// Two cards for a visitor who has not checked anything yet: compare with a
// competitor, and what changed at the large sites we fetch every day.
//
// The comparison is the second reason to use this at all. Every robots.txt is
// public, so it costs one more fetch and nothing else, and a competitor who has
// just opened up to AI search is worth knowing about before the next meeting.
//
// The changes are real. The tracking run rewrites a snapshot only when the file
// changed, so the dates are the days those files changed, and the domains are the
// domains. No invented "large fashion retailer".
//
// Both go away once there is a report, because then the page has something
// better to show.

import type { PageContext } from '../context.ts';
import { LINKS } from '../../lib/site.ts';

/** "2 days ago" in the page's language, from a day count. */
function ago(lang: string, iso: string): string {
  const days = Math.round((Date.parse(iso) - Date.now()) / 86400000);
  try {
    return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(days, 'day');
  } catch {
    return iso.slice(0, 10);
  }
}

export function Pitch(ctx: PageContext, changes: { domain: string; iso: string }[]): string {
  const { e } = ctx.s;
  const rows = changes.map((change) => `            <li class="changes__row">
              <span class="font-bold">${change.domain}</span>
              <span class="text-sm text-muted push-end">${ago(ctx.lang, change.iso)}</span>
              <a class="changes__link text-sm" href="${LINKS.gallery}/${change.domain}" rel="noopener">${e('sales.changes.link')}</a>
            </li>
`).join('');
  return `    <div class="grid" data-min="l" data-align="stretch" data-pitch>
      <section class="panel flow" data-space="xs" aria-labelledby="pitch-compare-heading">
        <h2 id="pitch-compare-heading" class="text-xl">${e('sales.compare.title')}</h2>
        <p class="text-muted">${e('sales.compare.body')}</p>
        <div class="compare-bar" data-tone="plain">
          <label for="pitch-compare-you" class="sr-only">${e('sales.compare.yours')}</label>
          <input id="pitch-compare-you" type="text" inputmode="url" autocomplete="url" spellcheck="false">
          <span class="text-sm text-muted">${e('sales.compare.vs')}</span>
          <label for="pitch-compare-them" class="sr-only">${e('sales.compare.theirs')}</label>
          <input id="pitch-compare-them" type="text" inputmode="url" spellcheck="false">
          <button type="button" class="button" id="pitch-compare-run">${e('sales.compare.run')}</button>
        </div>
      </section>

      <section class="flow" data-space="xs" aria-labelledby="pitch-changes-heading">
        <div class="cluster" data-align="baseline" data-justify="between" data-space="xs">
          <h2 id="pitch-changes-heading" class="text-xl">${e('sales.changes.title')}</h2>
          <a class="text-sm push-end" href="${LINKS.gallery}" rel="noopener">${e('sales.tracked.link')}</a>
        </div>
        <p class="text-sm text-muted">${e('sales.changes.body')}</p>
        <ul class="changes">
${rows}        </ul>
      </section>
    </div>
`;
}
