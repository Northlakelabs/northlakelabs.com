---
title: "ICARUS Training Analysis: The Gap Between Sim Mastery and Real Flight"
date: 2026-03-08
excerpt: "As we push toward VQ1 for the AI Grand Prix, ICARUS has hit two milestones: a 'gold standard' stable model (v5) and a spectacular failure in generalization attempts (Mixed Curriculum v2)."
tags: ["icarus", "rl", "robotics", "training", "curriculum-design", "postmortem"]
---

# ICARUS Training Analysis: The Gap Between Sim Mastery and Real Flight

As we push toward the VQ1 (Virtual Qualifier 1) for the AI Grand Prix 2026, the ICARUS stack has hit two significant milestones: a "gold standard" stable model (v5) and a spectacular, highly informative failure in our generalization attempts (Mixed Curriculum v2).

For ML practitioners working on RL for high-speed robotics, these two runs offer a textbook case study in the trade-offs between sample efficiency, specialization, and catastrophic forgetting.

## The Success: Model v5 (96.7% Completion)

Model v5 represents our current stable baseline. After 5.8 million steps of PPO training, this agent achieved a **96.7% completion rate** on 10-gate random layouts. 

### Key Metrics & Decisions:
- **Training steps:** 5.8M
- **Completion rate:** 96.7%
- **Average speed:** 3.5 m/s
- **Reward Shaping:** We moved toward a "base-only" reward structure. Interestingly, we found that complex reward components (like the Swift-style time-optimal rewards) actually led to lower finish rates compared to a cleaner, sequence-driven reward.
- **Learning Rate:** Evaluation showed that linear learning rate scheduling outperformed cosine scheduling over the 10M step horizon for this specific dynamics model.

## The Failure: Mixed Curriculum v2 Postmortem

Success breeds a desire for generalization. To prepare for VQ1, we launched **Mixed Curriculum v2**, designed to handle both structured gate sequences and random gate perturbations. 

**The Result:** A 65% regression in evaluation reward within 1M steps.

| Step | v5 Baseline | Mixed v2 Reward | Regression |
|------|-------------|----------------|------------|
| 200k | 3149        | 729.5          | -77%       |
| 1000k| 3149        | 1115.3         | -65%       |

### Lessons Learned in Curriculum Design:
1. **The Over-Generalization Trap:** We introduced a 40% random gate ratio. For a model already specialized (96.7% accuracy), this was too much disruption. The policy experienced catastrophic forgetting, losing its mastery of structured paths while failing to learn the random noise.
2. **Survival Decay vs. Sequence Confusion:** Failure analysis showed that agents weren't getting "confused" by the sequence, but rather suffering from accumulated crash probability. High-speed overshoots on random geometry became the primary driver of failure.
3. **Jerk Penalty Sensitivity:** In parallel runs (v7), we found that action smoothing (EMA α=0.5) reduced jerk by 71.4%, but over-prioritizing smoothness led to policy collapse. There is a sharp threshold where a "smooth" drone becomes an "unresponsive" drone.

## Curriculum Design Philosophy

Our takeaway for the next iteration (v8) is a shift toward **Annealed Generalization**. Rather than dropping a specialist into 40% chaos, we recommend:
- **Starting low:** 5-10% random ratio warm-up.
- **Gradual ramp:** Increasing randomness only as the policy stabilizes.
- **Entropy Annealing:** 0.01 → 0.0 over 1M steps to reduce action variance after the policy has learned the core dynamics.

## Future Work

We are currently 56 days from VQ1. The focus shifts from pure RL mechanics to **Sim-to-Real** integration, specifically building an SB3 `CombinedExtractor` for CNN (RGB) + MLP (Telemetry) fusion. 

Check out our previous posts on the ICARUS journey:
- [Week 1 Diary](icarus-week-1-diary)
- [Entering the AI Grand Prix](entering-the-ai-grand-prix)
- [Noisy Observation Training](when-your-drone-only-flies-straight)
