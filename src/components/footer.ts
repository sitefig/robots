// Site footer: the logo, the link groups from src/lib/footer.ts, and the
// fine print. Extend the footer by editing FOOTER, not this component.

import type { PageContext } from './context.ts';
import { FOOTER, type Target } from '../lib/footer.ts';
import { BrandMark } from './header.ts';
import { escapeHtml } from '../lib/site.ts';

function href(ctx: PageContext, to: Target): string {
  if ('home' in to) return `${ctx.home}${to.home}`;
  if ('site' in to) {
    const path = to.site.replace(/^\//, '');
    return `${ctx.assets}${path}`;
  }
  return to.url;
}

/** A dictionary key, or plain text (a proper name) when it is not a key. */
const label = (ctx: PageContext, key: string) => (/^[a-z]+\./.test(key) ? ctx.s.e(key) : escapeHtml(key));

export function SiteFooter(ctx: PageContext): string {
  const { e, raw } = ctx.s;
  const groups = FOOTER.map((g, i) => {
    const id = `footer-group-${i}`;
    const links = g.links
      .map((l) => {
        const url = href(ctx, l.to);
        const external = 'url' in l.to ? ' rel="noopener"' : '';
        return `            <li><a href="${url}"${external}>${label(ctx, l.label)}</a></li>`;
      })
      .join('\n');
    return `        <section class="footer-group" aria-labelledby="${id}">
          <h2 class="footer-group__heading" id="${id}">${e(g.heading)}</h2>
          <ul>
${links}
          </ul>
        </section>`;
  }).join('\n');
  return `  <footer class="site-footer">
    <div class="wrapper flow" data-space="l">
      <div class="footer-top">
        <a class="brand" href="${ctx.assets}">${BrandMark()}<span class="brand__word">sus.bot</span></a>
        <nav class="footer-nav" aria-label="${e('page.footer.navLabel')}">
${groups}
        </nav>
      </div>
      <div class="footer-legal">
        <p>${raw('page.footerRfc')}</p>
        <p>${e('page.footerLocal')}</p>
        <p>${raw('page.footerBy')}</p>
      </div>
    </div>
  </footer>
`;
}
