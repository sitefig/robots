// Monitoring pitch with an example change message.

import type { PageContext } from '../context.ts';
import { LINKS } from '../../lib/site.ts';
import { PRICING } from '../../client/config.ts';

export function Promo(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <section class="promo grid" data-min="l" aria-labelledby="promo-heading">
      <div class="flow" data-space="xs">
        <h2 id="promo-heading">${e('page.promo.title')}</h2>
        <p class="max-w-prose">${e('page.promo.body')}</p>
        <div class="cluster pt-2">
          ${PRICING.show ? `<a class="button" data-variant="primary" href="#pricing">${e('page.promo.cta')}</a>` : ''}
          <a href="${LINKS.diffs}" rel="noopener">${e('page.promo.sample')}</a>
        </div>
      </div>
      <figure class="flow" data-space="2xs">
        <figcaption class="text-sm text-muted">${e('page.promo.diffLabel')}</figcaption>
        <pre class="diff-sample"><span data-diff="removed">- Allow: /pricing/compare</span>
<span data-diff="added">+ Disallow: /pricing/compare</span>
<span data-diff="added">+ User-agent: GPTBot</span>
<span data-diff="added">+ Disallow: /</span></pre>
      </figure>
    </section>
`;
}
