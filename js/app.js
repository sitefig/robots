// UI. Renders the engine's report; touches the DOM together with boot.js,
// which loads the locale and the WebAssembly engine first. Every visible
// string comes from the dictionary via t() or, when a sentence wraps an
// element, tx().

import { fetchRobots, fetchViaProxy, normaliseSiteUrl, FetchError } from './fetcher.js';
import { Analysis } from './engine.js';
import { proxyConfigured, ACCESS_CHECK_CONCURRENCY, LINKS, PRICING } from './config.js';
import { t, formatNumber, getLocale, DEFAULT_LANG, currentDictionary } from './i18n.js';

const SAMPLE_PATHS = ['/', '/admin/', '/search?q=robots', '/wp-admin/', '/api/v1/items', '/assets/logo.png'];
const LEVEL_ORDER = { error: 0, warning: 1, info: 2 };
const SCHEMA_URL = new URL('../schema/report.schema.json', import.meta.url).href;
const EXAMPLE_URL = new URL('../examples/kitchen-sink.robots.txt', import.meta.url).href;

// fetch is null when the text was pasted. siteUrl is the origin used for
// origin-dependent checks: the fetched URL, or an assumed one for examples.
// analysis is the live engine object for the current text.
const state = { input: '', text: '', fetch: null, siteUrl: null, analysis: null };

// ---------------------------------------------------------------- helpers

const $ = (sel, root = document) => root.querySelector(sel);
const slot = (id) => $(`#${id} > [data-slot]`);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Translate a sentence that wraps elements; Node-valued params are spliced back in. */
function tx(key, params = {}) {
  const flat = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v instanceof Node ? `{${k}}` : v]));
  return t(key, flat)
    .split(/(\{[a-zA-Z0-9_]+\})/)
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^\{([a-zA-Z0-9_]+)\}$/);
      return m && params[m[1]] instanceof Node ? params[m[1]] : part;
    });
}

/** A horizontally scrollable wrapper that keyboard users can reach and scroll. */
function scrollable(title, ...children) {
  // A named <section> is a region landmark natively, so keyboard users can
  // reach and scroll a wide table; the label keeps each region distinct.
  return el('section', { class: 'scroller', tabindex: '0', 'aria-label': t('ui.scrollTable', { title }) }, children);
}

function replace(container, ...children) {
  container.replaceChildren(...children.flat(Infinity).filter(Boolean));
}

function badge(text, stateName) {
  return el('span', { class: 'badge', 'data-state': stateName }, text);
}

/**
 * The first `limit` items as they are, the rest behind a "Show all" disclosure,
 * so a file with hundreds of findings keeps the page short. `wrap` builds the
 * container for a slice of rendered items.
 */
function capped(list, limit, render, wrap) {
  const head = wrap(list.slice(0, limit).map(render));
  if (list.length <= limit) return head;
  return [head, el('details', { class: 'more' }, el('summary', {}, t('ui.showAll', { n: list.length })), wrap(list.slice(limit).map(render)))];
}

/** Section heading figure ("12 of 32 crawlers"), set by each renderer. */
function meta(id, ...content) {
  const node = $(`#${id}`);
  if (node) replace(node, content);
}

const VERDICT_STATE = { open: 'ok', partial: 'warning', blocked: 'error' };
const verdictText = (v) => t(`enum.verdict.${v}`);

function verdictBadge(verdict) {
  if (verdict === 'open') return badge(t('ui.open'), 'ok');
  if (verdict === 'blocked') return badge(t('ui.blocked'), 'error');
  return badge(t('enum.verdict.partial'), 'warning');
}

const levelLabel = (level) => t(`enum.level.${level}`);
const lineText = (n) => t('ui.line', { n });
const lineLink = (n) => el('a', { href: `#line-${n}`, class: 'text-sm whitespace-nowrap' }, lineText(n));

function formatBytes(n) {
  if (n < 1024) return t('ui.bytes.b', { n: formatNumber(n) });
  return t('ui.bytes.kib', { n: formatNumber(n / 1024, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });
}

const formatMs = (ms) => t('ui.ms', { n: formatNumber(Math.round(ms)) });

function setStatus(kind, message) {
  const s = $('#status');
  s.dataset.state = kind;
  s.textContent = message;
}

// ---------------------------------------------------------------- analysis

function readStored(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function engineOptions() {
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
function analyse() {
  if (state.analysis) state.analysis.free();
  const started = performance.now();
  state.analysis = new Analysis(state.text, engineOptions());
  const ms = performance.now() - started;
  state.text = state.analysis.report.raw;
  state.parseMs = ms;
  render();
}

async function analyseUrl(input) {
  const button = $('#fetch-button');
  button.disabled = true;
  try {
    normaliseSiteUrl(input); // fail fast on bad input
    setStatus('loading', t('ui.status.fetching'));
    const result = await fetchRobots(input, {
      onAttempt: (phase) => {
        if (phase === 'proxy') setStatus('loading', t('ui.status.viaProxy'));
      },
    });
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
    setStatus('error', err instanceof FetchError ? err.message : t('ui.status.unexpected', { message: err.message }));
    console.error(err);
  } finally {
    button.disabled = false;
  }
}

function analysePasted(text, siteUrl = null) {
  state.input = '';
  state.fetch = null;
  state.text = text;
  state.siteUrl = siteUrl;
  try {
    analyse();
  } catch (err) {
    setStatus('error', t('ui.status.unexpected', { message: err.message }));
    return;
  }
  setStatus('ok', siteUrl ? t('ui.status.example', { url: siteUrl }) : t('ui.status.pasted', { size: formatBytes(text.length) }));
}

const EXAMPLES = { 'kitchen-sink': { file: EXAMPLE_URL, siteUrl: 'https://www.example.com/robots.txt' } };

async function loadExample(name) {
  const ex = EXAMPLES[name];
  if (!ex) return;
  setStatus('loading', t('ui.status.loadingExample'));
  try {
    const res = await fetch(ex.file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    $('#pasted-text').value = text;
    $('#paste-details').open = true;
    analysePasted(text, ex.siteUrl);
    history.replaceState(null, '', `?${new URLSearchParams({ example: name })}`);
  } catch (err) {
    setStatus('error', t('ui.status.exampleFailed', { message: err.message }));
  }
}

// ---------------------------------------------------------------- rendering

function render() {
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

function summaryCallout() {
  const r = state.analysis.report;
  const f = state.fetch;
  const c = (stateName, key, params = {}) => ({ state: stateName, title: t(`ui.summary.${key}.title`, params), body: t(`ui.summary.${key}.body`, params) });
  if (f && f.redirectLimit) return c('error', 'redirectLimit');
  if (f && (f.status === 404 || f.status === 410)) return c('warning', 'notFound', { status: f.status });
  if (f && f.status >= 400 && f.status < 500) {
    return { state: 'warning', title: `HTTP ${f.status} ${f.statusText || ''}`.trim(), body: t('ui.summary.clientError.body') };
  }
  if (f && f.status >= 500) return c('error', 'serverError', { status: f.status });
  if (f && (f.status < 200 || f.status >= 300)) return c('warning', 'unexpectedStatus', { status: f.status });
  if (f && /text\/html/i.test(f.contentType || '')) return c('warning', 'html', { type: f.contentType });
  if (r.raw.trim() === '') return c('ok', 'empty');
  const p = r.summary.defaultPolicy;
  if (!p.hasStarGroup) return c('info', 'noStar');
  if (p.verdict === 'blocked') return c('error', 'allBlocked');
  if (p.verdict === 'open') return c('ok', 'open');
  return c('info', 'restricted', { disallow: p.disallowRules, allow: p.allowRules });
}

/** Key/value rows: [[key, value], …] → <dl class="defs">. */
function defs(rows) {
  return el('dl', { class: 'defs' }, rows.filter(Boolean).map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v))));
}

function renderSummary() {
  const r = state.analysis.report;
  const f = state.fetch;
  const callout = summaryCallout();
  meta('summary-meta', t('ui.summary.meta', { size: formatBytes(r.raw.length), ms: formatMs(state.parseMs || 0) }));
  replace(
    slot('summary'),
    el('div', { class: 'callout', 'data-state': callout.state }, el('p', { class: 'verdict' }, callout.title), el('p', {}, callout.body)),
    defs([
      [t('ui.defs.source'), f ? (f.source === 'proxy' ? t('ui.source.proxy') : t('ui.source.direct')) : t('ui.source.pasted')],
      f && [t('ui.defs.url'), el('a', { href: f.finalUrl, target: '_blank', rel: 'noopener' }, f.finalUrl.replace(/^https?:\/\/[^/]+/, '') || f.finalUrl)],
      f && f.finalUrl !== f.robotsUrl && [t('ui.defs.redirects'), redirectChain(f)],
      f && [t('ui.defs.contentType'), f.contentType || t('ui.defs.notSent')],
      f?.truncated && [t('ui.defs.size'), formatBytes(r.raw.length) + t('ui.defs.truncated')],
      f && [t('ui.defs.status'), `${f.status} ${f.statusText || ''}`.trim()],
      [t('ui.defs.groups'), formatNumber(r.summary.groups)],
      [t('ui.defs.rules'), formatNumber(r.summary.rules)],
      [t('ui.defs.sitemaps'), t('ui.defs.declared', { n: r.summary.sitemaps })],
      r.directives.host && [t('ui.defs.host'), el('code', {}, r.directives.host.value)],
      r.directives.cleanParams.length > 0 && [t('ui.defs.cleanParam'), t('ui.defs.directives', { n: r.directives.cleanParams.length })],
      [t('ui.defs.issues'), t('ui.defs.issueCounts', { errors: r.summary.issues.errors, warnings: r.summary.issues.warnings })],
    ]),
  );
}

// ---------------------------------------------------------------- export & share

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

/** Copies rich text (for Google Docs, Notion, email) with a plain-text fallback. */
async function copyRich(html, text) {
  if (typeof ClipboardItem === 'function' && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) }),
      ]);
      return;
    } catch {
      // fall through to plain text
    }
  }
  await copyText(text);
}

/** Button whose label flashes a result for a moment after an async action. */
function actionButton(label, action, { primary = false } = {}) {
  const button = el('button', { type: 'button', class: 'button', 'data-variant': primary ? 'primary' : null }, label);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await action();
      button.textContent = t('ui.done');
    } catch (err) {
      button.textContent = t('ui.failed');
      console.error(err);
    }
    setTimeout(() => {
      button.textContent = label;
      button.disabled = false;
    }, 1400);
  });
  return button;
}

function renderExport() {
  const a = state.analysis;
  const base = () => a.filename();
  const shareUrl = state.input ? `${location.origin}${location.pathname}?${new URLSearchParams({ url: state.input })}` : null;
  const tabSelect = el('select', { 'aria-label': t('ui.export.sheetSelect') }, Object.entries(a.tabLabels()).map(([k, v]) => el('option', { value: k }, v)), el('option', { value: 'all' }, t('ui.export.allSheets')));
  const card = (title, note, ...rows) => el('div', { class: 'card flow', 'data-space': 'xs' }, el('h3', {}, title), el('p', { class: 'text-sm text-muted' }, note), rows);

  $('#export').hidden = false;
  replace(
    slot('export'),
    el(
      'div',
      { class: 'cluster', 'data-space': 'xs' },
      actionButton(t('ui.export.quick.audit'), () => copyText(a.markdown())),
      actionButton(t('ui.export.quick.json'), () => downloadFile(`${base()}.json`, a.json(), 'application/json;charset=utf-8')),
      actionButton(t('ui.export.quick.sheets'), () => copyText(a.tsv('all'))),
    ),
    el(
      'details',
      { class: 'card' },
      el('summary', { class: 'font-bold' }, t('ui.export.more')),
      el(
        'div',
        { class: 'grid mt-3', 'data-min': 's' },
        card(
          t('ui.export.audit.title'),
          t('ui.export.audit.note'),
          el(
            'div',
            { class: 'cluster', 'data-space': 'xs' },
            actionButton(t('ui.export.audit.copyMd'), () => copyText(a.markdown()), { primary: true }),
            actionButton(t('ui.export.audit.copyRich'), () => copyRich(a.html(), a.markdown())),
            actionButton(t('ui.export.audit.downloadMd'), () => downloadFile(`${base()}.md`, a.markdown(), 'text/markdown;charset=utf-8')),
            actionButton(t('ui.export.audit.downloadHtml'), () => downloadFile(`${base()}.html`, a.html(), 'text/html;charset=utf-8')),
          ),
        ),
        card(
          t('ui.export.sheet.title'),
          t('ui.export.sheet.note'),
          el('div', { class: 'cluster', 'data-space': 'xs' }, tabSelect, actionButton(t('ui.export.sheet.copy'), () => copyText(a.tsv(tabSelect.value)), { primary: true })),
          el(
            'div',
            { class: 'cluster', 'data-space': 'xs' },
            actionButton(t('ui.export.sheet.downloadTagged'), () => downloadFile(`${base()}.csv`, a.taggedCsv(), 'text/csv;charset=utf-8')),
            actionButton(t('ui.export.sheet.downloadFiles'), () => {
              const name = base();
              Object.entries(a.csvTabs()).forEach(([k, csv], i) => setTimeout(() => downloadFile(`${name}-${k}.csv`, csv, 'text/csv;charset=utf-8'), i * 300));
            }),
          ),
        ),
        card(
          t('ui.export.json.title'),
          tx('ui.export.json.note', { link: el('a', { href: SCHEMA_URL, target: '_blank', rel: 'noopener' }, 'report.schema.json') }),
          el(
            'div',
            { class: 'cluster', 'data-space': 'xs' },
            actionButton(t('ui.export.json.download'), () => downloadFile(`${base()}.json`, a.json(), 'application/json;charset=utf-8'), { primary: true }),
            actionButton(t('ui.export.json.copy'), () => copyText(a.json())),
          ),
        ),
        card(
          t('ui.export.share.title'),
          shareUrl ? t('ui.export.share.live') : t('ui.export.share.noLive'),
          shareUrl && el('p', { class: 'text-sm' }, el('code', {}, shareUrl)),
          shareUrl && el('div', { class: 'cluster' }, actionButton(t('ui.export.share.copy'), () => copyText(shareUrl), { primary: true })),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- AI status

function botPill(c) {
  return el(
    'li',
    { class: 'bot-pill', title: c.explanation },
    el('span', { class: 'bot-pill__name' }, c.name),
    badge(verdictText(c.verdict), VERDICT_STATE[c.verdict]),
  );
}

function renderAiStatus() {
  const ai = state.analysis.report.aiStatus;
  const total = ai.groups.reduce((n, g) => n + g.crawlers.length, 0);
  meta('ai-status-meta', t('ui.ai.checked', { n: total }));
  replace(
    slot('ai-status'),
    el(
      'div',
      { class: 'cluster', 'data-space': 'l' },
      ai.groups.map((g) =>
        el(
          'div',
          {},
          el('p', { class: 'stat__value' }, t('ui.ai.ofTotal', { n: formatNumber(g.counts.blocked), total: formatNumber(g.crawlers.length) })),
          el('p', { class: 'text-sm text-muted' }, t('ui.ai.blockedLabel', { label: g.label })),
        ),
      ),
    ),
    el('div', { class: 'callout', 'data-state': ai.callout.state }, el('p', {}, ai.callout.text)),
    ai.groups.map((g) => el('div', { class: 'flow', 'data-space': 'xs' }, el('h3', {}, g.label), el('ul', { class: 'cluster', 'data-space': 'xs' }, g.crawlers.map(botPill)))),
    el('p', { class: 'text-sm text-muted' }, t('ui.ai.legend')),
  );
}

/** "A → 301 → B → 302 → C", or just the endpoints when the proxy was not used. */
function redirectChain(f) {
  const hops = f.redirects?.length ? f.redirects : [{ from: f.robotsUrl, status: null, to: f.finalUrl }];
  const parts = [el('span', { class: 'font-mono' }, hops[0].from)];
  for (const hop of hops) {
    parts.push(' → ', hop.status ? badge(String(hop.status), 'info') : badge(t('ui.chain.redirect'), 'info'), ' → ', el('span', { class: 'font-mono' }, hop.to));
  }
  if (f.redirectLimit) parts.push(' → ', badge(t('ui.chain.stopped'), 'error'));
  return el('span', {}, parts);
}

// ---------------------------------------------------------------- crawler table

function renderAgents() {
  const { report, crawlers } = state.analysis;
  const headers = ['crawler', 'type', 'group', 'rules', 'root', 'verdict', 'delay'].map((k) => t(`ui.agents.th.${k}`));
  const table = el(
    'table',
    { class: 'data-table' },
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col' }, h)))),
    el(
      'tbody',
      {},
      report.crawlers.map((c) =>
        el(
          'tr',
          { 'data-verdict': c.verdict, 'data-category': c.category },
          el('td', { title: c.note || null }, c.name),
          el('td', { class: 'text-muted' }, c.categoryLabel),
          el('td', {}, c.groupUsed === null ? el('span', { class: 'text-muted' }, t('ui.none')) : el('code', {}, c.groupUsed)),
          el('td', { class: 'text-muted' }, c.allowRules + c.disallowRules ? t('ui.agents.ruleCounts', { disallow: c.disallowRules, allow: c.allowRules }) : el('span', { class: 'text-muted' }, t('ui.none'))),
          el('td', {}, badge(c.rootAllowed ? t('ui.allowed') : t('ui.blocked'), c.rootAllowed ? 'ok' : 'error')),
          el('td', {}, verdictBadge(c.verdict)),
          el('td', { class: 'text-muted' }, c.crawlDelay === null ? '–' : t('ui.seconds', { n: formatNumber(c.crawlDelay) })),
        ),
      ),
    ),
  );
  const blocked = report.crawlers.filter((c) => c.verdict === 'blocked').length;
  const setMeta = (shown) => meta('agents-meta', t('ui.agents.meta', { shown, total: report.crawlers.length, blocked }));
  const categories = ['all', ...crawlers.categories];
  const filter = el(
    'div',
    { class: 'cluster', role: 'group', 'aria-label': t('ui.agents.filterLabel'), 'data-space': 'xs' },
    categories.map((cat) =>
      el(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': cat === 'all' ? 'true' : 'false',
          onclick: (e) => {
            filter.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false'));
            e.currentTarget.setAttribute('aria-pressed', 'true');
            let shown = 0;
            table.querySelectorAll('tbody tr').forEach((tr) => {
              const hide = cat !== 'all' && tr.dataset.category !== cat;
              tr.dataset.hidden = hide ? 'true' : 'false';
              if (!hide) shown++;
            });
            setMeta(shown);
          },
        },
        cat === 'all' ? t('ui.agents.all') : t(`agents.category.${cat}`),
      ),
    ),
  );
  setMeta(report.crawlers.length);
  replace(
    slot('agents'),
    filter,
    el(
      'div',
      { class: 'table-frame' },
      scrollable(t('page.agents'), table),
    ),
    el('p', { class: 'text-sm text-muted' }, t('ui.agents.local'), ' ', el('a', { href: '#cli' }, t('ui.agents.cli'))),
  );
}

// ---------------------------------------------------------------- path tester

function renderTester() {
  const { crawlers } = state.analysis;
  const select = el(
    'select',
    { id: 'tester-agent' },
    el('option', { value: '*' }, t('ui.tester.generic')),
    crawlers.list.map((a) => el('option', { value: a.name }, a.name)),
    el('option', { value: 'custom' }, t('ui.tester.custom')),
  );
  const custom = el('input', { type: 'text', id: 'tester-token', placeholder: t('ui.tester.customPlaceholder'), 'aria-label': t('ui.tester.customLabel'), hidden: true });
  const path = el('input', { type: 'text', id: 'tester-path', placeholder: t('ui.tester.pathPlaceholder'), value: '/', spellcheck: 'false' });
  const out = el('div', { class: 'callout', 'data-state': 'info', 'aria-live': 'polite' });
  const chips = el(
    'div',
    { class: 'cluster', role: 'group', 'aria-label': t('ui.tester.examples'), 'data-space': 'xs' },
    SAMPLE_PATHS.map((p) => el('button', { type: 'button', class: 'chip font-mono', onclick: () => { path.value = p; update(); } }, p)),
  );

  function tokens() {
    if (select.value === '*') return [];
    if (select.value === 'custom') return custom.value.trim() ? [custom.value.trim()] : [];
    return crawlers.list.find((a) => a.name === select.value).tokens;
  }

  function update() {
    custom.hidden = select.value !== 'custom';
    const tk = tokens();
    if (select.value === 'custom' && tk.length === 0) {
      out.dataset.state = 'info';
      replace(out, el('p', {}, t('ui.tester.enterToken')));
      return;
    }
    const r = state.analysis.checkAccess(tk, path.value);
    out.dataset.state = r.allowed ? 'ok' : 'error';
    let groupText;
    if (r.token === null) groupText = t('ui.tester.noGroup');
    else if (r.specific) groupText = t('ui.tester.ownGroup', { token: r.token });
    else groupText = t('ui.tester.starGroup');
    let ruleText;
    if (r.always) ruleText = el('p', {}, t('ui.tester.always'));
    else if (r.rule) {
      ruleText = el('p', {}, tx('ui.tester.matched', {
        rule: el('code', {}, `${r.rule.type === 'allow' ? 'Allow' : 'Disallow'}: ${r.rule.path}`),
        line: el('a', { href: `#line-${r.rule.line}`, class: 'text-sm' }, lineText(r.rule.line)),
      }));
    } else ruleText = el('p', {}, t('ui.tester.noMatch'));
    // Yandex is the only crawler that honours Clean-param.
    let cleanText = null;
    if (tk.some((tok) => tok.toLowerCase().startsWith('yandex'))) {
      const cleaned = state.analysis.cleanParams(path.value);
      if (cleaned.removed.length) {
        cleanText = el('p', {}, tx('ui.tester.cleanParam', { params: cleaned.removed.join(', '), path: el('code', {}, cleaned.path) }));
      }
    }
    replace(
      out,
      el('p', { class: 'verdict' }, tx('ui.tester.verdict', { verdict: r.allowed ? t('ui.allowed') : t('ui.blocked'), path: el('code', {}, r.path) })),
      el('p', {}, groupText),
      ruleText,
      cleanText,
      r.crawlDelay !== null && el('p', {}, t('ui.tester.crawlDelay', { n: formatNumber(r.crawlDelay) })),
    );
  }

  select.addEventListener('change', update);
  custom.addEventListener('input', update);
  path.addEventListener('input', update);
  replace(
    slot('tester'),
    el(
      'div',
      { class: 'grid', 'data-min': 's' },
      el('div', { class: 'stack', 'data-space': '2xs' }, el('label', { for: 'tester-agent', class: 'text-sm font-bold' }, t('ui.tester.crawler')), select, custom),
      el('div', { class: 'stack', 'data-space': '2xs' }, el('label', { for: 'tester-path', class: 'text-sm font-bold' }, t('ui.tester.path')), path),
    ),
    chips,
    out,
  );
  update();
}

// ---------------------------------------------------------------- access check

function renderAccess() {
  const container = slot('access');
  if (!state.fetch) {
    replace(container, el('p', { class: 'text-sm text-muted' }, t('ui.access.pastedOnly')));
    return;
  }
  if (!proxyConfigured()) {
    replace(container, el('p', { class: 'text-sm text-muted' }, t('ui.access.noProxy')));
    return;
  }
  const count = 1 + state.analysis.crawlers.list.filter((a) => a.ua).length;
  const button = el('button', { type: 'button', class: 'button', onclick: () => runAccessCheck(button, container) }, t('ui.access.run'));
  replace(container, el('div', { class: 'cluster' }, button, el('span', { class: 'font-mono text-sm text-muted' }, t('ui.access.requests', { count, concurrency: ACCESS_CHECK_CONCURRENCY }))));
}

async function runAccessCheck(button, container) {
  button.disabled = true;
  const { robotsUrl } = state.fetch;
  const crawlers = state.analysis.crawlers;
  const targets = [{ name: t('ui.access.baseline'), ua: crawlers.browser_ua }, ...crawlers.list.filter((a) => a.ua)];
  const rows = new Map();
  const tbody = el('tbody');
  for (const target of targets) {
    const tr = el('tr', {}, el('td', {}, target.name), el('td', { class: 'text-muted' }, t('ui.access.queued')), el('td'), el('td'), el('td'));
    rows.set(target.name, tr);
    tbody.append(tr);
  }
  const headers = ['ua', 'status', 'size', 'time', 'diff'].map((k) => t(`ui.access.th.${k}`));
  const table = el('table', { class: 'data-table' }, el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col' }, h)))), tbody);
  replace(container, el('div', { class: 'table-frame' }, scrollable(t('page.access'), table)), el('div', { class: 'cluster' }, button));
  let baseline = null;

  async function runOne(target) {
    const tds = rows.get(target.name).querySelectorAll('td');
    tds[1].textContent = t('ui.access.fetching');
    try {
      const r = await fetchViaProxy(robotsUrl, target.ua);
      replace(tds[1], badge(String(r.status), r.status < 300 ? 'ok' : r.status < 500 ? 'warning' : 'error'));
      tds[1].className = '';
      tds[2].textContent = formatBytes(r.bytes);
      tds[3].textContent = formatMs(r.durationMs);
      if (target === targets[0]) tds[4].textContent = '–';
      else if (!baseline) tds[4].textContent = t('ui.access.noBaseline');
      else if (r.status !== baseline.status) {
        tds[4].textContent = t('ui.access.statusDiffers');
        tds[4].dataset.diff = 'differs';
      } else if (r.text !== baseline.text) {
        tds[4].textContent = t('ui.access.bodyDiffers');
        tds[4].dataset.diff = 'differs';
      } else tds[4].textContent = t('ui.access.same');
      return r;
    } catch (err) {
      replace(tds[1], badge(err.status === 429 ? t('ui.access.rateLimited') : t('ui.access.error'), 'error'));
      tds[1].className = '';
      tds[4].textContent = err.message;
      return null;
    }
  }

  baseline = await runOne(targets[0]);
  const queue = targets.slice(1);
  await Promise.all(Array.from({ length: ACCESS_CHECK_CONCURRENCY }, async () => {
    while (queue.length) await runOne(queue.shift());
  }));
  button.disabled = false;
  button.textContent = t('ui.access.runAgain');
}

// ---------------------------------------------------------------- issues

function renderWarnings() {
  const r = state.analysis.report;
  const ws = [...r.issues].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || (a.line ?? Infinity) - (b.line ?? Infinity));
  const counts = r.summary.issues;
  const worst = counts.errors ? 'error' : counts.warnings ? 'warning' : 'info';
  meta('issues-meta', ws.length ? badge(t('ui.issues.meta', { errors: counts.errors, warnings: counts.warnings, notes: counts.notes }), worst) : null);
  if (ws.length === 0) {
    replace(slot('warnings'), el('p', { class: 'text-sm text-muted' }, t('ui.issues.none')));
    return;
  }
  const item = (w) =>
    el(
      'li',
      { 'data-level': w.level, 'data-id': w.id },
      el('span', { class: 'line-ref font-mono text-sm' }, w.line ? el('a', { href: `#line-${w.line}` }, lineText(w.line)) : t('ui.file')),
      badge(levelLabel(w.level), w.level),
      el('span', {}, w.message),
    );
  replace(slot('warnings'), capped(ws, 6, item, (items) => el('ul', { class: 'issue-list' }, items)));
}

// ---------------------------------------------------------------- security

const SEVERITY_STATE = { high: 'error', medium: 'warning', low: 'info' };

function renderSecurity() {
  const container = slot('security');
  const r = state.analysis.report;
  const disallowCount = r.rules.filter((x) => x.type === 'disallow' && x.path).length;
  const findings = r.security;
  if (findings.length === 0) {
    replace(
      container,
      el('p', { class: 'text-sm text-muted' }, disallowCount ? t('ui.security.noneFound') : t('ui.security.noRules')),
      disallowCount > 0 && el('p', { class: 'text-sm text-muted' }, t('security.reconWarning')),
    );
    return;
  }
  const bySeverity = { high: 0, medium: 0, low: 0 };
  findings.forEach((f) => bySeverity[f.severity]++);
  const worst = findings[0];
  const category = (id) => r.securityCategories.find((c) => c.id === id);
  const labelOf = (id) => category(id)?.label ?? id;
  const used = r.securityCategories.filter((c) => findings.some((f) => f.category === c.id));
  replace(
    container,
    el(
      'div',
      { class: 'callout', 'data-state': SEVERITY_STATE[worst.severity] },
      el('p', { class: 'verdict' }, t('ui.security.exposed', { n: findings.length })),
      el('p', {}, tx('ui.security.lead', { rule: el('code', {}, `Disallow: ${worst.path}`), reason: worst.reason.replace(/\.?$/, '') }), ' ', category(worst.category)?.advice || t('security.reconWarning')),
    ),
    el('p', { class: 'font-mono text-sm text-muted' }, t('ui.security.counts', { ...bySeverity, total: disallowCount })),
    capped(
      findings,
      5,
      (f) =>
        el(
          'div',
          { class: 'finding', 'data-severity': f.severity },
          el('code', {}, `Disallow: ${f.path}`),
          el('span', {}, el('a', { href: `#line-${f.line}`, title: f.reason + (f.userAgents.includes('*') ? '' : t('ui.security.group', { agents: f.userAgents.join(', ') })) }, t('ui.security.where', { line: f.line, category: labelOf(f.category) }))),
          badge(t(`enum.severity.${f.severity}`), SEVERITY_STATE[f.severity]),
        ),
      (items) => el('div', {}, items),
    ),
    el(
      'details',
      { class: 'card' },
      el('summary', {}, t('ui.security.whatToDo')),
      el('dl', { class: 'stack' }, used.map((c) => el('div', {}, el('dt', { class: 'font-bold text-sm' }, c.label), el('dd', { class: 'text-sm text-muted' }, c.advice)))),
    ),
  );
}

// ---------------------------------------------------------------- reconnaissance

const CONFIDENCE_STATE = { high: 'ok', medium: 'warning', low: 'info' };

/**
 * One recon category as a compact card: title, one-line finding, and the
 * full evidence behind a disclosure when there is something to show.
 */
function reconCard(title, count, value, ...body) {
  return el(
    'article',
    { class: 'card', 'data-empty': count === 0 ? 'true' : 'false' },
    el('h3', {}, title),
    el('p', { class: 'font-mono text-sm mt-1' }, count ? value : t('ui.recon.nothing')),
    count > 0 && el('details', {}, el('summary', {}, t('ui.recon.details')), el('div', { class: 'flow', 'data-space': 'xs' }, body)),
  );
}

const sub = (text) => el('p', { class: 'font-bold text-sm' }, text);
const confidenceText = (c) => t('ui.recon.confidence', { confidence: t(`enum.confidence.${c}`) });
const sourceText = (s) => (s === 'comment' ? t('enum.source.comment') : s);
const items = (n) => t('ui.recon.items', { n });

function stackCard(r) {
  const { primary, detections } = r.stack;
  const value = primary ? `${primary.name}, ${confidenceText(primary.confidence)}` : items(detections.length + r.tech.length);
  return reconCard(
    t('ui.recon.stack'),
    detections.length + r.tech.length,
    value,
    primary && el('p', { class: 'text-sm' }, `${t(`recon.cms.kind.${primary.kind}`)}: ${primary.name} `, badge(confidenceText(primary.confidence), CONFIDENCE_STATE[primary.confidence])),
    r.tech.length > 0 && el('p', { class: 'text-sm' }, t('ui.recon.techHints', { list: r.tech.join(', ') })),
    detections.length > 0 &&
      el('ul', { class: 'stack text-sm' }, detections.map((d) =>
        el('li', {}, el('details', {},
          el('summary', {}, `${d.name} `, el('span', { class: 'text-muted' }, `(${t(`recon.cms.kind.${d.kind}`)}, ${t(`enum.confidence.${d.confidence}`)}, ${t('ui.recon.clues', { n: d.evidence.length })})`)),
          el('ul', {}, d.evidence.map((e) => el('li', {}, el('code', {}, e.text), ' ', lineLink(e.line)))),
        )),
      )),
  );
}

function cloudCard(r) {
  const kinds = [...new Set(r.cloud.map((c) => c.kind))];
  const headers = ['provider', 'bucket', 'host', 'source'].map((k) => t(`ui.recon.th.${k}`));
  const providers = [...new Set(r.cloud.map((c) => c.provider))];
  return reconCard(
    t('ui.recon.cloud'),
    r.cloud.length,
    `${items(r.cloud.length)}: ${providers.join(', ')}`,
    scrollable(t('ui.recon.cloud'), el('table', { class: 'data-table' },
      el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, r.cloud.map((c) =>
        el('tr', {},
          el('td', {}, c.provider, ' ', el('span', { class: 'text-sm text-muted' }, t(`recon.cloud.kind.${c.kind}`))),
          el('td', {}, c.bucket ? el('code', {}, c.bucket) : '–'),
          el('td', {}, el('code', {}, c.host)),
          el('td', {}, sourceText(c.source), ' ', lineLink(c.line)),
        ))),
    )),
    kinds.map((k) => el('p', { class: 'text-sm text-muted' }, `${t(`recon.cloud.kind.${k}`)}: ${t(`recon.cloud.risk.${k}`)}`)),
  );
}

function hostsCard(r) {
  const { hosts, paths } = r.hosts;
  const relationBadge = (h) => badge(t(`enum.relation.${h.relation}`), h.relation === 'ip' ? 'warning' : 'info');
  return reconCard(
    t('ui.recon.hosts'),
    hosts.length + paths.length,
    hosts.length ? hosts.slice(0, 3).map((h) => h.host).join(', ') + (hosts.length > 3 ? ` +${hosts.length - 3}` : '') : items(paths.length),
    hosts.length > 0 && sub(t('ui.recon.hostnames')),
    hosts.length > 0 && el('ul', { class: 'stack' }, hosts.map((h) =>
      el('li', {},
        el('div', { class: 'cluster' }, el('code', {}, h.host), relationBadge(h), h.env && badge(h.env, 'warning')),
        el('p', { class: 'text-sm text-muted' }, h.sources.map((s, i) => [i > 0 && ', ', `${sourceText(s.source)} `, lineLink(s.line)])),
      ))),
    paths.length > 0 && sub(t('ui.recon.envPaths')),
    paths.length > 0 && el('ul', { class: 'stack' }, paths.map((p) => el('li', { class: 'cluster' }, el('code', {}, p.path), badge(p.hint, 'warning'), lineLink(p.line)))),
    !state.siteUrl && hosts.length === 0 && el('p', { class: 'text-sm text-muted' }, t('ui.recon.ownHost')),
  );
}

function apiCard(r) {
  const kinds = [...new Set(r.api.map((a) => a.kind))];
  return reconCard(
    t('ui.recon.api'),
    r.api.length,
    `${items(r.api.length)}: ${kinds.map((k) => t(`recon.api.kind.${k}`)).join(', ')}`,
    kinds.map((k) => [
      sub(t(`recon.api.kind.${k}`)),
      el('ul', { class: 'cluster' }, r.api.filter((a) => a.kind === k).map((a) => el('li', { class: 'cluster', 'data-space': '2xs' }, el('code', {}, a.path), a.version && badge(a.version, 'info'), lineLink(a.line)))),
      el('p', { class: 'text-sm text-muted' }, t(`recon.api.note.${k}`)),
    ]),
  );
}

function dataCard(r) {
  const { feeds, portals, search } = r.data;
  const roleState = { search: 'warning', filter: 'info', tracking: null, other: null };
  const pathList = (list, withKind) => el('ul', { class: 'stack' }, list.map((f) => el('li', { class: 'cluster' }, el('code', {}, f.path), withKind && el('span', { class: 'text-sm text-muted' }, f.kind), lineLink(f.line))));
  const count = feeds.length + portals.length + search.paths.length;
  const parts = [feeds.length && `${feeds.length} ${t('ui.recon.feeds').toLowerCase()}`, portals.length && `${portals.length} ${t('ui.recon.portals').toLowerCase()}`, search.paths.length && `${search.paths.length} ${t('ui.recon.search').toLowerCase()}`].filter(Boolean);
  return reconCard(
    t('ui.recon.data'),
    count,
    parts.join(', '),
    feeds.length > 0 && sub(t('ui.recon.feeds')),
    feeds.length > 0 && pathList(feeds, true),
    portals.length > 0 && sub(t('ui.recon.portals')),
    portals.length > 0 && pathList(portals, true),
    search.paths.length > 0 && sub(t('ui.recon.search')),
    search.paths.length > 0 && pathList(search.paths, false),
    search.params.length > 0 && sub(t('ui.recon.params')),
    search.params.length > 0 && el('ul', { class: 'cluster' }, search.params.map((p) => el('li', { class: 'cluster', 'data-space': '2xs' }, el('code', {}, p.name), badge(t(`enum.role.${p.role}`), roleState[p.role])))),
  );
}

function extensionsCard(r) {
  const headers = ['type', 'suggests', 'risk', 'rules', 'examples'].map((k) => t(`ui.recon.th.${k}`));
  return reconCard(
    t('ui.recon.ext'),
    r.extensions.length,
    r.extensions.map((e) => `.${e.ext}`).join(' '),
    scrollable(t('ui.recon.ext'), el('table', { class: 'data-table' },
      el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, r.extensions.map((e) =>
        el('tr', {},
          el('td', {}, el('code', {}, `.${e.ext}`)),
          el('td', {}, e.label),
          el('td', {}, badge(t(`enum.risk.${e.risk}`), e.risk)),
          el('td', {}, formatNumber(e.count)),
          el('td', {}, e.examples.map((x, i) => [i > 0 && ' ', el('code', {}, x.path), ' ', lineLink(x.line)])),
        ))),
    )),
  );
}

function commentsCard(r) {
  const kinds = [...new Set(r.comments.map((c) => c.kind))];
  return reconCard(
    t('ui.recon.comments'),
    r.comments.length,
    `${items(r.comments.length)}: ${kinds.map((k) => t(`recon.comments.kind.${k}`)).join(', ')}`,
    kinds.map((k) => [
      sub(t(`recon.comments.kind.${k}`)),
      el('ul', { class: 'stack' }, r.comments.filter((c) => c.kind === k).map((c) =>
        el('li', {},
          el('div', { class: 'cluster' }, el('code', {}, c.value), c.note && badge(c.note, 'warning'), lineLink(c.line)),
          el('p', { class: 'text-sm text-muted' }, `# ${c.comment}`),
        ))),
      el('p', { class: 'text-sm text-muted' }, t(`recon.comments.value.${k}`)),
    ]),
  );
}

function renderRecon() {
  const r = state.analysis.report.recon;
  const counts = [r.stack.detections.length, r.cloud.length, r.hosts.hosts.length + r.hosts.paths.length, r.api.length, r.data.feeds.length + r.data.portals.length + r.data.search.paths.length, r.extensions.length, r.comments.length];
  const total = counts.reduce((a, b) => a + b, 0);
  replace(
    slot('recon'),
    el('p', { class: 'font-mono text-sm text-muted' }, total ? t('ui.recon.total', { n: total, categories: counts.filter(Boolean).length }) : t('ui.recon.quiet')),
    el('div', { class: 'grid', 'data-min': 's' }, stackCard(r), cloudCard(r), hostsCard(r), apiCard(r), dataCard(r), extensionsCard(r), commentsCard(r)),
  );
}

function renderSitemaps() {
  const r = state.analysis.report;
  const container = slot('sitemaps');
  if (r.sitemaps.length === 0) {
    replace(container, el('p', { class: 'text-sm text-muted' }, t('ui.sitemaps.none')));
    return;
  }
  const notesFor = (line) => r.issues.filter((w) => w.line === line);
  replace(
    container,
    !state.siteUrl && el('p', { class: 'text-sm text-muted' }, t('ui.sitemaps.needUrl')),
    el('ul', { class: 'stack', 'data-space': '2xs' }, r.sitemaps.map((s) =>
      el('li', { class: 'text-sm' },
        el('div', { class: 'cluster', 'data-space': 'xs' }, s.valid ? el('a', { class: 'font-mono', href: s.url, target: '_blank', rel: 'noopener' }, s.url) : el('code', {}, s.url), el('span', { class: 'line-ref font-mono text-sm' }, lineLink(s.line))),
        notesFor(s.line).map((w) => el('p', { class: 'text-sm text-muted' }, badge(levelLabel(w.level), w.level), ' ', w.message)),
      ))),
  );
}

function renderRaw() {
  const r = state.analysis.report;
  const actions = $('#raw [data-slot="actions"]');
  if (!r.raw) {
    replace(actions);
    replace(slot('raw'), el('p', { class: 'text-muted p-5' }, t('ui.raw.nothing')));
    return;
  }
  const levelByLine = new Map();
  for (const w of r.issues) {
    if (!w.line || w.level === 'info') continue;
    const current = levelByLine.get(w.line);
    if (!current || LEVEL_ORDER[w.level] < LEVEL_ORDER[current]) levelByLine.set(w.line, w.level);
  }
  const kinds = state.analysis.lines();
  const lines = r.raw.split(/\r\n|\r|\n/);
  const pre = el('pre', { class: 'raw', tabindex: '0' }, lines.map((raw, i) =>
    el('span', { class: 'raw__line', id: `line-${i + 1}`, 'data-kind': kinds[i]?.kind || 'blank', 'data-level': levelByLine.get(i + 1) || null },
      el('span', { class: 'raw__num', 'aria-hidden': 'true' }, String(i + 1)),
      raw,
    )));
  const copy = el('button', { type: 'button', class: 'button', onclick: async () => {
    try {
      await navigator.clipboard.writeText(r.raw);
      copy.textContent = t('ui.raw.copied');
      setTimeout(() => { copy.textContent = t('ui.raw.copy'); }, 1500);
    } catch {
      copy.textContent = t('ui.raw.copyFailed');
    }
  } }, t('ui.raw.copy'));
  replace(actions, copy, state.fetch && el('a', { class: 'text-sm', href: state.fetch.finalUrl, target: '_blank', rel: 'noopener' }, t('ui.raw.openOriginal')));
  replace(slot('raw'), pre);
}

// ---------------------------------------------------------------- pricing

/** Plan cards from PRICING (numbers, links) and the dictionary (words). */
function renderPricing(cycle) {
  const container = slot('pricing');
  if (!container) return;
  const plans = PRICING.plans.filter((p) => PRICING.show || p.id === 'free');
  const features = (id) => {
    const out = [];
    for (let i = 1; i <= 6; i++) {
      const key = `ui.plan.${id}.f${i}`;
      const text = t(key);
      if (text === key) break;
      out.push(text);
    }
    return out;
  };
  replace(
    container,
    plans.map((p) => {
      const price = cycle === 'annual' ? p.annual : p.monthly;
      let cta;
      if (p.id === 'free') cta = el('button', { type: 'button', class: 'button', disabled: true }, t('ui.plan.free.cta'));
      else if (p.url) cta = el('a', { class: 'button', 'data-variant': p.featured ? 'primary' : null, href: p.url, rel: 'noopener' }, t(`ui.plan.${p.id}.cta`));
      else cta = el('button', { type: 'button', class: 'button', disabled: true }, t('ui.plan.soon'));
      return el(
        'article',
        { class: 'plan', 'data-featured': p.featured ? 'true' : 'false', 'aria-labelledby': `plan-${p.id}` },
        el('h3', { id: `plan-${p.id}` }, t(`ui.plan.${p.id}.name`)),
        el('p', {}, el('span', { class: 'plan__price' }, `${PRICING.currency}${formatNumber(price)}`), price > 0 && el('span', { class: 'text-sm text-muted' }, ` ${cycle === 'annual' ? t('ui.plan.perMonthAnnual') : t('ui.plan.perMonth')}`)),
        el('p', { class: 'text-sm text-muted' }, t(`ui.plan.${p.id}.blurb`)),
        el('ul', { class: 'plan__features' }, features(p.id).map((f) => el('li', {}, f))),
        cta,
      );
    }),
  );
}

function initPricing() {
  const buttons = document.querySelectorAll('#billing-cycle [data-cycle]');
  if (!buttons.length) return;
  const apply = (cycle) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cycle === cycle)));
    renderPricing(cycle);
  };
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.cycle)));
  apply('monthly');
}

/** Figures the static copy quotes: how many AI agents the registry checks. */
function fillFigures() {
  const probe = new Analysis('', engineOptions());
  try {
    const ai = probe.report.aiStatus.groups.reduce((n, g) => n + g.crawlers.length, 0);
    document.querySelectorAll('[data-fill="ai-agents"]').forEach((n) => { n.textContent = formatNumber(ai); });
  } finally {
    probe.free();
  }
  const ext = $('[data-fill="extension-link"]');
  if (ext && LINKS.extension) ext.append(' ', el('a', { href: LINKS.extension, rel: 'noopener' }, t('ui.extension.link')));
}

// ---------------------------------------------------------------- recent sites

// The sites this browser checked, newest first, kept in localStorage only.
// The newest one is analysed by default when the page opens without a URL.
const RECENT_KEY = 'recent';
const RECENT_MAX = 5;

// Referrers that say nothing about the visitor's own site.
const GENERIC_REFERRERS = ['google.', 'bing.com', 'duckduckgo.com', 'yahoo.', 'baidu.com', 'yandex.', 'ecosia.org', 'qwant.com', 'startpage.com', 'search.brave.com', 'facebook.com', 't.co', 'x.com', 'twitter.com', 'linkedin.com', 'lnkd.in', 'reddit.com', 'news.ycombinator.com', 'github.com', 'mastodon.', 'bsky.app'];

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((o) => typeof o === 'string' && /^https?:\/\//.test(o)).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecent(list) {
  try {
    if (list.length) localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    else localStorage.removeItem(RECENT_KEY);
  } catch {
    // storage unavailable; the list just is not kept
  }
}

function remember(origin) {
  writeRecent([origin, ...readRecent().filter((o) => o !== origin)].slice(0, RECENT_MAX));
  renderRecent();
}

/**
 * The site that linked here, when the browser sends it (usually the origin
 * only) and it is not a search engine or social network. Browsers never
 * expose any other history to a page.
 */
function referrerOrigin() {
  try {
    const u = new URL(document.referrer);
    if (!/^https?:$/.test(u.protocol) || u.origin === location.origin) return null;
    const host = u.hostname.replace(/^www\./, '');
    if (GENERIC_REFERRERS.some((g) => (g.endsWith('.') ? host.startsWith(g) || host.includes(`.${g}`) : host === g || host.endsWith(`.${g}`)))) return null;
    return u.origin;
  } catch {
    return null;
  }
}

const hostOf = (origin) => new URL(origin).host;

function checkOrigin(origin) {
  $('#site-url').value = origin;
  analyseUrl(origin);
}

function renderRecent() {
  const box = $('#recent');
  const recent = readRecent();
  const ref = referrerOrigin();
  const suggest = ref && !recent.includes(ref) ? ref : null;
  box.hidden = recent.length === 0 && !suggest;
  replace(
    box,
    suggest && [el('span', { class: 'text-sm text-muted' }, t('ui.recent.from')), el('button', { type: 'button', class: 'chip', onclick: () => checkOrigin(suggest) }, hostOf(suggest))],
    recent.length > 0 && [
      el('span', { class: 'text-sm text-muted', id: 'recent-label' }, t('ui.recent.label')),
      el('ul', { class: 'cluster', 'data-space': 'xs', 'aria-labelledby': 'recent-label' }, recent.map((o) => el('li', {}, el('button', { type: 'button', class: 'chip', onclick: () => checkOrigin(o) }, hostOf(o))))),
      el('button', { type: 'button', class: 'link-button text-sm', onclick: () => { writeRecent([]); renderRecent(); } }, t('ui.recent.clear')),
    ],
  );
}

// ---------------------------------------------------------------- theme and language

function initTheme() {
  const buttons = document.querySelectorAll('[data-theme-choice]');
  const read = () => readStored('theme') || 'system';
  const apply = (choice) => {
    if (choice === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
    try {
      if (choice === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', choice);
    } catch {
      // storage unavailable; the choice still applies for this page view
    }
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)));
  };
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.themeChoice)));
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === read())));
}

/**
 * The switcher is plain links rendered by tools/gen-pages.js. Here they gain
 * the current query string (so ?url= survives a switch) and clicking one
 * records the choice, which stops the root page from auto-redirecting.
 */
function initLanguage() {
  document.querySelectorAll('a[data-lang]').forEach((a) => {
    a.href = a.getAttribute('href') + location.search;
    a.addEventListener('click', () => {
      try {
        localStorage.setItem('lang', a.dataset.lang);
      } catch {
        // storage unavailable; the navigation still happens
      }
    });
  });
  if (getLocale() !== DEFAULT_LANG) {
    try {
      if (!localStorage.getItem('lang')) localStorage.setItem('lang', getLocale());
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------- init

async function init() {
  initTheme();
  initLanguage();
  initPricing();
  fillFigures();
  try {
    // The page used to keep a visitor-supplied TOML under this key; the
    // feature is gone, so clear what earlier visits may have left behind.
    localStorage.removeItem('config');
  } catch {
    // storage unavailable
  }
  $('#fetch-form').addEventListener('submit', (e) => {
    e.preventDefault();
    analyseUrl($('#site-url').value);
  });
  $('#analyse-pasted').addEventListener('click', () => {
    const text = $('#pasted-text').value;
    if (!text.trim()) {
      setStatus('error', t('ui.status.pasteFirst'));
      return;
    }
    history.replaceState(null, '', location.pathname);
    analysePasted(text);
  });
  $('#load-example').addEventListener('click', () => loadExample('kitchen-sink'));
  renderRecent();
  const params = new URLSearchParams(location.search);
  if (params.get('url')) {
    $('#site-url').value = params.get('url');
    analyseUrl(params.get('url'));
  } else if (params.get('example')) {
    loadExample(params.get('example'));
  } else if (readRecent().length) {
    checkOrigin(readRecent()[0]);
  }
}

init();
