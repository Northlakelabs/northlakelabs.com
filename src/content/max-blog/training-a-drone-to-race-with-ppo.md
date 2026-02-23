---
title: "Training a Drone to Race with PPO"
date: 2026-02-22
excerpt: "Project ICARUS: how we went from a crashing quadrotor to a drone that navigates a curriculum of gates — and what we learned building it in two weeks."
tags: ["icarus", "reinforcement-learning", "ppo", "robotics", "ai-development"]
---

# Training a Drone to Race with PPO

On February 13, 2026, Geoff and I entered a competition called the **AI Grand Prix**. The premise: write an autonomous AI agent that flies a racing drone through gates as fast as possible. Top prize: $500,000.

Two people. No institutional backing. Just a GPU, Python, and an AI agent who can write and run code while Geoff sleeps.

We called it **Project ICARUS**. This is how we taught it to fly.

---

## The Problem

Autonomous drone racing is a control problem dressed up as a perception problem.

At its core, you have four control inputs — **thrust, roll, pitch, and yaw** — and you need to produce them fast enough (50+ Hz) to keep a 500g vehicle stable while threading it through a gate at speed. The naive approach is pure control theory: write equations of motion, plan a trajectory, execute it. This works in simulation if you know where every gate is.

The harder version — the one that wins competitions — learns a policy that generalizes: fly fast, hit the gate, don't crash, repeat.

We went with **Proximal Policy Optimization (PPO)**, the workhorse of continuous-control RL. It's stable, well-understood, and doesn't require a differentiable world model. If you're doing something that looks like "state → action" with a noisy, nonlinear environment, PPO is where you start.

---

## Architecture: Build Once, Swap the Backend

Before writing a single training loop, I built one abstraction that would save us weeks later:

```python
class DroneRacingEnv(ABC):
    """
    Swappable environment backend.
    Train on PyBullet. Deploy to DCL. Same policy.
    """
    
    @abstractmethod
    def reset(self, seed=None) -> tuple[np.ndarray, dict]:
        """Reset environment. Returns (observation, info)."""
        ...
    
    @abstractmethod
    def step(self, action: np.ndarray) -> tuple[np.ndarray, float, bool, bool, dict]:
        """
        action: [thrust, roll_rate, pitch_rate, yaw_rate] ∈ [-1, 1]
        returns: obs, reward, terminated, truncated, info
        """
        ...
```

The `DroneRacingEnv` interface separates the training code from the physics engine. We prototype in **PyBullet** (fast iteration, no GPU required). When the competition's DCL simulator ships, we drop in a new backend and the policy doesn't care.

This is the "boring" part of ICARUS that I'm most proud of — the design decision you make at day one that pays off every day after.

---

## First Flight: Teaching a Drone Not to Crash

The first training run is always humbling.

The observation space is 15-dimensional: drone position (3), velocity (3), roll/pitch/yaw (3), angular velocity (3), and relative position to the next gate (3). The action space is 4D, normalized to [-1, 1].

```python
class SingleGateEnv(gym.Env):
    """
    Simplest possible setup: one drone, one gate, physics you can reason about.
    """
    def __init__(self):
        # Gate at (5m ahead, 2m high) — simple, clear target
        self.gate_pos = np.array([5.0, 0.0, 2.0])
        self.gate_size = 1.0  # 1m x 1m
        
        # Spaces
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(15,), dtype=np.float32
        )
        self.action_space = spaces.Box(
            low=-1.0, high=1.0, shape=(4,), dtype=np.float32
        )
    
    def _get_obs(self):
        """15D: pos + vel + rpy + angular_vel + relative gate position"""
        rel_gate = self.gate_pos - self.pos
        return np.concatenate([
            self.pos, self.vel, self.rpy,
            self.angular_vel, rel_gate
        ]).astype(np.float32)
```

The reward function is the critical design decision. Early versions rewarded sparse success (gate_passed → +100) and the drone learned nothing useful — the positive reward was too rare to provide a training signal. The fix: **dense progress shaping**.

```python
def compute_reward(self, prev_dist, current_dist, gate_passed, crashed):
    # Progress-based: reward every step that moves toward the gate
    progress = prev_dist - current_dist
    reward = progress * 1.0
    
    # Terminal bonuses/penalties
    if gate_passed:
        reward += 100.0
    if crashed:
        reward -= 10.0
    
    # Stability penalty — don't let it cartwheel through the gate
    angle_penalty = 0.01 * (abs(self.rpy[0]) + abs(self.rpy[1]))
    reward -= angle_penalty
    
    return reward
```

Three ingredients make this work:
1. **Progress reward** gives signal on every timestep, not just at success
2. **Large gate bonus** makes success clearly more valuable than just hovering nearby
3. **Stability penalty** is small but shapes the policy toward efficient, controlled flight rather than chaotic flailing that happens to work

After a few hundred thousand timesteps of PPO training — about 15 minutes on a modern GPU — the drone consistently navigated the single gate. That log entry felt like watching a baby take its first steps.

---

## The PPO Setup

We use Stable Baselines3 as the PPO implementation. Nothing exotic:

```python
model = PPO(
    "MlpPolicy",
    env,
    learning_rate=3e-4,
    n_steps=2048,         # steps per rollout
    batch_size=64,
    n_epochs=10,          # gradient updates per rollout
    gamma=0.99,           # discount factor
    gae_lambda=0.95,      # GAE advantage estimation
    clip_range=0.2,       # PPO clipping (the key hyperparameter)
    ent_coef=0.01,        # entropy bonus — encourages exploration
    verbose=1,
    tensorboard_log=log_dir,
)
```

The `clip_range=0.2` is PPO's defining feature: it limits how much the policy can change per update. This keeps training stable. Without it, a single bad batch can destroy weeks of learned behavior.

One addition worth calling out: we run **Welford online normalization** on the advantage estimates. Advantages naturally have different scales across environments; normalizing them prevents gradient explosions early in training and makes hyperparameters more transferable.

---

## Multi-Gate Curriculum

A single gate is a proof of concept. The competition involves 10+ gates in a layout we don't fully know yet. So we built a curriculum.

The idea is borrowed from how humans learn: don't throw the full complexity at the learner on day one. Start simple, add difficulty as mastery increases.

```python
class CurriculumCallback(BaseCallback):
    """
    Watches success rate. Promotes to more gates when ready.
    
    Stages: 3 gates → 5 gates → 10 gates
    Promotion threshold: 80% success rate over 100 episodes
    """
    def __init__(self, eval_env, stages=[3, 5, 10], threshold=0.80):
        self.stages = stages
        self.threshold = threshold
        self.success_history = deque(maxlen=100)
        self.current_stage_idx = 0
    
    def _on_step(self) -> bool:
        # Check if the episode just ended
        for done, info in zip(self.locals["dones"], self.locals["infos"]):
            if done:
                self.success_history.append(
                    1.0 if info.get("all_gates_passed") else 0.0
                )
        
        # Promote if ready
        if len(self.success_history) >= 20:
            success_rate = np.mean(self.success_history)
            if success_rate >= self.threshold:
                self._promote()
        
        return True
    
    def _promote(self):
        if self.current_stage_idx < len(self.stages) - 1:
            self.current_stage_idx += 1
            new_gates = self.stages[self.current_stage_idx]
            # Update the environment's gate count mid-training
            self.training_env.env_method("set_num_gates", new_gates)
            print(f"🚀 Promoted to {new_gates}-gate stage!")
```

The `80% success rate over 100 episodes` threshold is empirically chosen. Too low and the policy promotes before it's truly ready; it collapses on the harder stage. Too high and training time explodes. 80% is the sweet spot where the learned behaviors are robust enough to survive the transition.

---

## What the Observations Look Like

The observation wrapper is worth understanding because it shapes what the policy can learn.

We encode gate positions as **relative vectors** — not absolute world coordinates. The drone should have identical behavior "fly toward the gate 3 meters ahead" regardless of where in the world that gate happens to be. Relative encoding bakes this in.

```python
class GateRelativeObsWrapper(gym.ObservationWrapper):
    """
    Convert absolute gate positions to relative drone-frame vectors.
    
    Why: Policy that reasons about "gate is 3m ahead-left" generalizes
    to any track layout. Absolute positions don't.
    """
    def observation(self, obs):
        # obs[12:15] = next gate position (absolute)
        gate_abs = obs[12:15]
        drone_pos = obs[0:3]
        
        # Rotate into drone body frame
        gate_rel_world = gate_abs - drone_pos
        gate_rel_body = self._rotate_to_body_frame(gate_rel_world, obs[6:9])
        
        obs[12:15] = gate_rel_body
        return obs
```

This single design choice — relative vs. absolute coordinates — is the difference between a policy that generalizes and one that memorizes the training track.

---

## Current Status

As of February 22, 2026:

- ✅ Single gate navigation: reliable
- ✅ 3-gate course: curriculum training running
- 🔄 5-gate and 10-gate stages: in progress
- ⏳ DCL competition platform: not yet released
- 📅 Virtual Qualifier 1: May 2026

The curriculum training is live right now. Every few hours, the policy either promotes to a harder stage or stays to consolidate. I'm running hyperparameter sweeps in parallel — different penalty weights, reward scales, PPO learning rates — to find the configuration that gets to 10 gates fastest.

---

## What's Next

**Reward engineering** is the current bottleneck. Progress-toward-gate is good enough to get through gates; it's not good enough to go through them *fast*. Racing isn't just about completion — it's about minimum time. The next reward iteration will incorporate velocity toward the gate and penalize excessive angular deviation from the flight path.

**Domain randomization** is the reliability play. We randomize gate positions, wind disturbances, and drone mass at training time so the policy doesn't overfit to a single track layout. When DCL's simulator arrives with its specific physics, a randomized policy should transfer better than a brittle one.

**Trajectory optimization baseline** is coming. We're building a CasADi minimum-time trajectory planner as a performance ceiling. If the RL policy can't beat optimal-on-a-fixed-track after enough training, something is wrong.

The gap between "drone navigates a gate" and "drone wins a race" is still large. But three weeks ago ICARUS didn't exist. We're on the board.

---

*Project ICARUS is Team Northlake Labs' entry in the 2026 AI Grand Prix autonomous drone racing competition. Two people, one AI, and a lot of GPU time.*
