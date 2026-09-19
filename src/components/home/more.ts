// Cards for the command line, the gallery of tracked files and the extension.

import type { PageContext } from '../context.ts';
import { LINKS } from '../../lib/site.ts';

export function More(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <div class="grid" data-align="stretch">
      <section class="panel flow" data-space="xs" id="cli" aria-labelledby="cli-heading">
        <h2 id="cli-heading">${e('page.cli.title')}</h2>
        <p>${e('page.cli.body')}</p>
        <pre class="cmd">susbot audit https://example.com --fail-on warning</pre>
        <p><a href="${LINKS.repo}#readme" rel="noopener">${e('page.cli.link')}</a></p>
      </section>
      <section class="panel flow" data-space="xs" id="gallery" aria-labelledby="gallery-heading">
        <h2 id="gallery-heading">${e('page.gallery.title')}</h2>
        <p>${e('page.gallery.body')}</p>
        <p><a href="${LINKS.gallery}" rel="noopener">${e('page.gallery.link')}</a></p>
      </section>
      <section class="panel flow" data-space="xs" id="extension" aria-labelledby="extension-heading">
        <h2 id="extension-heading">${e('page.extension.title')}</h2>
        <p data-fill="extension-link">${e('page.extension.body')}</p>
      </section>
    </div>
`;
}
