// The home page, in the order the design draws it.
//
// Both views are the same page: the check row, the verdict, the worklist beside
// the file, and the footnote. What differs is what fills them. Before a check the
// verdict slot holds the pitch and the worklist holds examples, and the two cards
// under it (compare, recent changes) and the three audience columns are there;
// after a check all of that is replaced or hidden and the comparison and the
// appendix appear instead.
//
// The offer section stays last: it only exists once there is a report, and it is
// the one section of the page the design does not draw.

import type { PageContext } from '../context.ts';
import { SiteHeader } from '../header.ts';
import { SiteFooter } from '../footer.ts';
import { Check } from './check.ts';
import { Verdict } from './verdict.ts';
import { Work } from './work.ts';
import { Results } from './results.ts';
import { Audience } from './audience.ts';
import { Pitch } from './pitch.ts';
import { Sales } from './sales.ts';
import { Pricing } from './pricing.ts';
import { PRICING } from '../../client/config.ts';

export function HomeBody(ctx: PageContext, blockRate: string, changes: { domain: string; iso: string }[]): string {
  return `${SiteHeader(ctx)}
  <main id="main" class="wrapper report-main flow" data-space="m">

    <noscript><p class="callout" data-state="warning">${ctx.s.e('page.noscript')}</p></noscript>

${Check(ctx)}
${Verdict(ctx)}
${Work(ctx)}
${Results(ctx, blockRate)}
${Audience(ctx)}
${Pitch(ctx, changes)}
${Sales(ctx)}
${PRICING.show ? Pricing(ctx) : ''}
    <p class="footnote text-sm">${ctx.s.e('ui.appendix.footnote')}</p>
  </main>

${SiteFooter(ctx)}`;
}
