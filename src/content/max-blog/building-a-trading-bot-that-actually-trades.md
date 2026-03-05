---
title: "Building a Trading Bot That Actually Trades"
date: 2026-03-01
excerpt: "A walkthrough of Protogen Max — the architecture, the base-rate divergence strategy, and the brutal lessons from going 0-32 on weather markets before finding an edge worth trading."
tags: ["trading", "kalshi", "protogen", "architecture", "prediction-markets"]
image: "/assets/og/building-a-trading-bot-that-actually-trades.png"
series: "Protogen: Trading Journal"
seriesOrder: 3
---

# Building a Trading Bot That Actually Trades

Most trading bots don't trade. They paper trade. They backtest. They sit in a loop, polling an API, logging signals that would have been profitable if the code had actually executed.

Protogen Max trades.

It has an account with real money. It fires real orders. It keeps a log of every position it's opened and closed, every dollar it's made and lost. And for a while, it was losing — 0 wins, 32 losses, on a weather strategy with three structural failures I should have caught before writing the first line of production code.

This post is about what I built, how it works, and what I learned from the wreckage.

---

## Prediction Markets: The Setup

Before the architecture, a quick primer on what Kalshi actually is, because it's not obvious.

Kalshi is a regulated prediction market. You can bet on whether real-world events will happen — Will the Fed cut rates in June? Will CPI come in above 3.5%? Will tomorrow's high in Chicago exceed 45°F? Each question has a YES and NO contract, priced between $0 and $1. If you buy YES at $0.30 and the event happens, you collect $1 — a $0.70 profit. If it doesn't, you lose your $0.30.

The price is the market's implied probability. A $0.30 YES means the market collectively thinks there's a 30% chance the event happens.

What makes this interesting as an engineering target:

1. **Definitive outcomes.** Unlike equity trading, there's no ambiguity about whether you won or lost. The event happened or it didn't.
2. **Tractable signal.** Many Kalshi markets have clear base-rate data from history. The Fed has raised, held, or cut rates hundreds of times. CPI has hit specific ranges with measurable frequency. That data exists.
3. **Retail-dominated pricing.** Unlike equity markets where sophisticated quant funds drive prices toward efficiency, many Kalshi markets are priced mostly by retail traders who anchor on narratives instead of base rates.

That last point is the thesis. If I can calculate what the historically-justified probability of an event is, and the market is pricing it differently because of narrative bias — that's edge.

---

## The Protogen Max Architecture

The bot is a Python daemon that runs continuously against the Kalshi REST API. Here's the high-level structure:

```
daemon.py
├── Scanner          — polls for open markets, fetches order books
├── Strategy         — evaluates each market for signal
├── RiskManager      — applies Kelly sizing, exposure limits
├── ExecutionEngine  — places orders via API
├── PositionTracker  — monitors open positions, triggers exits
└── TradeLogger      — persistent SQLite log of everything
```

Each piece is a class, and the strategy layer is hot-swappable. Early on, that modularity saved me — when I retired the weather strategy and built the base-rate module, I replaced one class without touching the risk, execution, or logging layers.

### The Scanner

The scanner runs on a configurable interval (currently 15 minutes) and calls Kalshi's markets endpoint to pull all open markets. It filters for:

- Active trading window (not expiring in the next hour — liquidity gets weird near expiry)
- Minimum volume threshold (thin markets have massive bid-ask spreads)
- Category whitelist (only the strategy categories I have a model for)

Each market that passes the filter goes through the strategy layer.

### The Strategy Layer

A strategy takes a market object and returns either `None` (no signal) or an `Opportunity` object with the recommended side, Kelly-optimal fraction, and confidence estimate.

The base signature is simple:

```python
class Strategy:
    def evaluate(self, market: Market) -> Optional[Opportunity]:
        raise NotImplementedError
```

I've shipped two strategies: `WeatherStrategy` (retired, 0-32 record) and `BaseRateDivergenceStrategy` (active). More on the difference below.

### The Risk Manager

This is the part I got wrong first, and it matters more than the signal.

The risk manager applies three controls before any order reaches execution:

**1. Kelly sizing.** Given an estimated edge `e` (how much better my probability estimate is than the market price) and a bankroll `B`, the Kelly criterion says to bet `B × (e / odds)`. I use a fractional Kelly — typically 25% of full Kelly — because my probability estimates aren't perfect and Kelly is aggressive.

**2. Exposure limits.** Max open exposure across all positions is capped at 20% of bankroll. This prevents the system from going all-in on correlated positions even if Kelly says each one individually looks good.

**3. Drawdown scaling.** If the account drops more than 15% from its peak, position sizes scale down proportionally until recovery. A 20% drawdown means Kelly fractions are halved. This is the circuit breaker.

Early code had all three bugs simultaneously: positions were sized with Kelly but the implementation calculated size incorrectly, the exposure check was a stub that always returned `True`, and there was no drawdown scaling at all. Those bugs coexisted for weeks before I caught them.

### The Execution Engine

The execution engine is deliberately dumb. It takes an `Opportunity`, converts it to an order, and fires it. Error handling, retry logic, partial fill detection. That's it.

The intelligence lives in strategy and risk. The execution layer shouldn't be making decisions.

### Position Tracking and Exit Logic

Every opened position gets written to SQLite with a target exit condition. The daemon scans open positions on each cycle and checks:

- Has the market resolved? (Collect or pay, close the position in the tracker)
- Has the price moved enough that the edge calculation has inverted? (Early exit, take whatever profit/loss is there)
- Has the position been open past a time-based stop? (Force closure to free exposure)

This was the hardest piece to get right, because Kalshi markets can stay open for days or weeks. You can't just wait for expiry — you need to actively manage positions as new information arrives and market prices shift.

---

## Base-Rate Divergence: The Concept

The core of the current strategy is a simple claim: retail traders systematically price many Kalshi markets wrong because they anchor on recent narratives instead of long-run base rates.

Let me make that concrete.

**The FOMC example.** The Fed held rates at the June 2024 meeting. And the September 2024 meeting. And the November 2024 meeting. And January 2025. If you just looked at the last several meetings, "rate change" looks rare — maybe 15-20% of meetings result in a move.

But narrative-driven retail traders see every headline about "stubborn inflation" or "recession fears" as updating the odds for the *next* meeting, often dramatically. When the market prices a June cut at 45% and the base rate over comparable macroeconomic conditions is closer to 20%, that's a gap worth looking at.

**The math.** For each market type, I maintain an empirical distribution of historical outcomes. For Fed meetings, that's the full record of decisions and the macro conditions at the time. For CPI, it's the distribution of actual prints vs. consensus estimates over recent history.

The strategy's signal is simple:

```python
def evaluate(self, market: Market) -> Optional[Opportunity]:
    base_rate = self.get_historical_base_rate(market)
    market_implied = market.yes_price  # market's probability estimate

    divergence = base_rate - market_implied
    edge = abs(divergence)

    if edge < self.MIN_EDGE:
        return None  # not worth trading

    side = "YES" if divergence > 0 else "NO"
    kelly_fraction = self.risk_manager.kelly(edge, side, market)

    return Opportunity(market=market, side=side, fraction=kelly_fraction, edge=edge)
```

If the base rate says 25% and the market says 45%, the edge is 20 percentage points on the NO side. That's a large enough gap to warrant a position — after fees, after Kelly sizing, after exposure checks.

**What this is not.** This isn't a claim that markets are stupid or that I have information the market doesn't have. Sophisticated traders price these markets too. The claim is narrower: for specific categories where retail is the dominant volume and where base rates are observable and stable, systematic biases exist and persist.

---

## What the Weather Strategy Taught Me

The weather strategy was the prototype that went wrong. I've written the full postmortem elsewhere, but the architectural lessons are worth noting here because they changed how I built the base-rate module.

**Lesson 1: Validate your distributional assumptions before you go live.**

The weather strategy assumed NWS forecast errors follow a Gaussian distribution. They don't — temperature errors have fat tails. So every "90% confidence" call was actually closer to 75%. I went live on an uncalibrated model.

With base-rate divergence, I validate calibration explicitly: I maintain a rolling log of my probability estimates vs. actual outcomes. If I call something 70% and it happens 70% of the time over 100+ predictions, I'm calibrated. If I'm calling things 70% and they happen 85% of the time, my model is systematically overconfident in one direction and I need to diagnose why.

**Lesson 2: Know who else is in the market.**

Weather markets are fast. NWS publishes model runs multiple times per day, and automated arb bots process those runs within seconds. By the time my daemon polled on a 15-minute cycle, the efficient-pricing window had closed. I was trading on stale signals against infrastructure running at sub-second latency.

Kalshi's FOMC and CPI markets move slower. New information arrives on a more predictable schedule (meeting dates, release times), and the retail traders who dominate volume aren't running dedicated arb infrastructure. The edge is structural, not latency-dependent.

**Lesson 3: Kill fast.**

At loss 10, the pattern was visible. At loss 20, it was unmistakable. I kept the daemon running to 32 because I was hoping for variance to rescue a broken strategy.

Now the code has a hard stop: if the rolling win rate drops below threshold over the last N trades, the strategy pauses and flags for human review. The bot can't keep trading a broken signal just because shutting it down requires admitting defeat.

---

## The Honest State of Things

Protogen Max is real infrastructure that places real trades. The weather strategy proved the execution layer worked even when the signal layer was broken. Now the signal layer has a better foundation.

The base-rate divergence strategy is early. I have a few positions open, the infrastructure is running, and the data collection is live. What I don't have yet is a long enough track record to know if the edge is real or if I've just built a more sophisticated version of the same mistake.

That's the uncomfortable truth about building trading systems: you don't know if you've found edge until you've been wrong enough times to distinguish signal from noise. The weather strategy told me something true. I had to run it to 32 losses to hear it clearly.

The base-rate strategy has better structural foundations: the signal is data-tractable, the fee math works at the price points I'm targeting, and the market microstructure is less technically competitive. But I'm watching the calibration logs carefully.

---

## What "Actually Trades" Means

The title of this post is a small flex. Most trading bot tutorials end at the backtest. The exciting part is always the historical data, the beautiful equity curve, the Sharpe ratio.

The part where you click "deploy" and watch it fire a real order with real money into a real market — that's where you find out what you didn't know.

I've watched Protogen Max place orders at 3 AM. I've watched it exit positions early because the price moved against it and the edge calculation inverted. I've watched it correctly calculate that a market wasn't worth entering and move on.

The weather strategy record is 0-32. That's in the logs, permanent. It'll always be part of the bot's history.

But it also means I've been through the full cycle: build, deploy, trade, fail, diagnose, redesign. The base-rate divergence strategy inherits all of that.

If it works, it'll be because the foundations are honest. And if it fails, I'll write the postmortem — and the lessons will go into whatever comes next.

---

*Protogen Max is open-architecture trading infrastructure. Code lives in private repos for now. If you're building something similar, the interesting decisions are in the risk layer, not the signal layer.*
