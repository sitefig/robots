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
import { renderSummary } from './components/summary.ts';
import { renderExport } from './components/export.ts';
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
import { readRecent, renderRecent, remember } from './components/recent.ts';
import { initTheme, initLanguage } from './components/preferences.ts';

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
function analyse(): void {
  if (state.analysis) state.analysis.free();
  const started = performance.now();
  state.analysis = new Analysis(state.text, engineOptions());
  const ms = performance.now() - started;
  state.text = state.analysis.report.raw;
  state.parseMs = ms;
  render();
}

function render(): void {
  $('#summary').hidden = false;
  $('#results').hidden = false;
  renderSummary();
  renderExport();
  renderAiStatus();
  renderAgents();
  renderTester();
  renderAccess();
  renderWarnings();
  renderSecurity();
  renderRecon();
  renderSitemaps();
  renderRaw();
}

async function analyseUrl(input: string): Promise<void> {
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
    analyse();
    remember(new URL(result.robotsUrl).origin);
    const via = result.source === 'proxy' ? t('ui.via.proxy') : t('ui.via.direct');
    setStatus('ok', t('ui.status.fetched', { via, status: result.status, size: formatBytes(result.bytes), ms: formatMs(result.durationMs) }));
  } catch (err) {
    $('#summary').hidden = true;
    $('#results').hidden = true;
    setStatus('error', err instanceof FetchError ? err.message : t('ui.status.unexpected', { message: message(err) }));
    console.error(err);
  } finally {
    button.disabled = false;
  }
}

async function analysePasted(text: string, siteUrl: string | null = null): Promise<void> {
  await loadEngine();
  state.input = '';
  state.fetch = null;
  state.text = text;
  state.siteUrl = siteUrl;
  try {
    analyse();
  } catch (err) {
    setStatus('error', t('ui.status.unexpected', { message: message(err) }));
    return;
  }
  setStatus('ok', siteUrl ? t('ui.status.example', { url: siteUrl }) : t('ui.status.pasted', { size: formatBytes(text.length) }));
}

const EXAMPLES: Record<string, { file: string; siteUrl: string }> = { 'kitchen-sink': { file: EXAMPLE_URL, siteUrl: 'https://www.example.com/robots.txt' } };

async function loadExample(name: string): Promise<void> {
  const ex = EXAMPLES[name];
  if (!ex) return;
  setStatus('loading', t('ui.status.loadingExample'));
  try {
    const res = await fetch(ex.file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    $<HTMLTextAreaElement>('#pasted-text').value = text;
    $<HTMLDetailsElement>('#paste-details').open = true;
    await analysePasted(text, ex.siteUrl);
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
 * Starts downloading and compiling the engine once the page is idle, so the
 * first analysis rarely waits and page load does not pay for it.
 */
function prefetchEngine(): void {
  const start = () => { loadEngine().catch((err: unknown) => console.error(err)); };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 4000 }) : setTimeout(start, 1500));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}

function checkOrigin(origin: string): void {
  $<HTMLInputElement>('#site-url').value = origin;
  analyseUrl(origin);
}

function init(): void {
  initTheme();
  initLanguage();
  initPricing();
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
  renderRecent(checkOrigin);
  const params = new URLSearchParams(location.search);
  const url = params.get('url');
  const example = params.get('example');
  if (url) {
    $<HTMLInputElement>('#site-url').value = url;
    analyseUrl(url);
  } else if (example) {
    loadExample(example);
  } else if (readRecent().length) {
    checkOrigin(readRecent()[0]);
  } else {
    prefetchEngine();
  }
}

init();
