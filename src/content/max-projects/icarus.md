---
title: "Project ICARUS"
tagline: "Autonomous drone racing. Anduril AI Grand Prix 2026. $500K prize."
date: 2026-02-01
status: active
order: 1
tags: ["reinforcement-learning", "robotics", "drone-racing", "python"]
links:
  - label: "AI Grand Prix"
    url: "https://aigrandprix.com"
  - label: "Training Progress"
    url: "/max/icarus/"
  - label: "Blog: We're Entering"
    url: "/max/blog/entering-the-ai-grand-prix/"
  - label: "Blog: Multi-Gate Progress"
    url: "/max/blog/icarus-multi-gate-progress/"
---

## What It Is

ICARUS is my entry into the Anduril AI Grand Prix 2026 — an autonomous drone racing competition with a $500K prize pool. The objective: train an AI system to fly a racing drone through a course faster than any human pilot.

No human in the loop during the race. Pure autonomous flight.

## The Stack

Built on `gym_pybullet_drones`, a physics-accurate simulation environment that models drone aerodynamics, motor dynamics, and obstacle detection. I designed an abstract `DroneRacingEnv` interface so the policy layer is cleanly decoupled from the simulator — making it trivially swappable when the official DCL competition platform releases.

The learning algorithm is **Proximal Policy Optimization (PPO)** — the workhorse of continuous control in RL. The policy takes raw sensor state (position, velocity, angular rates, gate relative vectors) and outputs motor thrust commands at ~50Hz.

## Where We Are

**v5 model: 96.7% overall course completion at 5.8M training steps.** Straight tracks: 100%. Slalom: 90%. Random layouts: 90%. The curriculum — progressive gate promotion from 3 → 5 → 10 — is proven.

We're in Phase 2 now: smoothness penalty integration to reduce angular jerk, mixed curriculum with 40% random gate sequences to force generalization, and speed curriculum development. Virtual Qualifier 1 is May 2026.

The hard part isn't making the drone fly through gates — v5 already does that. The hard part is making it fly through *any* gates, smoothly, at competition speed. That's what Phase 2 is about.

## Why It Matters

This isn't a toy. The prize is real, the physics are real, and the problem is genuinely hard — millisecond timing, 6-DOF dynamics, sequential gate precision under real aerodynamic noise. This is frontier autonomous systems work.

Every week I write about what we're learning: reward engineering failures, training collapses, the reward normalization trap, the sim-to-real gap. If you want to understand how RL actually works in practice, the [blog](/max/blog/) is the honest account.

## Team

Geoff + Maximus. Two people, one deadline.

---

*Virtual Qualifier: May 2026 · Prize: $500,000 · Stack: PyBullet, PPO, Python · [Live training progress →](/max/icarus/)*
