// The verdict slot, which holds the pitch until there is a report.
//
// Both views have the same shape here, which is the point of the design: a state
// line, the headline, the sentence under it, and four tiles. Before a check the
// state line says what the check costs, the headline says what the tool is for,
// and the four tiles are empty with a dashed edge, naming the four questions the
// report will answer. After a check the client replaces all of it with the state
// word, the verdict, and the four tiles filled in.
//
// The headline is the page's h1 in both views, in the same slot and at the same
// size, so nothing moves when the answer arrives.

import type { PageContext } from '../context.ts';

/** One empty tile: the question it will answer, and a dash where the answer goes. */
function Placeholder(ctx: PageContext, id: string, label: string): string {
  const { e } = ctx.s;
  return `          <div class="tile flow" data-space="2xs" data-empty="true">
            <p class="tile__label text-sm">${label}</p>
            <p class="tile__value" aria-hidden="true">&mdash;</p>
            <p class="text-sm text-muted">${e(`sales.tile.${id}`)}</p>
          </div>
`;
}

export function Verdict(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <section class="flow" data-space="s" id="summary" aria-labelledby="page-h1">
      <div data-slot class="flow" data-space="m">
     
        <p class="cluster trust text-sm text-muted" data-space="xs">
          <span class="badge" data-state="ok">${e('sales.trust.free')}</span>
          <span>${e('sales.trust.noAccount')}</span>
          <span>${e('sales.trust.browser')}</span>
          <span>${e('sales.trust.noProbe')}</span>
        </p>
        <div class="grid tiles" data-min="xs" data-align="stretch">
${Placeholder(ctx, 'ai', e('ui.tile.aiLabel'))}${Placeholder(ctx, 'exposure', e('ui.tile.exposureLabel'))}${Placeholder(ctx, 'systems', e('ui.tile.systemsLabel'))}${Placeholder(ctx, 'technical', e('ui.tile.technicalLabel'))}        </div>
      </div>
    </section>
`;
}
