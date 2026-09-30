// Every state the page can be in, as puppeteer drivers. Each state is a
// name, a URL and a `setup(page)` that brings the page there. Used by the
// axe checker (every state, both themes, English and German) and mirrored
// for pa11y where its action language allows.
import { WORKER_URL, PRICING } from '../../src/client/config.ts';
import { PORTS, WORST, mockProxy } from './server.mjs';

export const BASE = `http://127.0.0.1:${PORTS.site}`;

/** A phone, for the states that only exist below the 48rem layout switch. */
const PHONE = { width: 390, height: 900 };
const origin = (port) => `http://127.0.0.1:${port}`;

async function results(page) {
  await page.waitForSelector('#results:not([hidden])', { timeout: 30000 });
  // The worklist is the report now: either it has cards or it says there is
  // nothing to fix. The recon cards are in the appendix, folded.
  await page.waitForSelector('#fixes .fix, #fixes .callout', { timeout: 30000 });
}

/**
 * The appendix rows are folded. A state that drives the crawler table, the
 * tester or the user-agent check opens its row first, which is what a visitor
 * does before using any of them.
 */
async function openRow(page, id) {
  await page.evaluate((rowId) => {
    const row = document.getElementById(rowId);
    if (row) row.open = true;
  }, id);
}

async function openDetails(page) {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
}

async function paste(page) {
  // The textarea sits in the file panel now, where the file will appear, and it
  // is visible from the start: there is no disclosure to open first.
  await page.evaluate((text) => {
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

/**
 * Meets the analytics question as a first-time visitor: drops the decision the
 * harness seeds for every other state, reloads, and waits for the dialog.
 */
async function askConsent(page) {
  await page.evaluate(() => {
    sessionStorage.setItem('a11y-ask-consent', '1');
    localStorage.removeItem('consent');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.getElementById('consent')?.hasAttribute('open'));
}

/** States per language page; `path` is '' for English, 'de/' for German. */
export function states(path) {
  const url = (q = '') => `${BASE}/${path}${q}`;
  return [
    { name: 'initial', url: url(), setup: async () => {} },
    // The analytics question, as a first-time visitor meets it: blocking, with
    // refusing exactly as easy as agreeing.
    { name: 'consent-asked', url: url(), setup: askConsent },
    { name: 'consent-refused', url: url(), setup: async (page) => {
      await askConsent(page);
      await page.click('#consent-reject');
      await page.waitForFunction(() => !document.getElementById('consent')?.hasAttribute('open'));
    } },
    { name: 'language-menu-open', url: url(), setup: async (page) => { await page.click('.lang-menu > summary'); } },
    // The easter egg: the logo's context menu with the logo files and the press kit.
    { name: 'brand-menu-open', url: url(), setup: async (page) => { await page.click('.site-header .brand', { button: 'right' }); await page.waitForSelector('#brand-menu:popover-open'); } },
    // Dark is the default, so the state worth checking is the light one a
    // visitor switches to, and the toggle after it has swapped its own label.
    { name: 'theme-light', url: url(), setup: async (page) => { await page.click('#theme-toggle'); await page.waitForFunction(() => document.documentElement.dataset.theme === 'light'); } },
    { name: 'paste-empty-error', url: url(), setup: async (page) => { await page.click('#analyse-pasted'); await page.waitForSelector('#status[data-state="error"]'); } },
    { name: 'fetch-invalid-url', url: url(), setup: async (page) => { await page.type('#site-url', 'not a url'); await page.click('#fetch-button'); await page.waitForSelector('#status[data-state="error"]'); } },
    { name: 'pasted-worst', url: url(), setup: paste },
    { name: 'pasted-worst-all-details', url: url(), setup: async (page) => { await paste(page); await openDetails(page); } },
    { name: 'tester-custom-empty', url: url(), setup: async (page) => { await paste(page); await openRow(page, 'row-tester'); await page.select('#tester-agent', 'custom'); await page.waitForSelector('#tester-token:not([hidden])'); } },
    { name: 'tester-custom-blocked', url: url(), setup: async (page) => { await paste(page); await openRow(page, 'row-tester'); await page.select('#tester-agent', 'custom'); await page.type('#tester-token', 'gptbot'); await page.$eval('#tester-path', (el) => { el.value = '/private/x'; el.dispatchEvent(new Event('input')); }); await page.waitForSelector('#tester .callout[data-state="error"]'); } },
    { name: 'tester-yandex-cleanparam', url: url(), setup: async (page) => { await paste(page); await openRow(page, 'row-tester'); await page.select('#tester-agent', 'YandexBot'); await page.$eval('#tester-path', (el) => { el.value = '/articles/x?utm_source=a&id=1'; el.dispatchEvent(new Event('input')); }); } },
    { name: 'filter-ai-training', url: url(), setup: async (page) => { await paste(page); await openRow(page, 'row-agents'); const chips = await page.$$('#agents .chip'); await chips[2].click(); await page.waitForSelector('#agents tr[data-hidden="true"]'); } },
    // The crawler table holds 134 rows back to 50; this is the rest revealed.
    { name: 'agents-expanded', url: url(), setup: async (page) => {
      await paste(page);
      await openRow(page, 'row-agents');
      await page.waitForFunction(() => document.querySelectorAll('#agents tbody tr[data-hidden="true"]').length > 0);
      await page.click('#agents .link-button[aria-controls="agents-table"]');
      await page.waitForFunction(() => document.querySelector('#agents .link-button[aria-controls="agents-table"]')?.getAttribute('aria-expanded') === 'true');
    } },
    // Phone width: the crawler table and the AI list start as the problem list,
    // with the rest behind their buttons: the crawlers that are shut out, and the
    // AI agents that are blocked. Four states, because the short list and the full
    // one are different DOMs and both have to pass.
    { name: 'phone-agents-problems', url: url(), viewport: PHONE, setup: async (page) => {
      await paste(page);
      await openRow(page, 'row-agents');
      await page.waitForSelector('#agents-problems-note:not([hidden])');
    } },
    { name: 'phone-agents-all', url: url(), viewport: PHONE, setup: async (page) => {
      await paste(page);
      await openRow(page, 'row-agents');
      await page.waitForSelector('#agents-problems-note:not([hidden])');
      await page.click('#agents-more');
      await page.waitForSelector('#agents-problems-note[hidden]');
    } },
    { name: 'phone-ai-blocked', url: url(), viewport: PHONE, setup: async (page) => {
      await paste(page);
      await openRow(page, 'row-ai');
      await page.waitForSelector('#ai-phone-note:not([hidden])');
    } },
    { name: 'phone-ai-all', url: url(), viewport: PHONE, setup: async (page) => {
      await paste(page);
      await openRow(page, 'row-ai');
      await page.waitForSelector('#ai-phone-note:not([hidden])');
      await page.click('#ai-more');
      await page.waitForSelector('#ai-phone-note[hidden]');
    } },
    // The worklist and the file are one control in two halves: opening a fix
    // marks its lines, pressing a line opens its fix, and IT mode changes what
    // every card shows. Three states, because all three are different DOMs.
    { name: 'fix-open', url: url(), setup: async (page) => {
      await paste(page);
      await page.click('#fixes .fix__head');
      await page.waitForSelector('#fix-ticket-0:not([hidden])');
    } },
    { name: 'fix-it-mode', url: url(), setup: async (page) => {
      await paste(page);
      await page.click('#fixes .seg > button[data-mode="it"]');
      await page.waitForSelector('#fixes .fix[data-mode="it"]');
    } },
    { name: 'file-line-selected', url: url(), setup: async (page) => {
      await paste(page);
      await page.click('#raw button.raw__line');
      await page.waitForSelector('#raw .raw__line[data-selected="true"]');
    } },
    // Two reports side by side: a second fetch and a second run of the engine,
    // which is a state of its own because the table only exists afterwards.
    { name: 'compare-done', url: url(`?url=${origin(PORTS.worst)}`), setup: async (page) => {
      await results(page);
      await page.type('#compare-site', origin(PORTS.empty));
      await page.click('#compare-run');
      await page.waitForSelector('#compare table', { timeout: 60000 });
    } },
    { name: 'export-copy-flash', url: url(), setup: async (page) => { await paste(page); await openRow(page, 'row-export'); await flash(page, '#export .button'); } },
    // The same two actions again, where the technical half of the report starts.
    { name: 'handoff-copy-flash', url: url(), setup: async (page) => { await paste(page); await flash(page, '#handoff .button'); } },
    { name: 'export-more-open', url: url(), setup: async (page) => { await paste(page); await openRow(page, 'row-export'); await page.click('#export details > summary'); } },
    // Only while the prices are published (PRICING.show in src/client/config.ts).
    ...(PRICING.show ? [{ name: 'pricing-annual', url: url(), setup: async (page) => { await page.click('#billing-cycle [data-cycle="annual"]'); await page.waitForSelector('#billing-cycle [data-cycle="annual"][aria-pressed="true"]'); } }] : []),
    { name: 'raw-copy-flash', url: url(), setup: async (page) => { await paste(page); await flash(page, '#raw .button'); } },
    { name: 'fetched-worst', url: url(`?url=${origin(PORTS.worst)}`), setup: results },
    { name: 'fetched-worst-access-check', url: url(`?url=${origin(PORTS.worst)}`), setup: async (page) => { await results(page); await openRow(page, 'row-access'); await page.click('#access .button'); await page.waitForSelector('#access .button:not([disabled])', { timeout: 60000 }); } },
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
    // The chips are an offer now: a visit no longer re-checks the newest site by
    // itself, so this state is the page as it arrives with a history behind it.
    { name: 'recent-default', url: url(), before: seedRecent, setup: async (page) => { await page.waitForSelector('#recent:not([hidden]) li'); } },
    { name: 'recent-cleared', url: url(), before: seedRecent, setup: async (page) => { await page.waitForSelector('#recent:not([hidden]) li'); await page.click('#recent .link-button'); await page.waitForSelector('#recent[hidden]'); } },
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
  // Every state except the consent ones runs as a visitor who has already
  // answered the analytics question, because the dialog blocks the page by
  // design and would otherwise stop all of them at the first click. "denied" is
  // the honest default here: it is also what the checkers need, since they abort
  // requests to Google anyway. The consent states clear this and reload.
  await page.evaluateOnNewDocument(() => {
    try {
      // A state that wants to meet the question sets this and reloads; it has to
      // be sessionStorage, because this runs again on that very reload.
      if (sessionStorage.getItem('a11y-ask-consent')) {
        localStorage.removeItem('consent');
        return;
      }
      if (!localStorage.getItem('consent')) localStorage.setItem('consent', 'denied');
    } catch {
      // storage blocked in this context; the dialog will ask, as it should
    }
  });
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
