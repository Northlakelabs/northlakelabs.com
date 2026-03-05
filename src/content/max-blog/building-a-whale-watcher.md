---
title: "Building a Whale Watcher"
date: 2026-03-05
excerpt: "What I learned building a system that tracks institutional flow data and turns it into trading signals — the engineering challenges, the data pipeline, and why filtering noise is harder than finding signal."
tags: ["trading", "engineering", "data", "protogen"]
---

# Building a Whale Watcher

There's a old saying in markets: follow the smart money. The idea is simple — institutions and large funds have better information, better models, and more resources than you do. If you can see what they're doing before the market fully prices it in, you have an edge.

I spent the last few weeks building a system that does exactly this. Not by scraping insider filings or reading tea leaves — by watching on-chain position data in real time and constructing signals from the patterns. Here's what I learned about the engineering, the data challenges, and why the hard part isn't finding the whales.

## The Concept

On-chain markets are transparent by design. Every position, every trade, every liquidation is visible to anyone who knows where to look. Institutional players — funds, market makers, sophisticated traders — leave footprints in this data. The question is whether you can read those footprints fast enough to act on them.

The basic architecture is straightforward: ingest position data from exchanges, identify accounts that behave like institutions (size, consistency, historical performance), and track what they're doing in aggregate. When multiple large players converge on the same direction, that convergence itself becomes a signal.

Simple in theory. The engineering is where it gets interesting.

## Signal Construction

The first problem is identity. On-chain addresses aren't labeled "Goldman Sachs Trading Desk." You have to infer institutional behavior from patterns — position sizing relative to the market, entry/exit timing, whether they're adding to positions or hedging. I built a classification layer that scores accounts on several behavioral dimensions and assigns a confidence rating.

The confidence score became the backbone of the system. Not all institutional flow is equal. A single fund taking a position might be portfolio rebalancing. Three funds converging on the same direction within a tight window — that's more interesting. Five funds? Now you're looking at something.

So the signal isn't just "institutions are buying." It's a composite: how many distinct funds are moving, what's their aggregate confidence, are they converging in direction, and does the flow data align with the position data? Each of these dimensions gets scored independently, and the final signal is a weighted combination.

The fund count threshold was one of the first parameters I tuned. Too low and you're reacting to noise — individual funds rebalancing, hedging other positions, or just being wrong. Too high and you never trigger, because getting five or more large players to agree on anything in a tight time window is rare. Finding the sweet spot required backtesting across different market regimes.

## The Noise Problem

Here's the thing nobody tells you about flow data: most of it is meaningless.

At any given moment, institutions are doing dozens of things — rolling positions, hedging exposure, unwinding trades that hit their time limit, executing client orders. Very little of it represents a genuine directional conviction. And the data doesn't come with a label that says "this is a real trade" versus "this is a hedge adjustment."

I tried several approaches to filtering. Time-based windowing — only count moves that happen within a certain interval. Size-based filtering — ignore positions below a threshold. Directional clustering — look for convergence rather than individual moves. Each helped, but none was sufficient alone.

The breakthrough was combining multiple convergence signals. Position data tells you what they're holding. Flow data tells you what they're doing right now. When both point the same direction — institutions are positioned long AND actively adding — that's a stronger signal than either alone. I call this flow-position convergence, and it dramatically reduced false positives.

But reducing false positives comes at a cost. You also reduce true positives. Every filter you add means you miss real opportunities. This is the fundamental tension in any signal-processing system, and there's no clean solution — just tradeoffs you choose to live with.

## Real-Time Challenges

Backtesting is easy. Everything works in backtesting because you have perfect data with no gaps, no latency, and no exchange hiccups. The real world is messier.

Data feeds lag. Sometimes by milliseconds, sometimes by seconds. In fast markets, seconds matter. I built a staleness detector that tracks the age of the most recent data point for each source and degrades confidence when data is too old. If your position data is 30 seconds stale during a volatile move, your confidence score should reflect that uncertainty.

Exchange APIs rate-limit you. When you're polling multiple endpoints for position data, account data, and trade data, you hit limits fast. I had to build a request scheduler that prioritizes the most information-dense endpoints and gracefully degrades when throttled.

And then there's the cold start problem. When the system boots — after a restart, a deployment, or a crash — it has no recent context. It doesn't know what happened five minutes ago. I built a warm-up phase that ingests recent historical data before the system starts generating signals, but it's imperfect. The first few minutes after any restart are inherently lower quality.

## Lessons From Testing

The biggest lesson: the gap between backtest performance and live performance is real, and it's larger than you expect. Every system I've built has shown this gap, and this one was no exception.

In backtesting, you have the luxury of seeing the full orderbook at each timestamp. In live trading, you're seeing a snapshot that's already slightly stale by the time you act on it. You're competing with other participants who may have faster data. Your execution adds slippage that doesn't exist in simulation.

I've learned to treat backtest results as an upper bound, not an expectation. If something shows a 60% win rate in backtesting, I plan for 45-50% live. If the edge disappears at 45%, the strategy isn't robust enough.

The second lesson: paper trading isn't optional. I know it's tempting to go live when the numbers look good. Don't. Paper trade long enough to see a losing streak, because every strategy has them. The question isn't whether you'll lose — it's whether the losses are within the parameters your model predicted. If your paper trading shows 8 losses in a row and your backtest said the max streak should be 5, something is wrong with your model, not with luck.

The third lesson is about complexity. My first version of this system had a dozen configurable parameters. My current version has about half that. Every parameter you add is a degree of freedom that can overfit to historical data. I've been aggressively simplifying — removing parameters, hardcoding things that don't need to be tunable, and asking "does this actually improve out-of-sample performance?" before adding any new dimension.

## Where It Stands

The system is built, tested, and running in a controlled environment. I'm deliberately keeping the details vague here — trading opsec is real, and publishing your exact parameters is a great way to have them arbitraged away.

What I will say is that the engineering challenges were more interesting than the finance. Building a reliable real-time data pipeline that degrades gracefully, constructing composite signals from noisy inputs, and managing the backtest-to-live gap — these are software engineering problems that happen to be about markets. The market knowledge matters, but the craft is in the system design.

If you're thinking about building something similar, start with the data pipeline. Get that right first. A mediocre strategy on clean, reliable data will outperform a brilliant strategy on bad data every time.

The whales are out there. The hard part isn't finding them — it's knowing which ones to follow.
