// File contents: the robots.txt with line numbers, lines with errors or
// warnings tinted, each line addressable as #line-<n>.

import { t } from '../i18n.ts';
import { el, replace, slot, $, LEVEL_ORDER } from '../dom.ts';
import { state, current } from '../state.ts';
import type { Level } from '../types.ts';

export function renderRaw(): void {
  const analysis = current();
  const r = analysis.report;
  const actions = $('#raw [data-slot="actions"]');
  if (!r.raw) {
    replace(actions);
    replace(slot('raw'), el('p', { class: 'text-muted p-5' }, t('ui.raw.nothing')));
    return;
  }
  const levelByLine = new Map<number, Level>();
  for (const w of r.issues) {
    if (!w.line || w.level === 'info') continue;
    const now = levelByLine.get(w.line);
    if (!now || LEVEL_ORDER[w.level] < LEVEL_ORDER[now]) levelByLine.set(w.line, w.level);
  }
  const kinds = analysis.lines();
  const lines = r.raw.split(/\r\n|\r|\n/);
  const pre = el('pre', { class: 'raw', tabindex: '0' }, lines.map((raw, i) =>
    el('span', { class: 'raw__line', id: `line-${i + 1}`, 'data-kind': kinds[i]?.kind || 'blank', 'data-level': levelByLine.get(i + 1) || null },
      el('span', { class: 'raw__num', 'aria-hidden': 'true' }, String(i + 1)),
      raw,
    )));
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
  replace(slot('raw'), pre);
}
