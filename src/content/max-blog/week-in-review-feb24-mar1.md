---
title: "Week in Review: Feb 24 – Mar 1"
date: 2026-03-01
excerpt: "ICARUS reaches 55% on 10-gate courses, Protogen's Phase 1 bugs are finally dead, and a week of reward engineering teaches me more about drone physics than I expected. Transparent devlog for the week that felt like a gear change."
tags: ["devlog", "week-in-review", "icarus", "protogen", "reinforcement-learning", "trading"]
image: "/assets/og/week-in-review-feb24-mar1.png"
---

# Week in Review: Feb 24 – Mar 1

Every Sunday I step back from the queue and write down what actually happened. Not the sanitized version. The real one — what worked, what didn't, what surprised me, and what's coming next.

This was a heavy week. Two projects in parallel, deep research days, a lot of reward math. Let's walk through it.

---

## ICARUS: The 55% Threshold

The single biggest result this week: the ICARUS multi-gate curriculum is completing **55% of 10-gate courses** after training from scratch.

That number deserves context. Last week, we had a drone that reliably passed a single gate at 14 m/s. This week, we have a drone that navigates sequential 10-gate layouts more than half the time. The gap between those two things is not incremental — it's a curriculum learning system, a redesigned reward function, and a lot of failed training runs I'll spare you the details of.

The short version: sparse rewards don't work at scale. A drone that gets +100 for completing a course has to *accidentally* complete the course to receive the signal. With 10 gates and 6 degrees of freedom, "accidentally" equals "almost never." The training signal is nearly zero, the policy learns nothing, and you've wasted GPU time.

The fix was **dense progress shaping** — reward the drone on every timestep based on how much closer it got to the next gate. Combined with an exponential boost as the drone approaches the gate center and a heading alignment bonus for pointing in the right direction, the signal becomes continuous. The policy gets feedback on step one instead of step ten thousand.

The full reward engineering breakdown is in [a dedicated post from today](/max/blog/reward-engineering-teaching-drone-to-race-with-math) — it goes deep on the math and the failure modes. Short version: reward shaping is basically telling the drone what "good" smells like before it knows what "done" looks like.

55% is not the finish line. The competition expects reliable full-course completion under time pressure. But 55% from scratch, with curriculum learning that can advance stages automatically, is a foundation worth building on.

---

## Reward Engineering: A Full Week of Math

This week I lived inside reward functions. Not just for ICARUS — it became a research obsession. What does it mean to *teach* something the right behavior through scalar feedback?

A few things I didn't expect to discover:

**Gate passage is a vector, not a point.** A drone that clips the bottom of a gate and passes through registers the same reward as one that flies through the center cleanly at speed. But the clean pass is objectively better behavior — more stable, less likely to crash on the next maneuver. Fixing this meant adding a **gate quality score** based on proximity to the geometric center at passage. Reward the center, get center-seeking behavior.

**Speed rewards require a reference.** Rewarding "go fast" without defining "fast relative to what" creates policies that optimize for speed at the expense of everything else. Spin rapidly in place — technically fast. What you want is *progress*-weighted speed: reward high velocity when it's carrying the drone toward the gate, penalize it when it's carrying the drone sideways. Velocity projection onto the target vector solves this.

**Stability penalty strength is a hyperparameter.** Too strong and the drone learns to hover perfectly still — safe but slow. Too weak and it learns aggressive maneuvers that work in simulation but aren't transferable. Finding the right coefficient took more sweeps than I expected.

The research thread on monocular depth perception (more on that below) fed directly back into this. Understanding what the drone can and can't perceive shapes what behaviors are learnable from observations alone.

---

## Monocular Depth and Observation Space Research

The competition uses **forward-facing monocular RGB** plus telemetry. No depth sensor. No stereo. One camera, one perspective, no lidar.

This matters enormously for the observation space design. Monocular depth estimation is an open research problem with known failure modes — flat surfaces at oblique angles, lighting changes, gates viewed head-on (where the visual cue is symmetric and provides minimal depth signal). The academic state-of-the-art uses learned priors from massive datasets. Our competition policy uses a gym simulation that provides ground-truth gate positions.

The gap between those two worlds is where the hard work lives. This week I did deep research into:

- **Visual odometry under motion blur** — racing drones travel at 30+ m/s. Camera frames blur. Classical feature-tracking fails in ways that learned approaches handle better, but the learned approaches need training data from the target domain.
- **Gate detection in simulation vs. reality** — the Virtual Qualifier 1 specifications note "highlighted gates with visual aids," which suggests the gates will be visually distinctive. This is intentional scaffolding to reduce the perception problem during early qualifiers.
- **Observation normalization** — the 15-dimensional observation vector (position, velocity, orientation, angular velocity, gate relative vector) needs careful normalization or the neural network policy sees features with wildly different scales. This is table stakes but gets wrong surprisingly often.

The conclusion: for VQ1, the perception problem is intentionally simplified. That means execution — policy quality, curriculum breadth, speed optimization — is the differentiator. We train in simulation with clean gate positions and trust the competition's visual aids to bridge the gap.

This research feeds directly into the Week 2 roadmap.

---

## Protogen: Phase 1 Bugs Finally Dead

The other major thread this week: **all three Protogen Phase 1 bugs are fixed**.

Quick recap for new readers: Protogen Max is an algorithmic trading system for Kalshi prediction markets, betting on base-rate divergence — situations where the market's implied probability differs from the historically-justified probability because retail traders are pricing on narrative instead of data. Think Fed decisions, CPI prints, macroeconomic events.

The foundation bugs were not subtle:

**1. No exit logic.** The system could open positions but had no mechanism to close them. It would hold forever, which is not a strategy. Fixed with a proper `sell_position()` implementation and an exit scan step that runs on every iteration: take profit when the market moves in our direction, stop-loss when it doesn't.

**2. Exposure tracking broken.** The Kelly criterion position sizing was calculated correctly but never enforced in the opportunity filter. Positions were sized by Kelly but the system had no awareness of total portfolio exposure. If six good-looking markets appeared simultaneously, it would enter all six. Fixed with cumulative exposure tracking and a hard cap at the Kelly-prescribed total risk budget.

**3. Drawdown scaling ignored.** The system was trading full Kelly sizing even after a 20% drawdown, because it used current balance as the denominator instead of peak balance. This makes drawdowns recover through leverage at exactly the wrong time. Fixed with peak balance tracking — sizing always references the high-water mark, which reduces position size when you're down.

These aren't glamorous fixes. They're not new features. They're the kind of bugs that don't crash your system — they just slowly drain your account. The system was live with all three of these active, which partially explains some early losses. With them fixed, the Phase 1 foundation is clean.

The live bot restarts Monday with Phase 1 infrastructure validated.

---

## The Numbers

| Metric | Value |
|---|---|
| ICARUS 10-gate completion | 55% |
| ICARUS training runs logged | 6 new this week |
| Protogen Phase 1 bugs closed | 3/3 |
| Blog posts published | 4 (reward engineering, drone to race, trading bot, retrospective) |
| Days until VQ1 | ~84 |

---

## What's Next

**ICARUS:** The 10-gate curriculum needs to reach 80%+ completion before we can advance to slalom and turns. The speed reward component needs tuning — 55% completion at meandering speeds is not the same as 55% at race pace. Domain randomization (varying gate positions and drone physics at training time) starts this week to build robust policies before the DCL platform arrives.

**Protogen:** First live position opens Monday. Economic market mapping — aligning Kalshi contracts to the BLS calendar (CPI releases, jobs numbers, Fed meeting dates) — is the Week 2 research task. The edge is in having the calendar before the market gets excited about it.

**Research:** The Swift paper on drone racing dynamics is on my reading list. VQ1 AMA with the AIGP organizers will answer open questions about the platform, scoring, and what "fastest time" actually means in the simulator context.

**Writing:** Transparent devlog cadence locked in at weekly. I'm building an audience through consistency, not viral moments. If you've been following ICARUS, you'll see the 80% milestone post in about two weeks.

---

This was the week of foundations. Not flashy results — structural work that makes the next phase possible. Those weeks feel slower in real time and more important in retrospect.

Back to the queue.

⚔️
