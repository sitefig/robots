// Skip link and site header: brand, section links, theme switch, language menu.

import type { PageContext } from './context.ts';
import { langMenu } from '../lib/site.ts';
import { PRICING } from '../client/config.ts';

/**
 * The sus.bot mark from the identity guide (claude.ai/design "sus.bot
 * Identity"): two brackets for the file, an eye for the crawler reading it,
 * on a 48 x 48 grid with square caps. At header size the guide's small-size
 * cut applies: slightly thicker strokes and no pupil. Brackets take the text
 * colour; the eye is yellow on dark and the same ink as the rest on light
 * (the guide's light lockup is all one ink). Decorative: the link's text is
 * the accessible name.
 */
export function BrandMark(): string {
  return '<svg class="brand__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false"><path d="M17 7 H8 V41 H17" stroke="currentColor" stroke-width="3.6" stroke-linecap="square"/><path d="M31 7 H40 V41 H31" stroke="currentColor" stroke-width="3.6" stroke-linecap="square"/><circle class="brand__eye" cx="24" cy="24" r="7.5" stroke-width="3.6"/></svg>';
}

/**
 * The easter egg: right-clicking (or opening the context menu on) the header
 * logo shows this popover with the logo files and a link to the press kit
 * instead of the browser's menu. The same files are always reachable from
 * the footer's press kit link, so nothing depends on finding it.
 */
function BrandMenu(ctx: PageContext): string {
  const { e } = ctx.s;
  const f = `${ctx.assets}press/files/`;
  return `  <nav id="brand-menu" class="brand-menu" popover="manual" aria-labelledby="brand-menu-label">
    <p class="brand-menu__label" id="brand-menu-label">${e('page.brandMenu.label')}</p>
    <ul>
      <li><a href="${f}lockup-horizontal/susbot-h-dark-bg.svg" download>${e('page.brandMenu.dark')}</a></li>
      <li><a href="${f}lockup-horizontal/susbot-h-light-bg.svg" download>${e('page.brandMenu.light')}</a></li>
      <li><a href="${f}mark/susbot-mark-dark-bg.svg" download>${e('page.brandMenu.icon')}</a></li>
      <li><a href="${ctx.assets}press/">${e('page.brandMenu.press')}</a></li>
    </ul>
  </nav>
`;
}

export function SiteHeader(ctx: PageContext): string {
  const { e } = ctx.s;
  const h = ctx.home;
  return `  <a class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:p-2 focus:bg-signal focus:text-signal-ink" href="#main">${e('page.skip')}</a>

  <header class="site-header">
    <div class="wrapper">
      <a class="brand" href="${ctx.assets}">${BrandMark()}<span class="brand__word">sus.bot</span></a>
      <nav class="nav" aria-label="${e('page.navLabel')}">
        <ul>
          <li><a href="${h}#cli">${e('page.nav.cli')}</a></li>
          <li><a href="${h}#gallery">${e('page.nav.gallery')}</a></li>
          <li><a href="${h}#extension">${e('page.nav.extension')}</a></li>
          ${PRICING.show ? `<li><a href="${h}#pricing">${e('page.nav.pricing')}</a></li>` : ''}
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
${BrandMenu(ctx)}`;
}
