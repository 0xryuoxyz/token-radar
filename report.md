# Token Radar — Top 25 Board

Snapshot: 2026-11-14 (DefiLlama, 758 protocols at or above $5M TVL). Watchlist: 40 protocols. Board: 198 rows (40 watchlist + 20 large + 138 early — every rankable protocol in the snapshot), 16 FARM verdicts. Model: radar-6.

Implied value is a model estimate, never a price and never a prediction of whether or when a token is issued. A token may never be issued.

Accounting for all 758 protocols in the snapshot: 198 ranked + 144 excluded (wrapped / staked / bridged or exchange products) + 0 rankable but unranked — every rankable protocol is ranked + 416 already record a token.

Integrity: 198/198 rows re-derived exactly from the snapshot, 0 failed. Held out four times (average median error 75.2% — lower than radar-5's 77.0% only because the alphabetical split was added; the curve is unchanged): slug-parity split — median error 73.7% on 56 protocols; walk-forward (by listing date) — median error 69.5% on 48 protocols; slug-mod3 split — median error 87.8% on 42 protocols; alphabetical split — median error 69.7% on 60 protocols. Token odds Brier (0 is perfect, 0.25 is a coin flip): parity 0.2087, walk-forward 0.3684, mod3 0.2081.

| Rank | Protocol | Category | TVL | 7d | Implied value | Token odds | Ready | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Steakhouse Financial | Risk Curators | $2.75B | -2.2% | $38.1M | 30.6% (1–2 years) | 50 | FARM |
| 2 | Sentora Curator | Risk Curators | $2.76B | +2.4% | $34.5M | 30.6% (1–2 years) | 36 | WATCH |
| 3 | Gauntlet | Risk Curators | $1.58B | +5.6% | $33.9M | 30.6% (1–2 years) | 51 | FARM |
| 4 | Hive Protocol | Chain | $198.8M | -10.2% | $18.3M | 64.2% (2–4 years) | 36 | WATCH |
| 5 | Plume Vaults | RWA | $211.5M | -3.1% | $18.1M | 66.8% (2–4 years) | 51 | FARM |
| 6 | Hyperithm | Risk Curators | $221.6M | -4.4% | $18.0M | 30.6% (1–2 years) | 50 | FARM |
| 7 | Lofty | RWA | $101.1M | +0.0% | $17.8M | 78.4% (4+ years) | 54 | FARM |
| 8 | OpenTrade | RWA | $241.5M | -1.6% | $17.6M | 46.1% (1–2 years) | 40 | WATCH |
| 9 | K3 Capital | Risk Curators | $207.7M | -8.9% | $17.2M | 30.6% (1–2 years) | 49 | FARM |
| 10 | USDD | CDP | $1.06B | -2.8% | $16.8M | 45.8% (1–2 years) | 37 | WATCH |
| 11 | Polymarket International | Prediction Market | $320.2M | -1.1% | $16.8M | 77.2% (4+ years) | 53 | FARM |
| 12 | BitFi Basis | Basis Trading | $214.9M | -10.3% | $16.6M | 49.8% (1–2 years) | 52 | FARM |
| 13 | RockawayX | Risk Curators | $292.5M | -2.5% | $16.5M | 32.2% (180–364 days) | 40 | WATCH |
| 14 | Veda | Onchain Capital Allocator | $1.56B | -8.3% | $16.3M | 38.5% (1–2 years) | 52 | FARM |
| 15 | OnRe | RWA | $308.9M | +0.1% | $16.1M | 46.1% (1–2 years) | 24 | SKIP |
| 16 | Clearstar | Risk Curators | $161.8M | -10.1% | $15.9M | 30.6% (1–2 years) | 49 | FARM |
| 17 | Nonce Capital | Risk Curators | $513.8M | -9.7% | $14.7M | 11.6% (<180 days) | 14 | SKIP |
| 18 | b14g | Restaking | $173.9M | -28.5% | $13.8M | 49.6% (1–2 years) | 37 | WATCH |
| 19 | Extended Perps | Derivatives | $96.4M | -4.9% | $13.6M | 45.6% (1–2 years) | 37 | WATCH |
| 20 | Upshift | Onchain Capital Allocator | $499.1M | +8.3% | $13.4M | 38.5% (1–2 years) | 56 | FARM |
| 21 | Galaxy Curation | Risk Curators | $130.0M | +11.2% | $12.6M | 11.6% (<180 days) | 25 | SKIP |
| 22 | R25 | RWA | $198.2M | +0.3% | $12.2M | 47.6% (180–364 days) | 20 | SKIP |
| 23 | Ember | RWA | $90.0M | -6.0% | $12.0M | 46.1% (1–2 years) | 46 | FARM |
| 24 | Symbiotic | Collateral Markets | $253.9M | -12.0% | $11.6M | 65.6% (2–4 years) | 35 | WATCH |
| 25 | Apex Omni | Derivatives | $26.8M | -1.3% | $11.5M | 66.3% (2–4 years) | 55 | FARM |

## How the numbers are made

Implied value = 10^(4.6864 + 0.2916 × log10(TVL) + category offset) × growth × maturity × breadth. The comps curve is fitted at run time from the 121 live protocols in the snapshot: an OLS line of log10(market cap) on log10(TVL) (raw slope 0.5831), shrunk by half toward 0, intercept refitted, plus a per-category offset (median residual, shrunk n / (n + 3)). Growth = 1 + clamp(change_7d, −80, 200) / 100 × 0.6. Maturity = 0.55 + min(age_days, 1460) / 1460 × 0.60 (unknown age: 365 days). Breadth = 1 + 0.03 × min(chains − 1, 5).

Token odds are the average of the age-band base rate and the category base rate (each the observed share of peers that already record a token — a market cap, a Gecko id or a symbol — smoothed toward the global base rate), plus a maturity gradient (+15 points for age 4+ years, +9 for 2–4 years, −15 for under 180 days), a base rate from the peers’ record, not a prediction. The gradient improved held-out Brier and log-loss on the three dashboard splits and on ten random-half splits (Brier 0.272 → 0.262 and 0.220 → 0.209); finer 7-band ages, growth and chains adjusters did not help and are out. Adding the category rate improved the held-out Brier score and log-loss on all three splits vs age-only; a TVL band and a logistic regression were tested and rejected for making the parity Brier worse. Farm plans are deposit-sized by verdict: FARM commits the full TVL-tier capital, WATCH tests with half, SKIP probes with $10 only; the second-chain step names the protocol’s own second chain when it has one, the weekly step names each protocol’s own age, TVL and 7-day growth, and steps 1 and 7 name its own deposit, chain, verdict and hold period. Verdicts use readiness ≥ 45, growth ≥ −20% and implied ≥ $10M for FARM (16 rows), readiness ≥ 35 for WATCH — radar-5’s stricter bar left only 2 FARM rows.

Excluded from ranking: protocols that record a token, plus wrapped / staked / bridged products of tokens that already trade, exchanges, and versioned pools. Every farm plan has 7 steps with a cost and a time, derived from the protocol’s own category, chains, TVL, age, growth and verdict.

## Full board

See `board.json` (all rows, with the model breakdown and farm steps for each) and the dashboard in `dashboard/` (sortable, filterable, with a detail view per protocol, an integrity strip with six proofs, and a model sandbox).
