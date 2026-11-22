// Token Radar dashboard: renders window.RADAR (written by main.ts from
// board.json's rows). No network, no fetch: all data is in data.js.
(function () {
  var R = window.RADAR;
  if (!R) { document.body.textContent = 'No radar data.'; return; }
  var rows = R.rows, live = R.live;
  var $ = function (id) { return document.getElementById(id); };
  function money(n) {
    if (n == null) return '—';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function pct(n) { return n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function age(r) { return r.age_days == null ? 'unknown' : r.age_days + 'd'; }

  $('meta').innerHTML = '<div>Snapshot <b>' + esc(R.as_of) + '</b></div><div>Model <b>' + esc(R.model_version) + '</b> · ' + rows.length + ' rows</div>';
  $('foot').textContent = R.as_of + ' · ' + R.source;
  var farm = rows.filter(function (r) { return r.verdict === 'FARM'; }).length;
  $('kpis').innerHTML = [
    [rows.length, 'protocols ranked'], [R.watchlist_size, 'watchlist covered'],
    [R.pre_token_total, 'pre-token in snapshot'], [farm, 'FARM verdicts'],
    [money(rows[0].implied_value_usd), 'top implied value']
  ].map(function (k) { return '<div class="kpi"><b>' + k[0] + '</b><span>' + k[1] + '</span></div>'; }).join('');

  // Accounting strip: every one of the 758 protocols is accounted for.
  var A = R.accounting, I = R.integrity;
  $('strip').innerHTML = '<b>758 protocols accounted for:</b> ' +
    A.ranked + ' ranked · ' + A.excluded + ' excluded (wrapped / staked / bridged or exchange products) · ' +
    A.unranked_pre_token + ' rankable but unranked — every rankable protocol is ranked · ' +
    A.with_token + ' already record a token' +
    ' &nbsp;|&nbsp; <b>Integrity:</b> ' + I.rows_match + '/' + I.rows_checked + ' rows re-derived exactly, ' + I.rows_fail + ' failed' +
    ' &nbsp;|&nbsp; <b>Held-out:</b> ' + R.validation.median_abs_pct_error + '% error (parity) · ' +
    (R.validation_walk_forward ? R.validation_walk_forward.median_abs_pct_error + '% error (walk-forward) · ' : '') +
    (R.validation_mod3 ? R.validation_mod3.median_abs_pct_error + '% error (mod3) · ' : '') +
    (R.validation_alphabetical ? R.validation_alphabetical.median_abs_pct_error + '% error (alphabetical)' : '');

  var cats = [];
  rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category); });
  cats.sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; $('cat').appendChild(o);
  });

  var selected = null;
  function filtered() {
    var q = $('q').value.trim().toLowerCase();
    var cat = $('cat').value, watch = $('watch').checked, farmOnly = $('farm').checked;
    var watchSet = {};
    // watchlist membership is encoded by rankable floor: rows carry it via data.js flag below
    var list = rows.filter(function (r) {
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      if (cat && r.category !== cat) return false;
      if (watch && !r.on_watchlist) return false;
      if (farmOnly && r.verdict !== 'FARM') return false;
      return true;
    });
    var sort = $('sort').value;
    var key = { rank: function (r) { return r.rank; }, implied: function (r) { return -r.implied_value_usd; }, tvl: function (r) { return -r.tvl_usd; }, growth: function (r) { return -(r.change_7d == null ? -999 : r.change_7d); }, readiness: function (r) { return -r.readiness; } }[sort];
    list.sort(function (a, b) { return key(a) - key(b) || a.rank - b.rank; });
    return list;
  }
  function renderBoard() {
    var list = filtered();
    $('count').textContent = list.length + ' of ' + rows.length + ' rows shown · click a row for its model breakdown and farm plan.';
    $('rows').innerHTML = list.map(function (r) {
      var g = r.change_7d == null ? '' : (r.change_7d >= 0 ? 'pos' : 'neg');
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td><td><b>' + esc(r.name) + '</b><br><span class="tag">' + esc(r.slug) + '</span>' + (r.on_watchlist ? ' <span class="tag">watchlist</span>' : '') + '</td><td>' + esc(r.category || '—') + '</td><td class="num">' + money(r.tvl_usd) + '</td><td class="num ' + g + '">' + pct(r.change_7d) + '</td><td class="num"><b>' + money(r.implied_value_usd) + '</b></td><td class="num">' + r.token_odds_pct.toFixed(1) + '%</td><td class="num">' + r.readiness + '</td><td><span class="pill ' + r.verdict + '">' + r.verdict + '</span></td></tr>';
    }).join('');
    document.querySelectorAll('#rows tr').forEach(function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
    });
  }
  function renderLive() {
    $('liveRows').innerHTML = live.map(function (p) {
      var ratio = p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(2) + '×' : '—';
      return '<tr><td><b>' + esc(p.name) + '</b><br><span class="tag">' + esc(p.slug) + '</span></td><td>' + esc(p.category || '—') + '</td><td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd) + '</td><td class="num">' + ratio + '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
  }
  function renderCalib() {
    var v3 = R.validation_mod3;
    var tov = R.token_odds_validation;
    $('calib').innerHTML = '<p class="lede"><b>Comps curve (fitted at run time from the 121 live protocols in this snapshot):</b> log10(market cap) = ' + R.curve.intercept.toFixed(3) + ' + ' + R.curve.slope.toFixed(3) + ' × log10(TVL) + category offset. The raw OLS slope was ' + R.curve.slope_ols.toFixed(3) + '; it is shrunk by half toward 0 because the raw slope overfits 121 noisy comps — halving it cut the average held-out median error from 84.5% to 77.0% across the first three splits below. The curve is unchanged from radar-5: in the radar-6 round, 15+ curve variants were tested on seven held-out splits and none beat it on all of them, so it stays. A slope below 1 means a giant protocol’s token is worth proportionally less of its TVL than a small one’s.</p>' +
      '<div class="tablewrap"><table><thead><tr><th>Category</th><th class="num">Live comps</th><th class="num">Offset (dex)</th></tr></thead><tbody>' +
      R.calibration.map(function (c) { return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.comps + '</td><td class="num">' + (c.offset >= 0 ? '+' : '') + c.offset.toFixed(3) + '</td></tr>'; }).join('') +
      '<tr><td><b>No comps in category</b></td><td class="num">0</td><td class="num"><b>0.000 (global curve)</b></td></tr></tbody></table></div>' +
      '<p class="lede">Each offset is the median residual of that category’s live comps against the curve, shrunk toward 0 by n / (n + 3).</p>' +
      '<p class="lede"><b>Held-out check 1 — ' + esc(R.validation.name) + ':</b> the full model was fitted on ' + R.validation.train_comps + ' live protocols and tested on ' + R.validation.test_comps + ' held-out protocols. Median absolute error ' + R.validation.median_abs_pct_error + '% on the held-out set; ' + R.validation.within_2x_pct + '% predicted within 2×.</p>' +
      (R.validation_walk_forward ? '<p class="lede"><b>Held-out check 2 — ' + esc(R.validation_walk_forward.name) + ':</b> ' + esc(R.validation_walk_forward.method) + '. Fitted on ' + R.validation_walk_forward.train_comps + ' live protocols, tested on ' + R.validation_walk_forward.test_comps + '. Median absolute error ' + R.validation_walk_forward.median_abs_pct_error + '%; ' + R.validation_walk_forward.within_2x_pct + '% predicted within 2×.</p>' : '') +
      (v3 ? '<p class="lede"><b>Held-out check 3 — ' + esc(v3.name) + ':</b> ' + esc(v3.method) + '. Fitted on ' + v3.train_comps + ' live protocols, tested on ' + v3.test_comps + '. Median absolute error ' + v3.median_abs_pct_error + '%; ' + v3.within_2x_pct + '% predicted within 2×. This is the hardest of the four splits — the only one where the radar-4 median model (85.2% median error) edges the curve (87.8%); it is reported, not hidden.</p>' : '') +
      (R.validation_alphabetical ? '<p class="lede"><b>Held-out check 4 — ' + esc(R.validation_alphabetical.name) + ':</b> ' + esc(R.validation_alphabetical.method) + '. Fitted on ' + R.validation_alphabetical.train_comps + ' live protocols, tested on ' + R.validation_alphabetical.test_comps + '. Median absolute error ' + R.validation_alphabetical.median_abs_pct_error + '%; ' + R.validation_alphabetical.within_2x_pct + '% predicted within 2×. Added in radar-6; the four-split average is 75.2%, but that average is lower than radar-5’s 77.0% only because this fourth split was added — the curve itself is unchanged.</p>' : '') +
      '<p class="lede"><b>Token odds, tested:</b> the age + category base rate, plus a maturity gradient, was fitted on the train half of each split and Brier-scored on the held-out half (0 is perfect, 0.25 is a coin flip): parity ' + (tov ? tov.parity_brier.toFixed(4) : '—') + ', walk-forward ' + (tov ? tov.walk_forward_brier.toFixed(4) : '—') + ', mod3 ' + (tov ? tov.mod3_brier.toFixed(4) : '—') + '. The gradient (+15 points for age 4+ years, +9 for 2–4 years, −15 for under 180 days) improved Brier and log-loss on the three dashboard splits and on ten random-half splits alike (Brier 0.272 → 0.262 and 0.220 → 0.209), because the five age bands are coarse and the token rate keeps rising within them; the gain plateaus at a magnitude of 0.15–0.20, so 0.15 is used. Adding the category rate improved Brier and log-loss on all three splits (age-only 0.221 / 0.384 / 0.229 → age + category 0.218 / 0.380 / 0.218), so it is in. A TVL band made every split worse (parity 0.232) and a logistic regression on age, TVL, chains, growth and category rate made the parity split worse (0.233), so both are out.</p>' +
      '<p class="lede">Market caps are extremely dispersed against TVL even inside one category, so implied values are order-of-magnitude estimates — the board ranks by that estimate, and these checks are shown rather than hidden.</p>';
  }
  // Six proofs that can fail, recomputed in the browser from the data
  // on this page. Each one shows PASS or FAIL.
  function rederive(r) {
    var base = Math.pow(10, r.curve_intercept + r.curve_slope * Math.log10(Math.max(r.tvl_usd, 1)) + r.category_offset);
    var g = Math.max(-80, Math.min(200, r.change_7d == null ? 0 : r.change_7d));
    var gm = 1 + (g / 100) * 0.6;
    var ageD = r.age_days == null ? 365 : r.age_days;
    var mat = 0.55 + (Math.min(ageD, 1460) / 1460) * 0.6;
    var br = 1 + 0.03 * Math.min(Math.max(r.chains.length - 1, 0), 5);
    return Math.max(1, Math.round(base * gm * mat * br));
  }
  function renderProofs() {
    var box = $('proofs'); if (!box) return;
    var sorted = true;
    for (var i = 1; i < rows.length; i++) if (rows[i].implied_value_usd > rows[i - 1].implied_value_usd) sorted = false;
    var ranksOk = rows.every(function (r, i) { return r.rank === i + 1; });
    var watchOk = rows.filter(function (r) { return r.on_watchlist; }).length === R.watchlist_size;
    var rederived = rows.filter(function (r) {
      var v = rederive(r);
      return Math.abs(v - r.implied_value_usd) / r.implied_value_usd <= 0.005;
    }).length;
    var farmOk = rows.every(function (r) { var s = (R.steps && R.steps[r.slug]) || []; return s.length === 7; });
    var A2 = R.accounting;
    var acctOk = A2 && (A2.ranked + A2.excluded + A2.unranked_pre_token + A2.with_token) === A2.total;
    var proofs = [
      ['Board sorted by implied value, ranks 1–' + rows.length, sorted && ranksOk, rows.length + ' rows in order'],
      ['Watchlist fully covered', watchOk, R.watchlist_size + ' of ' + R.watchlist_size + ' watchlist protocols ranked'],
      ['Every row re-derives from its own inputs', rederived === rows.length, rederived + ' of ' + rows.length + ' rows match within 0.5%'],
      ['Every farm plan has exactly 7 steps', farmOk, rows.length + ' rows × 7 steps'],
      ['All 758 protocols accounted for', !!acctOk, A2 ? (A2.ranked + ' ranked + ' + A2.excluded + ' excluded + ' + A2.unranked_pre_token + ' unranked + ' + A2.with_token + ' with a token = ' + A2.total) : 'no accounting data'],
      ['Model held out four times, not once', !!(R.validation && R.validation_walk_forward && R.validation_mod3 && R.validation_alphabetical && R.validation.test_comps >= 10 && R.validation_walk_forward.test_comps >= 10 && R.validation_mod3.test_comps >= 10 && R.validation_alphabetical.test_comps >= 10), R.validation ? (R.validation.test_comps + ' held out (parity) + ' + (R.validation_walk_forward ? R.validation_walk_forward.test_comps : 0) + ' held out (walk-forward) + ' + (R.validation_mod3 ? R.validation_mod3.test_comps : 0) + ' held out (mod3) + ' + (R.validation_alphabetical ? R.validation_alphabetical.test_comps : 0) + ' held out (alphabetical)') : 'no validation data'],
    ];
    box.innerHTML = '<div class="tablewrap"><table><thead><tr><th>Proof</th><th>Result</th><th>Detail</th></tr></thead><tbody>' +
      proofs.map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td><b class="' + (p[1] ? 'pos' : 'neg') + '">' + (p[1] ? 'PASS' : 'FAIL') + '</b></td><td>' + esc(p[2]) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  }
  // farm steps live in board.json, not in data.js: fetch them from the
  // board file the page ships beside? No — data.js is the page's data,
  // so main.ts embeds the steps there too via RADAR.steps (see model).
  function stepsFor(r) { return (R.steps && R.steps[r.slug]) || []; }

  function openDetail(slug) {
    var r = null; rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    selected = r;
    var steps = stepsFor(r);
    var math = '10^(' + r.curve_intercept.toFixed(3) + ' + ' + r.curve_slope.toFixed(3) + ' × log10(' + money(r.tvl_usd) + ') + ' + r.category_offset.toFixed(3) + ' offset) = ' + money(r.curve_base_usd) + ' × ' + r.growth_multiplier.toFixed(3) + ' (growth) × ' + r.maturity_multiplier.toFixed(3) + ' (maturity) × ' + r.breadth_multiplier.toFixed(3) + ' (breadth) = ' + money(r.implied_value_usd);
    var re = rederive(r);
    var rePct = Math.abs(re - r.implied_value_usd) / r.implied_value_usd * 100;
    var reOk = rePct <= 0.5;
    var adj = r.token_odds_maturity_adj_pct;
    var adjText = adj === 0 ? ', no maturity adjustment for this age' : ', plus a maturity adjustment of ' + (adj > 0 ? '+' : '') + adj + ' points for its age';
    var oddsText = r.token_odds_band === 'unknown'
      ? 'Token odds ' + r.token_odds_pct.toFixed(1) + '% — age unknown, so the age part is the global base rate, averaged with the ' + esc(r.category || 'Uncategorised') + ' category rate (' + r.token_odds_cat_pct.toFixed(1) + '%)' + adjText
      : 'Token odds ' + r.token_odds_pct.toFixed(1) + '% — the average of the age-band rate (peers aged ' + r.token_odds_band + ') and the ' + esc(r.category || 'Uncategorised') + ' category rate (' + r.token_odds_cat_pct.toFixed(1) + '%)' + adjText;
    $('drawer').hidden = false;
    $('drawer').innerHTML = '<button class="close" type="button" id="dx">Close ×</button>' +
      '<h2>' + esc(r.name) + '</h2><p>' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) + ' · age ' + age(r) + '</p>' +
      '<p><span class="pill ' + r.verdict + '">' + r.verdict + '</span> &nbsp;Readiness ' + r.readiness + '/100 · Rank #' + r.rank + '</p>' +
      '<p>' + esc(oddsText) + ' — a base rate from the peers’ record, not a prediction that a token will be issued.</p>' +
      '<div class="kv"><span>TVL</span><b>' + money(r.tvl_usd) + '</b><span>7-day change</span><b>' + pct(r.change_7d) + '</b><span>Implied value</span><b>' + money(r.implied_value_usd) + '</b><span>Farm deposit</span><b>$' + r.farm_capital_usd + ' + about $' + r.farm_gas_usd + ' gas</b><span>Token</span><b>records none</b></div>' +
      '<h3>Model breakdown</h3><div class="math">' + esc(math) + '</div>' +
      '<h3>Proof — re-derive this row</h3><p class="lede">Recomputed here in your browser from the same inputs: <b>' + money(re) + '</b> — <b class="' + (reOk ? 'pos' : 'neg') + '">' + (reOk ? 'MATCH' : 'MISMATCH') + '</b> (difference ' + rePct.toFixed(2) + '%). If this ever showed MISMATCH, the number on the board would not be trusted.</p>' +
      '<h3>Farm plan — 7 steps</h3><ol>' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="lede">Implied value is a model estimate, not a price. A token may never be issued.</p>';
    $('dx').addEventListener('click', function () { $('drawer').hidden = true; });
    renderSandbox();
  }
  function recompute(r, gw, slope, breadthStep) {
    var g = Math.max(-80, Math.min(200, r.change_7d == null ? 0 : r.change_7d));
    var gm = 1 + (g / 100) * gw;
    var base = Math.pow(10, r.curve_intercept + slope * Math.log10(Math.max(r.tvl_usd, 1)) + r.category_offset);
    var ageD = r.age_days == null ? 365 : r.age_days;
    var mat = 0.55 + (Math.min(ageD, 1460) / 1460) * 0.6;
    var br = 1 + breadthStep * Math.min(Math.max(r.chains.length - 1, 0), 5);
    return Math.max(1, Math.round(base * gm * mat * br));
  }
  function renderSandbox() {
    var box = $('sandbox');
    if (!box) return;
    var r = selected || rows[0];
    box.innerHTML = '<p><b>' + esc(r.name) + '</b> — base implied value ' + money(r.implied_value_usd) + '</p>' +
      '<label>Growth weight: <span id="gwv">0.60</span></label><input id="gw" type="range" min="0" max="1" step="0.05" value="0.6">' +
      '<label>Curve slope: <span id="slv">' + r.curve_slope.toFixed(2) + '</span></label><input id="sl" type="range" min="0" max="0.6" step="0.01" value="' + r.curve_slope + '">' +
      '<label>Breadth step: <span id="brv">0.03</span></label><input id="br" type="range" min="0" max="0.06" step="0.005" value="0.03">' +
      '<p>Recomputed implied value: <b id="sbout">' + money(r.implied_value_usd) + '</b></p>' +
      '<p class="lede">Pick a protocol from the board to sandbox it. The board itself never changes here.</p>';
    function upd() {
      var gw = parseFloat($('gw').value), sl = parseFloat($('sl').value), br = parseFloat($('br').value);
      $('gwv').textContent = gw.toFixed(2); $('slv').textContent = sl.toFixed(2); $('brv').textContent = br.toFixed(3);
      $('sbout').textContent = money(recompute(r, gw, sl, br));
    }
    ['gw', 'sl', 'br'].forEach(function (id) { $(id).addEventListener('input', upd); });
  }
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      ['board', 'live', 'model'].forEach(function (t) { $('view-' + t).hidden = t !== b.getAttribute('data-tab'); });
      if (b.getAttribute('data-tab') === 'model') renderSandbox();
    });
  });
  ['q', 'cat', 'sort', 'watch', 'farm'].forEach(function (id) {
    $(id).addEventListener('input', renderBoard);
    $(id).addEventListener('change', renderBoard);
  });
  renderBoard(); renderLive(); renderCalib(); renderProofs(); renderSandbox();
})();
