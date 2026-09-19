// Headline and intro on the left, the URL form and paste box on the right.

import type { PageContext } from '../context.ts';

export function Hero(ctx: PageContext): string {
  const { e, raw } = ctx.s;
  return `    <div class="grid" data-min="l">
      <div class="flow" data-space="s">
        <h1>${e('page.h1')}</h1>
        <p class="text-lg text-muted max-w-prose">${raw('page.intro')}</p>
      </div>
      <div class="panel flow" data-space="s">
        <form id="fetch-form" class="stack" novalidate>
          <label for="site-url">${e('page.urlLabel')}</label>
          <div class="cluster" data-align="stretch" data-space="xs">
            <input id="site-url" name="url" type="text" inputmode="url" autocomplete="url" spellcheck="false"
                   placeholder="${e('page.urlPlaceholder')}" required aria-describedby="site-url-hint">
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
