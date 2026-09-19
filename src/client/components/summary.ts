// The verdict card: a callout for the default policy (or the fetch problem)
// and the facts about the file.

import { t, formatNumber, type Params } from '../i18n.ts';
import { el, badge, replace, slot, meta, formatBytes, formatMs, type Child } from '../dom.ts';
import { state, current } from '../state.ts';
import type { FetchInfo } from '../types.ts';

interface Callout {
  state: string;
  title: string;
  body: string;
}

function summaryCallout(): Callout {
  const r = current().report;
  const f = state.fetch;
  const c = (stateName: string, key: string, params: Params = {}): Callout => ({ state: stateName, title: t(`ui.summary.${key}.title`, params), body: t(`ui.summary.${key}.body`, params) });
  if (f && f.redirectLimit) return c('error', 'redirectLimit');
  if (f && (f.status === 404 || f.status === 410)) return c('warning', 'notFound', { status: f.status });
  if (f && f.status >= 400 && f.status < 500) {
    return { state: 'warning', title: `HTTP ${f.status} ${f.statusText || ''}`.trim(), body: t('ui.summary.clientError.body') };
  }
  if (f && f.status >= 500) return c('error', 'serverError', { status: f.status });
  if (f && (f.status < 200 || f.status >= 300)) return c('warning', 'unexpectedStatus', { status: f.status });
  if (f && /text\/html/i.test(f.contentType || '')) return c('warning', 'html', { type: f.contentType || '' });
  if (r.raw.trim() === '') return c('ok', 'empty');
  const p = r.summary.defaultPolicy;
  if (!p.hasStarGroup) return c('info', 'noStar');
  if (p.verdict === 'blocked') return c('error', 'allBlocked');
  if (p.verdict === 'open') return c('ok', 'open');
  return c('info', 'restricted', { disallow: p.disallowRules, allow: p.allowRules });
}

type Row = [string, Child] | null | undefined | false | '';

/** Key/value rows: [[key, value], …] → <dl class="defs">. */
function defs(rows: Row[]): HTMLElement {
  return el('dl', { class: 'defs' }, rows.filter((r): r is [string, Child] => Boolean(r)).map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v))));
}

/** "A → 301 → B → 302 → C", or just the endpoints when the proxy was not used. */
export function redirectChain(f: FetchInfo): HTMLElement {
  const hops = f.redirects?.length ? f.redirects : [{ from: f.robotsUrl, status: null, to: f.finalUrl }];
  const parts: Child[] = [el('span', { class: 'font-mono' }, hops[0].from)];
  for (const hop of hops) {
    parts.push(' → ', hop.status ? badge(String(hop.status), 'info') : badge(t('ui.chain.redirect'), 'info'), ' → ', el('span', { class: 'font-mono' }, hop.to));
  }
  if (f.redirectLimit) parts.push(' → ', badge(t('ui.chain.stopped'), 'error'));
  return el('span', {}, parts);
}

export function renderSummary(): void {
  const r = current().report;
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
