// Site footer.

import type { PageContext } from './context.ts';

export function SiteFooter(ctx: PageContext): string {
  const { e, raw } = ctx.s;
  return `  <footer class="site-footer">
    <div class="wrapper">
      <p>${raw('page.footerRfc')}</p>
      <p>${e('page.footerLocal')}</p>
      <p>${raw('page.footerBy')}</p>
    </div>
  </footer>
`;
}
