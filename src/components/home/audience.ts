// Who this is for, in three columns, and it is three columns because the answer
// is three different people who share one file and rarely talk about it. The
// founder wants to know what it costs, the developer wants the line, security
// wants to know what the file gives away. Saying so is what makes a visitor
// forward the report instead of closing it.
//
// Marked data-pitch: it goes away once the visitor has their own report.

import type { PageContext } from '../context.ts';

export function Audience(ctx: PageContext): string {
  const { e } = ctx.s;
  const card = (id: string): string => `      <div class="audience flow" data-space="2xs">
        <p class="text-sm font-mono text-muted">${e(`sales.audience.${id}.label`)}</p>
        <p class="audience__title">${e(`sales.audience.${id}.title`)}</p>
        <p class="text-muted">${e(`sales.audience.${id}.body`)}</p>
      </div>
`;
  return `    <section class="grid" data-min="s" data-align="stretch" data-pitch aria-label="${e('sales.audience.label')}">
${card('seo')}${card('dev')}${card('sec')}    </section>
`;
}
