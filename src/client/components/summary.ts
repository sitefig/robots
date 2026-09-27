// The verdict card: a callout for the default policy (or the fetch problem)
// and the facts about the file.

import { t, formatNumber, type Params } from '../i18n.ts';
import { el, badge, replace, slot, formatBytes, type Child } from '../dom.ts';
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

/**
 * The colour key, under the verdict, with this report's own state marked.
 *
 * Red and green explain themselves; amber and blue do not, and a visitor should
 * not have to learn a palette to read their own result. Marking the live state
 * rather than printing a static key is what makes it work: the colour in front
 * of them is the one with the ring around it and the words "this report" beside
 * it, so the mapping is made once, in place.
 *
 * Never colour alone (SC 1.4.1): every square carries its own words, the marked
 * one is bold with an outline as well as aria-current, and the squares have a
 * border so they are visible in forced-colours mode.
 */
function legend(now: string): HTMLElement {
  const states = ['ok', 'info', 'warning', 'error'] as const;
  return el(
    'div',
    { class: 'legend cluster', 'data-space': 'xs', role: 'group', 'aria-label': t('ui.legend.label') },
    states.map((name) => {
      const here = name === now;
      const item = el(
        'span',
        { class: 'legend__item', 'data-state': name, 'data-now': here ? 'true' : null },
        el('span', { class: 'legend__dot', 'aria-hidden': 'true' }),
        t(`ui.legend.${name}`),
        here ? el('span', { class: 'legend__now' }, ` (${t('ui.legend.current')})`) : null,
      );
      if (here) item.setAttribute('aria-current', 'true');
      return item;
    }),
  );
}

export function renderSummary(): void {
  const callout = summaryCallout();
  // The verdict fills its own row; the facts go in the row below, beside the
  // export buttons (see src/components/home/verdict.ts).
  replace(
    slot('summary'),
    el('div', { class: 'callout', 'data-state': callout.state }, el('p', { class: 'verdict' }, callout.title), el('p', {}, callout.body)),
    legend(callout.state),
  );
  // What it means, then what it is. A visitor who has just checked their site
  // wants to know whether search engines can read it and whether AI crawlers are
  // helping themselves; a content type, a byte count and an HTTP status number
  // answer a question nobody asked. Those are still here, one disclosure away,
  // because whoever has to fix the file does need them.
  replace(
    slot('summary-facts'),
    defs(plainFacts()),
    el(
      'details',
      { class: 'facts-technical' },
      el('summary', { class: 'text-sm' }, t('ui.defs.technical')),
      defs(technicalFacts()),
    ),
  );
}

/** Whether AI training crawlers are being let in, as the page reads it. */
function trainingState(): 'open' | 'partial' | 'blocked' | null {
  const group = current().report.aiStatus.groups[0];
  if (!group) return null;
  const { open, partial, blocked } = group.counts;
  if (open === 0 && partial === 0) return 'blocked';
  if (blocked > 0 || partial > 0) return 'partial';
  return 'open';
}

/**
 * The four or five lines a business owner came for. Each is a consequence, not a
 * measurement: whether search engines can read the site, whether AI crawlers are
 * taking it, whether Google is being told where the pages are, and what it costs.
 */
function plainFacts(): Row[] {
  const r = current().report;
  const f = state.fetch;
  const p = r.summary.defaultPolicy;
  const { errors, warnings } = r.summary.issues;
  // A failing server is not an open door. Google reads 5xx, and a redirect chain
  // it gives up on, as "stay away from everything" for weeks, so saying search
  // engines "can read the whole site" here would contradict the verdict directly
  // above it. A missing file is different: that really does mean no instructions.
  const serverFailed = Boolean(f && (f.status >= 500 || f.redirectLimit));
  const search = !p.hasStarGroup || p.verdict === 'open' ? 'open' : p.verdict;
  const training = trainingState();
  return [
    [t('ui.plain.search'), serverFailed ? t('ui.plain.search.serverFail') : t(`ui.plain.search.${search}`)],
    serverFailed ? [t('ui.plain.ai'), t('ui.plain.ai.unknown')] : training && [t('ui.plain.ai'), t(`ui.plain.ai.${training}`)],
    [t('ui.plain.sitemap'), r.summary.sitemaps > 0 ? t('ui.plain.sitemap.some', { n: r.summary.sitemaps }) : t('ui.plain.sitemap.none')],
    [t('ui.plain.problems'), errors + warnings === 0 ? t('ui.plain.problems.none') : t('ui.plain.problems.some', { errors, warnings })],
    [
      t('ui.plain.rules'),
      serverFailed && r.summary.rules === 0 ? t('ui.plain.rules.unread')
        : r.summary.rules === 0 ? t('ui.plain.rules.none')
          : t('ui.plain.rules.some', { n: formatNumber(r.summary.rules) }),
    ],
  ];
}

/** The same check, for whoever has to change the file. */
function technicalFacts(): Row[] {
  const r = current().report;
  const f = state.fetch;
  return [
    [t('ui.defs.source'), f ? (f.source === 'proxy' ? t('ui.source.proxy') : t('ui.source.direct')) : t('ui.source.pasted')],
    f && [t('ui.defs.url'), el('a', { href: f.finalUrl, target: '_blank', rel: 'noopener' }, f.finalUrl.replace(/^https?:\/\/[^/]+/, '') || f.finalUrl)],
    f && f.finalUrl !== f.robotsUrl && [t('ui.defs.redirects'), redirectChain(f)],
    f && [t('ui.defs.contentType'), f.contentType || t('ui.defs.notSent')],
    f && [t('ui.defs.size'), formatBytes(r.raw.length) + (f.truncated ? t('ui.defs.truncated') : '')],
    f && [t('ui.defs.status'), `${f.status} ${f.statusText || ''}`.trim()],
    [t('ui.defs.groups'), formatNumber(r.summary.groups)],
    [t('ui.defs.rules'), formatNumber(r.summary.rules)],
    [t('ui.defs.sitemaps'), t('ui.defs.declared', { n: r.summary.sitemaps })],
    r.directives.host && [t('ui.defs.host'), el('code', {}, r.directives.host.value)],
    r.directives.cleanParams.length > 0 && [t('ui.defs.cleanParam'), t('ui.defs.directives', { n: r.directives.cleanParams.length })],
    [t('ui.defs.issues'), t('ui.defs.issueCounts', { errors: r.summary.issues.errors, warnings: r.summary.issues.warnings })],
  ];
}
