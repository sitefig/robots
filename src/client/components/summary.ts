// The verdict: a state word, a headline, and the consequences as tiles.
//
// The tiles are the report in four sentences, in the order a business asks:
// is AI helping itself, which sensitive files does the file name, what does it
// say about our systems, and is the file itself in order. Each one is answered by
// the engine rather than by copy, and each one links to the section that shows
// the working. Search engines and link previews are one level down, at the top
// of the crawler table, which is where their working is.
//
// What the file technically is (content type, byte count, HTTP status) stays one
// disclosure away. That is for whoever edits it.

import { t, formatNumber, getLocale, type Params } from '../i18n.ts';
import { el, badge, replace, slot, formatBytes, type Child } from '../dom.ts';
import { state, current } from '../state.ts';
import { fixCounts, fixTotal } from './fixes.ts';
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

/** Key/value rows: [[key, value, anchor?], …] → <dl class="defs">. */
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
 * The colour key, under the tiles, with this report's own state marked.
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
  // The headline and the sentence under it sit above the check field and are
  // the page's h1 in both views, so the verdict is written into them. A second
  // h1 in the slot would give the page two headlines with one id.
  const headline = document.getElementById('page-h1');
  if (headline) headline.textContent = callout.title;
  // The engine says what this file does; the second sentence says what the
  // list below is, which is the reason to keep reading rather than to forward
  // the page to somebody else unread.
  const intro = document.querySelector('#check .verdict-intro');
  if (intro) intro.textContent = fixTotal() > 0 ? `${callout.body} ${t('ui.verdict.intro')}` : callout.body;
  // The same slot the pitch was in, so nothing moves when the answer arrives:
  // the state line and the four tiles.
  replace(
    slot('summary'),
    el(
      'p',
      { class: 'cluster', 'data-space': 'xs' },
      badge(t(`ui.pill.${callout.state}`), callout.state),
      el('span', { class: 'text-sm text-muted' }, fixCounts()),
    ),
    tiles(),
    legend(callout.state),
  );
  // The appendix row is the disclosure now, so these are plain rows inside it.
  replace(slot('summary-facts'), defs(technicalFacts()));
}

interface Tile {
  label: string;
  anchor: string;
  state: string;
  value: string;
  detail: string;
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

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };

/** "a, b and c" in the visitor's language. */
function listOf(parts: string[]): string {
  try {
    return new Intl.ListFormat(getLocale(), { style: 'long', type: 'conjunction' }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

/** Up to three of them by name, because a name lands where a count does not. */
function names(list: { name: string }[]): string {
  const shown = list.slice(0, 3).map((c) => c.name);
  return list.length > shown.length ? t('ui.tile.andMore', { names: listOf(shown), n: list.length - shown.length }) : listOf(shown);
}

function searchTile(): Tile {
  const r = current().report;
  const p = r.summary.defaultPolicy;
  const serverFailed = Boolean(state.fetch && (state.fetch.status >= 500 || state.fetch.redirectLimit));
  const engines = r.crawlers.filter((c) => c.category === 'search');
  const shut = engines.filter((c) => !c.rootAllowed);
  const allowed = engines.filter((c) => c.rootAllowed);
  const verdict = !p.hasStarGroup || p.verdict === 'open' ? 'open' : p.verdict;
  // "Googlebot only" is the case worth naming: one search engine let in and the
  // rest shut out is the most expensive mistake this file can make, and a count
  // hides it.
  const status = serverFailed ? t('ui.tile.search.failing')
    : allowed.length === 1 ? t('ui.tile.search.only', { name: allowed[0].name })
      : shut.length > 0 ? t('ui.tile.search.someShut', { n: shut.length })
        : verdict === 'blocked' ? t('ui.tile.search.none')
          : verdict === 'partial' ? t('ui.tile.search.parts')
            : t('ui.tile.search.all');
  return {
    label: t('ui.tile.searchLabel'),
    anchor: '#agents',
    state: serverFailed || shut.length > 0 || verdict === 'blocked' ? 'error' : verdict === 'partial' ? 'info' : 'ok',
    value: status,
    detail: shut.length > 0 ? t('ui.tile.shutOut', { names: names(shut) }) : t('ui.tile.searchAll', { n: engines.length }),
  };
}

/**
 * Link previews. Nobody checks their robots.txt for this, and it is the one
 * marketing feels first: a blocked social fetcher means every share of every page
 * is a bare URL with no title and no image.
 */
function socialTile(): Tile {
  const social = current().report.crawlers.filter((c) => c.category === 'social');
  const shut = social.filter((c) => !c.rootAllowed);
  return {
    label: t('ui.tile.social'),
    anchor: '#agents',
    state: shut.length > 0 ? 'error' : 'ok',
    value: shut.length > 0 ? t('ui.tile.social.brokenShort') : t('ui.tile.social.fineShort'),
    detail: shut.length > 0 ? t('ui.tile.social.broken', { names: names(shut) }) : t('ui.tile.social.all', { n: social.length }),
  };
}

function aiTile(): Tile {
  const group = current().report.aiStatus.groups[0];
  const counts = group ? group.counts : { open: 0, partial: 0, blocked: 0 };
  const total = group ? group.crawlers.length : 0;
  const loose = counts.open + counts.partial;
  const status = unread() ? t('ui.tile.ai.unknown')
    : loose === 0 ? t('ui.tile.ai.blocked')
      : counts.blocked > 0 ? t('ui.tile.ai.partly')
        : t('ui.tile.ai.notDecided');
  return {
    label: t('ui.tile.aiLabel'),
    anchor: '#ai-status-heading',
    state: unread() ? 'warning' : counts.blocked === 0 && loose > 0 ? 'error' : loose > 0 ? 'info' : 'ok',
    value: status,
    detail: unread() ? '' : t('ui.tile.aiNote', { n: loose, total }),
  };
}

function exposureTile(): Tile {
  const r = current().report;
  const named = r.security.filter((s) => s.severity !== 'info');
  let worst: SecurityFinding | null = null;
  for (const s of named) if (!worst || SEVERITY_RANK[s.severity] < SEVERITY_RANK[worst.severity]) worst = s;
  const kind = worst && r.securityCategories.find((c) => c.id === worst.category)?.label;
  const status = unread() ? t('ui.tile.ai.unknown')
    : named.length === 0 ? t('ui.tile.level.none')
      : t(`ui.tile.level.${worst ? worst.severity : 'low'}`);
  return {
    label: t('ui.tile.exposureLabel'),
    anchor: '#security',
    state: unread() ? 'warning' : named.length === 0 ? 'ok' : worst && worst.severity === 'high' ? 'error' : 'warning',
    value: status,
    detail: unread() ? t('ui.plain.exposure.unknown')
      : named.length === 0 ? t('ui.plain.exposure.none')
        : `${t('ui.plain.exposure.some', { n: named.length })}${kind ? `. ${t('ui.plain.exposure.worst', { what: kind })}` : ''}`,
  };
}

/**
 * What the file says about the systems behind the site. The platform's name is
 * the value when the engine found one, because a name lands where "named in the
 * file" does not; the sentence under it lists the rest.
 */
function systemsTile(): Tile {
  const rc = current().report.recon;
  const tells: string[] = [];
  if (rc.stack.primary) tells.push(t('ui.plain.setup.platform', { name: rc.stack.primary.name }));
  if (rc.hosts.hosts.length > 0) tells.push(t('ui.plain.setup.hosts', { n: rc.hosts.hosts.length }));
  if (rc.cloud.length > 0) tells.push(t('ui.plain.setup.buckets', { n: rc.cloud.length }));
  if (rc.api.length > 0) tells.push(t('ui.plain.setup.apis', { n: rc.api.length }));
  if (rc.comments.length > 0) tells.push(t('ui.plain.setup.contacts', { n: rc.comments.length }));
  const status = unread() ? t('ui.tile.ai.unknown')
    : tells.length === 0 ? t('ui.tile.systems.none')
      : rc.stack.primary ? rc.stack.primary.name
        : t('ui.tile.systems.named');
  return {
    label: t('ui.tile.systemsLabel'),
    anchor: '#recon',
    state: unread() ? 'warning' : tells.length === 0 ? 'ok' : 'info',
    value: status,
    detail: unread() ? t('ui.plain.exposure.unknown')
      : tells.length === 0 ? t('ui.plain.setup.none')
        : t('ui.plain.setup.some', { what: listOf(tells) }),
  };
}

/**
 * The file as a file: how many errors the engine found in it, and how much is in
 * it. The counts are the engine's, and the rows behind them are the appendix.
 */
function technicalTile(): Tile {
  const s = current().report.summary;
  const { errors, warnings } = s.issues;
  return {
    label: t('ui.tile.technicalLabel'),
    anchor: '#appendix',
    state: unread() || errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok',
    value: unread() ? t('ui.tile.ai.unknown')
      : errors > 0 ? t('ui.tile.tech.errors', { n: errors })
        : warnings > 0 ? t('ui.tile.tech.warnings', { n: warnings })
          : t('ui.tile.tech.clean'),
    detail: unread() ? t('ui.plain.rules.unread') : listOf([t('md.rules', { n: s.rules }), t('md.sitemaps', { n: s.sitemaps })]),
  };
}

function tileGrid(list: Tile[]): HTMLElement {
  return el(
    'div',
    { class: 'grid tiles', 'data-min': 'xs', 'data-align': 'stretch' },
    list.map((tile) =>
      el(
        'div',
        { class: 'tile flow', 'data-space': '2xs', 'data-state': tile.state },
        el('p', { class: 'tile__label text-sm' }, el('a', { href: tile.anchor }, tile.label)),
        el('p', { class: 'tile__value' }, tile.value),
        tile.detail ? el('p', { class: 'text-sm text-muted' }, tile.detail) : null,
      )),
  );
}

/**
 * Four tiles, because four is what a founder reads, and in the order a founder
 * asks: AI, then what the file gives away, then what it says about the systems
 * behind the site, and only then the technical data.
 */
function tiles(): HTMLElement {
  return tileGrid([aiTile(), exposureTile(), systemsTile(), technicalTile()]);
}

/**
 * Search engines and link previews, above the crawler table that shows their
 * working. They were tiles under the verdict until the verdict was given to AI,
 * exposure, systems and the file itself.
 */
export function renderCrawlerSummary(): void {
  replace(slot('agents-summary'), tileGrid([searchTile(), socialTile()]));
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
