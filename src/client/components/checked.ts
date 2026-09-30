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

  // The field stays where it is. Checking a second site is the next thing most
  // people want, and swapping the box for a "Check again" button made them hunt
  // for it; the bar beside it says which report is on screen. The address is put
  // back in the field, so pressing the button re-checks this site and typing over
  // it checks another.
  const field = $<HTMLInputElement>('#site-url');
  if (state.input && !field.value) field.value = state.input;
  $('#checked').hidden = false;
  replace(
    slot('checked'),
    el(
      'p',
      { class: 'checked__what' },
      el('span', {}, host || t('ui.checked.pasted')),
      el('span', { class: 'checked__meta' }, t('ui.checked.meta', { n: formatNumber(lines) })),
    ),
    share
      ? actionButton(t('ui.checked.share'), () => {
        trackExport('link');
        return navigator.clipboard.writeText(share);
      })
      : null,
  );
}
