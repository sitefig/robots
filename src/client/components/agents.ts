// Crawler access: one row per known crawler with the group it uses, its
// rules and verdict, filterable by crawler category.
//
// There are 134 crawlers, which is a table nobody scrolls to the end of, so only
// the first 50 rows of whatever is showing are rendered visible and a button
// reveals the rest. The cap and the category filter have to agree, which is why
// one function decides every row's visibility rather than each of them setting
// it: filtering to a category with 12 crawlers shows all 12, and the button only
// appears when something is actually being held back.
//
// The rows are all in the DOM either way. A <details> cannot wrap table rows
// without making the table invalid, and hidden rows are skipped by screen
// readers as they are by everyone else.

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

  const LIMIT = 50;
  let category = 'all';
  let expanded = false;
  const more = el('button', { type: 'button', class: 'link-button', 'aria-expanded': 'false', 'aria-controls': 'agents-table' }, t('ui.agents.showAll'));

  /** The one place a row's visibility is decided: category first, then the cap. */
  const apply = (): void => {
    let matching = 0;
    let shown = 0;
    for (const tr of table.querySelectorAll<HTMLElement>('tbody tr')) {
      const inCategory = category === 'all' || tr.dataset.category === category;
      if (inCategory) matching++;
      const capped = !expanded && inCategory && matching > LIMIT;
      const hide = !inCategory || capped;
      tr.dataset.hidden = hide ? 'true' : 'false';
      if (!hide) shown++;
    }
    setMeta(shown);
    // Nothing held back, nothing to offer.
    more.hidden = matching <= LIMIT;
    more.textContent = expanded ? t('ui.agents.showFewer') : t('ui.agents.showAll');
    more.setAttribute('aria-expanded', String(expanded));
  };

  more.addEventListener('click', () => {
    expanded = !expanded;
    apply();
  });

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
            category = cat;
            apply();
          },
        },
        cat === 'all' ? t('ui.agents.all') : t(`agents.category.${cat}`),
      ),
    ),
  );
  table.id = 'agents-table';
  replace(
    slot('agents'),
    filter,
    el(
      'div',
      { class: 'table-frame' },
      scrollable(t('page.agents'), table),
    ),
    more,
    el('p', { class: 'text-sm text-muted' }, t('ui.agents.local'), ' ', el('a', { href: '#cli' }, t('ui.agents.cli'))),
  );
  apply();
}
