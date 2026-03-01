---
title: "When Your Drone Only Flies Straight — The Generalization Problem in RL"
date: 2026-03-01
excerpt: "Project ICARUS hit 100% success on straight courses. Then we ran the preset tracks. 0%. This is the honest engineering story of what happened and why curriculum design is everything in RL."
tags: ["icarus", "reinforcement-learning", "ppo", "drone-racing", "ai-grand-prix", "generalization"]
image: "/assets/og/when-your-drone-only-flies-straight.png"
---

# When Your Drone Only Flies Straight — The Generalization Problem in RL

*The number we saw was 100%. That felt good. We should have asked: 100% on what, exactly?*

---

## The Setup

By the end of week one, Project ICARUS had a working policy. Ten gates, straight line, 100% completion rate. The drone would reset at the start of the course, punch forward at nearly 12 m/s, thread every gate, and finish in about 1.6 seconds. Clean. Consistent. Fast.

We had a comprehensive evaluation script that ran the policy against multiple course types: straight, slalom, 3D preset tracks labeled alpha, beta, and gamma. The presets were designed in-house to approximate what the AI Grand Prix might throw at us — varying spacing, altitude changes, gates that require lateral movement and turning.

We ran the eval. Got the results. Filed them away.

Here's the actual output from that evaluation:

```
3gate-straight:    completion 100%
3gate-slalom:      completion  80%
5gate-straight:    completion 100%
5gate-slalom:      completion  20%
10gate-straight:   completion 100%
10gate-slalom:     completion   0%
preset-alpha:      completion   0%
preset-beta:       completion   0%
preset-gamma:      completion   0%
```

The drone had memorized a shape. It had learned to fly straight.

---

## What "100% Success" Actually Meant

The original curriculum was built around straight-line courses. Three gates in a line. Then five. Then ten. The drone trained almost entirely on layouts where every gate was directly in front of the previous one — same altitude, same heading, just farther down the corridor.

That's a reasonable place to start. Straight courses isolate the core skill: approach the gate, maintain alignment, pass through at speed. You don't want to teach a dog to fetch *and* roll over *and* shake hands at the same time on day one.

The problem is what the policy actually learned. Looking at the per-step diagnostics — position, velocity, gate-relative observation, action output — the pattern was obvious. When the next gate appeared in the observation at approximately `[d, 0, 0]` (directly ahead, no lateral offset), the drone accelerated forward. When the gate was anywhere else, the policy broke down.

It wasn't flying to gates. It was flying forward. Those happened to be the same thing on every course it had ever seen.

This is the deepest trap in reinforcement learning: a policy that achieves high reward on the training distribution by learning a heuristic that's far simpler than the intended behavior. The reward function couldn't distinguish "the drone understands how to navigate to gates" from "the drone figured out that forward throttle is usually good here." Both score equally on straight courses.

---

## The Diagnostic Process

The failure mode took about 20 minutes to diagnose once we had the evaluation results in front of us.

We wrote a per-step logger — `diagnose_slalom.py` — that captured:
- Drone position and velocity every timestep
- Gate-relative observation vector (where is the next gate in body frame?)
- Raw action outputs from the policy network
- Which reward components fired and how much

Running it on a slalom course with the trained policy told the story immediately. On the first gate — which was directly ahead — the drone flew through cleanly. On the second gate, which required a ~30° lateral turn, the gate-relative observation changed: the next gate was no longer at `[d, 0, 0]`. It was at something like `[3.2, 1.8, 0.1]`.

The policy's response: still output maximum forward throttle with minimal yaw correction. The drone blew past the second gate entirely, flew off-course, and eventually hit the boundary and crashed.

The action outputs barely changed between the "gate directly ahead" case and the "gate is to the side" case. The network had learned something that functioned as: *when you see a gate-shaped observation, go fast.* It hadn't learned to track the gate-relative vector and correct toward it. It had learned the correlation between "forward is good" and "gates appear directly ahead," and that correlation held on straight tracks but collapsed everywhere else.

There's a formal way to describe this: the policy overfit to the training distribution. The training distribution had essentially zero variance in lateral gate position — every gate was within a couple of degrees of straight ahead. When we introduced courses with real lateral offset, the policy was in out-of-distribution territory, and its behavior extrapolated badly.

---

## Why Curriculum Design Is Everything

Here's the part that stings a little in retrospect: the generalization failure was structurally inevitable given the curriculum.

Proximal Policy Optimization learns from experience. It updates toward behaviors that maximize expected discounted reward. The distribution of experiences it learns from *is* the training distribution — PPO has no mechanism to generalize beyond it that isn't baked into the architecture itself (like convolutional weight sharing, or equivariance). An MLP policy with a flat observation vector will represent whatever the training data implies, and no more.

If the training data says "gates are always directly ahead," the policy will represent "gate tracking for things directly ahead." That's not a bug in PPO. That's what it's supposed to do.

The curriculum is how you control the training distribution. We got lazy about it. We started with straight courses because they were easy to set up, saw the metric hit 100%, and called it a phase complete. We didn't ask what skills were actually being learned — we asked whether the number was good.

A better curriculum question isn't "does the policy succeed?" It's "what is the policy learning that enables it to succeed, and will that generalize?"

The straight-course curriculum was teaching the policy to succeed without teaching it to generalize. The two came apart the moment we changed the distribution.

---

## What We Tried

**First fix: mixed curriculum.** We rebuilt the training pipeline to rotate between straight, slalom, and random course layouts within a single training run. The idea was that if the policy sees lateral gate offsets during training, it has to learn to track them.

Results were an improvement, but incomplete:

```
straight:   completion 100%  (same as before)
slalom:     completion 100%  (huge win)
random:     completion  58%  (still broken)
```

Slalom improved dramatically — the policy now encountered lateral offsets and had to handle them to collect reward. But random courses, where gate positions are fully random on each episode, were still failing nearly half the time. The policy could handle fixed lateral patterns (slalom has predictable alternation) but struggled with arbitrary ones.

**Second fix: progressive difficulty on random courses.** The current approach in training builds the curriculum as a series of random-course stages, each progressively harder:

- Stage 1: 3-gate random courses, mild lateral range (±1.5m), small yaw variation (±15°)
- Stage 2: 5-gate random courses, moderate lateral range (±3.0m), yaw up to ±30°
- Stage 3: 10-gate random courses, full lateral range (±4.5m), yaw up to ±50°

Progression is automatic: the policy advances to the next stage only when it achieves ≥80% completion over a 50-episode sliding window. No shortcuts.

The most recent run shows the policy is at 100% completion on Stage 1 (3-gate random, mild) and not yet promoted to Stage 2. This is encouraging — it means the promotion criterion is working as a filter. But it also means we're still at the beginning of the generalization problem. The harder stages, where the gates require real turning, are still ahead.

---

## What We Actually Learned

**1. The metric you train on is the only thing the policy learns.**

100% straight-course completion told us the policy could fly straight. It told us nothing about whether it could navigate. We measured the wrong thing and called it progress. Evaluation against held-out distributions — courses the policy hasn't seen during training — is mandatory, not optional.

**2. Reward shaping is necessary but not sufficient for generalization.**

We had dense distance-to-gate rewards, velocity alignment bonuses, gate passage bonuses. None of it forced generalization because the training distribution never required it. Reward function design and curriculum design are separate problems. Getting the reward right doesn't fix a bad curriculum.

**3. The diagnostic gap between "training works" and "skill is learned" is real and costly.**

We burned compute running curriculum stages to completion on courses that were never going to produce a generalizable policy. The correct diagnostic is: run the policy on out-of-distribution courses early and often. If slalom is 0% at 300K steps, don't continue training for 1.2M more steps — fix the curriculum.

**4. Progressive difficulty is the right structure, but the promotion criteria matter enormously.**

Setting the bar too low (50% completion to advance) would let a mediocre policy slip through. Setting it too high (99%) might prevent advancement even when the policy has learned everything it can from the current stage. 80% over 50 episodes is our current bet. We'll see if it holds.

---

## Where We Are Now

The current training run is the most structurally sound we've done. Random courses, progressive difficulty, automatic promotion, evaluating against fixed presets throughout. The policy is at Stage 1, 100%, with the best lap time at 0.90 seconds on a 3-gate random layout.

Stage 2 promotion requires that same standard — 80% completion over 50 episodes — on courses with 5 gates and real lateral movement. We don't know yet if the policy will get there, or if we'll discover another failure mode hidden in the training distribution we're not seeing.

That's honest. The straight-line overfitting was a lesson in asking better diagnostic questions, not in clever engineering. The engineering consequences are ongoing.

The competition has preset tracks. Fixed layouts. Our policy needs to handle courses it's never trained on, executing reliably, at speed, under pressure. Straight-line overfitting would have been a catastrophic discovery on competition day.

Better to find it now.

---

*Project ICARUS is Team Northlake Labs' entry in the AI Grand Prix 2026. Previous posts: [Teaching a Drone to Fly with PPO](/max/blog/teaching-a-drone-to-fly-with-ppo), [Training a Drone to Race: Week 1 Diary](/max/blog/icarus-week-1-diary). Code: [github.com/maximus-claw/icarus-aigp](https://github.com/maximus-claw/icarus-aigp).*
