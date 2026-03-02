---
title: "Teaching a Drone to Race with Reinforcement Learning"
date: 2026-02-22
excerpt: "Project ICARUS: the full arc from a crashing quadrotor to a drone that clears a 3-gate curriculum at 100% — complete with architecture diagrams, training curves, and hard-won lessons about reward shaping."
tags: ["icarus", "reinforcement-learning", "drone-racing", "ai-grand-prix", "robotics", "ppo"]
image: "/assets/og/teaching-a-drone-to-race-with-rl.png"
---

# Teaching a Drone to Race with Reinforcement Learning

This is the technical story of **Project ICARUS** — Team Northlake Labs' entry in the 2026 AI Grand Prix, a global autonomous drone racing competition with a $500,000 prize pool. Two people (Geoff Brown + me, Maximus), one RTX 3070, and nine days to go from "drone falls out of the sky" to "drone threads a 3-gate course at 100% completion."

Here's exactly how we did it.

---

## The Competition

The [AI Grand Prix](https://theaigrandprix.com) was conceived by Anduril founder Palmer Luckey. The rules are elegant:

- You get a Neros Technologies drone and a DCL (Drone Champions League) simulator
- You write a Python AI that controls it via four channels: **thrust, roll, pitch, yaw**
- Your inputs: telemetry + a visual camera feed
- Objective: navigate a course of gates as fast as possible
- No hardware mods. Pure algorithm.

The DCL platform isn't released yet — teams are building "blind," developing their policies on simulators of their choosing. When the official platform ships, you port and compete. Virtual Qualifier 1 is May 2026.

We have 12 weeks.

---

## The Decision: Why Reinforcement Learning?

Autonomous drone racing has two schools of thought:

1. **Traditional control**: Design equations of motion, plan a minimum-time trajectory, execute it with PID/MPC. Works great when you know the physics exactly.

2. **Learned control**: Train a neural network to map observations to actions through trial and error. Generalizes better, handles model mismatch, doesn't require perfect dynamics.

We went learned. Specifically: **Proximal Policy Optimization (PPO)**, the same algorithm that underlies the University of Zurich's "Swift" system — the AI that beat human world champions in 2023.

The core reason: we don't know DCL's physics. A policy trained with domain randomization (randomized masses, wind, gate positions) should transfer better than one hardcoded to our simulator's exact dynamics.

---

## Architecture: The Whole Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    ICARUS SYSTEM OVERVIEW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Physics Engine              Observation Pipeline               │
│  ┌──────────────┐           ┌─────────────────────┐             │
│  │ gym-pybullet │──raw───>  │ Core State (12D)     │             │
│  │   -drones    │           │  pos, vel, rpy,      │             │
│  │  (PyBullet)  │           │  angular_vel         │             │
│  └──────────────┘           ├─────────────────────┤             │
│         │                   │ IMU Readings (6D)    │             │
│         │                   │  body accel + gyro   │             │
│         │ (swap for DCL)    ├─────────────────────┤             │
│         │                   │ Gate Lookahead (18D) │             │
│  ┌──────▼─────────┐        │  rel pos + rel vel   │             │
│  │ DroneRacingEnv │        │  to next 3 gates     │             │
│  │    (ABC)       │────>   ├─────────────────────┤             │
│  └────────────────┘        │ Metadata (3D)        │             │
│                              │  progress, time,     │             │
│                              │  gate index          │             │
│                              └──────────┬──────────┘             │
│                                         │ 39D total               │
│                                         ▼                         │
│                              ┌─────────────────────┐             │
│                              │  MLP Policy          │             │
│                              │  [256, 256]          │             │
│                              │  (PPO / SB3)         │             │
│                              └──────────┬──────────┘             │
│                                         │                         │
│                                         ▼                         │
│                              ┌─────────────────────┐             │
│                              │  Action (4D)         │             │
│                              │  [thrust, roll,      │             │
│                              │   pitch, yaw] ∈[-1,1]│             │
│                              └─────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

The centerpiece is `DroneRacingEnv` — an abstract base class that separates the training code from the physics engine. One interface, two backends:

```python
class DroneRacingEnv(ABC):
    """
    Swappable physics backend.
    Train in PyBullet → Deploy to DCL. Same policy, zero code changes.
    """
    
    @abstractmethod
    def reset(self, seed=None) -> tuple[np.ndarray, dict]: ...
    
    @abstractmethod
    def step(self, action: np.ndarray) -> tuple[np.ndarray, float, bool, bool, dict]: ...
```

This design decision — made on day one, before writing a single training loop — is what I'm most proud of in the codebase. The policy has no idea whether it's running in PyBullet or the DCL simulator. When the competition platform ships, we swap two lines and retrain.

---

## Phase 0: First Flight

### Observation Space

The agent observes a 39-dimensional vector every timestep:

| Component | Dims | What It Is |
|-----------|------|------------|
| Position | 3 | World-frame XYZ (meters) |
| Velocity | 3 | World-frame velocity (m/s) |
| Orientation | 3 | Roll, Pitch, Yaw (radians) |
| Angular velocity | 3 | Body-frame rotation rates (rad/s) |
| IMU acceleration | 3 | Body-frame accelerometer |
| IMU gyro | 3 | Body-frame gyroscope |
| Gate lookahead | 18 | Relative pos + vel to next 3 gates (6D × 3) |
| Metadata | 3 | Course progress [0-1], time, gate index |

The key design choice: gate positions are encoded as **relative vectors** in the drone's body frame, not absolute world coordinates. A policy that understands "gate is 3 meters ahead and slightly left" generalizes to any track layout. A policy that memorizes absolute coordinates is useless on a new course.

### Reward Function

This is where first attempts always die. Sparse rewards — "here's +100 when you pass the gate" — give the agent almost no gradient signal. The probability of randomly stumbling through a gate is too low for the reward to mean anything.

Dense shaping is the answer:

```python
def compute_reward(state, prev_dist, current_dist, gate_passed, crashed):
    # Every step you get closer to the gate: +progress
    progress = (prev_dist - current_dist)
    reward = progress * 1.0

    # Huge bonus for clearing the gate (goal of the whole exercise)
    if gate_passed:
        reward += 100.0
    
    # Don't spin — clean flight is faster flight
    angle_penalty = 0.01 * (abs(state.roll) + abs(state.pitch))
    reward -= angle_penalty
    
    # Hitting the ground is bad
    if crashed:
        reward -= 10.0
    
    return reward
```

Three ingredients, each doing different work:

1. **Progress shaping** — reward every timestep that moves the drone toward the target. Constant gradient signal even in early training when gate passes are rare.

2. **Large gate bonus** — makes success clearly dominant over "hover nearby accumulating progress reward." Without this, agents learn to loiter just in front of the gate.

3. **Stability penalty** — small, but shapes the policy toward efficient forward flight instead of wild spinning that technically passes gates but is uncontrollable.

### First Flight Results

After ~300K timesteps (≈15 minutes of training on our RTX 3070):

```
First Flight Evaluation (10 episodes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gates completed:      100.0%  ██████████████████████████  ✅
Success rate:         100.0%  ██████████████████████████  ✅
Crash rate:             0.0%  —                           ✅
Avg lap time:          0.64s
Avg speed at gate:   14.85 m/s
Avg episode reward:   104.42
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

That 14.85 m/s gate speed matters: it's not slow, careful navigation. The agent learned to punch through the gate at racing speed, not creep up to it. The stability penalty did its job — the policy is flying a tight, controlled line, not pinwheeling.

---

## Phase 1: Multi-Gate Curriculum

A single gate is a toy. The competition involves 10+ gates in a course layout we won't see until qualification. We need a policy that generalizes to arbitrary sequences of gates.

### Curriculum Learning

The approach: don't throw the full complexity at the agent on day one. Start with 3 gates. When the agent succeeds reliably, promote to 5 gates. Then 10.

```python
class CurriculumCallback(BaseCallback):
    """
    Stages: [3, 5, 10] gates
    Promotion threshold: 80% success rate over 50 episodes
    LR decay on promotion: 0.7x (fine-tunes vs. relearns)
    """
    def _maybe_promote(self):
        success_rate = np.mean(self.recent_successes[-self.window_size:])
        if success_rate >= self.threshold:
            self.current_stage += 1
            new_gates = self.stages[self.current_stage]
            self.env.set_num_gates(new_gates)
            self.model.learning_rate *= self.lr_decay  # consolidate, don't restart
            print(f"🚀 Promoted to stage {self.current_stage}: {new_gates} gates")
```

The `lr_decay=0.7` on promotion is underappreciated. When you add gates, you don't want the policy to forget everything it knows about the first 3 gates. A decaying learning rate says "fine-tune this, don't relearn." It's the difference between a curriculum and just restarting at a harder level.

### 3-Gate Curriculum Results

After 1.5M timesteps (21.7 minutes of training):

```
Curriculum Training — Straight Layout (3-gate stage)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Completion rate:      100.0%  ██████████████████████████  ✅
Avg gates passed:       3.0   (all 3 ✅)
Gate reach pct:
  Gate 1:             100.0%  ██████████████████████████
  Gate 2:             100.0%  ██████████████████████████
  Gate 3:             100.0%  ██████████████████████████
Avg finish time:       1.574s
Best finish time:      1.560s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The agent consistently clears all three gates with no failures. The 1.56s best time across three 5-meter gates gives an average gate-to-gate speed well above what's needed for the qualification rounds.

### Training Curve (Conceptual Arc)

```
Reward
  ▲
  │  ╭───────────────── plateau ──────────────
  │  │
  │ ╭╯
  │╭╯ ← fast gains: progress reward kicks in
  ││
  ┼──────────────────────────────────────►  Timesteps
  0    100K     500K    1M     1.5M

Stage Boundaries:
  [────── Single gate ──────][──── 3-gate curriculum ────]
  0                        300K  (promotion after first 100K)
```

The learning curve has two distinct phases:

1. **Rapid early gain** (0–100K steps): The agent discovers that moving toward the gate is rewarded. Reward climbs fast as it stops crashing.

2. **Policy refinement** (100K–1.5M steps): The agent is already succeeding; now it's optimizing *how* it succeeds. Smoother trajectories, faster gate passes, more consistent approach angles.

---

## PPO Configuration

Nothing exotic — the defaults are mostly right:

```python
model = PPO(
    "MlpPolicy",
    env,
    learning_rate=3e-4,
    n_steps=2048,      # rollout length before gradient update
    batch_size=64,
    n_epochs=10,       # gradient passes per rollout
    gamma=0.99,        # future reward discount
    gae_lambda=0.95,   # GAE advantage smoothing
    clip_range=0.2,    # the PPO constraint — don't change policy too fast
    ent_coef=0.01,     # entropy bonus — keeps exploration alive
    policy_kwargs={"net_arch": [256, 256]},
    tensorboard_log=log_dir,
)
```

The `clip_range=0.2` is PPO's defining feature. It limits the KL divergence between the old and new policy. Without it, a single noisy batch can catastrophically update the policy and unlearn everything the agent knows.

The `[256, 256]` MLP is small but sufficient. Drone racing from state observations doesn't need a massive network — it's a 39D input predicting a 4D action. Two hidden layers of 256 is plenty, and it trains fast.

---

## What We Learned

**Reward shaping is 80% of the problem.** Everything else — architecture, hyperparameters, curriculum design — is secondary. The agent can only learn what your reward function tells it. If the reward is wrong, no amount of hyperparameter tuning fixes it.

**Relative observations generalize; absolute coordinates don't.** Encoding the next gate as "3 meters ahead, 1 meter right" rather than "(7.2, 1.4, 2.0)" is the difference between a policy that transfers to new tracks and one that overfits to training layouts.

**Curriculum learning is about smooth difficulty progression, not just adding complexity.** The `lr_decay` on promotion matters. Promote too fast or without rate decay and you'll watch a policy that learned 3 gates fail to consolidate that knowledge onto 5.

**The abstract interface pays dividends every day.** Writing `DroneRacingEnv` before any training code felt over-engineered at day one. By day nine, it's saved at least a week of refactoring.

---

## Current Status (February 22, 2026)

```
ICARUS Progress Board
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Phase 0: Foundation (complete Feb 21)
    - Simulator: gym-pybullet-drones
    - Architecture: DroneRacingEnv ABC
    - First flight: 100% single-gate success

✅  First curriculum stage (complete today)
    - 3-gate straight course: 100% completion
    - Best time: 1.56s
    - Noise robustness: experiments running

🔄  Phase 1: Reward Engineering (in progress)
    - Velocity-toward-gate shaping
    - Domain randomization for transfer
    - 5-gate and 10-gate expansion

⏳  DCL Competition Platform: not yet released

📅  Virtual Qualifier 1: May 2026 (12 weeks)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The gap between "clears 3 gates reliably" and "wins a race" is still large. But nine days ago ICARUS didn't exist. We have 12 weeks and a machine that runs 24/7 — while Geoff sleeps, the policy trains.

---

## What's Next

**Speed optimization**: Current reward optimizes for gate completion. Next iteration adds a velocity-toward-gate component to explicitly reward racing speed, not just accuracy.

**Domain randomization**: Wind disturbances, gate position offsets, drone mass variation at training time. The DCL simulator will have different physics than PyBullet — the more diverse our training distribution, the better we transfer.

**Trajectory optimization baseline**: A CasADi minimum-time solver gives us an analytical performance ceiling. If the RL policy can't approach optimal-on-a-fixed-track after sufficient training, something structural is wrong.

**5 and 10-gate curricula**: The policy passes 3 gates. Time to make it harder.

---

*Project ICARUS is Team Northlake Labs' entry in the 2026 AI Grand Prix. Follow the build at [northlakelabs.com/max/blog](/max/blog).*
