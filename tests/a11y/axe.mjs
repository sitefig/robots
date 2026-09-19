// Checker 1: axe-core in headless Chrome, on every generated language page
// as served and on every interactive state of the page (tests/a11y/states.mjs)
// in English and German, each in the light and the dark theme. The DOM of
// every state is also saved for the html-validate checker.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer';
import { pages, requireWasm, chromePath, rootPath } from './lib.mjs';
import { startServers } from './server.mjs';
import { states, installMocks, BASE } from './states.mjs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const OPTIONS = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };
export const SNAPSHOTS = `${rootPath}tests/a11y/.snapshots/`;

requireWasm();
rmSync(SNAPSHOTS, { recursive: true, force: true });
mkdirSync(SNAPSHOTS, { recursive: true });
const servers = startServers();
await new Promise((r) => setTimeout(r, 300));
const launch = async () => puppeteer.launch({ executablePath: await chromePath(), args: ['--no-sandbox', '--disable-gpu'] });
let browser = await launch();
// A crashed Chrome fails one page, is reported, and is replaced, instead of
// ending the run with a bare protocol error that names no page.
async function ensureBrowser() {
  if (browser.connected) return;
  console.log('  Chrome disconnected; relaunching');
  browser = await launch();
}
// Opening a tab right after closing the press page sometimes fails in CI
// with "Target.createTarget: Session with given id not found" while Chrome
// stays healthy; a short retry gets the tab.
async function openPage(target) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await target.newPage();
    } catch (err) {
      if (attempt >= 3 || !browser.connected) throw err;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
}
let violations = 0;
let checked = 0;
let failures = 0;

async function audit(page, label, snapshot) {
  await page.evaluate(axeSource);
  const result = await page.evaluate((options) => axe.run(document, options), OPTIONS);
  for (const v of result.violations) {
    console.log(`  ${label}: [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(' ')}  ${(n.failureSummary || '').split('\n')[1] || ''}`);
  }
  violations += result.violations.length;
  checked++;
  if (snapshot) {
    const html = await page.evaluate(() => '<!DOCTYPE html>\n' + document.documentElement.outerHTML);
    writeFileSync(`${SNAPSHOTS}${snapshot}.html`, html);
  }
}

try {
  for (const p of pages()) {
    await ensureBrowser();
    let page;
    try {
      page = await openPage(browser);
      await installMocks(page);
      await page.goto(`${BASE}${p.urlPath}`, { waitUntil: 'networkidle0' });
      await audit(page, `static ${p.file}`);
    } catch (err) {
      failures++;
      console.log(`  static ${p.file}: could not check the page: ${err.message.split('\n')[0]}`);
    }
    await page?.close().catch(() => {});
  }
  for (const [lang, path] of [['en', ''], ['de', 'de/']]) {
    for (const scheme of ['light', 'dark']) {
      for (const st of states(path)) {
        // A fresh context per state: the theme choice lives in localStorage
        // and would otherwise leak from one state into the next.
        await ensureBrowser();
        let context;
        let page;
        try {
          context = await browser.createBrowserContext();
          page = await openPage(context);
        } catch (err) {
          failures++;
          console.log(`  ${lang} ${scheme} ${st.name}: could not open a page: ${err.message.split('\n')[0]}`);
          continue;
        }
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
        await installMocks(page);
        const label = `${lang} ${scheme} ${st.name}`;
        try {
          if (st.before) await st.before(page);
          await page.goto(st.url, { waitUntil: 'networkidle0', timeout: 60000, referer: st.referer });
          await st.setup(page);
          await audit(page, label, scheme === 'light' ? `${lang}-${st.name}` : null);
        } catch (err) {
          failures++;
          console.log(`  ${label}: could not reach the state: ${err.message.split('\n')[0]}`);
        }
        await context.close().catch(() => {});
      }
    }
  }
} finally {
  await browser.close().catch(() => {});
  servers.close();
}
console.log(`axe-core (Chrome): ${checked} page states checked, ${violations} violation(s), ${failures} state(s) not reached`);
process.exit(violations || failures ? 1 : 0);
