// Local gate check for the token-radar entry. Replicates the seven
// scorer rows from the bounty rules (dashboard_files, board_file,
// sorted_by_value, coverage, farm_steps, screenshots, dossier_matches)
// plus a determinism check (two runs, same bytes). No network.
// Usage: node check.mjs [--input <snapshot.json>] [--out <dir>]
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};
const input = opt('input', '/tmp/token-kit/token-radar-01-kit/input/snapshot.json');
const root = new URL('.', import.meta.url).pathname;
const outBase = opt('out', join(root, 'out-check'));

let passed = 0;
let failed = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) passed++; else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function sha(buf) { return createHash('sha256').update(buf).digest('hex'); }
function run(outDir) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  execFileSync('node', ['main.ts', '--input', input], {
    cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: outDir }, stdio: 'pipe',
  });
}

const out1 = join(outBase, 'run1');
const out2 = join(outBase, 'run2');
try {
  run(out1);
  check('run_completes', true, 'main.ts exited 0');
} catch (e) {
  check('run_completes', false, String(e.message).slice(0, 200));
console.log(`\n${passed} passed / ${failed} failed`);
  process.exit(1);
}
run(out2);
// determinism: same bytes in both runs (board, data, dossier)
const files1 = [];
(function walk(d, rel = '') {
  for (const n of readdirSync(d).sort()) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, `${rel}${n}/`);
    else files1.push(`${rel}${n}`);
  }
})(out1);
let detOk = true;
for (const f of files1) {
  const a = readFileSync(join(out1, f));
  const b = existsSync(join(out2, f)) ? readFileSync(join(out2, f)) : null;
  if (!b || !a.equals(b)) { detOk = false; console.log(`  differs: ${f}`); }
}
check('run_deterministic', detOk, `${files1.length} files compared`);

const snap = JSON.parse(readFileSync(input, 'utf8'));
const board = JSON.parse(readFileSync(join(out1, 'board.json'), 'utf8'));
const rows = board.rows ?? board;
const watch = new Set(snap.watchlist);

// dashboard_files
const dashDir = join(out1, 'dashboard');
let dashOk = true, dashDetail = '';
const dashFiles = existsSync(dashDir) ? readdirSync(dashDir) : [];
if (!dashFiles.includes('index.html')) { dashOk = false; dashDetail = 'no index.html'; }
if (!dashFiles.some((f) => f.endsWith('.css'))) { dashOk = false; dashDetail = 'no .css'; }
if (!dashFiles.some((f) => f.endsWith('.js'))) { dashOk = false; dashDetail = 'no .js'; }
let dashBytes = 0;
for (const f of dashFiles) {
  const p = join(dashDir, f);
  if (!statSync(p).isFile()) { dashOk = false; dashDetail = `${f} is not a file`; break; }
  dashBytes += statSync(p).size;
  const t = readFileSync(p, 'utf8');
  if (/https?:\/\//.test(t) && !/source:/.test(t)) {
    // any http(s) address in dashboard source is refused by the gate
    if (t.includes('http://') || t.includes('https://')) { dashOk = false; dashDetail = `${f} contains a URL`; break; }
  }
}
if (dashBytes > 4 * 1024 * 1024) { dashOk = false; dashDetail = 'dashboard over 4 MiB'; }
check('dashboard_files', dashOk, `${dashFiles.length} files, ${dashBytes} bytes${dashDetail ? ` (${dashDetail})` : ''}`);

// board_file + sorted_by_value + farm_steps
let boardOk = true, boardDetail = '';
if (!Array.isArray(rows) || rows.length < 100 || rows.length > 4000) { boardOk = false; boardDetail = `${rows.length} rows`; }
const slugs = new Set(snap.protocols.map((p) => p.slug));
for (const r of rows) {
  if (!slugs.has(r.slug)) { boardOk = false; boardDetail = `invented slug ${r.slug}`; break; }
  if (!r.name || !Number.isSafeInteger(r.rank) || r.rank <= 0 || !Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 1e14) { boardOk = false; boardDetail = `bad row ${r.slug}`; break; }
}
check('board_file', boardOk, `${rows.length} rows${boardDetail ? ` (${boardDetail})` : ''}`);
check('board_198', rows.length === 198, `${rows.length} rows — every rankable protocol in the snapshot`);
let sortedOk = true;
const ranks = rows.map((r) => r.rank).sort((a, b) => a - b);
for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) sortedOk = false;
for (let i = 1; i < rows.length; i++) if (rows[i].implied_value_usd > rows[i - 1].implied_value_usd) sortedOk = false;
if (rows.length >= 2 && rows[0].implied_value_usd === rows[rows.length - 1].implied_value_usd) sortedOk = false;
check('sorted_by_value', sortedOk, `rank 1 ${rows[0].slug} $${rows[0].implied_value_usd.toLocaleString('en-US')} → rank ${rows.length} $${rows[rows.length - 1].implied_value_usd.toLocaleString('en-US')}`);
const missing = snap.watchlist.filter((s) => !rows.some((r) => r.slug === s));
check('coverage', missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : `all ${snap.watchlist.length} watchlist slugs present`);
let farmOk = true, farmDetail = '';
for (const r of rows) {
  if (!Array.isArray(r.farm_steps) || r.farm_steps.length < 3 || r.farm_steps.length > 12) { farmOk = false; farmDetail = `${r.slug}: ${r.farm_steps?.length} steps`; break; }
  for (const s of r.farm_steps) if (s.length < 20 || s.length > 600) { farmOk = false; farmDetail = `${r.slug}: step ${s.length} chars`; break; }
  if (!farmOk) break;
}
check('farm_steps', farmOk, `${rows.length} rows × ${rows[0].farm_steps.length} steps${farmDetail ? ` (${farmDetail})` : ''}`);

// screenshots
const shotDir = join(out1, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((f) => !f.startsWith('.')).sort() : [];
let shotOk = shots.length >= 3 && shots.length <= 4, shotDetail = `${shots.length} images`;
for (const f of shots) {
  const buf = readFileSync(join(shotDir, f));
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  if (buf.length > 524288) { shotOk = false; shotDetail = `${f} ${buf.length} bytes over 512 KiB`; }
  if (!isPng && !isJpg) { shotOk = false; shotDetail = `${f} not PNG/JPEG`; }
  if (isPng) {
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    if (Math.max(w, h) > 1440 || Math.min(w, h) < 800) { shotOk = false; shotDetail = `${f} ${w}x${h}`; }
  }
}
check('screenshots', shotOk, shotDetail);

// dossier_matches: rebuild with the vendored library and compare bytes
const { buildDossier } = await import('./vendor/makefun-board.ts');
let dossierOk = false, dossierDetail = '';
try {
  const rebuilt = buildDossier(out1, { text_max_bytes: 65536, screenshots: { max: 4, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } });
  const written = readFileSync(join(out1, 'dossier.json'));
  dossierOk = Buffer.from(rebuilt).equals(written);
  dossierDetail = `${written.length} bytes, sha ${sha(written).slice(0, 12)}`;
} catch (e) { dossierDetail = String(e.message).slice(0, 160); }
check('dossier_matches', dossierOk, dossierDetail);

// no http(s) in dashboard source (gate rule, stricter re-check)
let netOk = true;
for (const f of dashFiles) {
  const t = readFileSync(join(dashDir, f), 'utf8');
  if (t.includes('http://') || t.includes('https://')) { netOk = false; console.log(`  URL in dashboard/${f}`); }
}
check('dashboard_no_network_urls', netOk, '');

// --- radar-5/6 additions: read the dashboard data (window.RADAR=...) ---
const dataJs = readFileSync(join(out1, 'data.js'), 'utf8');
const radar = JSON.parse(dataJs.replace(/^window\.RADAR=/, '').replace(/;\s*$/, ''));
const radarRows = radar.rows ?? [];

// token_odds: every row carries a base rate 0-100 with its band
let oddsOk = radarRows.length === rows.length, oddsDetail = '';
for (const r of radarRows) {
  if (typeof r.token_odds_pct !== 'number' || r.token_odds_pct < 0 || r.token_odds_pct > 100 || typeof r.token_odds_band !== 'string' || r.token_odds_band.length === 0) { oddsOk = false; oddsDetail = `${r.slug}: odds ${r.token_odds_pct}`; break; }
}
if (oddsOk) oddsDetail = `${Math.min(...radarRows.map((r) => r.token_odds_pct)).toFixed(1)}%–${Math.max(...radarRows.map((r) => r.token_odds_pct)).toFixed(1)}% across ${radarRows.length} rows`;
check('token_odds', oddsOk, oddsDetail);

// validation_four: four held-out splits (radar-6 adds the
// alphabetical split), each with >=10 test comps, and the average
// median error must beat radar-4's 90.4%
const vA = radar.validation, vB = radar.validation_walk_forward, vC = radar.validation_mod3, vD = radar.validation_alphabetical;
const avgErr = vA && vB && vC && vD ? (vA.median_abs_pct_error + vB.median_abs_pct_error + vC.median_abs_pct_error + vD.median_abs_pct_error) / 4 : 999;
const valOk = !!vA && !!vB && !!vC && !!vD && vA.test_comps >= 10 && vB.test_comps >= 10 && vC.test_comps >= 10 && vD.test_comps >= 10 && new Set([vA.name, vB.name, vC.name, vD.name]).size === 4 && avgErr < 85;
check('validation_four', valOk, valOk ? `parity ${vA.test_comps} test, ${vA.median_abs_pct_error}% err · walk-forward ${vB.test_comps} test, ${vB.median_abs_pct_error}% err · mod3 ${vC.test_comps} test, ${vC.median_abs_pct_error}% err · alphabetical ${vD.test_comps} test, ${vD.median_abs_pct_error}% err · avg ${avgErr.toFixed(1)}%` : `average held-out error ${avgErr.toFixed(1)}% or a split is missing`);

// verdict_distribution: the radar-6 thresholds must produce a
// usable farm guide — a board that almost never says FARM (radar-5
// had 2) is not one, and a board that says FARM on half the rows
// is not one either
const nFarm = rows.filter((r) => r.verdict === 'FARM').length;
const nWatch = rows.filter((r) => r.verdict === 'WATCH').length;
const nSkip = rows.filter((r) => r.verdict === 'SKIP').length;
check('verdict_distribution', nFarm >= 5 && nFarm <= 40 && nWatch >= 30 && nFarm + nWatch + nSkip === rows.length, `${nFarm} FARM / ${nWatch} WATCH / ${nSkip} SKIP`);

// integrity_proof: every board row re-derives from its own stored
// inputs (rounded multiples, so 0.5% tolerance) and the build-time
// exact proof reports 0 failures
let integOk = true, integDetail = '';
const integ = radar.integrity;
if (!integ || integ.rows_checked !== rows.length || integ.rows_fail !== 0) { integOk = false; integDetail = 'build-time integrity proof failed or missing'; }
let rederived = 0;
for (const r of radarRows) {
  const base = Math.pow(10, r.curve_intercept + r.curve_slope * Math.log10(Math.max(r.tvl_usd, 1)) + r.category_offset);
  const g = Math.max(-80, Math.min(200, r.change_7d == null ? 0 : r.change_7d));
  const gm = 1 + (g / 100) * 0.6;
  const ageD = r.age_days == null ? 365 : r.age_days;
  const mat = 0.55 + (Math.min(ageD, 1460) / 1460) * 0.6;
  const br = 1 + 0.03 * Math.min(Math.max(r.chains.length - 1, 0), 5);
  const v = Math.max(1, Math.round(base * gm * mat * br));
  if (Math.abs(v - r.implied_value_usd) / r.implied_value_usd <= 0.005) rederived++;
}
if (rederived !== rows.length) { integOk = false; integDetail = `${rederived}/${rows.length} rows re-derive`; }
if (integOk) integDetail = `${integ.rows_match}/${integ.rows_checked} rows re-derived exactly at build, ${rederived}/${rows.length} within 0.5% from stored inputs`;
check('integrity_proof', integOk, integDetail);

// accounting_758: ranked + excluded + unranked + with-token = 758
const acct = radar.accounting;
const acctOk = !!acct && acct.ranked + acct.excluded + acct.unranked_pre_token + acct.with_token === acct.total && acct.total === snap.protocols.length;
check('accounting_758', acctOk, acctOk ? `${acct.ranked} ranked + ${acct.excluded} excluded + ${acct.unranked_pre_token} unranked + ${acct.with_token} with a token = ${acct.total}` : 'accounting does not sum to the snapshot total');

// farm_deposit_sized: deposit is sized by verdict (SKIP $10 probe,
// WATCH half tier, FARM full tier) and step 2 varies across rows
let farmDepOk = true, farmDepDetail = '';
const step2 = new Set();
for (const r of rows) {
  step2.add(r.farm_steps[1]);
  if (r.verdict === 'SKIP' && !r.farm_steps[1].includes('$10')) { farmDepOk = false; farmDepDetail = `${r.slug}: SKIP step 2 has no $10 probe`; break; }
  if (typeof r.farm_capital_usd !== 'number' || r.farm_capital_usd <= 0) { farmDepOk = false; farmDepDetail = `${r.slug}: no farm capital`; break; }
}
if (farmDepOk && step2.size < rows.length / 2) { farmDepOk = false; farmDepDetail = `only ${step2.size} distinct step-2 texts for ${rows.length} rows`; }
if (farmDepOk) farmDepDetail = `${step2.size} distinct step-2 texts, SKIP rows probe at $10`;
check('farm_deposit_sized', farmDepOk, farmDepDetail);


// comps_curve: a real fitted curve — slope in (0, 1), OLS slope
// reported, and the curve's held-out average already checked above
const curve = radar.curve;
const curveOk = !!curve && typeof curve.slope === 'number' && curve.slope > 0.1 && curve.slope < 0.6 && typeof curve.slope_ols === 'number' && curve.slope_ols > 0.4 && curve.slope_ols < 0.8;
check('comps_curve', curveOk, curveOk ? `log10(mcap) = ${curve.intercept.toFixed(3)} + ${curve.slope.toFixed(3)} x log10(TVL), OLS slope ${curve.slope_ols.toFixed(3)} shrunk by half` : 'curve missing or slope out of range');

// token_odds_validation: Brier scores on three held-out splits,
// all below the 0.25 coin-flip level on the two slug splits
const tov = radar.token_odds_validation;
const tovOk = !!tov && tov.parity_brier < 0.25 && tov.mod3_brier < 0.25 && tov.walk_forward_brier < 0.45;
check('token_odds_validation', tovOk, tovOk ? `Brier parity ${tov.parity_brier} · walk-forward ${tov.walk_forward_brier} · mod3 ${tov.mod3_brier}` : 'token-odds Brier validation missing or too high');

// farm step 3 specificity: age + TVL make step 3 near-unique per row
const step3 = new Set(rows.map((r) => r.farm_steps[2]));
check('farm_step3_specific', step3.size >= 150, `${step3.size} distinct step-3 texts for ${rows.length} rows`);

// farm steps 1 and 7 specificity (radar-6): step 1 names the
// protocol's own deposit and chain, step 7 its verdict and hold
const step1 = new Set(rows.map((r) => r.farm_steps[0]));
const step7 = new Set(rows.map((r) => r.farm_steps[6]));
check('farm_steps_1_and_7_specific', step1.size >= rows.length * 0.9 && step7.size >= rows.length * 0.9, `${step1.size} distinct step-1 texts, ${step7.size} distinct step-7 texts for ${rows.length} rows`);

// token-odds maturity adjustment: every row carries the radar-6
// gradient adjustment it was given (-15, 0, +9 or +15 points)
const adjOk = radarRows.every((r) => [-15, 0, 9, 15].includes(r.token_odds_maturity_adj_pct));
check('token_odds_maturity_adj', adjOk, adjOk ? `adjustments in {-15, 0, +9, +15} on all ${radarRows.length} rows` : 'a row carries an unexpected maturity adjustment');

console.log(`\n${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
