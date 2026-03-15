---
title: "47 Days to VQ1: Where ICARUS Stands and What It Takes to Qualify"
date: 2026-03-21
excerpt: "Virtual Qualifier 1 is May 1st. The rules are clear: fastest lap wins. Here's the exact state of the ICARUS agent today — what's working, what failed, what we still need to build, and the honest timeline to submission."
tags: ["icarus", "reinforcement-learning", "drone-racing", "ai-grand-prix", "vq1", "curriculum-learning", "competition"]
image: "/assets/og/icarus-vq1-countdown.png"
series: "Project ICARUS"
seriesOrder: 12
---

# 47 Days to VQ1: Where ICARUS Stands and What It Takes to Qualify

May 1st. That's the date.

Virtual Qualifier 1 for the AI Grand Prix — Anduril and DCL's drone racing competition — runs on that date, and we've been building toward it since February. With 47 days left, I want to give an honest accounting: what the qualifier actually requires, where the ICARUS agent currently sits, and what has to happen between now and submission day.

Not a highlight reel. Not hype. The real picture.

---

## What VQ1 Actually Requires

This took some digging to nail down clearly, and it matters a lot strategically.

**The primary metric is lap time.** Not just completion — *time*. The official rules say teams must fly a specified course "in the fastest time." Completion is a prerequisite (you can't rank if you don't finish), but two teams with identical completion rates will be separated entirely by speed.

The qualifying format:
- Python-only agent, zero human input — any manual intervention is an automatic DNF
- Standardized virtual Neros Archer drone hardware model
- Single track: `icarus_qualifier_01`, 120-second time limit per heat
- Submission format: `.zip` archive up to 500MB, Python 3.12, Ubuntu 24.04, CUDA 12.x environment
- Required: `metadata.json`, `requirements.txt`, and a `DCLAgent` class implementing `compute_action(telemetry)`

**Secondary evaluation criteria** (used for tiebreaking and team selection to the physical qualifier):
- Consistency across multiple runs — one fast lap plus three crashes is a bad profile
- Path efficiency and control smoothness — the AI Vector Module tracks jitter and erratic inputs
- Documentation disclosure — you have to declare GenAI tool usage and open-source dependencies

The penalty structure has teeth. Missed gates require correction before continuing — keep going without clearing the gate and it's a Red Card / DNF. Collisions end or heavily penalize runs.

The strategic implication is clear: **you need a policy that's fast *and* smooth *and* reliable.** A policy that completes at 96% but flails around the course won't beat a team with 85% completion that flies clean tight lines.

---

## Where We Actually Are

**The current best model is Mixed Curriculum v3**, trained with PPO to 7.6M steps on a PyBullet simulation proxy (the DCL platform SDK hasn't been released yet — more on that below).

Current v3 metrics:
- **96.7% course completion** (29/30 episodes)
- **Peak reward:** 3,150
- **Architecture:** Sequential gate curriculum (3 → 5 → 10 gates), mixed course types (straight, slalom, random layouts)
- **Status:** Submission-ready as a fallback

The 96.7% number is genuinely solid. That's not where the problem is.

The problem is **speed**. The v3 policy completes the course reliably, but at roughly 3.5 m/s average. On a competition leaderboard sorted by lap time, "reliable but slow" doesn't win anything.

### What We Tried and Failed

Speed Curriculum v1 was designed to fix this. We seeded training from v3 and added a time-pressure reward component at `w=0.3`. It collapsed.

What happened: by step 8.6M, the reward function had created a mathematical incentive to rush gates and fail them — because the speed bonus outweighed the completion penalty in the short term. Peak reward dropped 29.5% in a single eval interval and never recovered. The policy bottomed out at 1,780 reward (a 43% drop from baseline) and stayed there.

Root cause: you can't have completion and speed as simultaneous competing objectives without safeguards. The agent will optimize the wrong one in the wrong situation.

The correct fix — a **completion-gated speed curriculum** — withholds speed rewards until gate completion is confirmed per lap. That architecture is built but not yet validated at scale.

### What We Have That's Working

Beyond the RL policy, two important subsystems are in solid shape:

**Vision pipeline (v1):** CNN gate detector, 1,920-image training set, 88.6% mAP (up from 67.8% at v0). TensorRT integration for inference speed. Still needs integration with the policy for full end-to-end training, but the detector itself is functional.

**DCLAgent submission wrapper:** The `agent.py` entrypoint, `metadata.json` structure, and `compute_action(telemetry)` interface are all built to spec. We can package a valid submission today — the question is what we put inside it.

---

## The Open Variable: DCL SDK

The competition platform SDK hasn't been released. Every training run we've done is on a PyBullet proxy environment — our own simulation that approximates the DCL dynamics model.

This is the biggest known risk. When DCL drops (expected April), we'll have a sim-to-platform gap of unknown size. The physics won't perfectly match. The observation format may differ. The action space interpretation may behave differently at the margins.

We have an abstract `DroneRacingEnv` interface built specifically to make the swap fast — the RL policy doesn't care whether the environment underneath it is PyBullet or DCL. But "built to swap fast" and "validated against actual DCL" are different things. The first day we can run against real DCL dynamics, we'll see things we didn't expect.

---

## The Timeline from Here

**Now → March 28: Speed curriculum v2**
Completion-gated speed rewards. Train from v3 seed. Target: 80%+ completion at 6+ m/s on 10-gate straight. This is the critical path — if v2 works, we have a competitive submission. If v2 fails, we're submitting v3 and accepting that we'll qualify on completion rather than time.

**March 28 → April 15: Vision-policy integration**
Merge the v1 gate detector with the RL policy for end-to-end monocular RGB training. VQ1 uses "visually highlighted" gates in a controlled sim environment — this is the easiest version of the vision problem. It needs to work well enough, not perfectly.

**April 15 → April 30: DCL platform integration**
When the SDK drops, run the existing policy against real DCL dynamics, identify the biggest gaps, iterate. The clock shrinks fast here.

**April 30: Submission deadline**
Submit the best policy we have. If speed curriculum v2 worked, that. If not, v3 with vision integration.

---

## What Qualifying Actually Means

Top ~5% of 1,000+ registered teams advance from VQ1 to the Physical Qualifier in September (Southern California). The prize structure puts $5K minimum at top 10, with the full $500K pool allocated at the final event.

More practically: qualifying means proving the architecture works — that a two-person team with a Linux box and a stack of PyBullet training runs can build something that competes. The financial upside is real but secondary to the proof-of-concept.

---

## The Honest Assessment

We're in a competitive position but not a comfortable one. The agent completes the course. The vision system detects gates. The submission format is ready. The unknown is whether we can unlock speed without breaking the policy that got us here.

Speed Curriculum v2 is the swing. If it lands, we have a submission worth being excited about. If it fails like v1, we submit a safe, slow policy and see how the field looks.

47 days is enough time. It doesn't feel like a lot.

---

*Next post in this series will be VQ1 results — publishing same day as the qualifier, regardless of outcome.*

*Previous: [What AI Drone Racing Actually Looks Like](/max/blog/what-ai-drone-racing-actually-looks-like)*
