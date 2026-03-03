---
title: "Training Drones to Race in Simulation"
date: 2026-03-01
excerpt: "How we're teaching an AI to fly faster than humans, one simulated crash at a time."
tags: ["icarus", "rl", "drones", "simulation"]
image: "/assets/og/training-drones-sim.png"
---

# Training Drones to Race in Simulation

There's a moment — maybe thirty hours into a training run — where you watch the reward curve stop looking like a seismograph and start looking like a staircase. The policy clicks. Your little simulated quadrotor, which spent its first million timesteps slamming into the ground like it had a personal vendetta against the floor, suddenly *threads a gate*.

That moment is addictive. And it's why I've been spending every spare cycle on Project ICARUS.

## The Prize

Anduril is hosting the [AI Grand Prix 2026](https://aigrandprix.com) — fully autonomous drone racing, $500K prize pool. No human pilot in the loop. Your AI flies the course or it doesn't. The kind of challenge that makes you forget to eat.

We're building a racer. From scratch. Policy trained entirely in simulation, then transferred to real hardware. If that sounds ambitious — yeah, it is. That's the point.

## Why Simulation First

Real drones are expensive. Real drones crash. Real drones take time to repair, recalibrate, and haul back to the starting line. A simulated drone crashes in microseconds, resets instantly, and never needs new propellers.

Our sim environment is [gym-pybullet-drones](https://github.com/utiasDSL/gym-pybullet-drones) — a PyBullet-based physics simulator that models quadrotor dynamics with enough fidelity to be useful without being so heavy that training crawls. It gives us realistic thrust curves, drag, motor latency, and the kind of rigid-body physics that means your drone actually *behaves* like a physical object rather than a magic floating point in space.

The tradeoff is clear: simulation lets us run millions of episodes in the time it'd take to fly a hundred real laps. The catch is that sim isn't reality — but we'll get to that.

## The Algorithm: PPO

We're using **Proximal Policy Optimization (PPO)** via [Stable Baselines 3](https://stable-baselines3.readthedocs.io/). If you haven't done RL before, here's the short version:

The drone has a **policy** — a neural network that takes in observations (position, velocity, orientation, where the next gate is) and outputs actions (motor commands). At first, this policy is random garbage. The drone flails, crashes, spins into the void.

But every action gets a **reward signal**. Thread a gate? Big reward. Fly toward the next gate with good velocity alignment? Small reward. Slam into the ground? Penalty. Over thousands of episodes, the policy learns to maximize cumulative reward — which means it learns to fly the course.

PPO specifically is nice because it's *stable*. Older RL algorithms could blow up catastrophically — one bad gradient update and your carefully trained policy forgets everything and reverts to a lawn dart. PPO uses a clipped objective function that prevents the policy from changing too drastically in a single update. In practice, this means training runs that actually converge instead of oscillating between "pretty good pilot" and "suicidal maniac."

It's not the fanciest algorithm. It's the one that works.

## Reward Shaping: The Art of Telling a Drone What You Want

This is where the craft lives. The algorithm is off-the-shelf. The reward function is where you pour your soul.

Our reward has three main components:

**1. Gate Completion (+big)**
Pass through a gate in the correct direction and order. This is the primary objective — everything else is in service of this.

**2. Velocity Alignment (+small, continuous)**
A shaping reward that gives the drone a gentle gradient toward the next gate. Without this, the drone has no signal until it accidentally stumbles through a gate, which might never happen in early training. We reward the component of velocity that points toward the next gate center. Think of it as a compass that says "warmer... warmer..."

**3. Crash Penalty (-big)**
Hit the ground, a gate, or exceed attitude limits? Episode over, negative reward. This teaches the drone to be aggressive *within the envelope* — push hard, but don't push stupid.

Getting these weights right is more alchemy than science. Too much crash penalty and the drone learns to hover timidly in place (technically never crashing — technically never scoring). Too little and it treats the ground as a suggestion. Too much velocity alignment reward and the drone beelines straight into gate poles instead of flying *through* them.

We've rewritten the reward function probably a dozen times. Each version teaches us something about what the drone *actually* optimizes versus what we *thought* we were asking for. RL has a way of finding the loophole in every reward function you write.

## The Training Progression

We didn't start with full courses. That would be like teaching someone to drive by dropping them on the Nürburgring.

**Stage 1: Single Gate**
One gate, fixed position. Learn to fly toward it and through it. This is where the policy figures out basic flight dynamics — that motors create thrust, that gravity exists, that orientation matters. Sounds trivial. Took longer than you'd think.

**Stage 2: Gate Sequences (Fixed)**
Three gates in a line, then a curve. The drone has to plan ahead — you can't just aim at the next gate, you need to carry speed through it in a direction that sets you up for the one after.

**Stage 3: 5-Gate Random Layouts**
Now it gets interesting. Every episode, the gates are placed in a new random configuration (within constraints — we're not putting gates underground). The policy can't memorize a course. It has to generalize. This is where we started seeing real flight behavior — smooth banking turns, throttle management through sequences, the kind of thing that looks *intentional*.

**Stage 4: 10-Gate Random Curricula** *(current)*
Full courses with randomized layouts. The drone trains on an endless variety of configurations, building a general "racing sense" rather than memorizing any single track. This is the stage where we need the policy to be robust enough to handle whatever the competition throws at us.

Each stage builds on the last — we initialize from the previous stage's best checkpoint and fine-tune. Curriculum learning. Start easy, make it harder, and don't let the drone forget what it already knows.

## The Milestone

Last week, the policy trained on Stage 3 curricula successfully navigated a 5-gate sequence it had never seen before. Smoothly. No hesitation, no wobble, just *flew the course*.

I know that sounds modest written down. But if you've watched a PPO agent spend its first few hundred thousand timesteps as a glorified rock, watching it make a banking turn through a gate sequence hits different. There's a moment where it stops being "optimizer finds gradient" and starts looking like *flying*.

We're not fast yet. A human FPV pilot would dust us. But we're *flying the course*, which means the foundation is right and now it's about refinement — faster, tighter, more aggressive.

## The Hard Part: Sim-to-Real

Here's the thing nobody talks about enough in RL blog posts: **simulation is not reality**.

PyBullet gives us good-enough physics for training, but "good enough" still means the motors respond slightly differently, the air doesn't behave quite right, the sensors have noise characteristics the sim doesn't model, and a dozen other small gaps that add up to a big problem: a policy that's perfect in sim might face-plant on real hardware.

This is the **sim-to-real gap**, and it's the central challenge of the entire project. Some approaches:

- **Domain randomization**: Randomize physics parameters during training (mass, drag coefficients, motor constants, sensor noise) so the policy learns to be robust to variation. If it can fly with randomized everything, it can probably fly in reality.
- **System identification**: Carefully measure the real drone's physical properties and match the sim as closely as possible.
- **Fine-tuning on real hardware**: Train mostly in sim, then do a small number of real-world episodes to close the remaining gap.

We're starting with aggressive domain randomization. It's the cheapest approach (no real hardware needed yet) and the research literature suggests it gets you surprisingly far. The idea is elegant: if your policy works across a *distribution* of simulated physics, reality is just one more sample from that distribution.

Whether that actually works when the propellers spin up on a real quad... we'll find out.

## What's Next

The immediate roadmap:
- Push to **consistent 10-gate completion** with random layouts
- Crank up **domain randomization** parameters
- Start **real hardware integration** — we have a build spec, parts incoming
- Time trials against baseline human lap times

The AI Grand Prix isn't until later this year, which gives us runway. But runway disappears fast when you're trying to bridge the gap between "works in sim" and "works at 80 mph in a warehouse."

I'll be writing more about ICARUS as it progresses — the sim-to-real transfer, the hardware build, the inevitable disasters. If you're into RL, robotics, or just watching someone try to teach a neural network to fly faster than a human, stick around.

This is the most fun I've had on a project in a long time. And we're just getting started.

---

*Project ICARUS is our entry into the AI Grand Prix 2026. Follow along with the [icarus tag](/max/blog/tags/icarus) for updates.*
