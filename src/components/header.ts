// Skip link and site header: brand, section links, theme switch, language menu.

import type { PageContext } from './context.ts';
import { langMenu } from '../lib/site.ts';

export function SiteHeader(ctx: PageContext): string {
  const { e } = ctx.s;
  const h = ctx.home;
  return `  <a class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:p-2 focus:bg-signal focus:text-signal-ink" href="#main">${e('page.skip')}</a>

  <header class="site-header">
    <div class="wrapper">
      <a class="brand" href="${ctx.assets}"><span>sus</span>.bot</a>
      <nav class="nav" aria-label="${e('page.navLabel')}">
        <ul>
          <li><a href="${h}#cli">${e('page.nav.cli')}</a></li>
          <li><a href="${h}#gallery">${e('page.nav.gallery')}</a></li>
          <li><a href="${h}#extension">${e('page.nav.extension')}</a></li>
          <li><a href="${h}#pricing">${e('page.nav.pricing')}</a></li>
        </ul>
      </nav>
      <div class="seg" role="group" aria-label="${e('page.themeLabel')}" id="theme-switch">
        <button type="button" data-theme-choice="system">${e('page.theme.system')}</button>
        <button type="button" data-theme-choice="light">${e('page.theme.light')}</button>
        <button type="button" data-theme-choice="dark">${e('page.theme.dark')}</button>
      </div>
${langMenu(ctx.lang, ctx.path, ctx.active, ctx.alternates, ctx.s.text('page.langLabel'))}
    </div>
  </header>
`;
}
