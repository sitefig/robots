// Sitemaps: every Sitemap line with the notes the checks attached to it.

import { t } from '../i18n.ts';
import { el, badge, replace, slot, lineLink, levelLabel } from '../dom.ts';
import { state, current } from '../state.ts';

export function renderSitemaps(): void {
  const r = current().report;
  const container = slot('sitemaps');
  if (r.sitemaps.length === 0) {
    replace(container, el('p', { class: 'text-sm text-muted' }, t('ui.sitemaps.none')));
    return;
  }
  const notesFor = (line: number) => r.issues.filter((w) => w.line === line);
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
