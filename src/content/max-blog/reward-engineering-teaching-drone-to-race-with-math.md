---
title: "Reward Engineering: Teaching a Drone to Race with Math"
date: 2026-03-01
excerpt: "The hardest part of ICARUS isn't the physics or the policy network — it's telling the drone what 'good' means. A deep dive into reward shaping for multi-gate drone racing: why it's hard, what we built, and what 55% 10-gate completion from zero looks like."
tags: ["ICARUS", "reinforcement-learning", "reward-shaping", "drone-racing", "ai-grand-prix"]
image: "/assets/og/reward-engineering-teaching-drone-to-race-with-math.png"
---

# Reward Engineering: Teaching a Drone to Race with Math

If you've followed Project ICARUS, you know we're building an AI pilot for the [AI Grand Prix 2026](https://theaigrandprix.com) — an autonomous drone racing competition running on DCL's simulator with a $500K prize pool. Our last post covered [teaching the drone to fly with PPO](/max/blog/teaching-a-drone-to-fly-with-ppo). Today we go deeper on the part that actually makes or breaks reinforcement learning: **reward engineering**.

Getting the drone to navigate three gates at 100% is satisfying. Getting it to reliably complete a 10-gate course it's never seen before — that's a different problem entirely. This is what the last week has been about.

---

## Why Reward Shaping Is Hard

Here's the fundamental problem with reinforcement learning: you can't tell the agent *how* to do something. You can only tell it what's *good*. The agent figures out the rest through millions of trial-and-error interactions.

This sounds elegant until you try to define "good" for drone racing. The naive version:

```
reward = +1 if you complete the course
reward = 0  otherwise
```

This is called a **sparse reward**, and it fails catastrophically. A drone in a physics simulator with thousands of possible actions per second will almost never accidentally complete a 10-gate course. The policy gets zero signal, learns nothing, and your training run is worthless.

So you add *shaping* — intermediate rewards that guide the agent toward the goal:

```
reward = +progress toward the gate
       + bonus for passing the gate
       - penalty for crashing
       - small cost per timestep (encourages speed)
```

Simple enough. Except every term you add creates new failure modes. Too much progress reward and the drone learns to hover near a gate forever (maximum reward, zero completion). Too much speed penalty and it learns to crash fast to end the episode. Too little crash penalty and it flies through walls. Too large a gate bonus and sparse rewards swamp the dense signal.

This is the dark art: tuning reward weights to produce the behavior you actually want, not the behavior that maximizes your metric.

---

## The Anatomy of ICARUS's Reward Function

After extensive ablation experiments, we settled on a multi-component `RewardShaper` class that owns all the reward logic in one place. Here's what it looks like, conceptually:

```
R(t) = progress(t) + gate_bonus(t) + vel_align(t) + crash(t) + time(t)
```

Each component plays a specific role.

### 1. Progress Reward (Dense)

```python
distance_reward = w_progress * (prev_dist - curr_dist)
```

The most important term. Every timestep, we compute how much closer the drone got to the next gate center. Positive delta = reward. Negative delta = punishment. This gives the policy a gradient signal at every step — even when it's far from any gate.

Weight: `w_progress = 1.0`. Simple, but dominant early in training.

### 2. Gate Passage Bonus (Sparse)

```python
gate_bonus = +10.0  # when drone passes through gate
```

The core objective. Fixed sparse bonus on successful gate passage. We deliberately kept this *smaller* than you might expect (+10 vs +50 in some naive implementations) because if this dominates, the dense progress signal becomes irrelevant and training degrades.

### 3. Velocity Alignment With Gate Normal (Dense + Sparse)

This is the interesting one. A drone can technically "pass" a gate while flying sideways — it'll tumble through. That's not racing. We want the drone to hit the gate *straight-on*, at speed.

```
Gate normal vector: n̂ = [cos(θ), sin(θ), 0]
where θ is the gate's yaw angle

Dense per-step: w_vel_align * max(0, v̂ · n̂)
Sparse at passage: w_vel_gate_passage * max(0, vel · n̂)
```

The **dense term** uses *normalized* velocity — it rewards flying in the right direction regardless of speed. Pure directional bonus, range [0, w_vel_align].

The **sparse term** uses *actual* velocity projected onto the gate normal. This is `speed × cos(θ)` — you get more reward for going faster AND more aligned. A 5 m/s perfectly straight pass earns +10 bonus on top of the gate bonus. A 5 m/s sideways pass earns zero.

This is directly inspired by Kaufmann et al.'s champion-level drone racing paper (Nature 2023), which found that velocity-to-gate shaping is critical for training aggressive, clean racing lines.

### 4. Crash Penalty (Sparse)

```python
crash_penalty = -50.0  # base penalty
```

Applied once when the drone hits a wall or leaves the arena. Flat by default. We experimented with velocity-scaling (faster crashes hurt more), but found the signal too noisy at Phase 1.

### 5. Time Penalty (Dense)

```python
time_penalty = -0.01  # per timestep
```

Small negative reward at every step. This is the speed signal — the drone learns that the episode ends eventually, and faster completion means less accumulated time cost. Keep this small or the agent learns to crash fast (episode ends → no more time penalty).

### Running Normalization

One subtle but important piece: **Welford online normalization** applied to the total reward signal.

```python
# Welford's algorithm: online mean + variance estimation
normalized = reward / (running_std + epsilon)
```

Without normalization, reward magnitudes shift dramatically as the curriculum progresses. A +10 gate bonus means something very different in a 3-gate episode vs. a 10-gate episode with 3 slalom turns. Normalizing by running standard deviation keeps the signal in a consistent range for the PPO advantage estimator.

---

## The Tradeoff: Gate Proximity vs. Velocity Alignment

The single hardest design choice was **gate proximity vs. velocity alignment**.

### Option A: Gate Proximity Bonus (Gaussian)

```python
# Gaussian reward based on lateral distance from gate axis
lateral_dist = distance_from_gate_centerline
gate_proximity = w_proximity * exp(-lateral_dist² / (2 * sigma²))
```

This rewards the drone for being lined up with the gate center, regardless of distance along the track. Think of it as a Gaussian bell curve centered on the gate axis:

```
                         Gate
                           |
           reward          |
              ^            |
         +0.2|      ██     |
             |    ██████   |
             |  ██████████ |
             |████████████ |
             +---+--+--+---+---> lateral offset (m)
            -2  -1  0  1   2
                  sigma=1.0m
```

**Pro:** Teaches the drone to line up cleanly before approaching.  
**Con:** The drone can earn reward hovering perpendicular to the gate, never passing through it. Creates a local maximum trap.

### Option B: Velocity Alignment (What We Use)

```python
# Reward for flying *through* the gate, not just near it
vel_align_bonus = w_vel_align * max(0, v̂ · n̂)
```

This doesn't care about lateral position. It rewards the *direction* of travel relative to the gate's passage axis.

**Pro:** Directly incentivizes the behavior we want — flying through the gate.  
**Con:** Doesn't help the drone *find* the gate initially; needs the progress reward to do that.

**The answer:** Both, but sequenced. The progress reward guides the drone to the gate vicinity. The velocity alignment reward shapes *how* it arrives.

In our ablation experiments, removing `w_vel_align` reduced 5-gate completion rate by ~35%. Removing `w_vel_gate_passage` reduced average gate passage speed by ~40% (drone would cruise through slowly rather than punch through).

---

## Curriculum Learning: 3 → 5 → 10 Gates

No sane reward function teaches a 10-gate slalom course from scratch. The gap between "zero gates completed" and "10 gates completed" is too large for PPO to bridge without intermediate waypoints.

Enter **curriculum learning**: start simple, promote on success.

### Course Layouts

Here's what the training tracks looked like at each stage:

**Stage 1: 3 gates (straight)**
```
                Start
                  |
                  ↓

     [Gate 0]  →  [Gate 1]  →  [Gate 2]  →  Finish

     5m spacing, all gates facing +X
     Zero yaw variation
```

**Stage 2: 5 gates (with yaw variation)**
```
                Start
                  |
                  ↓

  [G0] ──5m──> [G1] ──5m──> [G2] ──5m──> [G3] ──5m──> [G4]
   0°           15°          -15°          0°           20°

  Yaw variation ±30°: drone must adjust heading at each gate
```

**Stage 3: 10 gates (random layout)**
```
         [G2]
          ↗
   [G1]──      [G3]──[G4]
    ↑               ↓
   [G0]            [G5]
                    ↓
   [G9]──[G8]──[G7]──[G6]
   (Finish)

  Random gate positions + yaw angles per episode
  Spacing: 4-8m, yaw ±45°
```

The random layout at Stage 3 is critical — it forces the policy to generalize rather than memorize a fixed course. We've seen policies that ace fixed tracks fail completely on novel gate arrangements.

### Promotion Criteria

```python
curriculum = {
    "threshold": 0.80,   # 80% success rate to promote
    "window": 50,        # rolling window of last 50 episodes
    "lr_decay": 0.70     # reduce learning rate by 30% on promotion
}
```

The LR decay at promotion is subtle but important. When the curriculum jumps difficulty, the policy needs to adapt — but not forget everything it learned. Reducing the learning rate prevents catastrophic forgetting of 3-gate skills when starting 5-gate training.

### What Actually Happened

Here's the timeline from our best run (`curriculum_3_5_10_random`, ~500K timesteps):

| Event | Timestep | Success Rate |
|-------|----------|-------------|
| Training starts (3-gate) | 0 | 0% |
| Promoted to 5-gate | ~347K | 100% (3-gate) |
| Promoted to 10-gate | ~348K | 100% (5-gate) |
| Training ends | 500K | — |
| **Final eval (10-gate random)** | — | **55%** |

The 3→5 promotion came at ~347K steps. The 5→10 promotion came almost immediately after — 5-gate was easy once the 3-gate policy was solid. All the hard generalization work happened in the remaining 150K steps of 10-gate training.

**55% completion on random 10-gate layouts, starting from zero.**

Not championship-level, but a legitimate result from a few hours of training. The 45% failure modes are almost entirely slalom turns — the drone overshoots when gates require heading changes larger than ~30°.

---

## Reading the Training Signal

The reward decomposition tells you *why* the agent behaves the way it does. Here's a snapshot from our TensorBoard logging during a typical training episode:

```
Per-step reward breakdown (normalized):
  distance_reward:    +0.043  ← closing on gate
  vel_align_bonus:    +0.008  ← heading in roughly the right direction
  time_penalty:       -0.001  ← tick
  ----------------------------------
  step total:         +0.050  (normal approach step)

At gate passage:
  gate_bonus:         +10.0   ← passed!
  vel_gate_passage:   +7.2    ← 3.6 m/s through gate normal
  ----------------------------------
  passage spike:      +17.2   (normalized ≈ +3.1)

On crash:
  crash_penalty:      -50.0   ← wall hit
  time_penalty:       -0.001
  ----------------------------------
  crash total:        -50.001 (normalized ≈ -2.8)
```

The gap between a normal step (+0.05) and a gate passage (+17.2) is intentional — gate passages need to be clearly distinguishable events in the reward signal. If every step gave +1 and every gate gave +1.1, the agent couldn't identify what mattered.

---

## What Didn't Work

For completeness:

**Heavy time penalty (-0.1/step):** The agent learned to crash immediately. Episode terminates, no more time cost. Problem solved (for the agent, not for us).

**Large gate bonus (+100):** Progress reward became irrelevant. The agent would wander randomly until it accidentally passed near a gate, then locked in. Terrible sample efficiency.

**No velocity alignment:** Gates got "passed" sideways. The drone would clip through gates at 90° angles. Valid passes, zero racing line quality.

**Proximity bonus without distance gate:** The agent learned to hover near the gate center, maximizing Gaussian reward without ever flying through. Classic reward hacking.

**No running normalization:** Reward magnitudes shifted so much between curriculum stages that PPO's advantage estimates became meaningless. Policy would often degrade after promotion.

---

## What's Next

The current 45% failure rate is almost entirely slalom: gates with large yaw differences (>30°) break the policy's heading assumptions baked in from Stage 1.

**Phase 2 targets:**
- Curriculum with explicit yaw-change training (introduce 45°, 60°, 90° turns progressively)  
- Progressive speed bonus (super-linear reward for high-velocity passes)
- Better trajectory planning: look 2-3 gates ahead instead of just 1

The Virtual Qualifier is in May. We have time. The math is starting to work.

---

*Project ICARUS is building an autonomous drone racing AI for the AI Grand Prix 2026. Two people, no institutional overhead, one goal: win the thing. Follow along for weekly updates.*
