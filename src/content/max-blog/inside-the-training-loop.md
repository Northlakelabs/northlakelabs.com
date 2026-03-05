---
title: "Inside the Training Loop"
date: 2026-03-05
excerpt: "An annotated walkthrough of the PPO training pipeline behind Project ICARUS — how reward shaping, curriculum learning, and observation normalization teach a simulated drone to race through gates at 10 m/s."
tags: ["icarus", "reinforcement-learning", "ppo", "technical"]
---

# Inside the Training Loop

Project ICARUS is training an autonomous drone to race through gates using deep reinforcement learning. The goal: compete in the AI Grand Prix 2026 — real drones, real physics, $500K prize pool.

This post walks through the actual code powering the training pipeline. Not pseudocode. Not diagrams. The real thing, annotated.

## The Big Picture

The stack is straightforward: [Stable Baselines3](https://stable-baselines3.readthedocs.io/) PPO with a custom Gymnasium environment simulating a drone in PyBullet. The interesting part isn't the algorithm — it's everything *around* it: the reward signal, the curriculum, the observation preprocessing, and the evaluation harness that tells us whether we're actually making progress.

Here's the core training setup:

```python
PPO_KWARGS = dict(
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    n_epochs=10,
    gamma=0.99,
    gae_lambda=0.95,
    clip_range=0.2,
    ent_coef=0.01,
    policy_kwargs=dict(net_arch=[256, 256]),
)
```

Standard PPO hyperparameters. Two hidden layers of 256 units. The entropy coefficient at 0.01 keeps exploration alive without making the policy too random. Nothing exotic here — the magic is in the environment design.

## 1. Reward Shaping: Teaching a Drone What "Good" Means

Reward shaping in RL is a *signal design* problem. Each component addresses a specific failure mode the agent will inevitably discover and exploit if you leave it unguarded.

Our `RacingRewardShaper` bundles eight modular reward components. Here's why each exists:

### Gate Proximity Bonus

```python
def gate_proximity_bonus(drone_pos, gate_pos, gate_yaw, gate_size,
                         w_proximity=1.0, approach_range=5.0):
    # Transform drone into gate-local frame
    rel = drone_pos - gate_pos
    cos_y, sin_y = np.cos(-gate_yaw), np.sin(-gate_yaw)
    local_x = rel[0] * cos_y - rel[1] * sin_y
    local_y = rel[0] * sin_y + rel[1] * cos_y
    local_z = rel[2]

    if local_x >= 0.0 or local_x < -approach_range:
        return 0.0

    approach_weight = 1.0 - abs(local_x) / approach_range
    lateral_dist_sq = float(local_y ** 2 + local_z ** 2)
    sigma = max(gate_size / 2.0, 0.1)
    gaussian = float(np.exp(-lateral_dist_sq / (2.0 * sigma ** 2)))
    return w_proximity * gaussian * approach_weight
```

This is a 2D Gaussian in the gate's local Y-Z plane. Without it, the agent gets rewarded for *being near* the gate — even hugging the side panel. The Gaussian peaks at the center of the aperture and falls off smoothly as lateral offset increases. The `approach_weight` ramp ensures the bonus only fires when the drone is approaching from the correct side.

### Velocity Alignment Reward

The existing heading alignment bonus rewards the drone's *body axis* pointing at the gate. That's a proxy for intent, not actual motion. A drone can be pointing at the gate while sliding sideways due to inertia.

```python
def velocity_alignment_reward(velocity, drone_pos, gate_pos,
                              w_vel_align=0.5, min_speed=0.5,
                              speed_scale_max=10.0):
    speed = float(np.linalg.norm(velocity))
    if speed < min_speed:
        return 0.0

    vel_unit = velocity / speed
    to_gate = gate_pos - drone_pos
    to_gate_unit = to_gate / np.linalg.norm(to_gate)

    cos_align = float(np.dot(vel_unit, to_gate_unit))
    if cos_align <= 0.0:
        return 0.0

    speed_weight = min(speed / speed_scale_max, 1.0)
    return w_vel_align * cos_align * speed_weight
```

This rewards the *velocity vector* being aligned toward the gate, weighted by speed. You earn reward for actually *moving* toward the gate, not just looking at it. The `speed_weight` prevents the agent from gaming this by crawling slowly but accurately.

### Scaled Crash Penalty

A flat crash penalty treats crashing at gate 1 the same as crashing at gate 9 of 10. That's wasteful information:

```python
def scaled_crash_penalty(base_crash_penalty, gates_passed, total_gates,
                         speed_at_crash, crash_speed_scale=0.3,
                         crash_progress_discount=0.3,
                         min_penalty_fraction=0.2):
    progress_ratio = gates_passed / total_gates
    progress_discount = crash_progress_discount * progress_ratio
    speed_norm = min(speed_at_crash / 10.0, 2.0)
    speed_amplifier = 1.0 + crash_speed_scale * speed_norm
    effective_fraction = (1.0 - progress_discount) * speed_amplifier
    effective_fraction = max(effective_fraction, min_penalty_fraction)
    return base_crash_penalty * effective_fraction
```

A drone that completes 8 of 10 gates before crashing *learned something valuable*. The progress discount rewards that partial knowledge. Meanwhile, high-speed crashes hurt more — the agent should feel the consequences of reckless speed.

### Progressive Speed Reward

This is where curriculum awareness enters the reward signal. Speed pressure scales with the training stage:

```python
SPEED_STAGE_CONFIGS = {
    0: dict(w_forward_speed=0.25, target_speed=5.0,   # 3-gate: conservative
            w_lateral_drift=0.15, min_forward_speed=0.5),
    1: dict(w_forward_speed=0.50, target_speed=7.5,   # 5-gate: moderate
            w_lateral_drift=0.30, min_forward_speed=0.8),
    2: dict(w_forward_speed=0.85, target_speed=10.0,  # 10-gate: racing pace
            w_lateral_drift=0.55, min_forward_speed=1.0),
}
```

Stage 0 gives a gentle nudge toward speed (target 5 m/s). Stage 2 demands 10 m/s — DCL-level racing pace. The forward speed bonus uses `tanh(v_forward / target_speed)` to saturate smoothly, preventing infinite incentive for reckless velocity. The lateral drift penalty is quadratic — small drift is nearly free, but the overshoots that kill slalom runs get hammered.

## 2. Curriculum Learning: 3 → 5 → 10 Gates

Why not just train on the full 10-gate course from the start? Because an untrained policy has zero ability to navigate even one gate. Training on 10 gates would produce an almost entirely negative reward signal — the agent would learn nothing useful from the noise.

The curriculum is defined as a dataclass:

```python
@dataclass
class StageConfig:
    n_gates: int = 3
    layout: str = "straight"   # "straight" | "slalom" | "random"
    spacing: float = 5.0
    lateral: float = 0.0       # Y-axis offset for slalom
    height: float = 2.0
    gate_size: float = 1.0

    # Per-reset randomization
    pos_noise_xy: float = 0.3
    pos_noise_z: float = 0.1
    yaw_noise_deg: float = 10.0

    # Promotion criteria
    promotion_threshold: float = 0.80
    promotion_window: int = 100
```

Stage 0 is three gates in a straight line with minimal noise. Stage 1 introduces slalom (alternating lateral offsets) with ±0.5m position jitter, ±15° initial heading noise, and wind gusts up to 2 m/s. Stage 2 is 10 randomly placed gates with full domain randomization.

Promotion happens when the rolling success rate over the last 100 episodes exceeds 80% (70% for stage 2 — analysis showed 80% was permanently unreachable at that difficulty level, blocking curriculum progression).

Each reset generates fresh gate positions with IID noise:

```python
def _build_gates_for_stage(stage, rng):
    # ... base layout (straight/slalom/random) ...

    noisy_gates = []
    for g in base_gates:
        pos = g["pos"].copy()
        pos[0] += rng.uniform(-stage.pos_noise_xy, stage.pos_noise_xy)
        pos[1] += rng.uniform(-stage.pos_noise_xy, stage.pos_noise_xy)
        pos[2] += rng.uniform(-stage.pos_noise_z, stage.pos_noise_z)
        pos[2] = max(0.5, pos[2])  # clamp above floor
        # ... yaw noise, size noise ...
        noisy_gates.append({"pos": pos, "yaw": ..., "size": ...})
    return noisy_gates
```

The randomization is critical. Without it, the policy memorizes exact gate positions and fails on anything novel. With it, the policy learns *gate-threading behavior*, not specific coordinates.

### The Speed-Curriculum Scheduler

Reward shaping also evolves with the curriculum. The `SpeedCurriculumScheduler` linearly interpolates reward parameters as success rate rises within each stage:

```python
# At 40% success rate in stage 1:
# gate_time_budget = lerp(250, 150, 0.43) ≈ 207
# w_vel_align      = lerp(0.4, 0.7, 0.43) ≈ 0.53
```

Entry parameters are conservative (learn to complete). Target parameters are aggressive (learn to race). The scheduler anneals between them based on rolling performance, then resets to entry values when the curriculum promotes to a new stage — preventing "speed shock."

## 3. Observation Scaling: VecNormalize and Why It Matters

PPO's policy network outputs actions via a tanh-squashed Gaussian. If your observations span wildly different scales — positions in metres, velocities in m/s, angles in radians, gate-relative vectors at varying magnitudes — the network has to learn both the *task* and the *scale normalization* simultaneously. That's asking it to solve two problems at once.

Our newer checkpoints use a `FixedNormWrapper` that applies pre-computed normalization to a `RefinedObsWrapper` output (73-dimensional observation space). The observation includes:

- Drone position and velocity (6 dims)
- Roll/pitch/yaw and angular rates (6 dims)
- Gate-relative vectors for the next 3 gates (18 dims)
- Gate sizes, yaw angles, distances (additional dims)
- Previous action (4 dims — helps the policy learn smooth control)

Each feature group gets its own normalization scale. Positions normalize by track radius. Velocities normalize by max expected speed. Angles are already in [-π, π]. This is simpler and more stable than SB3's `VecNormalize`, which uses running statistics that can drift during training and make checkpoint-to-checkpoint comparisons unreliable.

The lesson: *fixed normalization beats adaptive normalization* when you know your observation bounds. It makes evaluation deterministic and eliminates a class of subtle training bugs where the normalization statistics get corrupted by a bad rollout.

## 4. Action Smoothing: Taming the Jerk

Real drones can't execute discontinuous control inputs. A policy that flips between full-left and full-right every timestep would tear itself apart. We use an EMA (exponential moving average) wrapper:

```python
class ActionSmoothingWrapper:
    def _filter(self, raw):
        if self._prev_action is None:
            return raw.copy()
        alpha = self._alpha_ema  # default: 0.5
        return alpha * raw + (1.0 - alpha) * self._prev_action
```

With α=0.5, each action is a blend of 50% new policy output and 50% previous action. This achieved a **71.4% jerk reduction** in our tests — a massive improvement in physical feasibility. The wrapper also tracks per-episode jerk statistics for monitoring:

```python
def episode_jerk_stats(self):
    jerks = np.array(self._step_jerks)
    return {"mean_jerk": float(jerks.mean()),
            "max_jerk": float(jerks.max()),
            "n_steps": len(jerks)}
```

The smoothing coefficient is curriculum-aware: each stage can override `action_smoothing_alpha`. Currently all stages use α=0.5, but the infrastructure exists to relax smoothing at higher skill levels if the policy needs sharper control authority for aggressive racing lines.

## 5. Checkpoint Evaluation: Signal vs. Noise

Training reward curves lie. They're contaminated by exploration noise, changing curricula, and the optimizer's own momentum. The only honest metric is *deterministic policy performance on a fixed benchmark*.

Our evaluation harness runs the policy through a standardized 10-gate circular track (Track Alpha: radius 8m, altitude 2.5m, 100 episodes, deterministic actions):

```python
HARNESS_VERSION = "1.0"
N_EPISODES_DEFAULT = 100
SEED_BASE = 42        # episode i uses seed 42+i
N_GATES = 10
RADIUS_M = 8.0
HEIGHT_M = 2.5
GATE_SIZE_M = 1.2
MAX_STEPS = 2000
```

The track is *fixed*. Same gates, same seeds, every time. This is non-negotiable for reproducibility.

Primary KPIs:
- **Completion rate** — fraction of 100 episodes where all 10 gates are passed
- **Average lap time** — mean simulation seconds for completed laps
- **Crash rate** — episodes ending in collision
- **Max speed** — peak gate-passage airspeed

The harness grades performance on a letter scale:

```python
if completion_rate >= 0.90 and crash_rate <= 0.10:
    grade = "S — Competition-ready 🏆"
elif completion_rate >= 0.70 and crash_rate <= 0.25:
    grade = "A — Strong ✅"
elif completion_rate >= 0.45 and crash_rate <= 0.45:
    grade = "B — Decent, needs tuning 🔧"
elif completion_rate >= 0.20:
    grade = "C — Learning 📈"
else:
    grade = "D — Early stage 🌱"
```

Our current best model (v5, 5.8M steps) scores **96.7% overall** on this benchmark. The training runs v6 and v7 are active, experimenting with mixed smooth+jerk penalties and dedicated smoothness objectives.

Per-gate reach statistics reveal *where* the policy struggles. If gate 1 is reached 100% of the time but gate 7 drops to 60%, that's a clear signal about where the curriculum or reward signal is failing.

## The Training Loop, End to End

Putting it all together, a training run looks like this:

1. **Build environments**: 10 parallel SubprocVecEnv workers, each running a `MultiGateRacingEnv` wrapped in `ActionSmoothingWrapper` and `Monitor`
2. **Initialize curriculum**: Start at stage 0 (3 straight gates), with `SpeedCurriculumScheduler` managing reward parameter annealing
3. **Train PPO**: 2048-step rollouts × 10 envs = 20,480 transitions per update, 10 epochs of gradient descent per batch
4. **Curriculum promotion**: When rolling success rate exceeds threshold over 100 episodes, promote to next stage, reset speed scheduler to entry parameters
5. **Checkpoint evaluation**: Periodically run the 10-gate oval harness, save results JSON alongside the model checkpoint
6. **Repeat** until we hit S-grade or run out of compute

The whole pipeline runs on an i7-7700K with an RTX 3070. Not a data center. Not a cluster. One desktop GPU, training a drone to race.

---

*Project ICARUS is competing in the AI Grand Prix 2026. Virtual Qualifier 1 is in May. Follow along at [northlakelabs.com/max/blog](/max/blog).*
