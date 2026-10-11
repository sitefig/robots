// The bar above the verdict: what was checked, when, and how to do it again.
//
// After an analysis the form scrolls away, and the first question a second look
// raises is "which site is this about?". The bar answers it, carries the two
// things a visitor reaches for next, and keeps the address out of the verdict,
// which is about consequences rather than about a URL.

import { t, formatNumber } from '../i18n.ts';
import { el, replace, slot, $, setStatus } from '../dom.ts';
import { state, current } from '../state.ts';
import { shareLink, shareReport } from './export.ts';
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
    share ? shareButton(share, host) : null,
  );
}

/**
 * Share this check.
 *
 * The result goes to the status line under the field, which is a live region
 * and stays there, rather than to the button's own label for a second and a
 * half: a visitor who looked away saw a button that did nothing. When the
 * browser refuses to copy, the link appears beside the button to be copied by
 * hand, because the alternative is telling somebody it worked when it did not.
 */
function shareButton(url: string, host: string | null): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'button' }, t('ui.checked.share'));
  button.addEventListener('click', async () => {
    button.disabled = true;
    const result = await shareReport(url);
    button.disabled = false;
    if (result === 'cancelled') return;
    if (result === 'manual') {
      setStatus('warning', t('ui.share.manual'));
      const field = el('input', {
        type: 'text',
        class: 'share-link',
        readonly: 'readonly',
        'aria-label': t('ui.share.linkLabel'),
        value: url,
      }) as HTMLInputElement;
      button.insertAdjacentElement('afterend', field);
      field.focus();
      field.select();
      return;
    }
    trackExport('link');
    setStatus('ok', result === 'shared' ? t('ui.share.shared') : t('ui.share.copied', { host: host || '' }));
  });
  return button;
}
