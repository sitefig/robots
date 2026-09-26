// The offer, after the report.
//
// A visitor who has just seen which AI crawlers are reading their site is the
// only one for whom any of this means something, so everything that asks for a
// decision lives here rather than above the check. The order is deliberate:
// the free account first, because it costs nothing and needs no conversation;
// then the way a developer does it alone; then what we watch for you.
//
// The strings use the `sales.` prefix on purpose. A new `page.` key has to
// exist in all 24 languages before a language keeps its home page, and this
// copy is still moving; `sales.` falls back to English string by string.

import type { PageContext } from '../context.ts';
import { LINKS } from '../../lib/site.ts';

const APP = 'https://app.sitefig.net';

export function Sales(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <section id="keep-watching" class="flow" data-space="s" aria-labelledby="keep-watching-heading" hidden>
      <h2 id="keep-watching-heading" class="text-2xl">${e('sales.title')}</h2>
      <p class="text-lg text-muted max-w-prose" data-slot="sales-lead">${e('sales.body')}</p>
      <div class="grid" data-min="s" data-align="stretch">
        <article class="card flow" data-space="xs">
          <h3>${e('sales.free.title')}</h3>
          <p class="text-sm">${e('sales.free.body')}</p>
          <ul class="plan__features">
            <li>${e('sales.free.f1')}</li>
            <li>${e('sales.free.f2')}</li>
            <li>${e('sales.free.f3')}</li>
          </ul>
          <a class="button" data-variant="primary" data-offer="free" href="${APP}/signup/">${e('sales.free.cta')}</a>
          <p class="text-sm text-muted">${e('sales.free.note')}</p>
        </article>
        <article class="card flow" data-space="xs">
          <h3>${e('sales.self.title')}</h3>
          <p class="text-sm">${e('sales.self.body')}</p>
          <pre class="cmd"><code>cargo install susbot
susbot https://example.com --fail-on warning</code></pre>
          <p class="text-sm">${e('sales.self.claude')}</p>
          <a class="button" data-offer="self" href="${LINKS.engine}#readme">${e('sales.self.cta')}</a>
        </article>
        <article class="card flow" data-space="xs">
          <h3>${e('sales.watch.title')}</h3>
          <p class="text-sm">${e('sales.watch.body')}</p>
          <ul class="plan__features">
            <li>${e('sales.watch.f1')}</li>
            <li>${e('sales.watch.f2')}</li>
            <li>${e('sales.watch.f3')}</li>
          </ul>
          <a class="button" data-offer="watch" href="${APP}/signup/">${e('sales.watch.cta')}</a>
        </article>
      </div>
    </section>
`;
}
