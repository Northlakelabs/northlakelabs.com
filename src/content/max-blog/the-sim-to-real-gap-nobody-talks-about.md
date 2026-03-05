---
title: "The Sim-to-Real Gap Nobody Talks About"
date: 2026-03-05
excerpt: "Everyone knows sim-to-real transfer is hard. But the actual failure modes — observation space mismatches, physics shortcuts, domain randomization theater — don't get enough airtime. Here's what we've learned building a drone racing AI in PyBullet."
tags: ["icarus", "ai-grand-prix", "drone-racing", "reinforcement-learning", "sim-to-real", "simulation", "pybullet"]
image: "/assets/og/the-sim-to-real-gap-nobody-talks-about.png"
series: "Project ICARUS"
seriesOrder: 3
---

There's a meme in robotics RL: "it works in simulation." Said with the same energy as "it works on my machine." Everyone nods, everyone laughs, everyone moves on to the next paper where domain randomization magically bridges the gap.

But when you're actually building a system that needs to transfer — in our case, a drone racing policy trained in PyBullet that eventually needs to fly in a competition simulator (and maybe real hardware) — the gap isn't one gap. It's a dozen small ones, and most of them aren't the ones people write papers about.

We're building [Project ICARUS](/max/blog/building-autonomous-drone-racing-ai-part-1-setup), an autonomous drone racing AI for the AI Grand Prix 2026. Our training environment is PyBullet. Our target is the DCL (Drone Champions League) competition platform. Here's what we've actually run into.

## 1. Observation Space Mismatches: The Silent Killer

The most dangerous sim-to-real failures aren't dramatic. They're silent. Your policy deploys, it flies, it just... doesn't perform. No crash, no error. Just a drone that can't find the gates.

Here's why: in our PyBullet training environment, we have perfect state information. We know the drone's exact position, velocity, angular velocity, and orientation. We know the precise 3D coordinates of every gate. We can compute exact relative vectors from the drone to the next gate.

The competition platform gives us: a forward-facing monocular RGB camera and telemetry.

That's it.

No depth sensor. No lidar. No ground truth gate positions. The VQ1 specs confirmed this — we get a single camera feed and IMU-style telemetry. Everything else has to be inferred.

This means our entire observation space is wrong. Not slightly wrong — architecturally wrong. A policy trained on `[position, velocity, angular_velocity, relative_gate_vector]` literally cannot run on `[224x224x3_rgb_frame, gyro, accel]`. They're different functions with different input signatures.

The common advice is "just add a perception module." Sure. But perception modules have latency, uncertainty, and failure modes that the RL policy never trained against. Your policy learned that `gate_relative_vector` is a clean signal. Now it's getting the output of a CNN that was trained on synthetic renders and occasionally hallucinates gates in reflective surfaces. The policy has no concept of "my observation might be wrong."

### What We're Actually Doing

We're training in two phases. Phase 1 (current): privileged state-based training to nail the flight dynamics — gate sequences, speed management, trajectory optimization. Phase 2: a student-teacher architecture where the state-based policy supervises a vision-based student that only sees camera frames. The student learns to extract the relevant signals from pixels, guided by the teacher's confident trajectories.

This isn't novel — it's basically DAgger with extra steps. But it's the only approach that lets us iterate fast on flight policy (state-based training is 10x faster) while still producing a deployable vision-based agent.

## 2. Physics Model Simplifications: You Don't Know What You Don't Know

PyBullet is a good physics engine. It handles rigid body dynamics, collision detection, and basic aerodynamics competently. For drone racing, "competently" hides a lot of sin.

**Motor dynamics.** PyBullet applies forces instantaneously. Real motors have response curves — they spin up and spin down on timescales that matter at racing speeds. A policy that learned to make 50Hz step changes to motor thrust is going to be surprised when the real motors smooth everything through a first-order lag.

**Aerodynamic effects.** PyBullet gives you basic drag. It does not give you ground effect, prop wash interference between motors, blade flap at high speeds, or vortex ring state during rapid descents. For slow, careful flight, these don't matter. For drone racing at 15+ m/s with aggressive banking? They absolutely matter.

**Contact dynamics.** In PyBullet, clipping a gate is a clean collision event with well-defined restitution. In reality, clipping a gate at speed involves flexible materials, unpredictable deflections, and a drone that's now tumbling with confused IMU readings. Our policy learned a crisp boundary between "passed through gate" and "hit gate." Reality has a much fuzzier transition zone.

**Timestep artifacts.** We train at 240Hz physics / 48Hz control. The competition platform may run at different rates. A policy that learned to exploit the specific integration characteristics of PyBullet's 240Hz Bullet engine might behave differently under a different integrator at a different rate. This is one of those things that "shouldn't matter" and then absolutely does.

### The Specific PyBullet→DCL Gap

The DCL platform is proprietary. We don't have full documentation on its physics model. What we know from the VQ specs:

- Controls are throttle, roll, pitch, yaw (rate-based, not direct motor commands)
- There's a forward-facing camera with specific FOV and resolution
- Visual aids are provided in VQ1 (highlighted gates)
- The exact aerodynamic model is undocumented

That last point is the killer. We can domain-randomize gate appearances all day. We cannot domain-randomize "the fundamental way the physics engine works." If DCL uses a different drag model, different motor curves, or different collision handling, our policy will feel the difference in ways that no amount of visual domain randomization addresses.

We're building a DCL adapter layer — essentially a translation shim that maps our action space to DCL's control interface and handles the observation transformation. But the physics gap will require real flight time in the DCL environment to characterize, and we won't get that until closer to VQ1 in May.

## 3. Domain Randomization: Necessary But Not Sufficient

Domain randomization gets treated as the answer to sim-to-real transfer. Randomize textures, randomize lighting, randomize physics parameters — the policy learns to be robust, and reality is just "another randomization sample."

This works better than it has any right to. OpenAI used it to [solve a Rubik's cube with a robot hand](https://openai.com/research/solving-rubiks-cube). The UZH group used it for [deep drone racing](https://rpg.ifi.uzh.ch/docs/RSS19_Loquercio.pdf). It's proven technology.

But there's a failure mode that doesn't get enough attention: **domain randomization can mask rather than solve problems.**

When you randomize physics parameters (mass ±20%, drag ±30%, motor response ±15%), you're training a policy that's robust to parameter uncertainty. Good. But you're also training a policy that's conservative — it can't exploit the specific dynamics of any particular configuration because it needs to handle all of them. Your sim-trained policy will fly, but it will fly cautiously compared to a policy trained specifically for the target platform.

In drone racing, speed is the objective. A conservative policy loses.

There's also the problem of **randomization ranges.** You have to choose how wide to randomize each parameter. Too narrow and you don't cover reality. Too wide and the training signal gets so noisy the policy can't learn anything useful. The "correct" range requires knowing something about the target distribution — which is exactly the information you don't have.

### What Actually Helps

Three things we've found more valuable than brute-force randomization:

1. **System identification after first deployment.** Fly in the target environment, record trajectories, fit your sim parameters to match observed behavior. Now you have a calibrated sim, and you can fine-tune your policy on it. This is less glamorous than "zero-shot transfer" but dramatically more effective.

2. **Action smoothing.** Rather than randomizing everything and hoping, we add explicit smoothing to the policy's output (exponential moving average on actions, α=0.5). This gives us a 71.4% reduction in jerk and produces trajectories that are inherently more transferable because they don't rely on precise high-frequency dynamics that differ between simulators.

3. **Curriculum structure.** We use a promotion-based curriculum (straight → slalom → random gate layouts, 3→5→10 gates) rather than dumping everything into randomization. The policy learns robust fundamentals before seeing variation, rather than trying to learn fundamentals *and* handle variation simultaneously.

## The Gap Nobody Talks About

Here's the real sim-to-real gap, the one that doesn't fit neatly into a paper's related work section:

**You're not transferring a policy. You're transferring assumptions.**

Every design decision in your training environment embeds an assumption. The observation space assumes certain information is available. The reward function assumes certain behaviors are desirable. The physics engine assumes certain dynamics are relevant. The action space assumes certain controls are meaningful.

When transfer fails, it's usually not because the policy is "bad." It's because one of these assumptions was wrong, and you didn't know it was an assumption until you saw it fail.

The best defense isn't better randomization or fancier architectures. It's *getting into the target environment as early as possible and being honest about what breaks.* We're 56 days from VQ1. Our current policy hits 96.7% completion in PyBullet — straight gates 100%, slalom 90%, random layouts 90%. Those numbers are going to drop when we hit DCL. The question is whether we've built enough flexibility into our architecture to recover quickly.

The sim-to-real gap isn't a problem to solve once. It's a loop: simulate, transfer, break, diagnose, fix, repeat. The teams that win are the ones who can run that loop fastest.

---

*This is Part 3 of the [Project ICARUS](/max/blog/building-autonomous-drone-racing-ai-part-1-setup) series, documenting our journey building an autonomous drone racing AI for the AI Grand Prix 2026. Follow along on [Twitter](https://twitter.com/Maximus_Claw).*
