// Lighthouse against the published site (or any URL): performance,
// accessibility, best practices and SEO, on mobile (Lighthouse's default
// throttled phone) and desktop. Prints the scores and every audit that did
// not pass, and exits 1 when a category is under its threshold.
//
//   node tests/lighthouse/run.mjs [url ...]
//
// Defaults to the English and German home pages of the live site. Minimum
// scores come from LH_MIN_<CATEGORY> (0-100), defaulting to 100, except
// performance (90), which depends on the network and the machine.
import { writeFileSync, mkdirSync } from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromePath } from '../a11y/lib.mjs';

const SITE = process.env.LH_SITE || 'https://sitefig.github.io/robots/';
const urls = process.argv.slice(2).length ? process.argv.slice(2) : [SITE, `${SITE}de/`];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const min = (c) => Number(process.env[`LH_MIN_${c.replace('-', '_').toUpperCase()}`] ?? (c === 'performance' ? 90 : 100));
const OUT = new URL('./.reports/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const chrome = await chromeLauncher.launch({ chromePath: await chromePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
let failed = 0;
try {
  for (const url of urls) {
    for (const formFactor of ['mobile', 'desktop']) {
      const config = formFactor === 'desktop'
        ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttlingMethod: 'simulate', throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } }
        : { extends: 'lighthouse:default' };
      const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATEGORIES }, config);
      const lhr = result.lhr;
      const name = `${new URL(url).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'root'}-${formFactor}`;
      writeFileSync(new URL(`${name}.json`, OUT), result.report);
      const scores = CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]);
      console.log(`${url} (${formFactor}): ${scores.map(([c, s]) => `${c} ${s}`).join(', ')}`);
      for (const [c, s] of scores) {
        if (s < min(c)) {
          failed++;
          console.log(`  ${c} ${s} is under ${min(c)}`);
        }
      }
      for (const c of CATEGORIES) {
        for (const ref of lhr.categories[c]?.auditRefs ?? []) {
          const audit = lhr.audits[ref.id];
          if (ref.weight > 0 && audit.score !== null && audit.score < 0.9) {
            console.log(`  [${c}] ${audit.id}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ''}`);
          }
        }
      }
    }
  }
} finally {
  await chrome.kill();
}
process.exit(failed ? 1 : 0);
