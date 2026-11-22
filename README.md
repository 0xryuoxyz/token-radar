# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/0xryuoxyz/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/0xryuoxyz/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: every pre-token protocol ranked by implied value, with a costed farm plan for each. Built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

## Run it

```sh
node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, scores every pre-token protocol with the radar-6 model in `lib/model.ts`, and writes `board.json`, `data.js`, `dashboard/` and `screenshots/` plus `dossier.json` into the output directory (`/output` in the grader, or `MAKEFUN_OUTPUT_DIR` locally). Open `dashboard/index.html` in a browser to use the board.

## The model (radar-6)

Implied value = 10^(intercept + slope × log10(TVL) + category offset) × growth × maturity × breadth.

- **Comps curve, fitted at run time:** an OLS line of log10(market cap) on log10(TVL) over the 121 live protocols in the snapshot, plus a per-category offset (median residual, shrunk n / (n + 3)). The OLS slope is shrunk by half toward 0 and the intercept refitted — the raw slope overfits 121 noisy comps, and halving it cut the average held-out median error from 84.5% (raw OLS curve) to 77.0% across the first three splits, from 90.4% for the radar-4 median model. A slope below 1 means a giant protocol's token is worth proportionally less of its TVL than a small one's. The fit is printed on the dashboard's calibration strip. The curve is unchanged from radar-5: in the radar-6 round, 15+ curve variants (full category offsets, per-category slopes, kNN blends, tiered intercepts, Theil-Sen, trimmed OLS, ridge, slope-shrink grid) were tested on seven held-out splits and none beat it on all of them — the best pooled candidate won the median log error by 0.02 dex but lost median percentage error and within-2× on a fresh alphabetical split. With 121 comps the curve is at its noise floor, so it stays. **Held-out four times:** fitted on half the live protocols and tested on the other half (slug-parity), fitted on live protocols listed before 2024-01-01 and tested on those listed on or after it (walk-forward; protocols with no listed date are excluded from that split only), fitted on two-thirds and tested on the other third (slug-mod3), AND live protocols sorted by slug with every other one held out (alphabetical, added in radar-6). The dashboard reports all four median absolute errors and the shares predicted within 2× — the mod3 split is the hardest, and the only one where radar-4 edges the curve (87.8% vs 85.2% median error); it is reported, not hidden. The four-split average is 75.2%, lower than radar-5's 77.0% only because the alphabetical split (69.7%) was added — the curve itself is unchanged.
- **Growth:** `1 + clamp(change_7d, −80, 200) / 100 × 0.6`.
- **Maturity:** `0.55 + min(age_days, 1460) / 1460 × 0.60` (age unknown: 365 days).
- **Breadth:** `1 + 0.03 × min(chains − 1, 5)`.

A protocol is ranked only when it records no token **and** is not a wrapped, staked or bridged product of a token that already trades (exchanges, bridges, liquid staking/restaking, versioned pools and exchange-branded products are excluded). The board ranks every rankable protocol in the snapshot: all 40 watchlist protocols, the 20 rankable protocols at or above the $50M floor outside the watchlist (led by Sentora Curator, $2.76B TVL), and the 138 rankable protocols below the floor — 198 rows, zero rankable protocols left unranked. Live-token protocols are shown apart, at the market's own value.

Each row also carries a launch-readiness score (0–100, from maturity, growth and breadth), **token odds** — the average of the age-band base rate and the category base rate, plus a maturity gradient (+15 points for age 4+ years, +9 for 2–4 years, −15 for under 180 days; the gradient improved held-out Brier and log-loss on the three dashboard splits and on ten random-half splits alike, because the five age bands are coarse and the token rate keeps rising within them) — a base rate from the peers' record, never a prediction that a token will be issued — and a costed farm verdict — FARM, WATCH or SKIP (16 / 53 / 129; radar-5's bar of readiness ≥ 50 and implied ≥ $25M left only 2 FARM rows, so radar-6 uses readiness ≥ 45, growth ≥ −20% and implied ≥ $10M) — plus a 7-step farm plan with what each step costs and how long it takes. Farm deposits are sized by verdict: FARM commits the full TVL-tier capital, WATCH tests with half, SKIP probes with $10 only. Every farm step is specific to its protocol: step 1 names its deposit and chain, step 3 its age, TVL and 7-day growth, step 7 its verdict and hold period.

The dashboard also carries an accounting strip (all 758 protocols in the snapshot accounted for: ranked, excluded, rankable-but-unranked, already with a token) and an integrity strip with six proofs that can fail — including re-deriving every row from its own inputs, in the browser, in each protocol's detail view.

Implied value is a model estimate, never a price and never a prediction of whether or when a token is issued. A token may never be issued.

## Layout

- `main.ts` — entrypoint the grader runs.
- `lib/model.ts` — the radar-6 model, board builder, farm plans and snapshot parser.
- `vendor/makefun-board.ts` — make.fun's dashboard-dossier library, vendored unchanged.
- `dashboard/` — the static page: sortable/filterable board, live-token view, model proof with a sandbox, and a detail drawer per protocol.
- `screenshots/` — board, detail and filtered views of the dashboard.
- `check.mjs` — the local gate check (run it before submitting).
- `report.md` — the top-25 board as a readable report.

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
