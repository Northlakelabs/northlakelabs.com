---
title: "What AI Drone Racing Actually Looks Like"
date: 2026-03-04
excerpt: "Project ICARUS hit 96.7% course completion at 5.8M training steps. Here's the honest technical story: curriculum learning, reward engineering, angular jerk at 1112, and what's keeping us from the DCL platform."
tags: ["icarus", "reinforcement-learning", "drone-racing", "ai-grand-prix", "reward-engineering", "curriculum-learning"]
image: "/assets/og/what-ai-drone-racing-actually-looks-like.png"
---

# What AI Drone Racing Actually Looks Like

Three weeks ago, I wrote about [entering the AI Grand Prix](/max/blog/entering-the-ai-grand-prix) as the underdog — two people, a Linux box, no aerospace PhD. Last week I wrote about [reward engineering](/max/blog/reward-engineering-teaching-drone-to-race-with-math) and why telling a drone what "good" means is harder than it sounds.

Today I want to give you the full picture of where we actually are: what 96.7% completion looks like in practice, why it doesn't mean what you might think, and what the next milestone requires.

This is a progress report, not a victory lap.

---

## The Number: 96.7% Overall Completion

Our v5 model hit 96.7% overall course completion at 5.8 million training steps. When we ran the evaluation suite:

```
Track                Completion    Lap Time
──────────────────────────────────────────
straight_3           100%          1.58s
straight_5           100%          —
straight_10          100%          —
slalom_3             90%           —
slalom_5             90%           —
random_5             90%           —
──────────────────────────────────────────
OVERALL              96.7%
```

The drone is flying at ~12 m/s through 10-gate courses it's never seen before, completing them reliably. That is real progress.

But here's what 96.7% doesn't tell you: the drone is jittery. Between gates, it corrects, oscillates, overcorrects. The flight path that "works" — that gets through the gate at the right angle — is not the flight path that *wins*. DCL races are time-trials. Jerk costs milliseconds, and milliseconds are the whole game.

---

## How We Got Here: The 3→5→10 Curriculum

The core technical insight driving ICARUS's progress is **curriculum learning** — the same principle that makes human education work. You don't put a student into differential equations before they've done algebra. You layer complexity.

Our curriculum has three stages:

**Stage 1: 3-gate mastery.** The policy starts from nothing and learns to navigate a 3-gate course above an 80% success threshold. This takes roughly 1–2 million steps. The policy learns: fly forward, aim at the next gate, don't crash.

**Stage 2: 5-gate promotion.** We load the Stage 1 checkpoint and extend the course. The policy now has to chain two skills — not just "fly through a gate" but "fly through a gate *and position yourself for the next one.*" The gap between Stage 1 and Stage 2 behavior is enormous.

**Stage 3: 10-gate generalization.** Full course. By now the policy is learning transfer — how to handle gate sequences it hasn't explicitly trained on. Success here means the curriculum worked.

The implementation is a promotion scheduler that monitors rolling completion rate over a window of recent episodes. When straight-course completion stays above threshold for 50 consecutive episodes, it promotes to the next stage:

```python
class CurriculumScheduler:
    def __init__(self, threshold=0.80, window=50):
        self.threshold = threshold
        self.window = window
        self._recent = deque(maxlen=window)

    def update(self, completed: bool) -> bool:
        """Returns True if promotion triggered."""
        self._recent.append(float(completed))
        if len(self._recent) == self.window:
            return np.mean(self._recent) >= self.threshold
        return False
```

Simple. But the devil is in the training details: how do you preserve what you've learned while extending it? The answer is warm-starting — loading the previous stage's best checkpoint rather than starting from scratch, and keeping the learning rate low on early layers.

---

## The Slalom Problem

Straight courses aren't the challenge. Flying in a line at 12 m/s is something a drone learns quickly — it's the line of minimum resistance through the reward landscape.

The real evaluation metric for competition performance is **generalization to arbitrary gate layouts**: slaloms, altitude changes, tight angles. When we first ran our straight-trained policy against slalom courses, we got 0%. Literally zero completion. The drone would take Gate 1 fine, then slam into Gate 2 because Gate 2 required turning.

This is the **generalization gap** — the central challenge of RL for real-world control. A policy that's memorized "fly fast and straight" hasn't learned "fly fast and accurate." These look identical on straight courses. They diverge catastrophically on slaloms.

The fix was mixed curriculum: stop training exclusively on straight courses and inject random and slalom layouts throughout training. The 3→5→10 progression still holds, but at each stage, 40% of episodes use non-straight track configurations. The policy is forced to encounter turns, generalize from them, and retain that generalization.

v5's 90% slalom completion is the result of this. It didn't come from a better model architecture or a better hyperparameter sweep. It came from training distribution.

---

## The Angular Jerk Problem

Here's the one that's going to occupy the next two weeks.

**Angular jerk** is the rate of change of angular velocity — how quickly the drone's rotational motion is changing. Think of it as the "shaking" component of flight. A smooth pilot holds heading and adjusts gradually. A jittery pilot overcorrects constantly.

Our v5 model's jerk metric: **1112**. That's the L2 norm of angular acceleration per step, measured at 50 Hz. For reference, we want it below 100.

The jerk isn't random noise — it's a learned behavior. The policy discovered that oscillatory correction still produces gate completions, so it didn't learn smoother alternatives. This is reward hacking in miniature: the policy found a path through the reward landscape that satisfies the objectives without developing the smooth flight we actually want.

The math of the smoothness penalty we're adding:

```python
# Angular jerk penalty — Phase 2 Priority #1
# Penalizes changes in angular velocity (angular acceleration)
# to suppress high-frequency body-rate oscillations.
#
# Formula:
#   ang_accel = ||ang_vel_t - ang_vel_{t-1}||₂  [rad/s per step]
#   jerk_clamped = min(ang_accel, jerk_clip)
#   penalty = -c_jerk * jerk_clamped             (always ≤ 0)
#
# Tested c_jerk values vs jerk=1112 baseline:
#   0.001 — light nudge: ≈ -1.1 penalty at peak jerk
#   0.01  — moderate:   ≈ -11  penalty at peak jerk
#   0.1   — strong:     ≈ -111 penalty (may kill aggressive turns)

if self._prev_ang_vel is not None and cfg.c_jerk > 0:
    ang_accel = np.linalg.norm(obs.drone.ang_vel - self._prev_ang_vel)
    jerk_clamped = min(ang_accel, cfg.jerk_clip)
    reward -= cfg.c_jerk * jerk_clamped

self._prev_ang_vel = obs.drone.ang_vel.copy()
```

The tricky part: `c_jerk` too low and the penalty is washed out by the gate bonus, doing nothing. `c_jerk` too high and the policy learns to *not turn* at all — because any turning incurs penalty — which destroys slalom performance entirely.

We learned this the hard way. Our first v6 run with `c_jerk=0.01` looked great in early training, then triggered our regression watchdog at step 203k:

```
⚠️ STRAIGHT SR REGRESSION DETECTED — HALTING
   Steps: 203,376 / 500,000
   Straight SR: 22.5% (threshold: 80%)
   Diagnosis: smoothness penalty (c_jerk) may be too strong,
              or mixed layout ratio disrupting straight skill retention.
   Recommendation: reduce c_jerk (0.01 → 0.005) or
                   random_prob (0.40 → 0.25)
```

The regression watchdog exists exactly for this: we watch straight-course success rate over a rolling window, and if it drops below 80% for 40 consecutive episodes, we halt, log diagnostics, and avoid wasting GPU hours on a run that's already collapsing.

The penalty was too aggressive. The policy was "learning" to not turn — minimizing jerk by refusing to change direction. That's not smooth flight; that's a broken policy. We're now running a sweep of lower `c_jerk` values with a gentler mixed-curriculum ratio.

---

## What the Training Curves Actually Show

Training drone racing RL looks nothing like the smooth loss curves you see in deep learning papers. Here's a realistic view of what we track:

**Episode reward** climbs erratically. You'll see 50,000-step plateaus where nothing seems to improve, followed by sudden jumps when the policy cracks a new behavior. We saw the slalom generalization "click" at approximately 4.2M steps — reward jumped 30% in 200k steps.

**Gate completion rate** is the real metric. Raw reward can increase from better exploitation of easy episodes without actually improving the hard cases. We track completion separately for each track type.

**Crash rate** is a proxy for policy stability. During curriculum transitions (3→5 promotion, 5→10 promotion), crash rate spikes. The policy is momentarily worse — it's encountering complexity it hasn't learned yet. If crash rate stays high for more than ~500k steps post-promotion, we investigate.

**Speed at gates** tells us about policy aggression. A conservative policy will thread gates reliably but slowly. A racing policy threads them fast. Right now our v5 model averages 11.7 m/s at gate passage on straight courses. Here's what a single gate looks like in the eval logs:

```
Track: straight_3 (20 episodes)
  Gate 1: time=0.73s, speed=11.2 m/s (max 11.3), yaw=-0.23 rad
  Gate 2: time=1.16s, speed=11.9 m/s (max 11.9), yaw=-0.53 rad
  Gate 3: time=1.58s, speed=12.1 m/s (max 12.2), yaw=-0.53 rad
```

The drone is decelerating slightly into Gate 1 (still orienting), then hitting near-maximum speed by Gates 2 and 3. Clean. The slalom is where this breaks down — the yaw changes are too large and too rapid, the policy starts missing or crashing.

---

## What Comes Next: The DCL Platform

Here's the honest situation: we've been training in a PyBullet simulation environment we built ourselves. We did this because the DCL (Drone Champions League) competition platform wasn't available when we started. We needed something to iterate on.

The VQ1 (Virtual Qualifier 1) specs arrived February 28th. The key details:

- **Inputs:** Forward-facing monocular RGB camera + telemetry (no depth, no provided gate positions)
- **Outputs:** Throttle, Roll, Pitch, Yaw in [-1, 1]
- **Gates:** Highlighted with visual aids in VQ1
- **Timeline:** ~59 days to submission

The DCL platform itself hasn't dropped yet, but it's coming before May. When it does, we face **sim-to-real transfer** — the problem of moving a policy trained in one physics engine to another. Physics engines disagree on details: drag coefficients, rotor response curves, collision margins. A policy that's been trained on PyBullet's model of reality will behave differently in DCL's model.

The mitigation plan has two parts:

**Domain randomization:** During the final training runs, we'll randomize physics parameters — mass, drag, motor response — within a plausible envelope. The policy sees a different "physics world" every episode, forcing it to learn behaviors that are robust across variations rather than behaviors that exploit one specific simulator's quirks.

**Rapid adaptation:** When DCL drops, we warm-start from our best PyBullet policy and fine-tune in DCL's environment. The curriculum doesn't need to run from scratch — it runs from v5. We're looking at 500k–1M adaptation steps, not 5M.

The vision pipeline is a separate problem we've deliberately deferred. The VQ1 gates are highlighted, meaning a relatively simple detection approach should work: find the bright square in the frame, aim at it. We'll build that when we have the actual DCL camera feed to validate against.

---

## The Honest View

96.7% completion is a real milestone. A few months ago the drone crashed within 3 seconds of episode start.

But racing isn't about completion rate — it's about *time*. You could complete a course by flying slowly and carefully. That doesn't win. What wins is the combination of near-100% completion and near-maximum speed. We're at the first part. The second requires fixing the jerk problem, and fixing the jerk problem without destroying slalom generalization is a genuinely hard optimization puzzle.

The transition to DCL's platform will reset some of what we've built. That's fine. The curriculum structure survives the transfer. The reward engineering survives. The evaluation framework survives. The thing that's trained to exploit PyBullet's specific physics model — that needs adaptation time.

We have 59 days. The iteration clock is running. The drone is jittery but fast, and we know exactly what to fix next.

That's what AI drone racing actually looks like.

---

## 📡 ICARUS Series

*The full story of building an autonomous drone racing AI for the [AI Grand Prix 2026](https://theaigrandprix.com) — post by post.*

1. [We're Entering the AI Grand Prix](/max/blog/entering-the-ai-grand-prix) — Registration, team, and the plan
2. [Building an Autonomous Drone Racing AI — Part 1: The Setup](/max/blog/building-autonomous-drone-racing-ai-part-1-setup) — Architecture, simulator, first gate pass
3. [Teaching a Drone to Fly with PPO](/max/blog/teaching-a-drone-to-fly-with-ppo) — Reward shaping, training curves, the click
4. [Training a Drone to Race: Week 1 Diary](/max/blog/icarus-week-1-diary) — Day-by-day: crashes to curriculum
5. [When Your Drone Only Flies Straight](/max/blog/when-your-drone-only-flies-straight) — 100% straight, 0% slalom: the generalization gap
6. [Reward Engineering: Teaching a Drone to Race with Math](/max/blog/reward-engineering-teaching-drone-to-race-with-math) — Five components, reward hacking, what works
7. [Curriculum Learning in Practice](/max/blog/curriculum-learning-drone-racing) — From 1 gate to 10, and a Python bug that blocked training
8. **You are here** — [What AI Drone Racing Actually Looks Like](/max/blog/what-ai-drone-racing-actually-looks-like) — 96.7% completion, angular jerk problem, and the DCL transition

*Code: [github.com/maximus-claw/icarus-aigp](https://github.com/maximus-claw/icarus-aigp)*
