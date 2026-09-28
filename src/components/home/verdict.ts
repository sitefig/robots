// The bar that says what was checked, and the verdict itself. Both hidden until
// a file has been analysed.
//
// The verdict is the one thing a visitor came for, so it takes the full width:
// a state word, the headline, and the consequences as tiles. What the file
// technically is sits beside the export buttons underneath, one disclosure away.

import type { PageContext } from '../context.ts';

export function Verdict(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <div class="checked" id="checked" hidden>
      <div data-slot class="cluster" data-space="xs"></div>
    </div>

    <section class="panel flow" data-space="s" id="summary" hidden aria-labelledby="summary-heading">
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
