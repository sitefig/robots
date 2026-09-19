// AI scraping status: blocked counts per AI category, the engine's callout,
// and one pill per AI crawler with its verdict.

import { t, formatNumber } from '../i18n.ts';
import { el, badge, replace, slot, meta, verdictText, VERDICT_STATE } from '../dom.ts';
import { current } from '../state.ts';
import type { AiCrawler } from '../types.ts';

function botPill(c: AiCrawler): HTMLElement {
  return el(
    'li',
    { class: 'bot-pill', title: c.explanation },
    el('span', { class: 'bot-pill__name' }, c.name),
    badge(verdictText(c.verdict), VERDICT_STATE[c.verdict]),
  );
}

export function renderAiStatus(): void {
  const ai = current().report.aiStatus;
  const total = ai.groups.reduce((n, g) => n + g.crawlers.length, 0);
  meta('ai-status-meta', t('ui.ai.checked', { n: total }));
  // "AI agents checked" in the aside beside this section.
  document.querySelectorAll('[data-fill="ai-agents"]').forEach((n) => { n.textContent = formatNumber(total); });
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
