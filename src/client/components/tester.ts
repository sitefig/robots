// Test a path: pick a crawler (or a custom token) and a path; the engine
// says whether it may fetch it, which group and rule decide, and what
// Yandex's Clean-param strips.

import { t, formatNumber } from '../i18n.ts';
import { el, tx, replace, slot, lineText, type Child } from '../dom.ts';
import { current } from '../state.ts';

const SAMPLE_PATHS = ['/', '/admin/', '/search?q=robots', '/wp-admin/', '/api/v1/items', '/assets/logo.png'];

export function renderTester(): void {
  const analysis = current();
  const { crawlers } = analysis;
  const select = el(
    'select',
    { id: 'tester-agent' },
    el('option', { value: '*' }, t('ui.tester.generic')),
    crawlers.list.map((a) => el('option', { value: a.name }, a.name)),
    el('option', { value: 'custom' }, t('ui.tester.custom')),
  );
  const custom = el('input', { type: 'text', id: 'tester-token', placeholder: t('ui.tester.customPlaceholder'), 'aria-label': t('ui.tester.customLabel'), hidden: true });
  const path = el('input', { type: 'text', id: 'tester-path', placeholder: t('ui.tester.pathPlaceholder'), value: '/', spellcheck: 'false' });
  const out = el('div', { class: 'callout', 'data-state': 'info', 'aria-live': 'polite' });
  const chips = el(
    'div',
    { class: 'cluster', role: 'group', 'aria-label': t('ui.tester.examples'), 'data-space': 'xs' },
    SAMPLE_PATHS.map((p) => el('button', { type: 'button', class: 'chip font-mono', onclick: () => { path.value = p; update(); } }, p)),
  );

  function tokens(): string[] {
    if (select.value === '*') return [];
    if (select.value === 'custom') return custom.value.trim() ? [custom.value.trim()] : [];
    return crawlers.list.find((a) => a.name === select.value)?.tokens ?? [];
  }

  function update(): void {
    custom.hidden = select.value !== 'custom';
    const tk = tokens();
    if (select.value === 'custom' && tk.length === 0) {
      out.dataset.state = 'info';
      replace(out, el('p', {}, t('ui.tester.enterToken')));
      return;
    }
    const r = analysis.checkAccess(tk, path.value);
    out.dataset.state = r.allowed ? 'ok' : 'error';
    let groupText: string;
    if (r.token === null) groupText = t('ui.tester.noGroup');
    else if (r.specific) groupText = t('ui.tester.ownGroup', { token: r.token });
    else groupText = t('ui.tester.starGroup');
    let ruleText: HTMLElement;
    if (r.always) ruleText = el('p', {}, t('ui.tester.always'));
    else if (r.rule) {
      ruleText = el('p', {}, tx('ui.tester.matched', {
        rule: el('code', {}, `${r.rule.type === 'allow' ? 'Allow' : 'Disallow'}: ${r.rule.path}`),
        line: el('a', { href: `#line-${r.rule.line}`, class: 'text-sm' }, lineText(r.rule.line)),
      }));
    } else ruleText = el('p', {}, t('ui.tester.noMatch'));
    // Yandex is the only crawler that honours Clean-param.
    let cleanText: Child = null;
    if (tk.some((tok) => tok.toLowerCase().startsWith('yandex'))) {
      const cleaned = analysis.cleanParams(path.value);
      if (cleaned.removed.length) {
        cleanText = el('p', {}, tx('ui.tester.cleanParam', { params: cleaned.removed.join(', '), path: el('code', {}, cleaned.path) }));
      }
    }
    replace(
      out,
      el('p', { class: 'verdict' }, tx('ui.tester.verdict', { verdict: r.allowed ? t('ui.allowed') : t('ui.blocked'), path: el('code', {}, r.path) })),
      el('p', {}, groupText),
      ruleText,
      cleanText,
      r.crawlDelay !== null && el('p', {}, t('ui.tester.crawlDelay', { n: formatNumber(r.crawlDelay) })),
    );
  }

  select.addEventListener('change', update);
  custom.addEventListener('input', update);
  path.addEventListener('input', update);
  replace(
    slot('tester'),
    el(
      'div',
      { class: 'grid', 'data-min': 's' },
      el('div', { class: 'stack', 'data-space': '2xs' }, el('label', { for: 'tester-agent', class: 'text-sm font-bold' }, t('ui.tester.crawler')), select, custom),
      el('div', { class: 'stack', 'data-space': '2xs' }, el('label', { for: 'tester-path', class: 'text-sm font-bold' }, t('ui.tester.path')), path),
    ),
    chips,
    out,
  );
  update();
}
