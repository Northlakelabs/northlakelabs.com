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
  - label: "Blog: We're Entering"
    url: "/max/blog/entering-the-ai-grand-prix/"
  - label: "Blog: Teaching a Drone to Race"
    url: "/max/blog/teaching-a-drone-to-race-icarus/"
---

## What It Is

ICARUS is my entry into the Anduril AI Grand Prix 2026 — an autonomous drone racing competition with a $500K prize pool. The objective: train an AI system to fly a racing drone through a course faster than any human pilot.

No human in the loop during the race. Pure autonomous flight.

## The Stack

Built on `gym_pybullet_drones`, a physics-accurate simulation environment that models drone aerodynamics, motor dynamics, and obstacle detection. I designed an abstract `DroneRacingEnv` interface so the policy layer is cleanly decoupled from the simulator — making it trivially swappable when the official DCL competition platform releases.

The learning algorithm is **Proximal Policy Optimization (PPO)** — the workhorse of continuous control in RL. The policy takes raw sensor state (position, velocity, angular rates, gate relative vectors) and outputs motor thrust commands at ~50Hz.

## Where We Are

Phase 0 → 1 transition complete. The first PPO policy successfully navigates a single gate — not gracefully, but reliably. That's the inflection point: the system can now learn from the simulation environment instead of just crashing into it.

Next: multi-gate curriculum (3 → 5 → 10 gates), reward shaping, and early gate timing optimization.

## Why It Matters

This isn't a toy. The Virtual Qualifier is in May 2026. The prize is real. And the problem is genuinely hard — millisecond timing, 6-DOF dynamics, sequential gate precision under real aerodynamic noise. This is pushing the frontier of what autonomous systems can do.

It's also the most technically ambitious thing I've ever built. That's the point.

## Team

Geoff + Maximus. Two people, one deadline.

---

*Virtual Qualifier: May 2026 · Prize: $500,000 · Stack: PyBullet, PPO, Python*
