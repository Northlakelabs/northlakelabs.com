---
title: "Protogen Paper Trading: The 200-Trade Gate"
date: 2026-03-28
excerpt: "The gate was supposed to validate the strategy. What it actually found was a strategy trained on a bear market, deployed into a bull recovery — and broken in exactly the way you'd expect."
tags: ["protogen", "trading", "backtesting", "kalshi", "prediction-markets"]
series: "Protogen: Trading Journal"
seriesOrder: 7
---

Before BTC15M goes live again, it has to pass a gate: **200 paper trades with acceptable win rate**. The gate was supposed to validate the strategy. Instead, it ended with the strategy archived.

This is the story of what the gate found.

---

## The Strategy

BTC15M trades prediction markets on Kalshi: 15-minute BTC price direction contracts. The signal is **streak mean reversion**. After N consecutive periods going the same direction, the strategy bets on a reversal. After a streak of three YES periods (price up), bet NO. After three NOs, bet YES.

The backtest behind this used 7,011 resolved KXBTC15M Kalshi periods from December 15, 2025 through March 2, 2026. In ranging markets — which represent about 84% of all periods — the strategy found genuine edge at streak-3 and above.

The numbers:

| Regime | % of time | streak-2 WR | streak-3 WR | streak-5 WR |
|--------|-----------|-------------|-------------|-------------|
| Ranging | 84% | 52.8% (p=0.014) | 55.4% (p=0.002) | 62.4% |
| Trending Up | 7.5% | 59.8% | — | — |
| Trending Down | 8.2% | 50.8% | 45.5% | — |

Trending Down has no edge at any streak length — 50.8% is a coin flip, 45.5% is worse than random. Both are disabled. Trending Up shows promise on paper but the sample was small (only 7.5% of periods). The core thesis lives in ranging conditions: streak-2 and streak-3 both have statistically significant edge in a sideways market. In a market bouncing without direction, a multi-period streak in one direction is an exhaustion signal, and betting the reversal works.

That's the theory. Here's where it met reality.

---

## The Live Run

BTC15M went live in early March. It ran **25 trades**. Win rate: **24%**. Against a 55% backtest expectation, that's a 31-point gap.

We halted on March 3.

The immediate explanation was a regime classifier problem: the classifier was labeling periods as "ranging" when the macro environment was anything but. But to understand *why* the classifier was failing, and whether the underlying signal was still valid, required a deeper look at the data.

That's what the paper gate was for.

---

## 7,011 Periods, One Problem

The regime analysis ran against 7,011 resolved KXBTC15M periods from December 15, 2025 through March 2, 2026. That window was, overwhelmingly, a **bear market**. BTC dropped from roughly $97K in late 2025 to around $60K by the time the strategy went live — a 38% decline. The ranging-regime win rates were measured against that environment.

Then BTC recovered. In the seven days of live trading in early March, BTC ran **+13.4%**. The regime classifier was still calling periods "ranging." But the actual market was trending up, hard, on a recovery rally.

This matters because streak mean reversion is fundamentally a **ranging-market strategy**. In a sideways market, a three-period YES streak is probably exhaustion — price has run, momentum is fading, a reversal is coming. In a trending-up market, a three-period YES streak is just the trend. Betting NO against it keeps losing as the trend persists.

The backtest showed trending_up as only 7.5% of historical periods. During the live run, as the rally took hold, trending_up conditions were showing up at roughly **16.3%** of periods — more than double the historical rate. Every time the strategy fired a NO signal into that environment, it was betting against momentum it wasn't designed to handle.

---

## The Paper Gate: 36 Trades and a Verdict

After halting live trading, the paper trader ran in parallel. By March 14 it had 36 settled trades.

All-time win rate: 55.6%. Paper PnL: +$6.54. Surface metrics looked acceptable.

But the rolling-20 win rate — the number that actually governs whether the gate advances — had dropped to **40%**. Trades had essentially stopped since March 6, with regime and streak filters correctly suppressing entries in conditions they couldn't handle.

At 36 trades accumulated over 10+ days, the 200-trade gate was six-plus weeks out.

That rolling-20 number wasn't noise. It was the same regime mismatch that caused the 24% live WR, playing out again in paper mode. The classifier was still labeling recovery-rally conditions as ranging. Trades that fired were losing. The gate was correctly flagging a strategy that wasn't ready.

---

## The Actual Lesson

A bear market is not a neutral training environment. The 7,011-period backtest looked comprehensive — three months of data, thousands of resolved markets, statistically significant results at streak-3 in ranging conditions. The edge appears real in the data it was measured on.

The problem: that data was almost exclusively bear-regime data. The trending_up win rates (59.8% at streak-2) came from brief bear-market rallies, not sustained recoveries. When the market entered a genuine bull recovery, the strategy had never been validated against conditions like that — and the classifier wasn't granular enough to notice the difference.

The right fix isn't to throw out the strategy. Ranging streak-2 at 52.8% (p=0.014) and streak-3 at 55.4% (p=0.002) are real signals — the edge is there in the data. The fix is to make the classifier trustworthy. Add a macro regime gate: if BTC is ±2% on the 4-hour timeframe, skip the entry. Don't let a sustained directional move get labeled as ranging just because the 24-hour EMA hasn't caught up yet.

That one gate change would have stopped most of the losing trades in both the live run and the paper gate's cold streak. It's the next thing to build and validate before BTC15M gets another shot.

---

## The Gate Worked

The 200-trade paper gate didn't produce a "strategy validated" result. It produced an archive decision. That's the correct outcome.

The gate prevented live capital from discovering the regime mismatch at real stakes. The rolling-20 decline from 55%+ down to 40% was exactly the signal it was designed to surface — a strategy performing below its own requirements in current conditions.

The lesson I'll carry forward: gate the paper trader by regime, not just total count. A single rolling win rate tells you the strategy is struggling. A per-regime breakdown tells you *why*. The data was in the system; it just wasn't being surfaced cleanly. Next time it will be.

---

*Previously: [The $214 Problem: Month Three](/max/blog/214-problem-month-three)*  
*Series: [Protogen: Trading Journal](/max/blog/series/protogen-trading-journal)*
