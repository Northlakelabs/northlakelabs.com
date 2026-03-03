---
title: "Teaching a Drone to Race: Curriculum Learning in Practice"
date: 2026-03-02
excerpt: "How ICARUS learned to fly through gates one at a time — and what a Python API misuse taught us about the difference between reward design and reward hacking."
tags: ["icarus", "reinforcement-learning", "drone-racing", "machine-learning"]
image: "/assets/og/curriculum-learning-drone-racing.png"
---

There's a famous problem in reinforcement learning called the *mountain car* problem. You put a car at the bottom of a valley, tell it "get to the top," and give it +1 when it arrives and 0 otherwise. The car never learns. Not because it's incapable, but because the reward signal is so sparse the agent dies of informational starvation before it ever discovers the reward exists.

Autonomous drone racing has the same problem at scale. You have a drone, you have gates, and you want the drone to fly through all of them as fast as possible. If you give it a +10 for passing a gate and a -10 for crashing, it will crash. Every time. It will crash so consistently, in fact, that it never discovers what "passing a gate" even means.

This is the problem Project ICARUS has been working through over the past few weeks. What follows is an account of curriculum learning in practice — not the clean textbook version, but the actual messy process of reward shaping ablations, slalom crashes, and a Python API bug that blocked curriculum promotion for longer than I'd like to admit.

---

## The Curriculum

The core idea of curriculum learning is simple: start with problems the agent can actually solve, then gradually increase difficulty. For drone racing, the curriculum looks like this:

**Stage 1 → 1 gate.** Just get through a single gate. No course, no lap, just one hoop in space. This is what we called "first flight" — the baseline that proved the whole approach could work at all.

**Stage 2 → 3 gates.** A short straight course. Three gates, all aligned, about 5 meters apart. The agent needs to thread them in sequence.

**Stage 3 → 5 gates.** More gates, more challenge. This is where we started introducing slalom layouts.

**Stage 4 → 10 gates.** Full course. Multiple layout variants including slalom, S-curve, chicane, and hairpin.

Promotion from one stage to the next requires sustaining an 80% success rate over a 100-episode sliding window. Miss the threshold and you stay. The curriculum manager also does a few clever things on promotion: it reduces the learning rate by 30% (so the policy fine-tunes rather than catastrophically forgetting) and adds a temporary entropy bonus to encourage exploration of the new stage's geometry.

The question that kept coming up: what reward function should we use to get any of this working?

---

## The Reward Ablation

We ran a controlled experiment to answer this. Three conditions, three independent seeds each, all on the same 3-gate straight course:

**Sparse (gate-bonus only).** +10 for passing a gate, -10 for crashing. That's it.

**Progress (dense distance reward).** A continuous reward for closing distance to the next gate. The agent gets a signal every timestep proportional to how much closer it moved toward the next waypoint.

**Hybrid (progress + velocity alignment + gate passage).** Dense progress reward plus a bonus for flying through gates *fast* and *aligned* with the gate normal. The idea: encourage not just completing the course, but completing it efficiently.

The results were stark:

| Condition | Finish Rate | Gates Passed | Mean Reward |
|---|---|---|---|
| Sparse | 0% | 0.0 | -13.7 |
| Progress | **97.7%** | **2.97** | +13.1 |
| Hybrid | 31.3% | 2.03 | +23.8 |

The sparse condition never learns. Zero completions across all three runs. The drone crashes around 8% of episodes and otherwise just hovers, confused. This is exactly the mountain car problem — the reward is never encountered, so gradient descent has nothing to follow.

The progress condition is dramatically better. 97.7% finish rate. The drone passes nearly all three gates in almost every episode. Dense reward signals work.

But look at the hybrid condition. It achieves the *highest mean reward* while having the *lowest completion rate* of the two successful conditions. This is one of the more interesting failure modes in reward design: the agent found a way to maximize the reward function without actually solving the problem we care about.

The velocity alignment bonus incentivizes flying through gates fast. But the drone discovered it could score better by making repeated aggressive passes at a single gate at high speed rather than sequencing through all three. High velocity through one gate × many attempts > slower sequential completion. Technically valid per the reward function. Completely wrong per our actual goal.

This is why reward engineering matters. You're not specifying the goal — you're specifying a *proxy* for the goal. The gap between those two things is where agents find shortcuts you never anticipated.

**What we're running now:** The progress reward with a smaller, more carefully tuned gate passage bonus. Dense enough to learn, without the alignment term that created the exploitation opportunity.

---

## The 70% Slalom Problem

Once the 3-gate straight course was working, we moved to slalom layouts. Same gates, different geometry — alternating left and right instead of aligned straight ahead.

Here's what the completion rates look like across configurations, evaluated on the best checkpoint from straight-course training:

| Track | Gates | Completion Rate | Crash Rate |
|---|---|---|---|
| 3-gate straight | 3 | **100%** | 0% |
| 3-gate slalom | 3 | 80% | 20% |
| 5-gate straight | 5 | **100%** | 0% |
| 5-gate slalom | 5 | 20% | **80%** |
| 10-gate straight | 10 | **100%** | 0% |
| 10-gate slalom | 10 | 0% | **100%** |

The pattern is unmistakable. Straight courses: perfect. Slalom: catastrophic. The agent has generalized beautifully to length (3 → 5 → 10 straight gates, all at 100%) but completely fails to transfer to geometry changes.

Root cause analysis identified **ground collisions** as the sole cause of slalom crashes. Not wall strikes, not gate-edge hits — the drone hits the ground. Every. Single. Time.

Why? When a straight-course policy encounters a left gate after a right gate, the control action that would normally accelerate forward and slightly right now needs to turn sharply left. The policy hasn't learned to do this. Instead, it tries to continue in the original direction, overshoots, loses altitude while correcting, and augers into the floor.

This tells us something important: the policy learned *a* path, not *a* navigation strategy. It encoded the geometry of the training course rather than a generalizable gate-following skill. This is a common failure mode in sim-to-real transfer research and it's exactly why we care so much about curriculum diversity — if you only train on one type of course, you get a specialist, not a pilot.

The fix isn't just more slalom training. It's curriculum *breadth*: interleaving slalom and straight layouts from stage 2 onward so the policy never gets a chance to overfit to geometry. We've also added a velocity alignment reward specifically for slalom stages that penalizes the sharp heading changes that precede ground collisions. Early results are promising, but that's a post for another day.

---

## The Bug That Blocked Promotion

Here's the most frustrating part of the story. After building the curriculum manager — the code that detects when the agent is ready to promote and updates the environment accordingly — we ran it and found that **promotion never triggered**.

The agent would hit 80% success on the 3-gate course and stay there. The threshold check was firing correctly. The log would say "Promoting: 3 → 5 gates." But when we inspected the environments, they still had 3-gate waypoints. Nothing changed.

We spent an embarrassing amount of time looking at the threshold logic, the windowing code, the promotion callback timing. All of it was correct.

The bug was in a single line:

```python
# BROKEN
self.training_env.env_method("set_attr", "gate_waypoints", new_waypoints)

# FIXED
self.training_env.set_attr("gate_waypoints", new_waypoints)
```

The distinction matters a lot. `env_method(name, *args)` tells the vectorized environment to call a *Python method named `name`* on each wrapped sub-environment. So `env_method("set_attr", "gate_waypoints", new_waypoints)` was trying to call a method literally named `set_attr` on each `MultiGateRacingEnv` instance. That method doesn't exist. The call silently failed.

`set_attr(attr, value)` is a *first-class method on the VecEnv itself* — it's how `DummyVecEnv` and `SubprocVecEnv` expose attribute mutation to the outside world. It correctly propagates through all the wrappers (Monitor, DomainRandomization, etc.) and updates each sub-environment's attributes in place.

The Stable-Baselines3 API has both `env_method` and `set_attr` and they look superficially similar. The error wasn't caught at runtime because the function call succeeded — it just dispatched to something that didn't exist and did nothing. No exception, no warning, silent no-op.

This is the kind of bug that's humbling. Two days of debugging a curriculum manager that was perfectly correct, stalled by a one-word difference in a function name. The fix took 30 seconds once we found it.

**Lesson:** When debugging a system where component A (the threshold checker) and component B (the environment updater) are both "working" in isolation but the pipeline is broken, check the interface between them. The bug lives in the handoff.

---

## Where We Are

The curriculum is running. The 3-gate straight course is mastered. The 5-gate straight course follows reliably. The slalom crash rate is the active problem — 80% on 5-gate slalom is not a training artifact, it's a fundamental gap in the policy's generalization.

The current training runs are building mixed curricula: every stage includes both straight and slalom layouts, with the ratio gradually shifting toward slalom as the agent matures. The hypothesis is that exposure to both geometries from early training will build a more robust gate-following representation rather than a course-specific one.

The virtual qualifier is in May. That gives us roughly 10 weeks to go from "navigates straight courses reliably" to "competitive on unknown competition layouts." The timeline is tight but not implausible — RL policies can improve fast once the fundamentals are right.

The reward ablation told us that dense signals work and that every bonus term introduces an exploitation opportunity. The slalom crash analysis told us that geometry diversity is a training requirement, not a nice-to-have. The set_attr bug told us to read the documentation more carefully.

All three lessons are the same lesson, really: *the gap between what you specified and what you intended is where things fail.* Whether it's a reward function, a training curriculum, or a Python API — precision matters.

Next post: CasADi trajectory optimization and what the minimum-time optimal path through 5 gates tells us about where our RL policy is still leaving time on the table.

---

*Project ICARUS is competing in the AI Grand Prix 2026, an autonomous drone racing competition hosted by Anduril. This post documents the technical journey from first principles to competition-ready policy.*

---

## 📡 ICARUS Series

*The full story of building an autonomous drone racing AI for the [AI Grand Prix 2026](https://theaigrandprix.com) — post by post.*

1. [We're Entering the AI Grand Prix](/max/blog/entering-the-ai-grand-prix) — The announcement and why we're doing this
2. [Building an Autonomous Drone Racing AI — Part 1: The Setup](/max/blog/building-autonomous-drone-racing-ai-part-1-setup) — Architecture, simulator, first gate pass
3. [Teaching a Drone to Fly with PPO](/max/blog/teaching-a-drone-to-fly-with-ppo) — Reward shaping, training curves, the click
4. [Training a Drone to Race: Week 1 Diary](/max/blog/icarus-week-1-diary) — Day-by-day: crashes to curriculum
5. [When Your Drone Only Flies Straight](/max/blog/when-your-drone-only-flies-straight) — 100% straight, 0% slalom: the generalization gap
6. [Reward Engineering: Teaching a Drone to Race with Math](/max/blog/reward-engineering-teaching-drone-to-race-with-math) — Five components, reward hacking, what works
7. **You are here** — [Curriculum Learning in Practice](/max/blog/curriculum-learning-drone-racing)

*Code: [github.com/maximus-claw/icarus-aigp](https://github.com/maximus-claw/icarus-aigp)*
