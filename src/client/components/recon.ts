// Reconnaissance: what the file gives away, one compact card per category
// with the evidence behind a disclosure.

import { t, formatNumber } from '../i18n.ts';
import { el, badge, replace, slot, scrollable, lineLink, type Child } from '../dom.ts';
import { state, current } from '../state.ts';
import type { Confidence, Recon } from '../types.ts';

const CONFIDENCE_STATE: Record<Confidence, string> = { high: 'ok', medium: 'warning', low: 'info' };

/**
 * One recon category as a compact card: title, one-line finding, and the
 * full evidence behind a disclosure when there is something to show.
 */
function reconCard(title: string, count: number, value: string, ...body: Child[]): HTMLElement {
  return el(
    'article',
    { class: 'card', 'data-empty': count === 0 ? 'true' : 'false' },
    el('h3', {}, title),
    el('p', { class: 'font-mono text-sm mt-1' }, count ? value : t('ui.recon.nothing')),
    count > 0 && el('details', {}, el('summary', {}, t('ui.recon.details')), el('div', { class: 'flow', 'data-space': 'xs' }, body)),
  );
}

const sub = (text: string) => el('p', { class: 'font-bold text-sm' }, text);
const confidenceText = (c: Confidence) => t('ui.recon.confidence', { confidence: t(`enum.confidence.${c}`) });
const sourceText = (s: string) => (s === 'comment' ? t('enum.source.comment') : s);
const items = (n: number) => t('ui.recon.items', { n });

function stackCard(r: Recon): HTMLElement {
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

function cloudCard(r: Recon): HTMLElement {
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

function hostsCard(r: Recon): HTMLElement {
  const { hosts, paths } = r.hosts;
  const relationBadge = (h: { relation: string }) => badge(t(`enum.relation.${h.relation}`), h.relation === 'ip' ? 'warning' : 'info');
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

function apiCard(r: Recon): HTMLElement {
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

function dataCard(r: Recon): HTMLElement {
  const { feeds, portals, search } = r.data;
  const roleState: Record<string, string | null> = { search: 'warning', filter: 'info', tracking: null, other: null };
  const pathList = (list: { path: string; line: number; kind?: string }[], withKind: boolean) => el('ul', { class: 'stack' }, list.map((f) => el('li', { class: 'cluster' }, el('code', {}, f.path), withKind && el('span', { class: 'text-sm text-muted' }, f.kind ?? ''), lineLink(f.line))));
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

function extensionsCard(r: Recon): HTMLElement {
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

function commentsCard(r: Recon): HTMLElement {
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

export function renderRecon(): void {
  const r = current().report.recon;
  const counts = [r.stack.detections.length, r.cloud.length, r.hosts.hosts.length + r.hosts.paths.length, r.api.length, r.data.feeds.length + r.data.portals.length + r.data.search.paths.length, r.extensions.length, r.comments.length];
  const total = counts.reduce((a, b) => a + b, 0);
  replace(
    slot('recon'),
    el('p', { class: 'font-mono text-sm text-muted' }, total ? t('ui.recon.total', { n: total, categories: counts.filter(Boolean).length }) : t('ui.recon.quiet')),
    el('div', { class: 'grid', 'data-min': 's' }, stackCard(r), cloudCard(r), hostsCard(r), apiCard(r), dataCard(r), extensionsCard(r), commentsCard(r)),
  );
}
