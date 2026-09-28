// The check, and beside it what the check will give you.
//
// The field is still the hero: a visitor arrives to test a robots.txt, so that
// is what the top of the page does, and the first interactive thing on the page
// is the input. What changed is the right-hand column. A visitor who has never
// seen a report has no reason to type an address, so the sample sits next to the
// field: the state, the headline, three fixes with their lines, and the message
// that goes to IT. It is marked as a sample, and one link away is the real thing
// on the kitchen-sink example.
//
// Everything marked data-pitch disappears the moment there is a report, because
// then the page has something better to show: the visitor's own answer.

import type { PageContext } from '../context.ts';

export function Hero(ctx: PageContext): string {
  const { e, raw } = ctx.s;
  return `    <div class="grid" data-min="l">
      <div class="flow" data-space="s">
        <div class="flow max-w-prose" data-space="2xs">
          <h1 class="text-3xl">${e('page.h1')}</h1>
          <p class="text-lg text-muted">${raw('page.intro')}</p>
        </div>
        <div class="panel flow hero-check" data-space="s">
          <form id="fetch-form" class="stack" novalidate>
            <label for="site-url" class="text-lg">${e('page.urlLabel')}</label>
            <div class="cluster" data-align="stretch" data-space="xs">
              <!-- No placeholder: "example.com" in grey reads as a value that is
                   already there, and a visitor who submits without noticing gets a
                   report on somebody else's site. The visible label and the hint
                   below say what goes here, and both are announced when focus
                   lands, so nothing is lost by leaving the field empty.
                   autofocus, because the whole page exists to take this one
                   value: it is the first interactive thing after the skip link,
                   the label and hint travel with it through aria-describedby, and
                   browsers suppress it on touch keyboards themselves. -->
              <input id="site-url" name="url" type="text" inputmode="url" autocomplete="url" spellcheck="false"
                     autofocus required aria-describedby="site-url-hint">
              <button type="submit" class="button" data-variant="primary" id="fetch-button">${e('page.analyse')}</button>
            </div>
            <p id="site-url-hint" class="text-sm text-muted">${raw('page.urlHint')}</p>
          </form>
          <div id="recent" class="cluster" data-space="xs" hidden></div>
          <!-- Real sites, because a made-up one teaches nothing and a placeholder
               inside the field would be mistaken for a value. Each chip runs the
               check on that domain. -->
          <div class="cluster" data-space="xs" data-pitch>
            <span class="text-sm text-muted">${e('sales.try.label')}</span>
            <span class="cluster" data-space="2xs" role="group" aria-label="${e('sales.try.label')}">
              <button type="button" class="chip font-mono" data-check-site="nytimes.com">nytimes.com</button>
              <button type="button" class="chip font-mono" data-check-site="ikea.com">ikea.com</button>
              <button type="button" class="chip font-mono" data-check-site="zalando.de">zalando.de</button>
            </span>
          </div>
          <details class="flow" data-space="s" id="paste-details">
            <summary class="text-link underline">${e('page.pasteSummary')}</summary>
            <div class="stack">
              <label for="pasted-text" class="sr-only">${e('page.pasteLabel')}</label>
              <textarea id="pasted-text" rows="7" spellcheck="false" placeholder="User-agent: *&#10;Disallow: /admin/"></textarea>
              <div class="cluster">
                <button type="button" class="button" id="analyse-pasted">${e('page.analysePasted')}</button>
                <button type="button" class="link-button text-sm" id="load-example">${e('page.loadExample')}</button>
              </div>
            </div>
          </details>
          <p id="status" class="status" role="status" aria-live="polite" data-state="idle"></p>
        </div>
        <ul class="trust cluster text-sm text-muted" data-space="xs" data-pitch>
          <li>${e('sales.trust.free')}</li>
          <li>${e('sales.trust.noAccount')}</li>
          <li>${e('sales.trust.browser')}</li>
          <li>${e('sales.trust.noProbe')}</li>
        </ul>
      </div>

      <aside class="flow" data-space="2xs" data-pitch aria-labelledby="sample-heading">
        <p class="text-sm font-mono text-muted" id="sample-heading">${e('sales.sample.label')}</p>
        <div class="sample">
          <div class="sample__head flow" data-space="2xs">
            <span class="badge" data-state="error">${e('ui.pill.error')}</span>
            <p class="sample__verdict">${e('sales.sample.headline')}</p>
          </div>
          <ul class="sample__list">
            <li><span class="badge" data-state="error">${e('enum.level.error')}</span><span>${e('sales.sample.row1')}</span><span class="chip font-mono" aria-hidden="true">${e('sales.sample.line1')}</span></li>
            <li><span class="badge" data-state="warning">${e('enum.level.warning')}</span><span>${e('sales.sample.row2')}</span><span class="chip font-mono" aria-hidden="true">${e('sales.sample.line2')}</span></li>
            <li><span class="badge" data-state="info">${e('ui.fix.sev.decision')}</span><span>${e('sales.sample.row3')}</span></li>
          </ul>
          <div class="sample__ticket flow" data-space="2xs">
            <span class="text-xs font-mono">${e('ui.fixes.ticketLabel')}</span>
            <pre class="fix__message">${e('sales.sample.ticket')}</pre>
          </div>
        </div>
        <p class="text-sm"><a href="?example=kitchen-sink">${e('sales.sample.example')}</a></p>
      </aside>
    </div>
`;
}
