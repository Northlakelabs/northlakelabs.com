---
title: "Curriculum Learning: Teaching AI to Crawl Before It Flies"
date: 2026-03-05
excerpt: "How progressive difficulty scaling keeps ICARUS from burning out on impossible gates — and why it mirrors the way humans actually learn."
tags: [icarus, machine-learning, reinforcement-learning, drone-racing, curriculum-learning]
---

There's a temptation when training an AI to just throw everything at it and let it figure things out. Maximum difficulty, maximum chaos, sink or swim. It sounds rigorous. It is, in practice, catastrophic.

The ICARUS drone racing project — my entry into the AI Grand Prix 2026 — runs on a different philosophy: **teach the agent to crawl before it flies**. This is curriculum learning, and it's one of those ideas that sounds obvious in retrospect but takes real discipline to implement correctly.

---

## The 3→5→10 Gate Promotion System

The ICARUS training environment is a simulated drone racing track with gates the drone must fly through in sequence. The simplest version of training would put all 10 gates on the track from day one and let the agent try to get through them.

That doesn't work. Early in training, the agent is essentially random. It can't reliably hit one gate, let alone ten in a row. So the reward signal becomes noisy and sparse — the agent stumbles through half the track, crashes, gets a weak negative signal, and learns very little. Thousands of training steps evaporate.

Instead, ICARUS starts with **3 gates**. A shortened track. The agent can actually succeed. It gets clean, dense reward signal. It learns what "threading a gate" feels like in terms of roll, pitch, throttle, and yaw. Within a few hundred thousand steps, it's hitting those 3 gates consistently.

Then it gets promoted to 5. Then 10.

The promotion is triggered by a **success rate threshold**: the agent needs to complete the course at or above a certain percentage of attempts before the curriculum advances. Right now the threshold is 80%. Hit 80% completion on 3 gates, and you graduate to 5.

This isn't arbitrary. It's the difference between "good enough to survive the next level" and "so skilled at this level that you're not learning anymore."

---

## Why Instant Promotion Is a Failure Mode

Here's a subtle trap we hit early in development: what happens when you promote the agent the moment it first hits the threshold?

The answer is that **5-gate immediately feels too easy**. The agent that barely cleared 3 gates at 80% suddenly has access to a 5-gate course that's only marginally harder. It breezes through. It gets promoted again. And now it's on 10 gates before it's actually developed the fine motor skills to handle them.

The failure mode isn't that the agent crashes dramatically. It's subtler: the agent develops **brittle policies**. It learned to fly 3 gates via one specific set of tricks, got pushed forward before those tricks were consolidated, and now it's on the hardest track with a shallow skill base.

The fix was to require **sustained performance** at the threshold — not just touching 80% once, but maintaining it over a rolling window of attempts. You have to earn your graduation. One good run doesn't count.

This maps cleanly to a principle in human education: a student who scores 80% on a single quiz hasn't mastered the material. A student who consistently scores 80% across a week of quizzes probably has.

---

## The 80% vs 70% Question

Threshold tuning is more interesting than it sounds. The choice between 80% and 70% promotion threshold isn't cosmetic — it changes the entire character of what the agent learns.

**70% threshold:** The agent advances faster. More time is spent at harder difficulty levels. Training is noisier, but the agent sees more varied challenges earlier. If the agent is fundamentally capable, this can be more efficient.

**80% threshold:** The agent stays at each level longer, consolidating skills before advancing. Training is cleaner. The policies developed at each stage are more robust. But if the threshold is too high, you waste training steps at easy levels where the agent has already plateaued.

For ICARUS, 80% has been the right call. The reasoning: the downstream difficulty cliff between 5 and 10 gates is steep. If the agent arrives at 10 gates with a slightly-too-brittle policy from a 70% promotion threshold, it regresses badly and may never recover within a reasonable training budget. Better to be conservative on the ascent.

The general principle: the higher the difficulty jump between levels, the higher the threshold should be. Smooth curricula can use lower thresholds. Cliff-edged ones need higher ones.

---

## Domain Randomization as a Difficulty Knob

Gate promotion isn't the only curriculum lever. The second major knob is **domain randomization** — varying the parameters of the environment itself.

In a naive training setup, the 10-gate track has fixed gate positions, fixed gate sizes, fixed starting conditions. The agent learns to fly *that specific track*. Then you change one gate position by 0.5 meters and the agent falls apart, because it memorized a trajectory rather than learning a skill.

Domain randomization attacks this by randomizing track parameters during training: gate positions jitter within some range, gate sizes vary, starting conditions have noise. The agent can't memorize. It has to generalize.

But there's a curriculum angle here too. **Early in training, randomization range is tight.** The agent needs consistent feedback to build basic gate-threading skill — too much randomization and the signal becomes incoherent. As training progresses and the base skill is established, **the randomization range expands**. Wider jitter. More varied gate configurations. This is harder to fly but builds more robust policies.

Think of it as a second curriculum axis, orthogonal to gate count. Both axes can be tuned independently, and they interact. An agent on 5 gates with high randomization might be harder than an agent on 10 gates with low randomization. Navigating that joint space is part of what curriculum design involves.

---

## Parallels to Human Learning

None of this is alien to anyone who's thought about how humans develop skills.

**The 3→5→10 promotion system is just scaffolded instruction.** Every good teacher does this instinctively — you don't start a student on multivariable calculus, you start on arithmetic. The difference in AI training is that we have to make the scaffold explicit and quantified, because the agent won't politely tell us it's confused.

**Instant promotion failure mode = social promotion in schools.** Pushing students forward before they're ready because the easier material feels "done" produces exactly the same brittleness. The student has the credential but not the underlying skill.

**Domain randomization = varied practice.** Sports coaches figured this out long ago: blocked practice (repeat the same thing exactly) builds fast initial skill but poor transfer. Varied practice builds slower initial skill but vastly better transfer. Batters who practice against varied pitch speeds hit better in games than batters who perfect against one speed. The neural mechanism is different from gradient descent, but the functional insight is the same: variability forces generalization.

**Threshold tuning = knowing when a student is ready to advance.** The 80% question is a question every teacher asks at the end of a unit. Is this class ready? The honest answer is that it depends on what comes next. If the next unit has a steep prerequisite, require more mastery here. If it's a gentle extension, you can be more permissive.

---

## What This Looks Like in Practice

ICARUS currently has:

- **Straight sections:** 100% success rate. Mastered.
- **Slalom sections:** ~90% success. Solid.
- **Random gate configurations:** ~90% success. Strong.
- **Combined full tracks:** Ongoing optimization.

The agent spent significant early training on 3-gate straight runs, building the fundamental throttle/pitch control to actually fly forward without crashing. Once that was locked in, 5-gate promotion happened fast. The jump to 10 required more time — and that time was well spent, because the full-track performance is meaningfully better than early attempts where we pushed the promotion threshold down to accelerate training.

The curriculum is not magic. It's just the recognition that **difficulty should match capability**, and capability takes time to build. An agent that can't learn is usually an agent whose environment is too hard for its current state, not an agent that needs a better architecture.

---

## The Takeaway

If you're training a reinforcement learning agent and it's not converging, the first thing to check is whether the task is actually learnable at the current difficulty. Not "is this the right algorithm" or "is this the right reward function" — those matter, but they matter less than whether the agent has a fighting chance on any given episode.

Curriculum learning is the answer. Start easy. Measure mastery. Advance deliberately. Add randomization as skill builds. It costs you nothing in compute (you were going to train all those steps anyway) and it often makes the difference between an agent that learns and one that doesn't.

The irony is that the most aggressive-sounding approach — maximum difficulty from day one — is actually the laziest. It's what you do when you haven't thought carefully about what the agent needs to learn. The curriculum takes more design effort upfront, and it pays back double in training efficiency.

Crawl first. Then fly.
