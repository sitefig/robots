// The verdict card: a callout for the default policy (or the fetch problem)
// and the facts about the file.

import { t, formatNumber, getLocale, type Params } from '../i18n.ts';
import { el, badge, replace, slot, formatBytes, type Child } from '../dom.ts';
import { state, current } from '../state.ts';
import type { FetchInfo, SecurityFinding } from '../types.ts';

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

type Row = [label: string, value: Child, anchor?: string] | null | undefined | false | '';

/**
 * Key/value rows: [[key, value, anchor?], …] → <dl class="defs">.
 *
 * A row with an anchor makes its label a link to the section that shows the
 * working. That is the whole bridge between the two halves of the page: the line
 * that says 30 private places are named is also the way to the list of them, so
 * nobody has to guess which of the sections below answers the sentence they just
 * read. The label is the link text, which says where it goes.
 */
function defs(rows: Row[]): HTMLElement {
  return el(
    'dl',
    { class: 'defs' },
    rows.filter((r): r is [string, Child, string?] => Boolean(r)).map(([k, v, anchor]) =>
      el('div', {}, el('dt', {}, anchor ? el('a', { href: anchor }, k) : k), el('dd', {}, v))),
  );
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
 * The server never handed the file over (5xx, or a redirect chain we gave up on)
 * and nothing was parsed, so there is nothing to say about what it gives away.
 * Saying "nothing private is named here" would be a claim about a file we never
 * read, the same mistake as telling someone their site is open when their server
 * is down.
 */
function unread(): boolean {
  const f = state.fetch;
  return Boolean(f && (f.status >= 500 || f.redirectLimit)) && current().report.summary.rules === 0;
}

/** Worst first, so the one line about severity picks the right finding. */
const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };

/** "a, b and c" in the visitor's language. */
function listOf(parts: string[]): string {
  try {
    return new Intl.ListFormat(getLocale(), { style: 'long', type: 'conjunction' }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

/**
 * The two lines about risk, which is what the business asks about first: not
 * "is my syntax right" but "what does this file hand to a stranger".
 *
 * robots.txt is the first file an attacker reads, because it is the one place a
 * site volunteers the paths it wants left alone. So the count of private places
 * named belongs in the verdict, next to the worst kind of them, and so does what
 * the file says about the systems behind it: the platform, the other servers,
 * the storage buckets, the internal interfaces, the names and ticket numbers
 * left in comments. All of it is already in the sections below; a founder should
 * not have to scroll past the crawler table to learn it.
 *
 * Findings the engine rated `info` are left out of the count on purpose: those
 * are the stock paths of a CMS it recognised, which every installation has and
 * which therefore disclose nothing.
 */
function riskRows(): Row[] {
  const r = current().report;
  const named = r.security.filter((s) => s.severity !== 'info');
  let worst: SecurityFinding | null = null;
  for (const s of named) if (!worst || SEVERITY_RANK[s.severity] < SEVERITY_RANK[worst.severity]) worst = s;
  const kind = worst && r.securityCategories.find((c) => c.id === worst.category)?.label;
  const exposure = named.length === 0
    ? t('ui.plain.exposure.none')
    : t('ui.plain.exposure.some', { n: named.length }) + (kind ? `. ${t('ui.plain.exposure.worst', { what: kind })}` : '');

  const rc = r.recon;
  const tells: string[] = [];
  if (rc.stack.primary) tells.push(t('ui.plain.setup.platform', { name: rc.stack.primary.name }));
  if (rc.hosts.hosts.length > 0) tells.push(t('ui.plain.setup.hosts', { n: rc.hosts.hosts.length }));
  if (rc.cloud.length > 0) tells.push(t('ui.plain.setup.buckets', { n: rc.cloud.length }));
  if (rc.api.length > 0) tells.push(t('ui.plain.setup.apis', { n: rc.api.length }));
  if (rc.comments.length > 0) tells.push(t('ui.plain.setup.contacts', { n: rc.comments.length }));

  return [
    [t('ui.plain.exposure'), unread() ? t('ui.plain.exposure.unknown') : exposure, '#security'],
    unread() ? null :
    [t('ui.plain.setup'), tells.length === 0 ? t('ui.plain.setup.none') : t('ui.plain.setup.some', { what: listOf(tells) }), '#recon'],
  ];
}

/**
 * The lines a business owner came for. Each is a consequence, not a measurement:
 * whether search engines can read the site, whether AI crawlers are taking it,
 * whether Google is being told where the pages are, what the file gives away and
 * what it says about the systems behind it.
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
    [t('ui.plain.search'), serverFailed ? t('ui.plain.search.serverFail') : t(`ui.plain.search.${search}`), '#agents'],
    serverFailed
      ? [t('ui.plain.ai'), t('ui.plain.ai.unknown'), '#ai-status-heading']
      : training && [t('ui.plain.ai'), t(`ui.plain.ai.${training}`), '#ai-status-heading'],
    ...riskRows(),
    [t('ui.plain.sitemap'), r.summary.sitemaps > 0 ? t('ui.plain.sitemap.some', { n: r.summary.sitemaps }) : t('ui.plain.sitemap.none'), '#sitemaps'],
    [t('ui.plain.problems'), errors + warnings === 0 ? t('ui.plain.problems.none') : t('ui.plain.problems.some', { errors, warnings }), '#warnings'],
    [
      t('ui.plain.rules'),
      serverFailed && r.summary.rules === 0 ? t('ui.plain.rules.unread')
        : r.summary.rules === 0 ? t('ui.plain.rules.none')
          : t('ui.plain.rules.some', { n: formatNumber(r.summary.rules) }),
      '#raw',
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
