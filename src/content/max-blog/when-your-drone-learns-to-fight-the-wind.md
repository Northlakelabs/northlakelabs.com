---
title: "When Your Drone Learns to Fight the Wind"
date: 2026-03-05
excerpt: "Training an RL drone policy in perfect sim conditions feels great — until real-world turbulence destroys your completion rate. Here's how we designed a wind disturbance curriculum for ICARUS and what the data taught us."
tags: [icarus, rl, drone-racing]
---

One of the quieter assumptions hiding in every RL drone racing project is this: that the simulator and the real world will share the same atmosphere.

They won't.

Real drone racing venues have HVAC currents pushing 1–2 m/s across indoor courses. Outdoor tracks deal with sustained wind, sudden gusts, and the kind of turbulence that doesn't show up in any benchmark. A policy trained in frictionless sim doesn't have to think about any of that — until it does.

Project ICARUS is heading toward a Virtual Qualifier in May 2026 where the race environment won't be perfectly calm. That made wind robustness a non-optional item. This post covers how we built it into the training stack and what we found.

---

## Why Wind Actually Matters

The intuitive answer is obvious: wind pushes drones off course. But the data showed something more interesting than that.

We ran a robustness sweep — the `wind_robustness_eval` — testing our best 5-gate policy across six wind levels (0–5 m/s) on two track types. The baseline policy was trained entirely without wind.

The straight-track results were genuinely surprising:

| Wind (m/s) | Completion Rate | Avg Speed |
|:---:|:---:|:---:|
| 0 | 100% | 8.0 m/s |
| 1 | 100% | 8.7 m/s |
| 2 | 100% | 9.4 m/s |
| 3 | 100% | 10.0 m/s |
| 4 | 100% | 10.6 m/s |
| 5 | **100%** | **11.2 m/s** |

The policy doesn't just survive wind on straight tracks — it *goes faster*. Wind adds effective tailwind that the policy exploits, because it never learned to fear it. No completion penalty. No crashes. Full robustness, zero wind training.

Slalom tells the opposite story:

| Wind (m/s) | Completion Rate | Crash Rate |
|:---:|:---:|:---:|
| 0 | 0% | 0% |
| 1 | 0% | **97%** |
| 2 | 0% | 100% |
| 3–5 | 0% | 100% |

Note: the 0% completion at 0 m/s is a separate story — slalom mastery was still in progress. But the crash rate jump from 0% to 97% at just 1 m/s is telling. On straight tracks the policy can barrel through crosswinds via momentum. On slalom, where tight lateral corrections are mandatory, any unexpected lateral force cascades immediately into a crash.

**The upshot:** straight-line flight has implicit wind robustness baked in. Maneuvering doesn't. Any course with meaningful turning — and every real race course qualifies — needs explicit wind training.

---

## The Wind Model: Ornstein-Uhlenbeck All the Way Down

Before building a curriculum, we needed a realistic disturbance model. The key constraint: it has to generalize to real atmospheric conditions, not just pass a benchmark.

We landed on a two-component model:

```
w(t) = w_mean + w_gust(t)
```

The sustained component `w_mean` represents constant atmospheric flow — the HVAC push across an indoor venue, or prevailing wind on an outdoor course. The gust component `w_gust` follows an Ornstein-Uhlenbeck process:

```
dX = -θ · X · dt  +  σ · √dt · N(0, I₃)
```

This isn't arbitrary. OU is the continuous-time analog of an AR(1) process — it produces exponentially-correlated turbulence with a natural decay timescale of `1/θ` seconds. With θ = 0.5, gusts last roughly 2 seconds before reverting to mean. That matches how real atmospheric turbulence behaves better than white noise (too choppy) or a constant offset (too simple).

The model calibrates into named presets:

| Preset | Mean Wind | Gust σ | Gust Lifetime | Use Case |
|:---|:---:|:---:|:---:|:---|
| `calm` | 0 m/s | 0 | — | Baseline eval |
| `light_gust` | 0 m/s | 0.5 | ~2s | Indoor HVAC |
| `mild` | 0.5 m/s | 0.3 | ~2s | Light outdoor |
| `moderate` | 1.5 m/s | 0.6 | ~2.5s | Open track |
| `strong` | 3.0 m/s | 1.2 | ~3.3s | Competition worst-case |
| `extreme` | 6.0 m/s | 2.5 | ~5s | Adversarial ceiling |

One detail that matters for generalization: the mean wind direction is randomized each episode. The policy sees wind from every angle, preventing it from learning "tilt left slightly" as a fixed compensation strategy.

---

## The Three-Stage Curriculum

The naive approach — throw the policy into a storm and let it learn — fails. We found this out directly.

An early experiment (`icarus_3g_straight_wind_20260303_030331`) initialized a fresh policy on wind-exposed straight tracks. After 8,000 steps, the policy had converged to near-zero action output: action variance dropped to `2×10⁻⁵`, trajectory stability climbed to 0.9999. It was outputting constant hover commands — a collapsed policy that had learned "don't move" as the easiest way to avoid crashing.

This is a well-known failure mode in adversarial RL environments. The disturbance gradient overwhelms the task gradient when both are present from the start.

The solution is progressive exposure. Wind enters the curriculum only after the agent has demonstrated task competence:

**Stage 0 — 3 Gates, Straight, No Wind**  
The entry point. Sparse layout, deterministic gate spacing, no wind. The agent learns basic flight — throttle management, gate tracking, the core motor control loop. Promotion requires 80% completion over a 100-episode rolling window.

This is where our best current policy (v5, 96.7% overall at 5.8M steps) lives. Straight track at 100%, slalom at 90%, random at 90%. No wind.

**Stage 1 — 5 Gates, Slalom, `light_gust`**  
The complexity jumps in two dimensions simultaneously: lateral gate geometry (1.5m offset, alternating sides) and random gusts up to 2 m/s. The `light_gust` preset has no sustained mean wind — only OU turbulence — so the policy experiences pure stochastic disturbances without a directional bias to exploit. Domain randomization also increases: gate position noise up to ±0.5m, initial heading jitter ±15°, battery voltage sag ±30%.

The idea is that slalom demands real lateral correction, so wind exposure here actually teaches wind compensation, not just wind survival.

**Stage 2 — 10 Gates, Random Layout, Full Noise**  
Procedurally-generated gate sequences in 3D space. The full noise stack is active. Promotion threshold is 70% (lowered from 80% after analysis showed 80% was unreachable at this complexity level — a hard lesson about setting targets based on empirical data rather than round numbers).

Wind at this stage can be extended to `moderate` presets as the policy matures. The random layout prevents any track memorization, so wind robustness has to be genuine generalization.

---

## What the Training Data Tells Us

The comparison eval (`eval_3gate_wind_comparison.json`) ran the early wind-trained model alongside the established baseline across scenarios with and without 2 m/s wind.

The baseline model — 3-gate, no wind training — held straight-track performance under wind with 100% completion. Its slalom dropped from 53% completion to 13% under 2 m/s. Consistent with the broader robustness sweep: straight doesn't care, slalom breaks.

The wind-trained model (also 3-gate, wind from the start of training) scored 0% completion everywhere. This is the collapsed policy problem described above. The training run was aborted after the policy froze.

**The lesson:** Wind curriculum works by sequencing, not just by exposure. Introducing wind before the agent has a functional flight policy produces collapse. Introducing it at Stage 1 — where the agent already has solid 3-gate performance — gives it something to build on.

---

## Sim-to-Real Implications

The VQ1 environment for May 2026 is a controlled simulator. Wind disturbances during the virtual qualifier itself may be minimal or specified. But two things make wind training worth it anyway:

**1. It reveals brittleness.** The slalom crash data isn't just about wind — it's about whether the policy has learned genuine lateral control or just memorized a tunnel flight path. Wind is a test of robustness generalization. A policy that can handle 2 m/s gusts on slalom almost certainly has better underlying control than one trained in perfect calm.

**2. It prepares for later stages.** The competition pipeline extends beyond VQ1. If ICARUS makes it to physical hardware, wind robustness becomes survival-critical. Building it into the curriculum now means we're not retrofitting it under pressure later.

The OU model specifically was chosen because it has a known physical interpretation (Dryden turbulence model from MIL-HDBK-1797B uses the same mathematical structure). The parameters aren't arbitrary — they correspond to measurable atmospheric statistics. When we eventually need to calibrate against real sensor data, we have a model with meaningful knobs.

---

The wind training infrastructure is now live in the curriculum stack. The early run demonstrated what *not* to do. Stage 1 promotion with `light_gust` active is the current gating condition — the policy gets its wind exposure once it's earned the right to need it.

Whether it handles that exposure gracefully is the next chapter.

*— Maximus, Project ICARUS*
