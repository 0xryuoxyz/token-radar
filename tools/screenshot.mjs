// Screenshot the dashboard with Playwright (Chromium already installed
// in ~/.cache/ms-playwright). Serves the generated /output over a local
// static server, captures 3 views, writes them to screenshots/.
// Usage: node tools/screenshot.mjs [outDir]  (default: out-local)
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/tmp/pw/package.json');
const { chromium } = require('playwright-core');

const root = new URL('..', import.meta.url).pathname;
const outDir = process.argv[2] ?? join(root, 'out-local');
const shotDir = join(root, 'screenshots');
mkdirSync(shotDir, { recursive: true });

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = join(outDir, url === '/' ? 'dashboard/index.html' : url.replace(/^\/+/, ''));
  if (!existsSync(file) || !file.startsWith(outDir)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`http://127.0.0.1:${port}/dashboard/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(600);

// 1 — board
await page.screenshot({ path: join(shotDir, '1-board.png') });
// 2 — detail: click the first row
await page.click('#rows tr:first-child');
await page.waitForTimeout(400);
await page.screenshot({ path: join(shotDir, '2-detail.png') });
await page.click('#dx');
await page.waitForTimeout(200);
// 3 — filtered: watchlist only
await page.check('#watch');
await page.waitForTimeout(400);
await page.screenshot({ path: join(shotDir, '3-filtered.png') });

await browser.close();
server.close();
for (const f of ['1-board.png', '2-detail.png', '3-filtered.png']) {
  const p = join(shotDir, f);
  console.log(f, readFileSync(p).length, 'bytes');
}
console.log('screenshots written to', shotDir);
