// Every state the page can be in, as puppeteer drivers. Each state is a
// name, a URL and a `setup(page)` that brings the page there. Used by the
// axe checker (every state, both themes, English and German) and mirrored
// for pa11y where its action language allows.
import { WORKER_URL, PRICING } from '../../src/client/config.ts';
import { PORTS, WORST, mockProxy } from './server.mjs';

export const BASE = `http://127.0.0.1:${PORTS.site}`;
const origin = (port) => `http://127.0.0.1:${port}`;

async function results(page) {
  await page.waitForSelector('#results:not([hidden])', { timeout: 30000 });
  await page.waitForSelector('#recon article', { timeout: 30000 });
}

async function openDetails(page) {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
}

async function paste(page) {
  await page.evaluate((text) => {
    document.querySelector('#paste-details').open = true;
    document.querySelector('#pasted-text').value = text;
  }, WORST);
  await page.click('#analyse-pasted');
  await results(page);
}

/**
 * Clicks a copy button and waits until its label shows the result ("Done",
 * "Copied", "Failed", …), which arrives asynchronously after the clipboard
 * call, instead of sleeping a fixed time.
 */
async function flash(page, selector) {
  const before = await page.$eval(selector, (b) => b.textContent);
  await page.click(selector);
  await page.waitForFunction((sel, text) => document.querySelector(sel)?.textContent !== text, { timeout: 5000 }, selector, before);
}

/** Puts two sites in this browser's recent list before the page loads. */
async function seedRecent(page) {
  await page.evaluateOnNewDocument((list) => {
    try {
      localStorage.setItem('recent', JSON.stringify(list));
    } catch {
      // storage blocked; the state then fails visibly
    }
  }, [origin(PORTS.worst), origin(PORTS.notFound)]);
}

/** States per language page; `path` is '' for English, 'de/' for German. */
export function states(path) {
  const url = (q = '') => `${BASE}/${path}${q}`;
  return [
    { name: 'initial', url: url(), setup: async () => {} },
    { name: 'language-menu-open', url: url(), setup: async (page) => { await page.click('.lang-menu > summary'); } },
    // The easter egg: the logo's context menu with the logo files and the press kit.
    { name: 'brand-menu-open', url: url(), setup: async (page) => { await page.click('.site-header .brand', { button: 'right' }); await page.waitForSelector('#brand-menu:popover-open'); } },
    { name: 'theme-pressed', url: url(), setup: async (page) => { await page.click('[data-theme-choice="dark"]'); } },
    { name: 'paste-panel-open', url: url(), setup: async (page) => { await page.click('#paste-details > summary'); } },
    { name: 'paste-empty-error', url: url(), setup: async (page) => { await page.click('#paste-details > summary'); await page.click('#analyse-pasted'); await page.waitForSelector('#status[data-state="error"]'); } },
    { name: 'fetch-invalid-url', url: url(), setup: async (page) => { await page.type('#site-url', 'not a url'); await page.click('#fetch-button'); await page.waitForSelector('#status[data-state="error"]'); } },
    { name: 'pasted-worst', url: url(), setup: paste },
    { name: 'pasted-worst-all-details', url: url(), setup: async (page) => { await paste(page); await openDetails(page); } },
    { name: 'tester-custom-empty', url: url(), setup: async (page) => { await paste(page); await page.select('#tester-agent', 'custom'); await page.waitForSelector('#tester-token:not([hidden])'); } },
    { name: 'tester-custom-blocked', url: url(), setup: async (page) => { await paste(page); await page.select('#tester-agent', 'custom'); await page.type('#tester-token', 'gptbot'); await page.$eval('#tester-path', (el) => { el.value = '/private/x'; el.dispatchEvent(new Event('input')); }); await page.waitForSelector('#tester .callout[data-state="error"]'); } },
    { name: 'tester-yandex-cleanparam', url: url(), setup: async (page) => { await paste(page); await page.select('#tester-agent', 'YandexBot'); await page.$eval('#tester-path', (el) => { el.value = '/articles/x?utm_source=a&id=1'; el.dispatchEvent(new Event('input')); }); } },
    { name: 'filter-ai-training', url: url(), setup: async (page) => { await paste(page); const chips = await page.$$('#agents .chip'); await chips[2].click(); await page.waitForSelector('#agents tr[data-hidden="true"]'); } },
    { name: 'export-copy-flash', url: url(), setup: async (page) => { await paste(page); await flash(page, '#export .button'); } },
    { name: 'export-more-open', url: url(), setup: async (page) => { await paste(page); await page.click('#export details > summary'); } },
    // Only while the prices are published (PRICING.show in src/client/config.ts).
    ...(PRICING.show ? [{ name: 'pricing-annual', url: url(), setup: async (page) => { await page.click('#billing-cycle [data-cycle="annual"]'); await page.waitForSelector('#billing-cycle [data-cycle="annual"][aria-pressed="true"]'); } }] : []),
    { name: 'raw-copy-flash', url: url(), setup: async (page) => { await paste(page); await flash(page, '#raw .button'); } },
    { name: 'fetched-worst', url: url(`?url=${origin(PORTS.worst)}`), setup: results },
    { name: 'fetched-worst-access-check', url: url(`?url=${origin(PORTS.worst)}`), setup: async (page) => { await results(page); await page.click('#access .button'); await page.waitForSelector('#access .button:not([disabled])', { timeout: 60000 }); } },
    { name: 'fetched-404', url: url(`?url=${origin(PORTS.notFound)}`), setup: async (page) => { await page.waitForSelector('#results:not([hidden])'); } },
    { name: 'fetched-410', url: url(`?url=${origin(PORTS.gone)}`), setup: async (page) => { await page.waitForSelector('#results:not([hidden])'); } },
    { name: 'fetched-503', url: url(`?url=${origin(PORTS.serverError)}`), setup: async (page) => { await page.waitForSelector('#results:not([hidden])'); } },
    { name: 'fetched-html', url: url(`?url=${origin(PORTS.html)}`), setup: async (page) => { await page.waitForSelector('#results:not([hidden])'); } },
    { name: 'fetched-empty', url: url(`?url=${origin(PORTS.empty)}`), setup: async (page) => { await page.waitForSelector('#results:not([hidden])'); } },
    { name: 'fetched-redirect-limit', url: url('?url=https://loop.invalid'), setup: async (page) => { await page.waitForSelector('#results:not([hidden])'); } },
    { name: 'fetched-cross-host-truncated', url: url('?url=https://moved.invalid'), setup: results },
    { name: 'fetch-unreachable', url: url('?url=https://unreachable.invalid'), setup: async (page) => { await page.waitForSelector('#status[data-state="error"]', { timeout: 60000 }); } },
    { name: 'example-kitchen-sink', url: url('?example=kitchen-sink'), setup: results },
    // Recent sites: the newest one is analysed by default on an empty URL.
    { name: 'recent-default', url: url(), before: seedRecent, setup: async (page) => { await results(page); await page.waitForSelector('#recent:not([hidden]) li'); } },
    { name: 'recent-cleared', url: url(), before: seedRecent, setup: async (page) => { await results(page); await page.click('#recent .link-button'); await page.waitForSelector('#recent[hidden]'); } },
    // The site that linked here is offered as a suggestion.
    { name: 'referrer-suggestion', url: url(), referer: 'http://www.example.org/blog/post', setup: async (page) => { await page.waitForSelector('#recent:not([hidden]) .chip'); } },
  ];
}

/**
 * Route the worker URL and the unreachable hosts to mocks. `.invalid` hosts
 * never resolve, so the page falls back to the proxy for them, which is
 * mocked; `unreachable.invalid` gets a proxy error so the error state shows.
 */
export async function installMocks(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith(WORKER_URL)) {
      if (u.includes('unreachable.invalid')) return req.respond({ status: 502, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Could not reach https://unreachable.invalid/robots.txt' }) });
      return req.respond(mockProxy(u));
    }
    if (/\.invalid\//.test(u) || /googletagmanager\.com|google-analytics\.com/.test(u)) return req.abort('failed');
    req.continue();
  });
}
