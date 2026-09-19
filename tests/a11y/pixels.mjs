// Visual regression: renders every state from states.mjs (English and German,
// light and dark, desktop; the main states also at phone width) for two
// builds of the site and compares the screenshots byte for byte.
//
//   node tests/a11y/pixels.mjs <baseline-site-dir> [candidate-site-dir]
//
// The candidate defaults to _site/. Timings shown on the page (parse and
// fetch durations) come from performance.now(), which is frozen so both runs
// render the same text; the text cursor is hidden. Screenshots of differing
// states are kept in tests/a11y/.pixels/ for inspection.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { chromePath, rootPath, sitePath } from './lib.mjs';
import { startServers } from './server.mjs';
import { states, installMocks } from './states.mjs';

const baseline = process.argv[2];
const candidate = process.argv[3] ?? sitePath;
if (!baseline) {
  console.error('usage: node tests/a11y/pixels.mjs <baseline-site-dir> [candidate-site-dir]');
  process.exit(2);
}
const OUT = `${rootPath}tests/a11y/.pixels/`;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const PHONE_STATES = new Set(['initial', 'pasted-worst', 'fetched-worst', 'example-kitchen-sink']);
const runs = [];
for (const [lang, path] of [['en', ''], ['de', 'de/']]) {
  for (const scheme of ['light', 'dark']) {
    for (const st of states(path)) {
      runs.push({ id: `${lang}-${scheme}-${st.name}`, st, scheme, width: 1280 });
      if (scheme === 'light' && PHONE_STATES.has(st.name)) runs.push({ id: `${lang}-phone-${st.name}`, st, scheme, width: 390 });
    }
  }
}

async function capture(siteDir) {
  const servers = startServers(`${siteDir.replace(/\/$/, '')}/`);
  await new Promise((r) => setTimeout(r, 300));
  const browser = await puppeteer.launch({ executablePath: await chromePath(), args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] });
  const shots = new Map();
  try {
    for (const run of runs) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: run.width, height: 900 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: run.scheme }]);
      await page.evaluateOnNewDocument(() => {
        performance.now = () => 0;
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent = '* { caret-color: transparent !important; }';
          document.head.append(style);
        });
      });
      await installMocks(page);
      try {
        if (run.st.before) await run.st.before(page);
        await page.goto(run.st.url, { waitUntil: 'networkidle0', timeout: 60000, referer: run.st.referer });
        await run.st.setup(page);
        await page.evaluate(() => document.fonts.ready);
        await new Promise((r) => setTimeout(r, 150));
        shots.set(run.id, await page.screenshot({ fullPage: true, type: 'png' }));
      } catch (err) {
        shots.set(run.id, null);
        console.log(`  ${run.id}: could not reach the state: ${err.message.split('\n')[0]}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    servers.close();
  }
  return shots;
}

const a = await capture(baseline);
const b = await capture(candidate);
let same = 0;
const different = [];
for (const run of runs) {
  const x = a.get(run.id);
  const y = b.get(run.id);
  if (x && y && Buffer.compare(x, y) === 0) same++;
  else {
    different.push(run.id);
    if (x) writeFileSync(`${OUT}${run.id}.baseline.png`, x);
    if (y) writeFileSync(`${OUT}${run.id}.candidate.png`, y);
  }
}
console.log(`pixels: ${same} of ${runs.length} states identical`);
for (const id of different) console.log(`  differs: ${id}`);
process.exit(different.length ? 1 : 0);
