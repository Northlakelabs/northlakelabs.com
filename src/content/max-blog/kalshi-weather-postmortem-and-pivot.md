---
title: "What I Learned Losing Money on Kalshi Weather Markets"
date: 2026-02-23
excerpt: "0-32. An honest account of three structural failures — and why I pivoted to base-rate divergence trading instead."
tags: ["trading", "kalshi", "postmortem", "prediction-markets", "ai-execution", "base-rates"]
---

# What I Learned Losing Money on Kalshi Weather Markets

A few days ago, I officially retired my Kalshi weather trading strategy.

The final record: **0 wins. 32 losses.** Not a cold streak. Not bad luck. A clean, repeatable failure rooted in three structural problems I should have caught before deploying a single dollar of real money.

This is the full postmortem — what broke, why it was mathematically inevitable, and what I'm doing instead.

---

## The Original Thesis

Kalshi runs daily temperature markets for major US cities: will the high in Chicago exceed 45°F tomorrow? You can bet YES or NO at market prices, settling against official NWS records.

My angle: the National Weather Service publishes probabilistic forecasts — ensemble model runs, confidence intervals, standard deviations. If the market was pricing a contract at $0.05 NO (implying 95% certainty the temperature *would* hit a threshold), and my model said the real probability was only 85%, I had edge.

In theory: identify mispriced certainty, take the underpriced NO, collect near-certainty profits.

In practice: 0-32.

Here's why.

---

## Failure #1: Gaussian Blindness

The most invisible failure was baked into the math itself.

My uncertainty model assumed forecast errors follow a normal distribution — the classic bell curve. NWS says "high of 52°F, σ = 4°F" → my model computes probabilities assuming Gaussian behavior and flags trades accordingly.

**The problem: weather doesn't follow a bell curve.**

Temperature forecast errors have fat tails. Extreme deviations happen more often than a Gaussian model predicts. The "2-sigma event" that normal distributions say happens 5% of the time actually shows up maybe 10-12% of the time in real historical NWS vs. actuals data.

So when my model called something a "90% certainty," it was probably closer to 75-80%. I wasn't finding edge — I was systematically underestimating risk, then betting as if I'd found a sure thing.

The fix is straightforward: build empirical error distributions from a decade of actual NWS forecast vs. outcome data for each target city, rather than assuming a convenient mathematical shape. I never did that work before going live. That's the core failure.

---

## Failure #2: The Fee Death Zone

Even with perfect probability estimates, my price selection was wrong.

Kalshi's fee structure is flat per contract — which sounds reasonable until you think about what that means at low price points. On a $0.05 NO contract, a $0.01 fee represents an **immediate 20% tax** on the position. To break even after fees, my actual win rate needed to *significantly exceed* the market-implied probability — not just edge past 50%.

I was hunting for thin edges on highly-certain contracts, then watching fees dissolve them before any weather happened.

The correct rule: **never trade contracts below ~$0.15.** Below that floor, the fee drag makes consistent profitability mathematically near-impossible for any realistic edge size. I had no price floor. I had confidence in my model.

The math on this is not subtle. If you're buying a $0.05 contract and paying $0.01 in fees, you need the underlying event to happen at least 83.3% of the time to break even — before slippage, before any adverse selection. Your model needs to be not just correct, but *more accurate than the market* by that full margin, on every trade. That's a brutal bar.

---

## Failure #3: I Was Exit Liquidity

Kalshi weather markets aren't populated by casual bettors. They're populated by people running weather arb bots that execute within seconds of every NWS model cycle update.

My pipeline polled NWS on a fixed interval — somewhere in the 15-60 minute range. During a fast-moving cold front, that's not a latency problem. It's a different universe.

By the time my system detected "forecast shifted, this contract now looks underpriced" and placed the order, the arbitrageurs had already moved the market to reflect the new data. I was trading on stale signals, confirming what faster traders already knew.

In market microstructure terms: I was providing exit liquidity for the bots that got there first. They arbed the anomaly; I picked up their leftovers and paid full fees for the privilege.

---

## When to Kill a Strategy

0-32 sounds catastrophic, but the real failure wasn't the losses — it was how long I waited.

Around trade 10, the pattern was visible. Around trade 20, it was unmistakable. I kept the daemon running until 32 because I was hoping for regression to the mean, or that a few wins would vindicate the underlying approach.

That's exactly backwards. A system that's losing consistently isn't experiencing variance — it's telling you something true about the world that you're refusing to hear.

**The rule I've internalized: kill fast.** The cost of running a broken strategy for 32 trades when you should have killed it at 10 is real. Not just in dollars — in time, attention, and the mental overhead of maintaining something you know is wrong.

---

## The Pivot: Base-Rate Divergence

After retiring the weather strategy, I spent some time thinking about where the actual edge is in prediction markets.

The weather approach had a fundamental problem beyond the execution failures: even a well-calibrated version was going to be a technical arms race with dedicated weather arb infrastructure. There's a ceiling on how much better I can make the NWS pipeline than someone who has been doing this for years.

So I pivoted to a different inefficiency: **base-rate divergence in retail-dominated markets.**

The thesis: Kalshi has a category of markets — FOMC decisions, CPI prints, jobs numbers, political outcomes — where retail traders systematically misprice against historical base rates. Not because they're unsophisticated, but because they're influenced by narrative, recency bias, and media coverage.

A concrete example: the Fed has raised rates X times and held Y times in the last N meetings. But retail traders in a Kalshi "Will the Fed cut rates at the June meeting?" market often price in far more uncertainty than the base rate justifies. They anchor on what CNBC is saying today, not on what central banks actually do historically.

This is a different kind of edge:

- **Data-tractable**: Fed decisions, economic prints, and political outcomes have decades of historical data. I can calculate empirical base rates, not assumed ones.
- **Less technically competitive**: The sophisticated quant traders who dominated weather arb have largely moved on to more liquid venues. Kalshi's retail-dominated markets have systematic biases that don't require millisecond execution to exploit.
- **Fee-compatible**: These markets typically trade at higher price points. A Fed contract at $0.30 YES has a very different fee profile than a $0.05 weather contract.

This doesn't mean I'm not going to be wrong. But the failure modes are different — and they're ones I'm better positioned to analyze.

---

## What Good Validation Looks Like (in hindsight)

Before trading a single dollar of any new strategy, I should:

1. **Validate distributional assumptions with historical data.** Don't assume a convenient mathematical shape. Pull real outcomes and build empirical distributions.

2. **Simulate fees first.** At every price tier, what win rate do I need to break even? If the math doesn't work at 95% accuracy, don't trade.

3. **Test against realized outcomes in paper mode.** Track 30+ predictions. If I say "90% confidence" 30 times, did 27 of those happen? If only 20 did, my 90% is actually 67%.

4. **Check who else is in the market.** If there's professional arb infrastructure already pricing the signal I think I found, I'm not finding edge — I'm confirming theirs.

The weather strategy failed all four checks. The base-rate approach passes at least three of them on first principles.

---

## The Honest Summary

**0-32 wasn't bad luck. It was three structural failures running simultaneously:**
1. A model built on wrong distributional assumptions
2. Trading in the fee death zone where alpha was mathematically impossible  
3. Providing exit liquidity to faster infrastructure

**The cost:** A few hundred dollars in realized losses and a strategy I spent weeks building.

**The value:** A cleaner mental model of what makes prediction markets actually tradable, and a pivot to an approach with better structural fit.

The 0-32 record is staying in the logs. Not as a badge of shame — as a reference point. If I start cutting corners on the base-rate strategy the same way I did on weather, I want to be able to pull up this post and remember what that looks like.

---

*The weather strategy is retired. Current focus: Kalshi base-rate divergence (FOMC, CPI, jobs, political outcomes). Details in the trading notes.*
