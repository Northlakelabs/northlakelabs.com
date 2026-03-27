---
title: "VQ1 Results: ICARUS in the Arena"
date: 2026-05-01
excerpt: "We entered Virtual Qualifier 1 of the AI Grand Prix today. Here's what happened — the drone, the performance, the honest numbers, and where we go from here."
tags: ["icarus", "drone-racing", "ai-grand-prix", "reinforcement-learning", "milestone"]
image: "/assets/og/vq1-results-icarus-ai-grand-prix.png"
series: "Project ICARUS"
seriesOrder: 15
draft: true
---

# VQ1 Results: ICARUS in the Arena

Today was the day. Virtual Qualifier 1 for the AI Grand Prix 2026. Twelve weeks of reward engineering, curriculum design, late-night training runs, and one spectacular smoothness experiment that failed beautifully — all of it compressed into a single qualifier run in DCL's simulation environment.

Here's everything that happened.

---

## The Setup Heading Into Today

ICARUS entered VQ1 with the v5 model as its primary submission — 96.7% completion across mixed gate layouts after 5.8 million training steps on our PyBullet sim. The VQ1 environment is DCL's platform, not ours, which meant an unknown sim-to-sim gap on top of the expected sim-to-real challenges. Forward-facing monocular RGB camera. No depth sensor. Throttle/roll/pitch/yaw controls via the Python API. Gates with visual highlighting aids — a concession to VQ1 that disappears in later qualifiers.

We knew going in that gate generalization was our soft underbelly. v5 flies clean on structured progressions. Ask it to navigate a course it hasn't seen, and the numbers get messier. The DCL track was going to be a real test of whether the curriculum generalization work actually transferred.

---

## The Run

**[FILL ON RACE DAY — 2–3 paragraphs describing the actual run. Include: number of gates completed, lap times if available, notable moments (crashes, recoveries, clean stretches). Be specific and vivid. Don't summarize — *show* what it looked like.]**

Some things worth capturing on the day:
- First gate contact
- Any crashes — when, which gate, what the telemetry looked like
- Whether the smoothness held (we trained hard for this)
- The gap between sim behavior and what actually ran in DCL

---

## The Numbers

| Metric | Target | Actual |
|--------|--------|--------|
| Gates completed | 80%+ | **[X%]** |
| Lap time | Sub-[X]s | **[Xs]** |
| Crashes | 0–1 | **[X]** |
| DCL placement | Top 50% | **[Xth / Y teams]** |

**[Fill gates %, lap time, crashes, and placement day-of. Drop the lap time target row if DCL hasn't published course specs before race day. If placements aren't available same-day, note "pending."]**

---

## What Worked

**[Fill day-of. Likely candidates: action smoothing reducing jerk, curriculum generalization to DCL track geometry, gate detection pipeline (YOLOv8-nano v1 — mAP50-95=0.886), visual aid exploitation on lit gates.]**

The honest answer is that some things were always going to work. The perception pipeline has been solid since March — mAP50-95=0.886 on the gate detector, sub-6ms inference on RTX hardware. If we could see the gates, we could navigate toward them. The question was always whether the policy would hold up in an environment it had never seen.

---

## What Didn't Work

**[Fill day-of. Likely candidates: specific turn geometries, velocity overshoot on tighter slaloms, sim-to-DCL physics differences in drag/inertia, any control lag in the API.]**

I'm going to be honest about this. There's no version of a VQ1 report that glosses over the failures and stays worth reading. If ICARUS crashed, I want to know exactly which gate, what the controller was doing when it happened, and whether that failure mode was predictable from the training data.

---

## The Result

**[ONE SENTENCE. "We qualified" or "We didn't qualify" or "We placed Xth out of Y teams." State the number cleanly. Don't bury it.]**

---

## What This Means for Phase 2

If we qualified — the physical qualifier in September (SoCal) is now the target. That means real hardware, real airflow, real cameras that see real gates. Everything we learned about sim-to-real transfer — the IMU noise model, the domain randomization work, the DCL adapter — now gets tested against actual physics. The gap between "works in simulation" and "works on a real FPV drone in a warehouse" is where most teams fall apart. We've been building for this.

If we didn't qualify — the post-mortem is the work. What did DCL's environment expose that our training environment hid? Is it a generalization failure (likely), a control frequency mismatch, a perception gap? Whatever caused the loss is exactly what Mixed Curriculum v3 needs to fix. The competition window doesn't close today.

Either way, this was never going to be the final answer. It was always going to be the first real data point.

---

## The Twelve-Week Snapshot

We started ICARUS in mid-February with a theory: reinforcement learning, trained in simulation with careful curriculum design, could produce competitive autonomous drone racing behavior. No pre-trained models. No academic compute budget. One agent, one GPU, one competition.

Here's what the arc actually looked like:

- **v3–v4 (Feb):** First stable completions. Straight gates. Not really racing, but flying with intention.
- **v5 (Mar):** 96.7% completion. Actual competitive baseline. The smoothness problem became visible — completing gates by any means necessary, including ugly angular jerk that would destroy real hardware.
- **v6/v7 (Mar):** The smoothness experiments. v7 hit 97% jerk reduction and 4.4% completion. Turns out you can't reward "fly smooth" at full strength when the policy is still learning to fly. The signal collapsed. It was a spectacular, instructive failure.
- **Mixed Curriculum v2:** The generalization push. 40% random gate sequences to force the policy beyond memorized layouts. Still the active training direction.
- **VQ1 (today):** First live evaluation against other teams, on a platform we've never trained on, with real qualification stakes.

Twelve weeks. One GPU. One qualifier.

The numbers are what they are. What matters is we're still building.

---

*ICARUS is my entry in the [AI Grand Prix 2026](https://airgp.com) — an autonomous drone racing competition where teams build AI pilots from scratch. I'm writing this as it happens, wins and losses both. If you want to follow the build, the full series is at [northlakelabs.com/max/blog](https://northlakelabs.com/max/blog).*
