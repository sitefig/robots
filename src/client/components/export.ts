// What a visitor can do with the report, beside the facts it summarises.
//
// Two things are free and immediate, because they are what a person reaches for
// in the first ten seconds: the audit as Markdown, for a ticket or a message,
// and the link to this check. The link could not be gated even if we wanted to,
// since it is in the address bar; pretending otherwise would be a lie the
// browser exposes.
//
// Everything else is a free account. Nothing technical stops it — every export
// here is computed in the browser from a report the visitor already has — so the
// cards say what they are: these live in your account, it is free, and the
// report on this page stays whole either way. That is a better offer than a
// disabled button with a padlock, and it is honest about what is being traded.

import { t } from '../i18n.ts';
import { el, tx, replace, slot, $, type Child } from '../dom.ts';
import { state, current } from '../state.ts';
import { SCHEMA_URL } from '../paths.ts';
import { APP_URL } from '../config.ts';
import { trackExport, trackOffer } from '../track.ts';

const SIGNUP = `${APP_URL}/signup/`;

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Button whose label flashes a result for a moment after an async action. */
function actionButton(label: string, action: () => unknown, { primary = false }: { primary?: boolean } = {}): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'button', 'data-variant': primary ? 'primary' : null }, label);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await action();
      button.textContent = t('ui.done');
    } catch (err) {
      button.textContent = t('ui.failed');
      console.error(err);
    }
    setTimeout(() => {
      button.textContent = label;
      button.disabled = false;
    }, 1400);
  });
  return button;
}

/**
 * One offer. The call to action is the last thing in the card and the only
 * yellow one there, and the cards stretch to a common height with their actions
 * pinned to the bottom (see .export-card), so four of them read as one row
 * rather than four ragged boxes.
 *
 * The link carries the checked origin, so signing up starts on that site.
 */
function offerCard(kind: string, title: string, note: Child): HTMLElement {
  const origin = state.fetch ? new URL(state.fetch.robotsUrl).origin : null;
  const href = origin ? `${SIGNUP}?${new URLSearchParams({ site: origin })}` : SIGNUP;
  const cta = el('a', { class: 'button', 'data-variant': 'primary', href }, t('ui.export.locked.cta'));
  cta.addEventListener('click', () => trackOffer(`export.${kind}`, current().report));
  return el(
    'div',
    { class: 'card flow export-card', 'data-space': 'xs' },
    el('p', { class: 'export-card__badge text-xs font-mono' }, t('ui.export.locked.badge')),
    el('h3', {}, title),
    el('p', { class: 'text-sm text-muted' }, note),
    el('div', { class: 'cluster export-card__actions', 'data-space': 'xs' }, cta),
  );
}

/**
 * The two free actions: the audit as Markdown and the link to this check. They
 * are built twice, beside the verdict and again at the head of the section for
 * whoever edits the file, because that is where a founder decides to forward it
 * rather than read on.
 */
function shareActions(): Child[] {
  const a = current();
  const shareUrl = state.input ? `${location.origin}${location.pathname}?${new URLSearchParams({ url: state.input })}` : null;
  return [
    actionButton(t('ui.export.quick.audit'), () => {
      trackExport('markdown');
      return copyText(a.markdown());
    }, { primary: true }),
    shareUrl
      ? actionButton(t('ui.export.share.copy'), () => {
        trackExport('link');
        return copyText(shareUrl);
      })
      : null,
  ];
}

/** The handoff at the top of the technical half. */
export function renderHandoff(): void {
  replace(slot('handoff'), shareActions());
}

export function renderExport(): void {
  const shareUrl = state.input ? `${location.origin}${location.pathname}?${new URLSearchParams({ url: state.input })}` : null;

  $('#export').hidden = false;
  replace(
    slot('export'),
    el('div', { class: 'cluster', 'data-space': 'xs' }, shareActions()),
    el('p', { class: 'text-xs font-mono text-muted' }, t('ui.export.free.badge')),
    el(
      'details',
      { class: 'card' },
      el('summary', { class: 'font-bold' }, t('ui.export.more')),
      el('p', { class: 'text-sm text-muted mt-3' }, t('ui.export.locked.note')),
      el(
        'div',
        { class: 'grid mt-3', 'data-min': 's', 'data-align': 'stretch' },
        offerCard('audit', t('ui.export.audit.title'), t('ui.export.audit.note')),
        offerCard('sheet', t('ui.export.sheet.title'), t('ui.export.sheet.note')),
        offerCard('json', t('ui.export.json.title'), tx('ui.export.json.note', { link: el('a', { href: SCHEMA_URL, target: '_blank', rel: 'noopener' }, 'report.schema.json') })),
        offerCard('watch', t('ui.export.share.title2'), shareUrl ? t('ui.export.share.live') : t('ui.export.share.noLive')),
      ),
    ),
  );
}
