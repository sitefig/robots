// Security notes: Disallow rules pointing at sensitive places, worst first,
// with what to do instead per category.

import { t } from '../i18n.ts';
import { el, tx, badge, replace, slot, capped } from '../dom.ts';
import { current } from '../state.ts';
import type { SecurityFinding, Severity } from '../types.ts';

const SEVERITY_STATE: Record<Severity, string> = { high: 'error', medium: 'warning', low: 'info' };

export function renderSecurity(): void {
  const container = slot('security');
  const r = current().report;
  const disallowCount = r.rules.filter((x) => x.type === 'disallow' && x.path).length;
  const findings = r.security;
  if (findings.length === 0) {
    replace(
      container,
      el('p', { class: 'text-sm text-muted' }, disallowCount ? t('ui.security.noneFound') : t('ui.security.noRules')),
      disallowCount > 0 && el('p', { class: 'text-sm text-muted' }, t('security.reconWarning')),
    );
    return;
  }
  const bySeverity: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  findings.forEach((f) => bySeverity[f.severity]++);
  const worst = findings[0];
  const category = (id: string) => r.securityCategories.find((c) => c.id === id);
  const labelOf = (id: string) => category(id)?.label ?? id;
  const used = r.securityCategories.filter((c) => findings.some((f) => f.category === c.id));
  replace(
    container,
    el(
      'div',
      { class: 'callout', 'data-state': SEVERITY_STATE[worst.severity] },
      el('p', { class: 'verdict' }, t('ui.security.exposed', { n: findings.length })),
      el('p', {}, tx('ui.security.lead', { rule: el('code', {}, `Disallow: ${worst.path}`), reason: worst.reason.replace(/\.?$/, '') }), ' ', category(worst.category)?.advice || t('security.reconWarning')),
    ),
    el('p', { class: 'font-mono text-sm text-muted' }, t('ui.security.counts', { ...bySeverity, total: disallowCount })),
    capped(
      findings,
      5,
      (f: SecurityFinding) =>
        el(
          'div',
          { class: 'finding', 'data-severity': f.severity },
          el('code', {}, `Disallow: ${f.path}`),
          el('span', {}, el('a', { href: `#line-${f.line}`, title: f.reason + (f.userAgents.includes('*') ? '' : t('ui.security.group', { agents: f.userAgents.join(', ') })) }, t('ui.security.where', { line: f.line, category: labelOf(f.category) }))),
          badge(t(`enum.severity.${f.severity}`), SEVERITY_STATE[f.severity]),
        ),
      (items) => el('div', {}, items),
    ),
    el(
      'details',
      { class: 'card' },
      el('summary', {}, t('ui.security.whatToDo')),
      el('dl', { class: 'stack' }, used.map((c) => el('div', {}, el('dt', { class: 'font-bold text-sm' }, c.label), el('dd', { class: 'text-sm text-muted' }, c.advice)))),
    ),
  );
}
