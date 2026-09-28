// How you compare, which is the question straight after "is my file right".
//
// Every robots.txt is public, so this costs one more fetch and one more run of
// the engine, and nothing else: no account, no crawl, nothing touched on either
// site. Five rows, because five is what a decision needs. Each row is the same
// fact read off both reports, and the last column says why it matters, which is
// the only part written by us rather than measured.
//
// The last row is deliberately "Unknown" on both sides. Neither file says when
// it last changed, and one check cannot know: that is exactly what watching is
// for, and saying so is more honest than leaving the row out.

import { t, formatNumber, getLocale, DEFAULT_LANG, currentDictionary } from '../i18n.ts';
import { el, replace, slot, $ } from '../dom.ts';
import { state, current } from '../state.ts';
import { fetchRobots, FetchError } from '../fetcher.ts';
import { Analysis, loadEngine, type Options } from '../engine.ts';
import { trackOffer, trackExport } from '../track.ts';
import { APP_URL } from '../config.ts';
import type { Report } from '../types.ts';

const SEARCH_TOKENS = ['bingbot', 'duckduckbot', 'applebot'];

interface Cell {
  text: string;
  state: string;
}

interface Row {
  label: string;
  you: Cell;
  them: Cell;
  soWhat: string;
}

/** Whether the named crawlers can reach the home page: all, none or some. */
function reach(report: Report, tokens: string[]): Cell {
  const named = report.crawlers.filter((c) => tokens.some((token) => c.name.toLowerCase().includes(token)));
  if (named.length === 0) return { text: t('ui.compare.unknown'), state: 'muted' };
  const allowed = named.filter((c) => c.rootAllowed).length;
  if (allowed === named.length) return { text: t('ui.compare.yes'), state: 'ok' };
  if (allowed === 0) return { text: t('ui.compare.no'), state: 'bad' };
  return { text: t('ui.compare.partly'), state: 'warn' };
}

/** The AI search group: can an answer engine cite this site at all? */
function cited(report: Report): Cell {
  const group = report.aiStatus.groups[1] || report.aiStatus.groups[0];
  if (!group) return { text: t('ui.compare.unknown'), state: 'muted' };
  const { open, partial, blocked } = group.counts;
  if (blocked === 0) return { text: t('ui.compare.yes'), state: 'ok' };
  if (open === 0 && partial === 0) return { text: t('ui.compare.no'), state: 'bad' };
  return { text: t('ui.compare.partly'), state: 'warn' };
}

function training(report: Report): Cell {
  const group = report.aiStatus.groups[0];
  if (!group) return { text: t('ui.compare.unknown'), state: 'muted' };
  const loose = group.counts.open + group.counts.partial;
  return { text: t('ui.compare.ofTotal', { n: loose, total: group.crawlers.length }), state: loose === 0 ? 'ok' : 'muted' };
}

function exposed(report: Report): Cell {
  const n = report.security.filter((f) => f.severity !== 'info').length;
  return { text: formatNumber(n), state: n === 0 ? 'ok' : 'bad' };
}

function rows(you: Report, them: Report): Row[] {
  const unknown = { text: t('ui.compare.unknown'), state: 'muted' };
  return [
    { label: t('ui.compare.row.found'), you: reach(you, SEARCH_TOKENS), them: reach(them, SEARCH_TOKENS), soWhat: t('ui.compare.so.found') },
    { label: t('ui.compare.row.cited'), you: cited(you), them: cited(them), soWhat: t('ui.compare.so.cited') },
    { label: t('ui.compare.row.training'), you: training(you), them: training(them), soWhat: t('ui.compare.so.training') },
    { label: t('ui.compare.row.exposed'), you: exposed(you), them: exposed(them), soWhat: t('ui.compare.so.exposed') },
    { label: t('ui.compare.row.changed'), you: unknown, them: unknown, soWhat: t('ui.compare.so.changed') },
  ];
}

function table(youHost: string, themHost: string, list: Row[]): HTMLElement {
  return el(
    'div',
    { class: 'table-frame' },
    el(
      'table',
      { class: 'data-table compare-table' },
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col' }, t('ui.compare.th.what')),
        el('th', { scope: 'col', class: 'font-mono' }, youHost),
        el('th', { scope: 'col', class: 'font-mono' }, themHost),
        el('th', { scope: 'col' }, t('ui.compare.th.so')),
      ])),
      el('tbody', {}, list.map((row) =>
        el(
          'tr',
          {},
          el('th', { scope: 'row' }, row.label),
          el('td', { 'data-cell': row.you.state }, row.you.text),
          el('td', { 'data-cell': row.them.state }, row.them.text),
          el('td', { class: 'text-sm text-muted' }, row.soWhat),
        ))),
    ),
  );
}

/** The offer under the table: one check is a snapshot, and theirs will change. */
function upsell(): HTMLElement {
  const origin = state.fetch ? new URL(state.fetch.robotsUrl).origin : null;
  const href = origin ? `${APP_URL}/signup/?${new URLSearchParams({ site: origin })}` : `${APP_URL}/signup/`;
  const cta = el('a', { class: 'button', 'data-variant': 'primary', href }, t('ui.compare.cta'));
  cta.addEventListener('click', () => trackOffer('compare.watch', current().report));
  return el(
    'div',
    { class: 'upsell' },
    el(
      'div',
      { class: 'flow max-w-prose', 'data-space': '2xs' },
      el('p', { class: 'font-bold' }, t('ui.compare.upsell.title')),
      el('p', { class: 'text-sm' }, t('ui.compare.upsell.body')),
    ),
    cta,
  );
}

let running = false;

/**
 * Fetch and analyse one competitor, then show the table. The competitor's report
 * is thrown away afterwards: it exists to fill five cells, and keeping a second
 * engine object alive would double the memory for nothing.
 */
export async function runCompare(input: string): Promise<void> {
  const target = input.trim();
  const status = $('#compare-status');
  if (!target || running) return;
  running = true;
  status.dataset.state = 'loading';
  status.textContent = t('ui.compare.running');
  try {
    await loadEngine();
    const result = await fetchRobots(target);
    const options: Options = {
      siteUrl: result.origin,
      // The same shape the page builds for its own check, so the engine reports
      // on how the competitor's file was served by the same rules.
      fetch: {
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
      },
      lang: getLocale(),
      locale: getLocale() === DEFAULT_LANG ? null : JSON.stringify(currentDictionary()),
      now: new Date().toISOString(),
    };
    const theirs = new Analysis(result.text, options);
    const youHost = state.fetch ? new URL(state.fetch.robotsUrl).host : t('ui.checked.pasted');
    const themHost = new URL(result.robotsUrl).host;
    replace(slot('compare'), table(youHost, themHost, rows(current().report, theirs.report)), upsell());
    theirs.free();
    status.dataset.state = 'idle';
    status.textContent = '';
    trackExport('compare');
  } catch (err) {
    status.dataset.state = 'error';
    status.textContent = err instanceof FetchError ? err.message : String(err);
  } finally {
    running = false;
  }
}

/** The form, once there is a report to compare against. */
export function renderCompare(): void {
  const host = state.fetch ? new URL(state.fetch.robotsUrl).host : t('ui.checked.pasted');
  $('#compare-you').textContent = t('ui.compare.youAre', { host });
  const field = $<HTMLInputElement>('#compare-site');
  const button = $('#compare-run');
  if (button.dataset.bound !== 'true') {
    button.dataset.bound = 'true';
    button.addEventListener('click', () => { void runCompare(field.value); });
    field.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        event.preventDefault();
        void runCompare(field.value);
      }
    });
  }
}
