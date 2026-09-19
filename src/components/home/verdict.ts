// The verdict card, hidden until a file has been analysed.

import type { PageContext } from '../context.ts';

export function Verdict(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <section class="panel flow" data-space="s" id="summary" hidden aria-labelledby="summary-heading">
      <div class="section-title">
        <h2 id="summary-heading">${e('page.verdict')}</h2>
        <p class="text-sm text-muted font-mono push-end" id="summary-meta"></p>
      </div>
      <div data-slot class="grid" data-min="l"></div>
      <div id="export" class="flow" data-space="xs" hidden>
        <div data-slot class="flow" data-space="xs"></div>
      </div>
    </section>
`;
}
