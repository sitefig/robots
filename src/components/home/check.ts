// The top row, which is the same slot in both views: the field before a check,
// and what was checked after one.
//
// One row, 46px tall, the field flexible and the two buttons fixed, exactly as
// the design draws it. After an analysis the form is hidden and the checked bar
// takes its place, so the page does not grow a second address field: checking
// another site is what the logo is for, and "Check again" re-runs this one.
//
// The field has no placeholder. A greyed "yourstore.com" reads as a value that
// is already there, and a visitor who submits without noticing gets a report on
// somebody else's site; the three example domains under the headline do that job
// instead. The label is there for a screen reader, and the hint travels with the
// field through aria-describedby.

import type { PageContext } from '../context.ts';

export function Check(ctx: PageContext): string {
  const { e, text } = ctx.s;
  return `    <div class="flow" data-space="xs" id="check">
      <form id="fetch-form" class="check-bar" novalidate>
        <label for="site-url" class="sr-only">${e('page.urlLabel')}</label>
        <input id="site-url" name="url" type="text" inputmode="url" autocomplete="url" spellcheck="false"
               autofocus required aria-describedby="site-url-hint">
        <button type="submit" class="button" data-variant="primary" id="fetch-button">${e('page.analyse')}</button>
        <button type="button" class="button" id="paste-open">${e('sales.pasteFile')}</button>
      </form>
      <p id="site-url-hint" class="sr-only">${text('page.urlHint')}</p>
      <!-- The sites this browser has checked before, and the site that sent the
           visitor here. They belong to the check row rather than to the verdict
           slot: the report replaces that slot, and these are how you get from one
           report to the next without going back to the front page. -->
      <div id="recent" class="cluster" data-space="xs" hidden></div>
      <div class="checked" id="checked" hidden>
        <div data-slot class="cluster" data-space="xs"></div>
      </div>
      <p id="status" class="status" role="status" aria-live="polite" data-state="idle"></p>
    </div>
`;
}
