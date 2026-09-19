// Crawler access: one row per known crawler with the group it uses, its
// rules and verdict, filterable by crawler category.

import { t, formatNumber } from '../i18n.ts';
import { el, badge, replace, slot, meta, scrollable, verdictBadge } from '../dom.ts';
import { current } from '../state.ts';

export function renderAgents(): void {
  const { report, crawlers } = current();
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
  const setMeta = (shown: number) => meta('agents-meta', t('ui.agents.meta', { shown, total: report.crawlers.length, blocked }));
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
          onclick: (e: Event) => {
            filter.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false'));
            (e.currentTarget as HTMLElement).setAttribute('aria-pressed', 'true');
            let shown = 0;
            table.querySelectorAll<HTMLElement>('tbody tr').forEach((tr) => {
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
