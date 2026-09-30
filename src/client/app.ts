// The page: fetches or takes a pasted robots.txt, runs the engine and has
// each component render its section. boot.ts loads the locale and the
// WebAssembly engine first. Every visible string comes from the dictionary.

import { fetchRobots, normaliseSiteUrl, FetchError } from './fetcher.ts';
import { Analysis, loadEngine, type Options } from './engine.ts';
import { LINKS } from './config.ts';
import { t, getLocale, DEFAULT_LANG, currentDictionary } from './i18n.ts';
import { $, el, setStatus, formatBytes, formatMs } from './dom.ts';
import { state } from './state.ts';
import { SCHEMA_URL, EXAMPLE_URL } from './paths.ts';
import { renderSummary, renderCrawlerSummary } from './components/summary.ts';
import { renderExport, renderHandoff } from './components/export.ts';
import { renderChecked } from './components/checked.ts';
import { renderFixes } from './components/fixes.ts';
import { renderAppendix } from './components/appendix.ts';
import { renderCompare, runCompare } from './components/compare.ts';
import { renderAiStatus } from './components/ai-status.ts';
import { renderAgents } from './components/agents.ts';
import { renderTester } from './components/tester.ts';
import { renderAccess } from './components/access.ts';
import { renderWarnings } from './components/issues.ts';
import { renderSecurity } from './components/security.ts';
import { renderRecon } from './components/recon.ts';
import { renderSitemaps } from './components/sitemaps.ts';
import { renderRaw } from './components/raw.ts';
import { initPricing } from './components/pricing.ts';
import { renderRecent, remember } from './components/recent.ts';
import { initTheme, initLanguage } from './components/preferences.ts';
import { initConsent } from './components/consent.ts';
import { initBrandMenu } from './components/brand-menu.ts';
import { initSales, renderSales } from './components/sales.ts';
import { trackCheck, type CheckSource, type CheckTrigger } from './track.ts';

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

function engineOptions(): Options {
  return {
    siteUrl: state.siteUrl,
    fetch: state.fetch,
    lang: getLocale(),
    locale: getLocale() === DEFAULT_LANG ? null : JSON.stringify(currentDictionary()),
    now: new Date().toISOString(),
    schemaUrl: SCHEMA_URL,
  };
}

/** Run the engine on the current text with the page locale. */
function analyse(source: CheckSource, trigger: CheckTrigger): void {
  if (state.analysis) state.analysis.free();
  const started = performance.now();
  state.analysis = new Analysis(state.text, engineOptions());
  const ms = performance.now() - started;
  state.text = state.analysis.report.raw;
  state.parseMs = ms;
  render();
  trackCheck(state.analysis.report, source, trigger);
}

function render(): void {
  // The pitch has done its job the moment there is a report: the sample, the
  // audience columns and the example chips are all arguments for checking, and
  // the visitor has just checked.
  document.querySelectorAll<HTMLElement>('[data-pitch]').forEach((node) => { node.hidden = true; });
  $('#checked').hidden = false;
  $('#handoff-panel').hidden = false;
  $('#summary').hidden = false;
  $('#results').hidden = false;
  // The fix list first: it decides which line belongs to which fix, and the
  // verdict counts and the file viewer both read that.
  renderFixes();
  renderChecked();
  renderSummary();
  renderExport();
  renderHandoff();
  renderAiStatus();
  renderAgents();
  renderCrawlerSummary();
  renderTester();
  renderAccess();
  renderWarnings();
  renderSecurity();
  renderRecon();
  renderSitemaps();
  renderRaw();
  renderAppendix();
  renderCompare();
  renderSales();
}

async function analyseUrl(input: string, trigger: CheckTrigger = 'user'): Promise<void> {
  const button = $<HTMLButtonElement>('#fetch-button');
  button.disabled = true;
  try {
    normaliseSiteUrl(input); // fail fast on bad input
    setStatus('loading', t('ui.status.fetching'));
    const [result] = await Promise.all([
      fetchRobots(input, {
        onAttempt: (phase) => {
          if (phase === 'proxy') setStatus('loading', t('ui.status.viaProxy'));
        },
      }),
      loadEngine(),
    ]);
    state.input = input;
    state.fetch = {
      source: result.source,
      robotsUrl: result.robotsUrl,
      finalUrl: result.finalUrl,
      status: result.status,
      statusText: result.statusText || null,
      contentType: result.contentType || null,
      bytes: result.bytes,
      truncated: Boolean(result.truncated),
      redirects: (result.redirects || []).map((r) => ({ from: r.from, status: r.status ?? null, to: r.to })),
      redirectLimit: Boolean(result.redirectLimit),
      text: '',
    };
    state.text = result.text;
    state.siteUrl = result.finalUrl;
    history.replaceState(null, '', `?${new URLSearchParams({ url: input })}`);
    analyse(result.source === 'proxy' ? 'proxy' : 'direct', trigger);
    remember(new URL(result.robotsUrl).origin);
    const via = result.source === 'proxy' ? t('ui.via.proxy') : t('ui.via.direct');
    setStatus('ok', t('ui.status.fetched', { via, status: result.status, size: formatBytes(result.bytes), ms: formatMs(result.durationMs) }));
  } catch (err) {
    // Nothing is hidden on a failure. Before the first check this slot holds the
    // pitch, including the page's only h1, and hiding it left the page headless;
    // after one it holds a report that is still true of the site named in the bar
    // above it. The status line is what says this attempt failed.
    setStatus('error', err instanceof FetchError ? err.message : t('ui.status.unexpected', { message: message(err) }));
    console.error(err);
  } finally {
    button.disabled = false;
  }
}

async function analysePasted(text: string, siteUrl: string | null = null, trigger: CheckTrigger = 'user'): Promise<void> {
  await loadEngine();
  state.input = '';
  state.fetch = null;
  state.text = text;
  state.siteUrl = siteUrl;
  try {
    analyse(siteUrl ? 'example' : 'paste', trigger);
  } catch (err) {
    setStatus('error', t('ui.status.unexpected', { message: message(err) }));
    return;
  }
  setStatus('ok', siteUrl ? t('ui.status.example', { url: siteUrl }) : t('ui.status.pasted', { size: formatBytes(text.length) }));
}

const EXAMPLES: Record<string, { file: string; siteUrl: string }> = { 'kitchen-sink': { file: EXAMPLE_URL, siteUrl: 'https://www.example.com/robots.txt' } };

async function loadExample(name: string, trigger: CheckTrigger = 'user'): Promise<void> {
  const ex = EXAMPLES[name];
  if (!ex) return;
  setStatus('loading', t('ui.status.loadingExample'));
  try {
    const res = await fetch(ex.file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const area = document.getElementById('pasted-text') as HTMLTextAreaElement | null;
    if (area) area.value = text;
    await analysePasted(text, ex.siteUrl, trigger);
    history.replaceState(null, '', `?${new URLSearchParams({ example: name })}`);
  } catch (err) {
    setStatus('error', t('ui.status.exampleFailed', { message: message(err) }));
  }
}

/** The extension link, once there is one. */
function fillLinks(): void {
  const ext = $('[data-fill="extension-link"]');
  if (ext && LINKS.extension) ext.append(' ', el('a', { href: LINKS.extension, rel: 'noopener' }, t('ui.extension.link')));
}

/**
 * Starts downloading and compiling the engine on the visitor's first sign of
 * intent (focus, pointer, key, touch): it loads while they type the address
 * or while the robots.txt is fetched, so the first analysis rarely waits,
 * and a visit without interaction never pays for the 1.6 MB compile.
 */
function prefetchEngine(): void {
  const events = ['focusin', 'pointerdown', 'keydown', 'touchstart'];
  const start = () => {
    events.forEach((e) => removeEventListener(e, start, true));
    loadEngine().catch((err: unknown) => console.error(err));
  };
  events.forEach((e) => addEventListener(e, start, { capture: true, passive: true }));
}

function checkOrigin(origin: string, trigger: CheckTrigger = 'user'): void {
  $<HTMLInputElement>('#site-url').value = origin;
  analyseUrl(origin, trigger);
}

function init(): void {
  initTheme();
  initLanguage();
  initConsent();
  initBrandMenu();
  initPricing();
  initSales();
  fillLinks();
  try {
    // The page used to keep a visitor-supplied TOML under this key; the
    // feature is gone, so clear what earlier visits may have left behind.
    localStorage.removeItem('config');
  } catch {
    // storage unavailable
  }
  $('#fetch-form').addEventListener('submit', (e) => {
    e.preventDefault();
    analyseUrl($<HTMLInputElement>('#site-url').value);
  });
  $('#analyse-pasted').addEventListener('click', () => {
    const text = $<HTMLTextAreaElement>('#pasted-text').value;
    if (!text.trim()) {
      setStatus('error', t('ui.status.pasteFirst'));
      return;
    }
    history.replaceState(null, '', location.pathname);
    void analysePasted(text);
  });
  $('#load-example').addEventListener('click', () => loadExample('kitchen-sink'));
  // "Paste a file" in the top row: the textarea is in the file panel, where the
  // file itself will appear, so this takes you there rather than opening a
  // second place to put text.
  $('#paste-open').addEventListener('click', () => {
    const area = document.getElementById('pasted-text');
    if (!area) return;
    area.scrollIntoView({ block: 'center' });
    area.focus();
  });
  // The example chips under the field: a real site, checked the same way a typed
  // one is, so the field shows what was checked afterwards.
  // The pitch card: check one site and compare it with another in one press.
  $('#pitch-compare-run').addEventListener('click', () => {
    void (async () => {
      const yours = $<HTMLInputElement>('#pitch-compare-you').value;
      const theirs = $<HTMLInputElement>('#pitch-compare-them').value;
      if (!yours.trim()) {
        setStatus('error', t('fetch.error.empty'));
        return;
      }
      $<HTMLInputElement>('#site-url').value = yours;
      await analyseUrl(yours);
      if (theirs.trim()) {
        $<HTMLInputElement>('#compare-site').value = theirs;
        await runCompare(theirs);
      }
    })();
  });
  // The compare card asks for two domains, and the first is the one being typed
  // above, so it follows that field until somebody edits it themselves. Then the
  // only thing left to fill in is the competitor.
  const mine = $<HTMLInputElement>('#pitch-compare-you');
  $('#site-url').addEventListener('input', () => {
    if (mine.dataset.touched !== 'true') mine.value = $<HTMLInputElement>('#site-url').value;
  });
  mine.addEventListener('input', () => { mine.dataset.touched = 'true'; });
  renderRecent(checkOrigin);
  const params = new URLSearchParams(location.search);
  const url = params.get('url');
  const example = params.get('example');
  // A visit starts on the page the design draws, not on yesterday's answer. An
  // address in ?url= or ?example= is somebody asking for that check, so those
  // still run on load; the sites this browser checked before are offered as
  // chips instead, which is a choice rather than a surprise.
  if (url) {
    $<HTMLInputElement>('#site-url').value = url;
    analyseUrl(url, 'load');
  } else if (example) {
    loadExample(example, 'load');
  } else {
    prefetchEngine();
  }
}

init();
