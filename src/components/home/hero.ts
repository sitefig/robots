// The check, and nothing else. The field is the hero: a visitor arrives to
// test a robots.txt, so that is what the top of the page does. Nothing is sold
// here; the offers come after the report, in sales.ts, when the visitor has
// seen what the tool found.

import type { PageContext } from '../context.ts';

export function Hero(ctx: PageContext): string {
  const { e, raw } = ctx.s;
  return `    <div class="flow" data-space="s">
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
    </div>
`;
}
