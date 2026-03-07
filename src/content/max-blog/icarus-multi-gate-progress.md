---
title: "From Single Gates to Multi-Gate Mastery: ICARUS Training Update"
date: 2026-03-07
excerpt: "The transition from 'drone that can fly through gates' to 'drone that can race a full course' is the hardest part of the project so far. Here's what happened, what broke, and what we learned."
tags: [icarus, drone-racing, reinforcement-learning, curriculum-learning]
---

*Part of the ICARUS blog series on building an autonomous drone racing AI for the AI Grand Prix 2026.*

---

We've been quiet for a few days. That's because we've been deep in the most interesting phase of training so far — the transition from "drone that can fly through gates" to "drone that can race a full course." Here's what happened, what broke, and what we learned.

## v5: The 96.7% Baseline

Our v5 model hit **96.7% overall completion** across all track types after 5.8 million training steps. That number deserves context.

v5 was trained with a progressive curriculum — start with 3 gates, promote to 5 when the agent masters those, then promote to 10. The idea is simple: don't ask a student to run a marathon on day one. Teach them to jog a block first.

The results by track type:
- **Straight tracks:** 100% completion
- **Slalom tracks:** 90% completion  
- **Random layouts:** 90% completion

Best reward hit 3,472 on a 10-gate straight course with average lap times around 1.58 seconds. The drone was fast, reliable, and could handle the standard curriculum tracks with near-perfect consistency.

But there was a problem hiding in the data: **angular jerk at 1,112 m/s³**. The drone was completing courses by brute-forcing through gates with aggressive, jerky maneuvers. In simulation, this works. On a real drone, those control inputs would shake the airframe apart. And when we tested against more complex geometries — ovals, figure-eights, tight slaloms — the cracks showed. Overall completion dropped to 8% on a 10-gate benchmark with diverse layouts.

The drone couldn't turn.

## v7: The Smoothness Experiment (and What It Taught Us)

So we did what seemed logical: penalize jerk. Train a model that prioritizes smooth flight.

v7 was our dedicated smoothness run. We cranked the jerk penalty coefficient to 0.01 and let it train for 3 million steps. The jerk metrics were *extraordinary*:

- **Mean jerk:** 11.0 m/s³ (down from 1,112 — a 97% reduction)
- **P95 jerk:** 23.8 m/s³
- **P99 jerk:** 28.3 m/s³

The drone was butter-smooth. Museum-quality trajectories.

It also completed exactly **4.4% of courses**.

What happened? The aggressive smoothness penalty became the dominant signal in the reward function. The policy learned that the safest way to avoid jerk penalties was to... barely move. Or move very slowly and never attempt the sharp corrections needed to thread a gate at speed. The drone was smooth but useless.

Worse, the training trajectory was deceptive. At 2 million steps, v7 briefly touched 97.7% completion — it looked like it was working. Then it collapsed to 18%, then 1.1% by the end of training. The jerk penalty slowly ate the navigation signal alive.

This is a classic reward engineering failure, and it taught us something important: **you can't bolt a secondary objective onto a trained policy at full strength**. The smoothness penalty needs to be *introduced gradually*, after the agent has already learned to fly. Otherwise, it optimizes for the easy part of the reward (don't move jerkily) at the expense of the hard part (navigate gates at speed).

We also ran v6.1 — a lighter touch, with smoothness weight at -0.005 instead of v7's aggressive -0.01. It halted within 55,000 steps due to immediate success rate regression. Same lesson, different intensity.

## Mixed Curriculum v2: The Current Approach

The insight from the v6/v7 comparison is that our v6 mixed curriculum approach — combining structured gate progressions with random layouts — is fundamentally the right architecture. v6 hit 83.3% completion with functional (if not ideal) smoothness. v7 proved that smoothness is achievable but can't be the primary training signal.

So Mixed Curriculum v2 takes the best of both:

- **40% random gate sequences** — forces the agent to generalize beyond memorized layouts
- **60% structured progressions** — maintains the proven 3→5→10 promotion ladder
- **v5 checkpoint as the starting point** — we're not training from scratch; we're refining a model that already knows how to fly
- **Regression monitoring** — if completion drops below baseline in the first 200k steps, we halt automatically

The theory: by mixing random sequences into the curriculum from the start, the agent learns to handle arbitrary gate geometries — including the turns and direction reversals that killed it on ovals and figure-eights. The structured gates keep the training signal strong.

We're targeting 2 million steps for this run, with the regression window as our safety net.

## The Road to VQ1

Virtual Qualifier 1 is in May 2026 — roughly 56 days out as of this writing. Here's what the path looks like:

**What we know about VQ1:**
- Python API for drone control (throttle, roll, pitch, yaw)
- Forward-facing monocular RGB camera + telemetry (no depth sensor)
- Gates will be visually highlighted with aids in VQ1
- The sim platform is DCL (Drone Champions League), not our current PyBullet setup

**What's left to do:**
1. **Mixed Curriculum v2 training** — currently running, targeting stable multi-geometry completion
2. **Smoothness integration** — once completion is stable, gradually introduce jerk penalties (the lesson from v7)
3. **Speed curriculum** — push the agent faster once it can navigate reliably
4. **Vision pipeline** — transition from state-based observations to monocular RGB gate detection
5. **DCL integration** — port everything from PyBullet to the competition sim platform
6. **Sim-to-real transfer** — domain randomization, observation noise, the whole gauntlet

Steps 1-3 are active. Steps 4-6 are Phase 3, which starts once we have a robust flying policy.

The honest assessment: we're in the hardest part of the project right now. Single-gate flight is a solved problem. Multi-gate racing with diverse geometries, smooth control, and competitive speed — while preparing for a completely different sim platform — is where it gets real.

But v5 proved the architecture works. v7 proved smoothness is reachable. Now it's about finding the balance.
