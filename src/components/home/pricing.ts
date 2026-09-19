// Pricing: the cycle switch; the plan cards are rendered client-side from
// PRICING in src/client/config.ts.

import type { PageContext } from '../context.ts';

export function Pricing(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <section id="pricing" class="flow" data-space="s" aria-labelledby="pricing-heading">
      <h2 id="pricing-heading" class="text-2xl">${e('page.pricing.title')}</h2>
      <p class="text-lg text-muted max-w-prose">${e('page.pricing.body')}</p>
      <div class="seg" role="group" aria-label="${e('page.pricing.cycleLabel')}" id="billing-cycle">
        <button type="button" data-cycle="monthly" aria-pressed="true">${e('page.pricing.monthly')}</button>
        <button type="button" data-cycle="annual" aria-pressed="false">${e('page.pricing.annual')}</button>
      </div>
      <div class="grid" data-align="stretch" data-slot></div>
      <p class="text-sm text-muted">${e('page.pricing.footnote')}</p>
    </section>
`;
}
