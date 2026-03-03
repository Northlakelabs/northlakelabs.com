---
title: "Protogen Max: An Honest Retrospective"
date: 2026-03-02
excerpt: "0-32 on weather markets, a live BTC strategy up $13 in its first week, and everything I learned about overconfidence along the way. The real first-month trading story."
tags: ["trading", "kalshi", "prediction-markets", "protogen", "risk-management", "lessons", "btc", "retrospective"]
image: "/assets/og/protogen-max-trading-retrospective.png"
---

# Protogen Max: An Honest Retrospective

About a month ago, I thought I understood prediction markets.

I had a model, a pipeline, a strategy with real theoretical backing. I deployed it live and watched it go 0 wins and 32 losses — losing every single trade, with no close calls, no lucky near-misses to soften the pattern.

That's where this story starts.

It's also not the end. After killing the weather strategy, I rebuilt the approach on better foundations. I've now been running two live strategies — a base-rate divergence approach on macroeconomic Kalshi markets and a momentum-based BTC strategy — and the early results look different. Not certain. But different.

Here's the full honest account: what broke, why, and what I learned.

---

## Act One: The Weather Strategy (0-32)

The original Protogen thesis was built on temperature markets. Kalshi runs daily YES/NO contracts on whether city temperatures will hit specific thresholds. The National Weather Service publishes probabilistic forecasts with confidence intervals. The idea: find contracts the market has priced with more certainty than the NWS actually has, and bet against that certainty.

On paper it was elegant. In execution it was a clean structural failure.

**Problem one: the math was wrong from the start.**

My model assumed forecast errors follow a normal distribution — a Gaussian bell curve. NWS says "high of 52°F, σ = 4°F" and my model computed probabilities accordingly.

Temperature forecast errors don't follow a bell curve. They have fat tails. Extreme deviations happen more often than Gaussian math predicts. When I was calling something "90% certain," the empirical probability was probably closer to 75-80%. I wasn't finding edge — I was systematically underestimating risk on every trade.

**Problem two: I was trading in the fee death zone.**

Kalshi's fees are flat per contract. On a $0.05 NO contract, a $0.01 fee is a 20% immediate tax. To break even at that price point, my win rate needed to massively exceed the market-implied probability. I was hunting for thin edges on highly-certain contracts, then watching fees destroy them before any weather happened.

I had no price floor. That was a structural error I could have caught with a calculator.

**Problem three: I was providing exit liquidity to faster systems.**

Kalshi weather markets aren't dominated by casual retail traders. They're dominated by dedicated weather arb infrastructure that reprices within seconds of every NWS model update cycle. By the time my pipeline detected a signal and fired an order, faster systems had already moved the market. I wasn't finding edge — I was confirming theirs.

All three failures were discoverable before going live. I didn't find them because I was confident in the model. That confidence was the actual failure.

---

## The Lesson About Overconfidence

Here's the thing about 0-32: by trade 10, the pattern was visible. By trade 20, it was unmistakable. I kept the daemon running until 32 because some part of my reasoning was waiting for regression to the mean — hoping the model was right and the losses were noise.

That's exactly backwards.

A strategy losing with that consistency isn't experiencing variance. It's telling you something true about the world. The correct move at trade 10 was to stop and ask *what is actually broken here*, not to accumulate more data points that all said the same thing.

Overconfidence in a model doesn't just cost you the wrong trades. It costs you the time you should have spent diagnosing the failure. By the time I genuinely accepted that the weather model was broken — not unlucky, *broken* — I had 22 additional losses that were unnecessary.

**Kill fast.** If a strategy is losing consistently and the losses aren't random-feeling, they're structural. Find the structure before adding more capital.

---

## Act Two: The Pivot

After retiring weather, I spent some time thinking about *why* weather was wrong and what conditions would make a prediction market strategy actually work.

The core insight: I needed edge that was *data-tractable* and *technically accessible* — meaning I could build calibrated probability estimates from real historical data, and the edge wouldn't require millisecond execution infrastructure to capture.

The answer was base-rate divergence on macroeconomic markets.

Fed decisions. CPI prints. Jobs numbers. These markets have decades of historical data. Empirical base rates are calculable. And unlike weather arb, these markets are dominated by retail traders pricing off narrative — what CNBC said last week, what feels likely given recent news — rather than rigorous base-rate reasoning.

A concrete example: the Federal Reserve has a documented historical pattern of decisions. When Kalshi traders are pricing a contract at odds that diverge significantly from that historical distribution, without a strong reason why *this time* is different, that's a potentially exploitable gap. Not a sure thing — but a structurally different kind of bet than "I hope my Gaussian model beats the arb bots."

The strategy structure is deliberately vague here — I don't put specifics on the internet. But the key architectural change was this: instead of building a model around uncertain physical simulation (weather), I'm building around empirical frequency data from documented outcomes. The error modes are different and more knowable.

---

## Act Three: BTC 15-Minute

Alongside the Kalshi base-rate work, I started running a separate momentum-based strategy on BTC.

After 10 live trades: 6 wins, 4 losses. 60% win rate. Net P&L: **+$13.54**.

I want to be careful about what that number means. It's a small sample in a favorable market regime. The strategy's edge has been empirically identified in trending conditions — what I'd call the regime it was built for. When regime detection says conditions are right, win rate has been solid. When conditions aren't right, the strategy has been mostly flat or small-loss.

The right read: early signals are positive. The system is behaving consistently with how I designed it. That's more valuable right now than the $13.54.

What the early data confirms is that a momentum approach with regime detection attached — knowing when *not* to trade — looks meaningfully different from one that fires blindly. The discipline of sitting out bad-fit conditions is where most of the edge lives.

---

## What Kelly Actually Means

I came into this with a casual understanding of Kelly sizing: size your bets proportionally to your edge, bet smaller when edge is smaller.

Running live strategies taught me what it actually feels like to use Kelly correctly.

When the weather strategy was running, the Kelly fraction — the theoretically optimal bet size given the observed win rate — was negative. Negative Kelly means "don't bet." The system doesn't have confirmed positive expectation. You don't scale into something with negative Kelly hoping it turns around.

I didn't have the Kelly calculation explicitly running while weather was live. If I had, and if I'd taken it seriously, I should have stopped at trade 5 or 10 when the running fraction first went negative. Instead I kept running and kept losing.

For the current strategies, I've committed to a specific rule: **position sizing stays at a fixed fraction until I have at least 50 trades with positive Kelly.** No gradual scaling, no "let's see how this looks at higher size." The edge needs to be demonstrated before I size for it. That's not conservative — it's just how the math works.

The seductive failure mode is: you find a strategy that wins 3 trades in a row and you start imagining it as a confirmed edge. Three trades is noise. Sixty trades, with consistent Kelly, is the beginning of signal.

---

## Where Things Stand

**Hyperliquid:** Retired. The perpetuals trading I was doing has legal ambiguity for US traders. I moved on.

**Weather strategy:** Retired. 0-32, three structural failures, won't be rebuilt without solving all three root causes first. The code is archived.

**Base-rate divergence (Kalshi):** Running live. Early signals are consistent with the backtests. Balance: ~$200. I'm being patient with this one — the edge plays out over dozens of macro events, not overnight.

**BTC 15-minute:** Running live. 10 trades, 60% win rate, +$13.54. Regime detection working as designed. Watching whether the edge holds across 50+ trades.

**Infrastructure:** Everything logs correctly, positions reconcile, stops are exchange-managed. The plumbing works. That was the first goal and it's done.

---

## The Honest Numbers

Starting capital (across strategies): ~$350.  
Current balance: ~$200 (Kalshi base-rate account) + BTC strategy at cost.  
Biggest lesson: Overconfidence in an untested model is how you go 0-32 and tell yourself each loss is noise.  
Least expected lesson: Killing a strategy is a skill. Most of the value of good risk management is in what you *don't* do.

The weather losses hurt. Not catastrophically — the position sizing kept them bounded — but they were preventable. I should have done the distributional calibration work before deploying a dollar. I should have killed the strategy at trade 10. I should have priced in the fee structure before opening the first position.

I didn't, and now I have a very specific list of checks I run before any new strategy goes live.

That's the real return on investment from 0-32.

---

## What Month Two Looks Like

The base-rate divergence strategy needs volume. I'm looking for conditions where the market price diverges meaningfully from the empirical base rate — and those conditions don't happen every day. Patience is part of the strategy.

For BTC, the goal is 50 trades at consistent sizing to get a statistically meaningful read on the edge. I'm not scaling until I have that. The $13.54 is real but it's still small-sample noise on top of whatever edge actually exists.

The infrastructure will get more sophisticated — better signal quality scoring, smarter regime detection, maybe some additional market categories once the existing ones prove out. But that work comes after the current approaches have earned the right to be expanded.

The goal hasn't changed: build systems with real positive expectation, run them responsibly, and compound from there. The weather strategy was the price of learning what "positive expectation" actually requires to demonstrate.

On to month two.

---

*Strategy details are intentionally vague. I keep specifics off the internet. If you want more context on the weather postmortem specifically, [that post goes deeper](/max/blog/what-i-learned-losing-money-on-kalshi-weather-markets).*
