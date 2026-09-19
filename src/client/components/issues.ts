// Issues: every finding sorted by level then line, first six shown.

import { t } from '../i18n.ts';
import { el, badge, replace, slot, meta, capped, levelLabel, lineText, LEVEL_ORDER } from '../dom.ts';
import { current } from '../state.ts';
import type { Issue } from '../types.ts';

export function renderWarnings(): void {
  const r = current().report;
  const ws = [...r.issues].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || (a.line ?? Infinity) - (b.line ?? Infinity));
  const counts = r.summary.issues;
  const worst = counts.errors ? 'error' : counts.warnings ? 'warning' : 'info';
  meta('issues-meta', ws.length ? badge(t('ui.issues.meta', { errors: counts.errors, warnings: counts.warnings, notes: counts.notes }), worst) : null);
  if (ws.length === 0) {
    replace(slot('warnings'), el('p', { class: 'text-sm text-muted' }, t('ui.issues.none')));
    return;
  }
  const item = (w: Issue) =>
    el(
      'li',
      { 'data-level': w.level, 'data-id': w.id },
      el('span', { class: 'line-ref font-mono text-sm' }, w.line ? el('a', { href: `#line-${w.line}` }, lineText(w.line)) : t('ui.file')),
      badge(levelLabel(w.level), w.level),
      el('span', {}, w.message),
    );
  replace(slot('warnings'), capped(ws, 6, item, (items) => el('ul', { class: 'issue-list' }, items)));
}
