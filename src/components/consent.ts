// The analytics choice, as a dialog that blocks the page until it is answered.
//
// What the law allows, and what it does not, decides the shape of this:
//
// - Blocking until a choice is made is fine. Conditioning access on *accepting*
//   is not: consent has to be freely given, and a wall that only opens for "yes"
//   means it was not (EDPB Guidelines 05/2020 on consent). So rejecting gets you
//   the whole site, immediately and permanently.
// - Refusing has to be as easy as agreeing. The EDPB's cookie banner taskforce
//   went after exactly this: one bright button for yes and a grey link for no.
//   Both buttons here are the same element, the same size, the same colour, and
//   "No analytics" comes first in the markup. Neither is the signal yellow,
//   which everywhere else marks the action we want you to take.
// - Silence is not consent, so nothing is loaded and nothing is sent until
//   somebody presses a button. Escape counts as refusing, not as postponing.
// - Withdrawing has to be as easy as giving, hence the footer link that reopens
//   this, and the privacy page that says what is collected.
//
// It is a native <dialog> opened with showModal(), which gives the focus trap,
// the inert background and the backdrop without any of it being hand-rolled. It
// is rendered in the HTML of every page, not injected by script, so it cannot
// arrive late over the top of something a visitor is already reading.

import type { PageContext } from './context.ts';

export function ConsentDialog(ctx: PageContext): string {
  const { e } = ctx.s;
  const privacy = `${ctx.assets}privacy/`;
  return `  <dialog id="consent" class="consent" aria-labelledby="consent-title" aria-describedby="consent-body">
    <div class="flow" data-space="s">
      <h2 id="consent-title" class="text-xl">${e('ui.consent.title')}</h2>
      <div class="flow" data-space="2xs">
        <p id="consent-body">${e('ui.consent.body')}</p>
        <p class="text-sm text-muted">${e('ui.consent.never')}</p>
      </div>
      <p class="text-sm"><a href="${privacy}">${e('ui.consent.privacy')}</a></p>
      <div class="cluster consent__actions" data-space="xs">
        <button type="button" class="button" id="consent-reject">${e('ui.consent.reject')}</button>
        <button type="button" class="button" id="consent-accept">${e('ui.consent.accept')}</button>
      </div>
    </div>
  </dialog>
`;
}
