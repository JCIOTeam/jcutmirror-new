// scripts/probe-pages-real.mjs
// 用真 Chromium 访问 vite preview 上的每个路由，捕获 console.error / 页面崩溃，
// 并验证关键文本出现在 DOM 里。比 jsdom 真实得多（支持 ES modules、import.meta、CSS-in-JS）。
//
// 用途：每次改动 vite.config.ts (尤其是 manualChunks) 之后跑一遍，防止 TDZ 类
//      "Cannot access 'X' before initialization" 这种只在 minified 运行时才出现的 bug
//      把生产环境推白屏。
//
// 一次性运行（不需要长期持有 puppeteer-core 依赖）：
//      npm i --no-save puppeteer-core
//      node scripts/probe-pages-real.mjs
//
// 退出码：所有路由 ok 退 0，任何路由有 page error / console error / missing text 退 1。
// 适合放到 CI 里 vite build 之后跑。

import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const CHROME = '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome';

const ROUTES = [
  { path: '/', expect: ['JCUT'] },
  { path: '/mirrors', expect: ['JCUT'] },                       // redirect to home
  { path: '/mirrors/ubuntu', expect: ['Ubuntu'] },
  { path: '/mirrors/ubuntu?tab=files', expect: ['Ubuntu'] },
  { path: '/status', expect: ['JCUT'] },
  { path: '/news', expect: ['JCUT'] },
  { path: '/news/something', expect: ['JCUT'] },
  { path: '/this-route-does-not-exist', expect: ['404'] },
];

async function startPreview() {
  console.log('Starting vite preview...');
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  for (let i = 0; i < 20; i++) {
    await wait(500);
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`);
      if (r.ok) {
        console.log('preview ready\n');
        return proc;
      }
    } catch {
      /* retry */
    }
  }
  proc.kill();
  throw new Error('preview did not start in time');
}

async function probe(browser, route) {
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning' || msg.type() === 'warn') warnings.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => failedRequests.push(`${req.url()} ${req.failure()?.errorText}`));

  // mock backend so the page does not error out on /jobs and /api/...
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.endsWith('/jobs')) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'ubuntu',
            upstream: 'rsync://archive.ubuntu.com/ubuntu/',
            status: 'success',
            size: '500G',
            last_update_ts: 1700000000,
            next_schedule_ts: 1700086400,
            last_ended_ts: 1700000000,
          },
        ]),
      });
    }
    if (url.includes('/api/is_campus_network')) {
      return req.respond({ status: 200, contentType: 'text/plain', body: '1' });
    }
    if (url.includes('/grafana/')) {
      return req.respond({ status: 404, body: '' });
    }
    req.continue();
  });

  const url = `http://127.0.0.1:${PORT}${route.path}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10_000 });
  } catch (e) {
    pageErrors.push(`navigation: ${e.message}`);
  }

  // give React a beat to commit
  await wait(800);

  const rootText = await page.evaluate(() => {
    const r = document.getElementById('root');
    return r ? (r.textContent || '').replace(/\s+/g, ' ').trim() : '';
  });
  const title = await page.title();
  const htmlLang = await page.evaluate(() => document.documentElement.lang);

  const haystack = `${title} ${rootText}`;
  const missing = route.expect.filter((needle) => !haystack.includes(needle));

  await page.close();

  return {
    path: route.path,
    title,
    htmlLang,
    rootBytes: rootText.length,
    rootPreview: rootText.slice(0, 100),
    missing,
    errors,
    warnings,
    pageErrors,
    failedRequests,
  };
}

const server = await startPreview();
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const results = [];
for (const route of ROUTES) {
  const r = await probe(browser, route);
  results.push(r);
  const verdict =
    r.pageErrors.length || r.errors.length
      ? '❌ ERR'
      : r.missing.length
        ? '⚠ MISS'
        : '✅ OK';
  console.log(
    `${verdict}  ${route.path.padEnd(34)} root=${String(r.rootBytes).padStart(5)}b  errs=${r.errors.length}  pageErrs=${r.pageErrors.length}  missing=[${r.missing.join(',')}]`
  );
}

console.log('\n=== Errors / details for non-OK routes ===');
let bad = 0;
for (const r of results) {
  if (r.pageErrors.length === 0 && r.errors.length === 0 && r.missing.length === 0) continue;
  bad++;
  console.log(`\n${r.path}`);
  console.log(`  title: ${r.title}`);
  console.log(`  html lang: ${r.htmlLang}`);
  console.log(`  root preview: ${r.rootPreview}`);
  if (r.pageErrors.length) {
    console.log('  PAGE ERRORS:');
    for (const e of r.pageErrors) console.log(`    - ${e.slice(0, 250)}`);
  }
  if (r.errors.length) {
    console.log('  CONSOLE ERRORS:');
    for (const e of r.errors.slice(0, 5)) console.log(`    - ${e.slice(0, 250)}`);
  }
  if (r.failedRequests.length) {
    console.log('  FAILED REQUESTS:');
    for (const f of r.failedRequests.slice(0, 3)) console.log(`    - ${f.slice(0, 200)}`);
  }
}

await browser.close();
server.kill();
process.exit(bad > 0 ? 1 : 0);
