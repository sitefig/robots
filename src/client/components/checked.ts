// The bar above the verdict: what was checked, when, and how to do it again.
//
// After an analysis the form scrolls away, and the first question a second look
// raises is "which site is this about?". The bar answers it, carries the two
// things a visitor reaches for next, and keeps the address out of the verdict,
// which is about consequences rather than about a URL.

import { t, formatNumber } from '../i18n.ts';
import { el, replace, slot, $ } from '../dom.ts';
import { state, current } from '../state.ts';
import { shareLink, actionButton } from './export.ts';
import { trackExport } from '../track.ts';

export function renderChecked(): void {
  const r = current().report;
  const lines = r.raw ? r.raw.split(/\r\n|\r|\n/).length : 0;
  const host = state.fetch ? new URL(state.fetch.robotsUrl).host : null;
  const share = shareLink();

  const again = el('button', { type: 'button', class: 'button', onclick: () => {
    const field = $<HTMLInputElement>('#site-url');
    field.value = state.input;
    // A hidden form still submits programmatically, which keeps one code path
    // for every check the page makes.
    $<HTMLFormElement>('#fetch-form').requestSubmit();
  } }, t('ui.checked.again'));

  // The form and the bar share one row: after a check the address field would
  // only invite a second check of a different site, which is what the logo is
  // for, and the design has the bar alone here.
  $('#fetch-form').hidden = true;
  $('#checked').hidden = false;
  replace(
    slot('checked'),
    el(
      'p',
      { class: 'checked__what' },
      el('span', {}, host || t('ui.checked.pasted')),
      el('span', { class: 'checked__meta' }, t('ui.checked.meta', { n: formatNumber(lines) })),
    ),
    state.input ? again : null,
    share
      ? actionButton(t('ui.checked.share'), () => {
        trackExport('link');
        return navigator.clipboard.writeText(share);
      })
      : null,
  );
}
