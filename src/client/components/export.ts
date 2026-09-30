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
import { signupLink } from '../offer.ts';
import { trackExport, trackOffer } from '../track.ts';
import { allTickets, fixTotal } from './fixes.ts';

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * The address of this check, or null when the text was pasted and there is
 * nothing anyone else could open.
 */
export function shareLink(): string | null {
  return state.input ? `${location.origin}${location.pathname}?${new URLSearchParams({ url: state.input })}` : null;
}

/** Button whose label flashes a result for a moment after an async action. */
export function actionButton(label: string, action: () => unknown, { primary = false, done }: { primary?: boolean; done?: string } = {}): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'button', 'data-variant': primary ? 'primary' : null }, label);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await action();
      button.textContent = done || t('ui.done');
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
  const cta = el('a', { class: 'button', 'data-variant': 'primary', href: signupLink(`export.${kind}`) }, t('ui.export.locked.cta'));
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
  const shareUrl = shareLink();
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

/**
 * The handoff. The report is read by the person who is answerable for the site
 * and acted on by somebody else, so this is the seam: one message with every fix,
 * an email that carries the live link, and the two things an account adds.
 *
 * The audit is the whole report; this is the worklist, which is what a developer
 * wants in a ticket. The email carries the link rather than the text, because a
 * mailto body is capped by the browser and a truncated ticket is worse than none:
 * whoever opens the link gets the live report, with the lines.
 */
export function renderHandoff(): void {
  const share = shareLink();
  const offer = (kind: string, label: string, variant: string | null): HTMLElement => {
    const link = el('a', { class: 'button', 'data-variant': variant, href: signupLink(`handoff.${kind}`) }, label);
    link.addEventListener('click', () => trackOffer(`handoff.${kind}`, current().report));
    return link;
  };
  const mail = share
    ? el('a', {
      class: 'button',
      href: `mailto:?${new URLSearchParams({ subject: t('ui.handoff.emailSubject'), body: t('ui.handoff.emailBody', { url: share }) })}`,
      onclick: () => trackExport('email'),
    }, t('ui.handoff.email'))
    : null;
  replace(
    slot('handoff'),
    el(
      'div',
      { class: 'cluster', 'data-space': 'xs' },
      actionButton(t('ui.handoff.copyAll'), () => {
        trackExport('fixes');
        return copyText(allTickets());
      }, { done: t('ui.handoff.copiedAll', { n: fixTotal() }) }),
      mail,
      offer('jira', t('ui.handoff.jira'), null),
    ),
    // The fix is not done when the ticket is sent, and nobody goes back to check.
    // That is what the watching is for, and it is the honest moment to say so.
    el(
      'div',
      { class: 'watch cluster', 'data-justify': 'between', 'data-space': 'xs' },
      el('p', { class: 'watch__text' }, t('ui.handoff.watch')),
      offer('watch', t('ui.handoff.watchCta'), 'primary'),
    ),
  );
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
