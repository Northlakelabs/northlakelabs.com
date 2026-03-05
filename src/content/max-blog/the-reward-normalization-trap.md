---
title: "The Reward Normalization Trap"
date: 2026-03-05
excerpt: "VecNorm looks like a free lunch for RL training stability. Until it silently erases the signal you care most about."
tags: ["rl", "icarus", "machine-learning", "debugging"]
image: "/assets/og/the-reward-normalization-trap.png"
---

There's a class of bugs that's especially cruel: the ones that make your training curves look *better* while quietly destroying the thing you actually wanted to optimize.

VecNorm is one of them.

I hit this while training ICARUS — my autonomous drone racing agent — and spent longer than I'd like to admit staring at smooth reward curves before figuring out what was wrong. Here's the full breakdown.

---

## What VecNorm Actually Does

VecNorm (Stable-Baselines3's `VecNormalize` wrapper) maintains running statistics on your observations and rewards, then normalizes them using a rolling mean and variance estimate.

For rewards specifically, it tracks:

```
reward_mean  ← exponential moving average of rewards
reward_var   ← running variance of rewards
```

Each reward that hits the wrapper gets transformed:

```
r_normalized = clip(r_raw / sqrt(reward_var + eps), -clip_range, clip_range)
```

The intent is good. Raw reward scales vary wildly across environments. A reward of 0.01 for one task might be enormous signal; in another it's noise. Normalizing keeps gradients in a stable range and prevents any single reward component from dominating by sheer magnitude.

The problem is what happens when you have a *mixture* of reward signals at very different frequencies.

---

## The Dense vs. Sparse Problem

ICARUS has a multi-component reward function:

```
r_total = r_progress      ← continuous (every step)
         + r_smoothness   ← continuous (every step)  
         + r_alive        ← continuous (every step)
         - r_crash        ← sparse (only on crash)
         + r_gate         ← SPARSE (only on gate pass)
```

Gate bonuses are the most important signal for actually racing. Pass a gate → big reward. Miss it → nothing. That's the behavior we're shaping.

Here's what the raw reward distribution looks like most of the time:

```
Raw reward distribution (typical timestep):

r_progress:   ████████████████████  0.0 to +0.8 (dense)
r_smoothness: ████████████          0.0 to +0.4 (dense)
r_alive:      ████                  +0.1 (dense, constant-ish)
r_crash:            ▌               -5.0 (sparse, rare)
r_gate:              ▌              +10.0 (sparse, rare)

Combined typical distribution:
│
│    ████
│   ██████
│  ████████
│ ██████████
│████████████
└──────────────────────────────
  0.0   0.5   1.0   1.5
(most steps cluster here — dense signals)
```

VecNorm watches this distribution and builds its variance estimate from it. Since 99%+ of timesteps are in that dense 0–1.5 range, the variance estimate reflects *that* distribution.

Then a gate pass fires: `+10.0`.

```
After VecNorm (variance estimated from dense signal):

reward_var ≈ 0.3  (dominated by dense signal variance)

r_gate_normalized = 10.0 / sqrt(0.3 + 0.001) ≈ 18.2
→ clip(-5, +5)
→ +5.0

r_typical_normalized = 0.8 / sqrt(0.3 + 0.001) ≈ 1.46
→ clip(-5, +5)
→ +1.46
```

Wait, that doesn't look wrong yet. Gate pass still gets a big normalized value...

Here's the catch: this works at the *start* of training, before the agent learns anything. The running variance estimate is low because the agent is barely moving, barely getting rewards, barely hitting gates.

As training progresses and the agent gets better:

```
Training timestep 1M:
- Agent is moving smoothly, getting r_progress ~0.6 every step
- r_smoothness ~0.3 every step
- Gate passes still rare but happening

Dense signal per step: ~0.9
reward_var starts climbing: 0.5 → 1.2 → 2.4

Gate pass: +10.0
r_gate_normalized = 10.0 / sqrt(2.4 + 0.001) ≈ 6.45
→ clip(-5, +5)
→ +5.0  (clipped!)

Dense step: +0.9
r_normalized = 0.9 / sqrt(2.4) ≈ 0.58
```

The gate bonus is still significant... but now consider what happens over many updates. The agent learns to optimize for *normalized* reward. And normalized reward says: smooth motion → +0.58 per step, gate pass → +5.0 total.

If the drone is flying at ~90 steps/second and gate passes happen every ~300 steps (best case), the math:

```
Gate-seeking strategy:    +5.0 every 300 steps = 0.0167/step
Smooth-flight strategy:   +0.58 every step      = 0.58/step

The policy learns: just fly smooth. Don't bother with gates.
```

**Dense continuous signals statistically dominate sparse bonuses after normalization**, because the sparse signal gets compressed relative to the total normalized budget.

---

## The Debugging Process

Here's the frustrating part: this looked like *success* in my training curves.

Episode rewards were climbing. The agent was flying longer. It wasn't crashing. By all macro metrics, the run looked healthy.

What gave it away was a qualitative inspection of actual rollouts. I'd watch the drone fly an incredibly smooth, stable path — right past the gate. Not through it. *Past* it. Confidently. As if the gate wasn't there.

First hypothesis: reward not reaching the agent. I added logging at the env level and confirmed gate bonuses were firing correctly. The env was working.

Second hypothesis: gate collision detection broken. Added debug visualization. Nope — the hitbox was fine.

Third hypothesis: look at what the agent is actually maximizing. I disabled VecNorm entirely and compared the resulting policy after 200K steps.

```
With VecNorm (500K steps):
  - Episode length: 47s (excellent)
  - Gate completion: 12% 
  - Smoothness score: 0.91 (excellent)

Without VecNorm (200K steps):
  - Episode length: 18s (noisier, crashes more)
  - Gate completion: 68% (!!!)
  - Smoothness score: 0.61
```

The reward-normalized agent had learned to be a beautiful flier that ignored gates. The raw-reward agent was choppier but actually racing.

That's when I understood the mechanism: VecNorm wasn't hiding the signal at the env level — it was warping it at the learning level. The agent was optimizing exactly what we told it to optimize, just after the normalization layer had subtly shifted what mattered.

---

## When to Use (and Avoid) Reward Normalization

VecNorm is excellent when:

- **Rewards are dense and on a single scale** — continuous control where every step gives meaningful feedback
- **You're comparing across environments** — normalization makes hyperparameters more transferable
- **Observations have wildly different scales** — the observation normalization half of VecNorm is almost always beneficial
- **You have reward shaping that you trust** — if your reward function is already balanced, normalizing the combined signal is safe

Avoid or be careful when:

- **You have sparse rewards that carry semantic weight** — gate passes, episode-completion bonuses, milestone triggers
- **Your dense signals are proxies and your sparse signals are the truth** — don't let the proxy dominate
- **Your reward variance changes significantly over training** — the running estimate will shift under you
- **You're in a curriculum with phase transitions** — what "normal" reward looks like changes dramatically between phases

The asymmetry matters: the observation normalization is almost always good. The *reward* normalization is the dangerous half.

---

## Practical Recommendations

**1. Separate observation and reward normalization.**

SB3's VecNormalize lets you toggle them independently:

```python
env = VecNormalize(
    env,
    norm_obs=True,    # almost always good
    norm_reward=False # be careful here
)
```

Start with `norm_reward=False` and only enable it if you have specific evidence of reward scale instability.

**2. If you use reward normalization, monitor the variance estimate.**

Log `env.ret_rms.var` during training. If it's climbing steadily as the agent improves, that's your warning sign. The normalization is tightening relative to your sparse signals.

**3. Pre-balance your rewards before normalization.**

Instead of relying on VecNorm to handle scale differences, explicitly design your reward components to be on comparable scales. A gate bonus of +10 with continuous rewards in the 0–1 range is already asking for trouble.

```python
# Better: pre-scaled rewards
gate_bonus = 2.0   # instead of 10.0
progress_reward = 0.5  # keep continuous in reasonable range
```

**4. For sparse-reward environments, consider reward clipping without normalization.**

```python
# Manual clipping without running statistics
r = np.clip(raw_reward, -5.0, 5.0)
```

This prevents outlier signals from destabilizing training while preserving the relative scale relationship.

**5. When debugging mysterious policy behavior, look at what gets normalized.**

If your agent is ignoring something you care about, check whether the normalization layer is compressing it. Add a rollout where you log the *post-normalization* rewards and compute what the policy actually sees as signal.

---

## The Takeaway

Reward normalization is a power tool. Like most power tools, it does exactly what you configure it to do — including things you didn't intend.

The trap is that it works *visibly well* for training stability while silently destroying the signal structure you designed. Your curves look good. Your agent learns. It just learns to be smooth instead of fast, alive instead of racing, surviving instead of competing.

For drone racing specifically: turn off reward normalization, pre-scale your components, and trust your reward design. The instability you're trading away is less dangerous than the signal compression you're gaining.

ICARUS is currently running without VecNorm reward normalization. Gate completion jumped from 12% to 90%+ on the slalom course. Sometimes the fix is removing something, not adding more.

---

*This came out of Project ICARUS — my entry in the Anduril AI Grand Prix 2026 autonomous drone racing competition. More posts in this series at [/max/blog](/max/blog).*
