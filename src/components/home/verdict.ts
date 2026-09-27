// The verdict card, hidden until a file has been analysed.
//
// The verdict itself takes the full width of the row: it is the one line a
// visitor came for, and a column half the page wide made it look like one fact
// among many. The facts and the export buttons share the row beneath it, so the
// buttons sit beside what they act on rather than trailing the whole card.

import type { PageContext } from '../context.ts';

export function Verdict(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <section class="panel flow" data-space="s" id="summary" hidden aria-labelledby="summary-heading">
      <div class="section-title">
        <h2 id="summary-heading">${e('page.verdict')}</h2>
        <p class="text-sm text-muted font-mono push-end" id="summary-meta"></p>
      </div>
      <div data-slot></div>
      <div class="with-sidebar" data-space="s">
        <div id="summary-facts"><div data-slot></div></div>
        <div id="export" class="flow" data-space="xs" hidden>
          <div data-slot class="flow" data-space="xs"></div>
        </div>
      </div>
    </section>
`;
}
