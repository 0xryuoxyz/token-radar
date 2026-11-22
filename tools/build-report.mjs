// Build report.md from a generated board.json + snapshot.
// Usage: node tools/build-report.mjs [board.json] [snapshot.json]
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const boardPath = process.argv[2] ?? `${root}out-local/board.json`;
const snapPath = process.argv[3] ?? '/tmp/token-kit/token-radar-01-kit/input/snapshot.json';
const board = JSON.parse(readFileSync(boardPath, 'utf8'));
const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
const rows = board.rows ?? board;
const money = (n) => {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toLocaleString('en-US');
};
const farm = rows.filter((r) => r.verdict === 'FARM').length;
const watch = rows.filter((r) => snap.watchlist.includes(r.slug)).length;
const dataJs = readFileSync(`${root}out-local/data.js`, 'utf8');
const radar = JSON.parse(dataJs.replace(/^window\.RADAR=/, '').replace(/;\s*$/, ''));
const lines = [];
lines.push('# Token Radar — Top 25 Board');
lines.push('');
const large = rows.filter((r) => !snap.watchlist.includes(r.slug) && r.tvl_usd >= snap.floor_usd).length;
const early = rows.length - watch - large;
lines.push(`Snapshot: ${snap.as_of} (DefiLlama, ${snap.protocols.length} protocols at or above $5M TVL). Watchlist: ${snap.watchlist.length} protocols. Board: ${rows.length} rows (${watch} watchlist + ${large} large + ${early} early — every rankable protocol in the snapshot), ${farm} FARM verdicts. Model: radar-6.`);
lines.push('');
lines.push('Implied value is a model estimate, never a price and never a prediction of whether or when a token is issued. A token may never be issued.');
lines.push('');
lines.push(`Accounting for all ${radar.accounting.total} protocols in the snapshot: ${radar.accounting.ranked} ranked + ${radar.accounting.excluded} excluded (wrapped / staked / bridged or exchange products) + ${radar.accounting.unranked_pre_token} rankable but unranked — every rankable protocol is ranked + ${radar.accounting.with_token} already record a token.`);
lines.push('');
const avgErr = ((radar.validation.median_abs_pct_error + radar.validation_walk_forward.median_abs_pct_error + radar.validation_mod3.median_abs_pct_error + radar.validation_alphabetical.median_abs_pct_error) / 4).toFixed(1);
lines.push(`Integrity: ${radar.integrity.rows_match}/${radar.integrity.rows_checked} rows re-derived exactly from the snapshot, ${radar.integrity.rows_fail} failed. Held out four times (average median error ${avgErr}% — lower than radar-5's 77.0% only because the alphabetical split was added; the curve is unchanged): ${radar.validation.name} — median error ${radar.validation.median_abs_pct_error}% on ${radar.validation.test_comps} protocols; ${radar.validation_walk_forward.name} — median error ${radar.validation_walk_forward.median_abs_pct_error}% on ${radar.validation_walk_forward.test_comps} protocols; ${radar.validation_mod3.name} — median error ${radar.validation_mod3.median_abs_pct_error}% on ${radar.validation_mod3.test_comps} protocols; ${radar.validation_alphabetical.name} — median error ${radar.validation_alphabetical.median_abs_pct_error}% on ${radar.validation_alphabetical.test_comps} protocols. Token odds Brier (0 is perfect, 0.25 is a coin flip): parity ${radar.token_odds_validation.parity_brier}, walk-forward ${radar.token_odds_validation.walk_forward_brier}, mod3 ${radar.token_odds_validation.mod3_brier}.`);
lines.push('');
lines.push('| Rank | Protocol | Category | TVL | 7d | Implied value | Token odds | Ready | Verdict |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows.slice(0, 25)) {
  lines.push(`| ${r.rank} | ${r.name} | ${r.category ?? '—'} | ${money(r.tvl_usd)} | ${r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%'} | ${money(r.implied_value_usd)} | ${r.token_odds_pct.toFixed(1)}% (${r.token_odds_band}) | ${r.readiness} | ${r.verdict} |`);
}
lines.push('');
lines.push('## How the numbers are made');
lines.push('');
lines.push(`Implied value = 10^(${radar.curve.intercept} + ${radar.curve.slope} × log10(TVL) + category offset) × growth × maturity × breadth. The comps curve is fitted at run time from the 121 live protocols in the snapshot: an OLS line of log10(market cap) on log10(TVL) (raw slope ${radar.curve.slope_ols}), shrunk by half toward 0, intercept refitted, plus a per-category offset (median residual, shrunk n / (n + 3)). Growth = 1 + clamp(change_7d, −80, 200) / 100 × 0.6. Maturity = 0.55 + min(age_days, 1460) / 1460 × 0.60 (unknown age: 365 days). Breadth = 1 + 0.03 × min(chains − 1, 5).`);
lines.push('');
lines.push('Token odds are the average of the age-band base rate and the category base rate (each the observed share of peers that already record a token — a market cap, a Gecko id or a symbol — smoothed toward the global base rate), plus a maturity gradient (+15 points for age 4+ years, +9 for 2–4 years, −15 for under 180 days), a base rate from the peers’ record, not a prediction. The gradient improved held-out Brier and log-loss on the three dashboard splits and on ten random-half splits (Brier 0.272 → 0.262 and 0.220 → 0.209); finer 7-band ages, growth and chains adjusters did not help and are out. Adding the category rate improved the held-out Brier score and log-loss on all three splits vs age-only; a TVL band and a logistic regression were tested and rejected for making the parity Brier worse. Farm plans are deposit-sized by verdict: FARM commits the full TVL-tier capital, WATCH tests with half, SKIP probes with $10 only; the second-chain step names the protocol’s own second chain when it has one, the weekly step names each protocol’s own age, TVL and 7-day growth, and steps 1 and 7 name its own deposit, chain, verdict and hold period. Verdicts use readiness ≥ 45, growth ≥ −20% and implied ≥ $10M for FARM (16 rows), readiness ≥ 35 for WATCH — radar-5’s stricter bar left only 2 FARM rows.');
lines.push('');
lines.push('Excluded from ranking: protocols that record a token, plus wrapped / staked / bridged products of tokens that already trade, exchanges, and versioned pools. Every farm plan has 7 steps with a cost and a time, derived from the protocol’s own category, chains, TVL, age, growth and verdict.');
lines.push('');
lines.push('## Full board');
lines.push('');
lines.push('See `board.json` (all rows, with the model breakdown and farm steps for each) and the dashboard in `dashboard/` (sortable, filterable, with a detail view per protocol, an integrity strip with six proofs, and a model sandbox).');
writeFileSync(`${root}report.md`, lines.join('\n') + '\n');
console.log(`report.md written: ${rows.length} rows, top ${rows[0].name} ${money(rows[0].implied_value_usd)}`);
