// The file itself, with line numbers, and the other half of the fix list.
//
// Lines with a problem are tinted, the selected fix's lines are marked, and a
// line that belongs to a fix is a button: pressing it selects that fix. So the
// file is not a dump at the bottom of the page any more, it is the evidence
// beside the claim, and it works in both directions.
//
// Every line keeps its id (#line-<n>), because the issue list, the fix chips and
// any link anyone has ever shared point at those.

import { t, formatNumber } from '../i18n.ts';
import { el, replace, slot, $, LEVEL_ORDER } from '../dom.ts';
import { state, current } from '../state.ts';
import { onSelect, select, ownerOfLine } from '../selection.ts';
import type { Level } from '../types.ts';

export function renderRaw(): void {
  const analysis = current();
  const r = analysis.report;
  const actions = $('#raw [data-slot="actions"]');
  const hint = $('#raw-hint');
  if (!r.raw) {
    replace(actions);
    hint.textContent = '';
    replace(slot('raw'), el('p', { class: 'text-muted p-5' }, t('ui.raw.nothing')));
    return;
  }
  const levelByLine = new Map<number, Level>();
  for (const w of r.issues) {
    if (!w.line || w.level === 'info') continue;
    const now = levelByLine.get(w.line);
    if (!now || LEVEL_ORDER[w.level] < LEVEL_ORDER[now]) levelByLine.set(w.line, w.level);
  }
  // A sensitive path is a problem on that line too, even when no check failed.
  for (const f of r.security) {
    if (f.severity === 'info' || levelByLine.has(f.line)) continue;
    levelByLine.set(f.line, f.severity === 'high' ? 'error' : 'warning');
  }
  const kinds = analysis.lines();
  const lines = r.raw.split(/\r\n|\r|\n/);
  const rows = lines.map((text, i) => {
    const n = i + 1;
    const fix = ownerOfLine(n);
    const attrs = {
      class: 'raw__line',
      id: `line-${n}`,
      'data-kind': kinds[i]?.kind || 'blank',
      'data-level': levelByLine.get(n) || null,
      'data-selected': 'false',
    };
    const num = el('span', { class: 'raw__num', 'aria-hidden': 'true' }, String(n));
    // Only a line a fix explains is a control. The rest stay plain text, so the
    // file does not turn into a hundred tab stops.
    if (fix === undefined) return el('span', attrs, num, text);
    // The name carries the line and what pressing it does. The text is cut at
    // 80 characters because a robots.txt in the wild has 3,000-character lines.
    const label = t('ui.file.select', { n, text: text.trim().slice(0, 80) });
    return el('button', { ...attrs, type: 'button', 'aria-label': label, onclick: () => select({ index: fix, lines: [n], hint: t('ui.file.hint.line', { n }) }) }, num, text);
  });
  const pre = el('pre', { class: 'raw', tabindex: '0' }, rows);

  hint.textContent = t('ui.file.hint.none');
  onSelect((s) => {
    for (const row of rows) {
      const n = Number(row.id.slice(5));
      row.dataset.selected = s.lines.includes(n) ? 'true' : 'false';
    }
    hint.textContent = s.hint || t('ui.file.hint.none');
    const first = s.lines[0];
    if (first) document.getElementById(`line-${first}`)?.scrollIntoView({ block: 'center' });
  });

  const copy = el('button', { type: 'button', class: 'button', onclick: async () => {
    try {
      await navigator.clipboard.writeText(r.raw);
      copy.textContent = t('ui.raw.copied');
      setTimeout(() => { copy.textContent = t('ui.raw.copy'); }, 1500);
    } catch {
      copy.textContent = t('ui.raw.copyFailed');
    }
  } }, t('ui.raw.copy'));
  replace(actions, copy, state.fetch && el('a', { class: 'text-sm', href: state.fetch.finalUrl, target: '_blank', rel: 'noopener' }, t('ui.raw.openOriginal')));
  replace(
    slot('raw'),
    pre,
    el(
      'div',
      { class: 'file-legend cluster text-xs text-muted', 'data-space': 'xs' },
      el('span', { class: 'file-legend__item', 'data-level': 'error' }, t('ui.file.legend.problem')),
      el('span', { class: 'file-legend__item', 'data-selected': 'true' }, t('ui.file.legend.selected')),
      el('span', {}, t('ui.file.total', { n: formatNumber(lines.length) })),
    ),
  );
}
