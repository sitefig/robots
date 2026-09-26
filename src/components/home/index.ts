// The home page: the tool plus the monitoring and pricing sections.

import type { PageContext } from '../context.ts';
import { SiteHeader } from '../header.ts';
import { SiteFooter } from '../footer.ts';
import { Hero } from './hero.ts';
import { Verdict } from './verdict.ts';
import { Sales } from './sales.ts';
import { Results } from './results.ts';
import { Pricing } from './pricing.ts';
import { PRICING } from '../../client/config.ts';
import { More } from './more.ts';

export function HomeBody(ctx: PageContext, blockRate: string): string {
  return `${SiteHeader(ctx)}
  <main id="main" class="wrapper flow pt-8" data-space="xl">

    <noscript><p class="callout" data-state="warning">${ctx.s.e('page.noscript')}</p></noscript>

${Hero(ctx)}
${Verdict(ctx)}
${Results(ctx, blockRate)}
${Sales(ctx)}
${PRICING.show ? Pricing(ctx) : ''}
${More(ctx)}
  </main>

${SiteFooter(ctx)}`;
}
