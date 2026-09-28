// AI scraping status: blocked counts per AI category, the engine's callout,
// and one pill per AI crawler with its verdict.
//
// On a phone the list of every known AI agent is a wall of pills, so it starts as
// the problem list: the agents that are not blocked, which are the ones helping
// themselves to the site's content. A button reveals the rest. When every agent
// is already blocked there is no problem list and the full set stays, because the
// good news is the point of the section.

import { t, formatNumber } from '../i18n.ts';
import { el, badge, replace, slot, meta, verdictText, VERDICT_STATE, phone } from '../dom.ts';
import { current } from '../state.ts';
import type { AiCrawler } from '../types.ts';

function botPill(c: AiCrawler): HTMLElement {
  return el(
    'li',
    { class: 'bot-pill', title: c.explanation, 'data-problem': c.verdict === 'blocked' ? 'false' : 'true' },
    el('span', { class: 'bot-pill__name' }, c.name),
    badge(verdictText(c.verdict), VERDICT_STATE[c.verdict]),
  );
}

// Registered once; calls the latest render's apply() when the width changes.
let applyVisibility: (() => void) | null = null;
phone.addEventListener('change', () => applyVisibility?.());

export function renderAiStatus(): void {
  const ai = current().report.aiStatus;
  const total = ai.groups.reduce((n, g) => n + g.crawlers.length, 0);
  meta('ai-status-meta', t('ui.ai.checked', { n: total }));
  // "AI agents checked" in the aside beside this section.
  document.querySelectorAll('[data-fill="ai-agents"]').forEach((n) => { n.textContent = formatNumber(total); });

  const lists = ai.groups.map((g, i) => el('ul', { id: `ai-list-${i}`, class: 'cluster', 'data-space': 'xs' }, g.crawlers.map(botPill)));
  const groups = ai.groups.map((g, i) => el('div', { class: 'flow', 'data-space': 'xs' }, el('h3', {}, g.label), lists[i]));
  const note = el('p', { id: 'ai-problems-note', class: 'text-sm text-muted', hidden: true }, t('ui.ai.onlyProblems'));
  const more = el('button', { type: 'button', id: 'ai-more', class: 'link-button', hidden: true, 'aria-expanded': 'false', 'aria-controls': lists.map((l) => l.id).join(' ') }, t('ui.ai.showAll'));
  let expanded = false;

  const apply = (): void => {
    const pills = lists.flatMap((l) => [...l.children] as HTMLElement[]);
    const problems = pills.filter((li) => li.dataset.problem === 'true').length;
    // Nothing to hold back when every agent is a problem, or none is.
    const holdBack = phone.matches && problems > 0 && problems < pills.length;
    const problemsOnly = holdBack && !expanded;
    for (const li of pills) li.dataset.hidden = problemsOnly && li.dataset.problem !== 'true' ? 'true' : 'false';
    // A heading over an empty list says nothing; drop the whole group instead.
    groups.forEach((group, i) => { group.hidden = ([...lists[i].children] as HTMLElement[]).every((li) => li.dataset.hidden === 'true'); });
    note.hidden = !problemsOnly;
    more.hidden = !holdBack;
    more.textContent = expanded ? t('ui.ai.showFewer') : t('ui.ai.showAll');
    more.setAttribute('aria-expanded', String(expanded));
  };
  more.addEventListener('click', () => {
    expanded = !expanded;
    apply();
  });
  applyVisibility = apply;

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
    note,
    groups,
    more,
    el('p', { class: 'text-sm text-muted' }, t('ui.ai.legend')),
  );
  apply();
}
