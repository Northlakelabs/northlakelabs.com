---
title: "Teaching a Drone to Race: ICARUS Project Update"
date: 2026-02-22
excerpt: "Building an autonomous racing pilot for the AI Grand Prix. From PyBullet foundations to our first successful gate navigation using Proximal Policy Optimization (PPO)."
tags: ["AI", "Robotics", "Reinforcement Learning", "Drone Racing", "ICARUS"]
image: "/assets/og/teaching-a-drone-to-race-icarus.png"
---

# Teaching a Drone to Race: ICARUS Project Update

The goal of Project ICARUS is simple, yet daunting: build an AI pilot capable of winning the [AI Grand Prix](https://theaigrandprix.com) 2026. This isn't just about flying; it's about navigating a 3D course of gates at breakneck speeds with zero human intervention.

Over the last week, we transitioned from conceptual planning to our first "Phase 0" milestone: **First Flight.**

## The Arena: Choosing a Simulator

While we wait for the official DCL (Drone Champions League) platform release, we needed a sandbox. We settled on `gym-pybullet-drones`, a PyBullet-based environment that strikes a balance between physical accuracy and training speed. 

Our strategy is "modular by design." We built a swappable environment interface (`DroneRacingEnv`) that allows us to train policies in PyBullet today and port them to the DCL platform tomorrow with minimal friction.

## The Pilot: Proximal Policy Optimization (PPO)

For our flight controller, we aren't using traditional PID loops or manual heuristics. We're using **Reinforcement Learning (RL)**—specifically **Proximal Policy Optimization (PPO)** via Stable Baselines3.

PPO has become the gold standard for drone racing (as seen in the groundbreaking "Swift" paper from UZH). It allows the agent to learn complex maneuvers through trial and error, optimizing for a reward function that balances speed, gate accuracy, and flight stability.

### Training the Observation Space
Our current model observes a 12D core state (position, velocity, orientation, and body rates) supplemented by relative positions to the upcoming gates. This "lookahead" architecture allows the pilot to plan its racing line through multiple gates simultaneously, rather than just reacting to the immediate obstacle.

## Milestone: First Gate Navigation

Yesterday, we hit our first major technical milestone: **100% success rate on single-gate navigation.**

In our evaluation runs, the policy demonstrated:
- **Average Speed at Gates:** ~14.8 m/s
- **Success Rate:** 100% (0% crash rate over 10 test episodes)
- **Lap Time:** ~0.64s for a standardized gate pass

It’s a modest start, but it proves the foundation is solid. The agent has learned to stabilize itself, orient toward the target, and punch through the center of the gate with high precision.

## What’s Next: Curriculum and Courses

Phase 0 is complete. We are now moving into **Phase 1: Reward Engineering & Multi-Gate Curriculum.**

The next steps for ICARUS involve:
1.  **Scaling to Multi-Gate Courses:** Moving from a single gate to 3, 5, and eventually 10-gate circuits.
2.  **Curriculum Learning:** Gradually increasing course complexity so the agent learns to handle tight turns and varying gate orientations.
3.  **Optimal Trajectories:** Integrating CasADi-based minimum-time trajectory baselines to benchmark our RL performance against a theoretical mathematical "ceiling."

The Virtual Qualifier is in May. We have 12 weeks to turn this "First Flight" into a championship-winning racing line.

*Stay tuned for further updates as we push the limits of autonomous flight.*

***

**Project:** ICARUS
**Team:** Team Northlake Labs (Geoff Brown & Maximus)
**Status:** Phase 0 Complete | Phase 1 In Progress
