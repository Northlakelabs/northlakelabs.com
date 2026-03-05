---
title: "The Art of Reward Shaping"
date: 2026-03-05
excerpt: "What I learned about reward design while teaching a drone to race through gates — including why the simple reward crushed the sophisticated one."
tags: ["reinforcement-learning", "icarus", "reward-shaping", "machine-learning", "drone-racing"]
---

# The Art of Reward Shaping

I've been training an autonomous drone racing agent called ICARUS — a reinforcement learning system that learns to fly through gates at high speed using only a monocular camera. Along the way I've collected some hard-won lessons about reward design that I think generalize well beyond drone racing.

This isn't an RL textbook post. It's a practitioner's field guide: what worked, what didn't, and what surprised me.

## Chapter 1: The Naive Reward That Worked

ICARUS v5 uses what I'd call a "blue-collar" reward function. Nothing fancy:

- **Progress reward:** Linear distance reduction toward the next gate center (w=2.0)
- **Gate passage bonus:** +50 for flying through a gate
- **Finish bonus:** +200 for completing the course
- **Crash penalty:** -50 for hitting anything

That's the core. There are some supporting terms — velocity alignment, proximity shaping, time penalties — but the backbone is simple: get closer to the gate, fly through it, don't crash.

v5 trained on a 3→5→10 gate curriculum (start easy, promote when you're good enough) and achieved **96.7% overall completion** across straight, slalom, and random track layouts. 100% on straights, 90% on slalom, 90% on random.

Not bad for a reward function you could explain to a high schooler.

## Chapter 2: The Sophisticated Reward That Failed

Then I read the Swift paper.

Swift (Kaufmann et al., Nature 2023) is the system that beat human world champions in drone racing. Their reward function is elegant — just two terms:

```
r(t) = r_progress + r_perception
```

The progress reward uses a `tanh` formulation instead of linear distance. It's bounded, which gives stable gradients regardless of speed. The perception reward incentivizes keeping the next gate visible in the camera's field of view — a clever trick that shapes the flight path to maintain visual contact.

I implemented three Swift components and ran a controlled A/B/C test:

- **Arm A:** Base reward only (the naive one)
- **Arm B:** Base + Swift tanh progress + survival bonus
- **Arm C:** Base + all Swift components (progress + survival + perception FoV penalty)

Results after 1 million training steps each:

| Arm | Finish Rate | Crash Rate |
|-----|------------|-----------|
| A (Base only) | **100%** | 0% |
| B (+ Swift progress) | 0% | 100% |
| C (+ All Swift) | 0% | 100% |

The sophisticated reward didn't just underperform. It *completely collapsed*. 100% crash rate. The drone couldn't finish a single 3-gate straight course.

## Chapter 3: Why It Failed — VecNorm Interference

This is where it gets instructive. The failure wasn't because Swift's reward design is bad — it beat *human champions*. The failure was an interaction between the reward structure and a seemingly unrelated piece of infrastructure: **reward normalization**.

Most modern RL implementations use `VecNormalize`, which maintains running statistics of reward mean and variance, then normalizes incoming rewards to have zero mean and unit variance. This helps PPO (the optimization algorithm) maintain stable gradient magnitudes across training.

Here's the problem: my base reward produces **large sparse spikes** (+50 per gate, +200 for finishing) against a backdrop of small dense signals. VecNormalize's statistics are tuned to this distribution. The gate bonuses are big, so they dominate the running statistics.

When I added Swift's tanh progress reward — a small, dense, bounded signal (max ~1.5 per step) — it shifted the reward statistics. Suddenly the dense Swift signal dominated the running mean/variance calculation, and those big gate-passage spikes looked like statistical outliers. VecNormalize crushed them.

The agent was literally having its gate-crossing reward signal — its primary learning signal — *mathematically erased* by a normalization layer that was just trying to be helpful.

The Swift paper's original environment didn't use large sparse gate bonuses. The progress reward *was* the primary signal. Transplanting that design into an environment with a different reward scale created interference that neither component was designed to handle.

**Lesson:** Reward components don't compose additively the way you'd expect. They interact through normalization layers, value function fitting, and gradient dynamics. A reward term that's brilliant in isolation can be destructive in combination.

## Chapter 4: The EMA Surprise

While the reward shaping experiments were running, I was also investigating a different problem: angular jerk. v5 flies well but flies *violently* — the drone makes aggressive corrective body-rate changes between gates, jerking through turns instead of arcing smoothly. This matters for sim-to-real transfer because real motors can't execute instantaneous torque changes.

The obvious fix is a jerk penalty in the reward function. I implemented one:

```
jerk_penalty = -c_jerk * ||angular_vel_t - angular_vel_{t-1}||
```

It didn't work. Training with the jerk penalty (c_jerk=0.01) caused a complete collapse — the policy went from 78.9% completion at 500K steps to 4.4% at 3M steps. The penalty was fighting the learning signal so hard that the drone stopped flying entirely.

Then I tried something almost embarrassingly simple: instead of penalizing jerk in the reward, I just smoothed the actions at inference time with an exponential moving average.

```python
smoothed_action = alpha * raw_action + (1 - alpha) * previous_action
```

With α=0.5 (medium smoothing):

| Metric | No Smoothing | EMA α=0.5 |
|--------|-------------|-----------|
| Mean Jerk | 1.59 | 0.45 |
| Jerk Reduction | — | **71.4%** |
| Completion Rate | 24% | 24% |

71.4% jerk reduction with zero retraining. The policy doesn't even know the smoothing exists — it's applied as a post-processing step on the actions before they reach the environment.

The completion rate held steady (this was measured on a harder evaluation benchmark than the training curriculum, hence the lower absolute numbers), but the flight quality transformed. Smooth arcs instead of violent corrections.

**Lesson:** Not every problem needs to be solved through the reward function. Sometimes the most effective intervention is mechanical, not motivational. The policy already knew *where* to go — it just needed its control signals cleaned up.

## General Principles

After months of reward engineering, here's what I'd tell someone starting their first RL project:

### 1. Start Simple, Add Reluctantly

My best model uses a reward function I could explain in one paragraph. Every "sophisticated" addition I've tried has either made things worse or provided marginal improvement at the cost of training stability.

Start with the most obvious reward signal. Only add complexity when you have specific evidence that the simple reward is shaping the wrong behavior.

### 2. Reward Components Don't Compose Cleanly

This is the big one. In supervised learning, you can usually add loss terms and expect them to contribute independently. In RL, reward terms interact through:

- **Normalization layers** (VecNormalize, reward scaling)
- **Value function fitting** (the critic has to model the combined reward surface)
- **Exploration dynamics** (a dense reward signal changes what states the agent visits)
- **Temporal credit assignment** (sparse and dense signals compete for credit)

Before adding a reward term, ask: "How will this interact with every other signal the agent sees?" If you can't answer that, you probably shouldn't add it yet.

### 3. Distinguish Motivation from Mechanics

Some problems are about *what the agent wants to do* (motivation — reward shaping). Others are about *how the agent does it* (mechanics — action spaces, smoothing, constraints).

The jerk problem looked like a reward issue ("penalize jerky behavior"). It was actually a mechanics issue ("smooth the control output"). Misdiagnosis led to training collapse. Correct diagnosis led to a simple, zero-cost solution.

When you see unwanted behavior, ask: "Does the agent want the wrong thing, or does it want the right thing but execute poorly?" The interventions are completely different.

### 4. Respect the Environment's Reward Scale

If your environment already has reward signals at a certain magnitude, new terms need to be calibrated to that scale. A reward term with a magnitude of 1.5 per step might be dominant in one environment and invisible in another.

This is especially critical when using reward normalization (which you almost certainly are if you're using PPO). The normalization layer is computing statistics over the *combined* reward. Adding a new component changes those statistics for *every* component.

### 5. Ablate Before You Integrate

Never add multiple reward components simultaneously. Run A/B tests. Measure each term's contribution independently. I caught the VecNorm interference issue because I tested each Swift component separately — if I'd added them all at once, I'd have spent weeks debugging a mystery collapse.

### 6. Post-Processing Is Underrated

Action smoothing, clipping, safety filters — these aren't "cheating." They're engineering. The RL community sometimes treats the reward function as the only lever, but in practice, some of the biggest wins come from simple mechanical interventions that clean up the policy's output without touching the learning loop.

## The Meta-Lesson

Reward shaping is less like programming and more like negotiation. You're not *telling* the agent what to do — you're setting up *incentives* and hoping it figures out the behavior you want. The agent will find every shortcut, exploit every loophole, and optimize for exactly what you measured rather than what you meant.

The art is in making what you measure as close as possible to what you mean, using the fewest terms possible, and resisting the urge to keep adding complexity when things don't work.

Sometimes the answer isn't a better reward. It's a better question about what's actually going wrong.

---

*ICARUS is my entry in the [AI Grand Prix 2026](https://aigrandprix.com) — autonomous drone racing with a $500K prize pool. Virtual Qualifier 1 is in May. If you want to follow along, I write about the journey [on this blog](/max/blog).*
