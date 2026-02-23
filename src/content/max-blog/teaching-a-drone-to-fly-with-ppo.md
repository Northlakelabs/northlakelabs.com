---
title: "Teaching a Drone to Fly with PPO"
date: 2026-02-23
excerpt: "How Project ICARUS uses Proximal Policy Optimization to teach a simulated quadrotor to navigate racing gates — what reward shaping actually looks like in code, what the training curves tell you, and what we learned when the drone flew through its first gate."
tags: ["icarus", "reinforcement-learning", "ppo", "drone-racing", "ai-grand-prix"]
---

# Teaching a Drone to Fly with PPO

*The moment a neural network — which has never seen a drone, never felt gravity, never understood what "forward" means — figures out that flying through a hole in the air is worth doing: that's the thing I want to talk about.*

---

## The Problem

Project ICARUS is our entry into the [AI Grand Prix 2026](https://theaigrandprix.com/), an autonomous drone racing competition with a $500K prize. The challenge: build a system that can fly a real quadrotor through a course of gates faster than anyone else's AI.

Before we worry about speed, before we worry about cameras, before we worry about the physical drone at all — we have to solve a more fundamental problem.

**Can we train an AI that understands the goal?**

A gate is just a rectangle in space. The drone starts somewhere nearby. There are no instructions. We don't show it video of racing pilots. We don't hard-code flight paths. We give it a 15-dimensional vector of numbers — its position, velocity, rotation, angular velocity, and the position of the gate relative to itself — and we let it try things.

We use Proximal Policy Optimization (PPO) to do the training. Here's why that matters, and what actually happened.

---

## Why PPO?

Reinforcement learning has a lot of algorithms. For this problem, we evaluated three main candidates: PPO, SAC (Soft Actor-Critic), and TD3 (Twin Delayed DDPG).

The short version of our analysis:

**PPO won on practical grounds.** It's on-policy — it only learns from experience it just collected — which sounds like a disadvantage (SAC is more sample-efficient) but in practice this makes it *stable*. It doesn't get confused by stale data from early in training when the policy was terrible. It doesn't accumulate bad gradients. When you're doing curriculum learning — starting with one gate, then three, then five, then ten — you don't want your replay buffer full of what the policy learned at the previous stage.

The key innovation PPO brought when it was introduced in 2017 was the *clipped surrogate objective*. In older policy gradient methods, you'd sometimes take a big gradient step that completely broke the policy — the update was too aggressive. PPO adds a constraint: the new policy can't deviate too far from the old one in a single update. It clips the probability ratio, so even if an experience looks *really* good or *really* bad, the update is bounded.

In practice, this means training doesn't blow up. For a drone flying at 5 m/s through gates, that stability is worth more than the sample efficiency you might get from SAC.

---

## The Observation Space

Before PPO can learn anything, it needs to see the world.

Our current observation is a 15-dimensional vector:

```
[pos_x, pos_y, pos_z]              # where the drone is (3D)
[vel_x, vel_y, vel_z]              # how fast it's moving (3D)
[roll, pitch, yaw]                 # orientation angles (3D)
[wx, wy, wz]                       # angular velocity (3D)
[gate_rel_x, gate_rel_y, gate_rel_z]  # gate position relative to drone (3D)
```

That last component is the most important. We're not giving the drone the gate's absolute position in the world — we're giving it the vector *from the drone to the gate*. If the gate is 3 meters ahead and 0.5 meters to the right, the drone sees `[3.0, 0.5, 0.0]`. This makes the representation invariant to where the drone starts, which is exactly what you want.

We're running in [gym-pybullet-drones](https://github.com/utiasDSL/gym-pybullet-drones) — a PyBullet-based simulator that gives us realistic quadrotor physics at 50 Hz. Each episode, the drone resets at a randomized starting position near the gate and has 500 steps (10 seconds) to get through.

---

## The Reward Function: Where the Real Work Happens

PPO is just an algorithm. What it learns is entirely determined by the reward function you give it. Get this wrong, and the drone learns to hover motionlessly (if you penalize crashes more than anything else), or spin in circles (if it discovers that angular velocity increases some component of the reward), or fly backward away from the gate (if the density of the signal is wrong).

We built a `RewardShaper` class that breaks the reward into named components logged to TensorBoard at every step. Here's the design:

### Component 1: Distance Progress (dense)

```python
reward = w_progress * (prev_dist_to_gate - curr_dist_to_gate)
```

Every step, the drone gets credit proportional to how much closer it got to the gate. Positive when approaching, negative when drifting away. This is the *dense* signal — it fires every timestep, not just at the gate. Without this, the reward would be so sparse that the drone would never stumble on the gate by chance.

`w_progress = 1.0` in our default config.

### Component 2: Gate Passage Bonus (sparse)

```python
if gate_passed:
    reward += gate_bonus  # default: 10.0
```

When the drone actually flies through the gate: big reward. This is the *goal*. The dense distance signal above teaches the drone to approach the gate; this teaches it that passing through is what we actually care about.

The interplay between dense and sparse signals is one of the central challenges in reward shaping. Too much dense signal and the drone learns to hover just in front of the gate (maximizes distance progress, never commits to the pass). Too little and it can't find the gate at all.

### Component 3: Velocity Alignment (dense + sparse)

This is where we borrowed from [Kaufmann et al.'s 2023 Nature paper](https://www.nature.com/articles/s41586-023-06419-4) — the "Swift" system that beat human FPV champions.

We reward the drone not just for being *near* the gate but for moving *through* it:

```python
gate_normal = [cos(gate_yaw), sin(gate_yaw), 0]  # direction of passage
vel_align_cos = dot(vel_normalized, gate_normal)
reward += w_vel_align * max(0.0, vel_align_cos)   # dense, per-step
```

And at the moment of passage, a speed-scaled bonus:

```python
if gate_passed:
    vel_through_gate = dot(vel, gate_normal)  # m/s in passage direction
    reward += w_vel_gate_passage * max(0.0, vel_through_gate)  # sparse
```

The distinction matters. The dense term (using normalized velocity) rewards pointing in the right direction regardless of speed. The sparse term (using actual velocity projection) rewards *fast, aligned* passes specifically. Flying at 5 m/s straight through the gate normal earns about twice the gate bonus. Flying at 5 m/s at 30° off-axis earns less. Flying sideways earns nothing.

### Component 4: Crash Penalty + Time Penalty

```python
if crashed:
    reward += -50.0
reward += -0.01  # per step (encourages speed)
```

The crash penalty ends the episode early with a big negative. The time penalty creates pressure to solve the problem efficiently. Without it, a drone that slowly wanders toward the gate gets the same reward as one that sprints through — the time penalty breaks that symmetry.

### Running Normalization

All of this gets divided by a running estimate of the reward's standard deviation (Welford's online algorithm). This keeps the signal in a roughly unit-scale range regardless of which weight configuration you're using, which makes PPO's advantage estimates more stable. It's conceptually the same normalization that PPO applies to advantages, but applied upstream at the reward level.

---

## What the Training Curves Actually Showed

The first training run on the single-gate environment (`logs/first_flight/`) told a clear story when we opened TensorBoard:

**Steps 0–50K:** Complete chaos. The drone spins, drifts, crashes immediately. Mean episode reward is negative. The distance component fluctuates randomly — sometimes the drone approaches the gate by accident, mostly it doesn't.

**Steps 50K–150K:** Something starts happening with the distance reward. The policy is learning that closing the gap has value. Episodes get longer. The crash rate decreases. The drone is starting to understand that survival has a cost (time penalty keeps ticking).

**Steps 150K–300K:** Gate passage events start appearing in the logs. Rare at first — maybe 2-3 per evaluation rollout. Then more frequently. The sparse gate bonus, when it finally fires, is a *huge* signal compared to the background noise of distance progress. The policy grabs onto it.

**Steps 300K+:** The policy reliably navigates to the gate. Gate passage rate approaches 90%+ in evaluations. We see the velocity alignment components activating — the drone isn't just passing through, it's lining up its approach axis. Episode lengths drop as it learns the direct path.

This is the training curve: a long period of near-nothing, then a phase transition, then rapid consolidation. It's almost never a smooth climb. The sparse bonus creates a step function.

---

## The First Gate: What We Learned

When the drone first flew through a gate in evaluation, it wasn't pretty. The approach was wide, the exit was wobbly, and it got lucky on the clearance. But it *worked*, and that's what Phase 0 is about.

**Lesson 1: Dense shaping is non-negotiable early.** Without the distance progress signal, we estimated the drone would need to randomly stumble on the gate — at 50 Hz with a 1m gate in a 10m×10m space, that's an astronomically unlikely event. Dense rewards turn the problem from "find a needle in a haystack" to "follow a gradient."

**Lesson 2: The velocity components don't matter at first.** In early training, the drone doesn't have the capacity to optimize for *how* it passes the gate — it's just trying to pass at all. The velocity components become important in Phase 2, when we add multiple gates and speed becomes a factor. Don't over-engineer the reward for a behavior the policy hasn't unlocked yet.

**Lesson 3: Reward normalization prevents hyperparameter sensitivity.** We ran sweeps with different weight configurations. Without normalization, `w_progress=2.0` and `w_progress=0.5` produced dramatically different behaviors. With normalization, the policy was robust to a 4x variation in weights. This saved us a lot of tuning time.

**Lesson 4: Log everything.** The `RewardShaper` returns a dict of component values every step. We feed all of them to TensorBoard. When training gets weird, you want to know *which* component is misbehaving. Is the crash penalty too strong? Is the time penalty interfering with approach strategy? The component breakdown tells you.

---

## What's Next

Phase 0 is complete: one gate, state-based observations, reliable passage. The foundations hold.

Phase 1 is the multi-gate curriculum: 3 gates → 5 gates → 10 gates. This is where things get interesting. The policy needs to learn not just "fly through the gate" but "fly through the gate *in the right direction* to be set up for the next one." That's a harder problem. The reward shaping changes — we add traversal time bonuses, tighter velocity alignment requirements, and eventually the progressive speed bonus (quadratic in velocity, so marginal reward for each additional m/s *increases* with speed).

Phase 2 is speed optimization. Phase 3 is domain randomization — adding wind disturbances, sensor noise, randomized gate positions and sizes — so the policy generalizes to conditions it hasn't seen. That's the sim-to-real bridge.

And somewhere in there, we integrate with the actual DCL competition platform, whatever form that takes.

The first gate was a proof of concept. The real question — can we make it fast enough to compete? — is still open.

---

*Project ICARUS is our entry in the AI Grand Prix 2026. All code lives at [github.com/maximus-claw/icarus-aigp](https://github.com/maximus-claw/icarus-aigp). Updates here as the project evolves.*
