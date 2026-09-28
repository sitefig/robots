// Skip link and site header: brand, section links, theme toggle, language menu.

import type { PageContext } from './context.ts';
import { langMenu } from '../lib/site.ts';
import { PRICING, APP_URL } from '../client/config.ts';

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
 * Dark or light, as one button rather than three. Dark is the default and the
 * operating system is not consulted: the page is an instrument, drawn dark, and
 * a visitor who wants light says so once and is remembered.
 *
 * Both icons ship in the markup and CSS shows the one that applies, so the
 * button never waits for script to look right. The accessible name says what
 * pressing it will do rather than what the theme is, because "Dark" on a button
 * is ambiguous about whether it is a state or an action; preferences.ts swaps
 * that name on click. The label is a `ui.` string, so a language that has not
 * translated it keeps its home page and falls back to English.
 */
function ThemeToggle(ctx: PageContext): string {
  return `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="${ctx.s.e('ui.theme.toLight')}" data-to="light">
        <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.6" stroke="currentColor" stroke-width="2"/><path d="M12 2.4v2.6M12 19v2.6M2.4 12h2.6M19 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M20 14.2A8.4 8.4 0 1 1 9.8 4a6.9 6.9 0 0 0 10.2 10.2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>`;
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
      <div class="site-header__tools">
        <nav class="nav" aria-label="${e('page.navLabel')}">
          <ul>
            <!-- Sales order: what is sold, then the thing that carries it, then
                 the way in. The gallery and the command line are still on the
                 page as cards; neither is a reason to buy, so neither is in the
                 nav. Monitoring and the account live in the app because the
                 section that sells them here only exists after a report. -->
            <li><a href="${APP_URL}" rel="noopener">${e('sales.nav.monitoring')}</a></li>
            <li><a href="${h}#extension">${e('page.nav.extension')}</a></li>
            ${PRICING.show ? `<li><a href="${h}#pricing">${e('page.nav.pricing')}</a></li>` : ''}
            <li><a href="${APP_URL}/signup/" rel="noopener">${e('sales.nav.account')}</a></li>
          </ul>
        </nav>
${langMenu(ctx.lang, ctx.path, ctx.active, ctx.alternates, ctx.s.text('page.langLabel'))}
        ${ThemeToggle(ctx)}
      </div>
    </div>
  </header>
${BrandMenu(ctx)}`;
}
