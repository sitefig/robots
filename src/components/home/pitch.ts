// Two cards under the audience columns, for a visitor who has not checked
// anything yet: compare with a competitor, and what the tracked sites are doing.
//
// The comparison is the second reason to use this at all. Every robots.txt is
// public, so it costs one more fetch and nothing else, and a competitor who has
// just opened up to AI search or hidden a category is a thing worth knowing
// before your next meeting.
//
// The figures in the second card come from the tracking data, not from copy: the
// number of sites we fetch every day and the share of them that block GPTBot are
// both read out of the engine's own README at build time.
//
// Both are marked data-pitch and go away once there is a report.

import type { PageContext } from '../context.ts';
import { escapeHtml, LINKS } from '../../lib/site.ts';

export function Pitch(ctx: PageContext, tracked: string, blockRate: string): string {
  const { e } = ctx.s;
  return `    <div class="grid" data-min="l" data-align="stretch" data-pitch>
      <section class="panel flow" data-space="xs" aria-labelledby="pitch-compare-heading">
        <h2 id="pitch-compare-heading" class="text-xl">${e('sales.compare.title')}</h2>
        <p class="text-muted">${e('sales.compare.body')}</p>
        <div class="cluster" data-align="stretch" data-space="xs">
          <label for="pitch-compare-you" class="sr-only">${e('sales.compare.yours')}</label>
          <input id="pitch-compare-you" type="text" inputmode="url" autocomplete="url" spellcheck="false">
          <span class="text-sm text-muted">${e('sales.compare.vs')}</span>
          <label for="pitch-compare-them" class="sr-only">${e('sales.compare.theirs')}</label>
          <input id="pitch-compare-them" type="text" inputmode="url" spellcheck="false">
          <button type="button" class="button" id="pitch-compare-run">${e('sales.compare.run')}</button>
        </div>
      </section>

      <section class="panel flow" data-space="xs" aria-labelledby="pitch-tracked-heading">
        <div class="cluster" data-justify="between" data-space="xs">
          <h2 id="pitch-tracked-heading" class="text-xl">${e('sales.tracked.title')}</h2>
          <a class="text-sm push-end" href="${LINKS.gallery}" rel="noopener">${e('sales.tracked.link')}</a>
        </div>
        <p class="text-sm text-muted">${e('sales.tracked.body')}</p>
        <dl class="defs">
          <div><dt>${e('sales.tracked.sites')}</dt><dd class="font-mono">${escapeHtml(tracked)}</dd></div>
          <div><dt>${e('sales.tracked.gptbot')}</dt><dd class="font-mono">${escapeHtml(blockRate)}</dd></div>
        </dl>
      </section>
    </div>
`;
}
