// The press kit at /press/: logo files from src/site/press/files/ (made by
// tools/brand.ts from the identity guide), colours, type, usage rules and a
// short description. English only for now; the header and footer follow the
// site language menu, which links each language's home page from here.

import { statSync } from 'node:fs';
import type { PageContext } from '../components/context.ts';
import { Document } from '../components/document.ts';
import { SiteHeader } from '../components/header.ts';
import { SiteFooter } from '../components/footer.ts';
import { strings, assetsFor, relative, homePath, pageJsonLd, escapeHtml, DEFAULT_LANG } from '../lib/site.ts';
import { ZIP_NAME, INK, SURFACE, PAPER, ACCENT } from '../lib/brand.ts';
import type { SiteData } from '../../eleventy.config.ts';

export const data = { permalink: '/press/index.html', translationKey: 'press', lang: DEFAULT_LANG };

const FILES = new URL('./press/files/', import.meta.url);

function size(file: string): string {
  const bytes = statSync(new URL(file, FILES)).size;
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Logo {
  name: string;
  note: string;
  svg: string;
  /** Background of the preview, so each file is shown on the ground it is made for. */
  ground: 'dark' | 'light' | 'mid';
  alt: string;
  pngs?: { name: string; widths: number[] };
}

const LOGOS: Logo[] = [
  { name: 'Horizontal, dark background', note: 'The default. Use this unless there is no room.', svg: 'lockup-horizontal/susbot-h-dark-bg.svg', ground: 'dark', alt: 'sus.bot logo, white with a yellow eye', pngs: { name: 'susbot-h-dark-bg', widths: [416, 832, 1664] } },
  { name: 'Horizontal, light background', note: 'All one ink. The yellow drops out.', svg: 'lockup-horizontal/susbot-h-light-bg.svg', ground: 'light', alt: 'sus.bot logo in black', pngs: { name: 'susbot-h-light-bg', widths: [416, 832, 1664] } },
  { name: 'Stacked, dark background', note: 'For square spaces such as avatars and stickers.', svg: 'lockup-stacked/susbot-v-dark-bg.svg', ground: 'dark', alt: 'sus.bot logo, stacked, white with a yellow eye' },
  { name: 'Stacked, light background', note: 'For square spaces on light grounds.', svg: 'lockup-stacked/susbot-v-light-bg.svg', ground: 'light', alt: 'sus.bot logo, stacked, in black' },
  { name: 'One ink, black', note: 'For single-colour print, embroidery and engraving.', svg: 'lockup-horizontal/susbot-h-mono-black.svg', ground: 'light', alt: 'sus.bot logo in pure black' },
  { name: 'One ink, white', note: 'For single-colour print on dark material.', svg: 'lockup-horizontal/susbot-h-mono-white.svg', ground: 'mid', alt: 'sus.bot logo in pure white' },
  { name: 'Icon, dark background', note: 'The mark alone, at least 16 px.', svg: 'mark/susbot-mark-dark-bg.svg', ground: 'dark', alt: 'sus.bot icon, white brackets and a yellow eye', pngs: { name: 'susbot-mark-dark-bg', widths: [128, 512] } },
  { name: 'Icon, light background', note: 'The mark alone in one ink.', svg: 'mark/susbot-mark-light-bg.svg', ground: 'light', alt: 'sus.bot icon in black', pngs: { name: 'susbot-mark-light-bg', widths: [128, 512] } },
  { name: 'Icon, light background, yellow eye', note: 'A darker yellow that holds up on light grounds.', svg: 'mark/susbot-mark-light-bg-yellow.svg', ground: 'light', alt: 'sus.bot icon in black with a dark yellow eye' },
  { name: 'App icon', note: 'Rounded square for app stores and home screens.', svg: 'favicon/susbot-app-icon-512.svg', ground: 'mid', alt: 'sus.bot app icon', pngs: { name: 'susbot-app-icon', widths: [180, 512, 1024] } },
  { name: 'Favicon', note: 'The small-size cut for 16 px and below: solid pupil, thicker brackets.', svg: 'favicon/susbot-favicon.svg', ground: 'mid', alt: 'sus.bot favicon', pngs: { name: 'susbot-favicon', widths: [32, 64] } },
];

const COLOURS: [string, string, string][] = [
  ['Surface', SURFACE, 'Page background in dark mode'],
  ['Panel', '#1b1c20', 'Raised areas'],
  ['Border', '#383b42', 'Lines and frames'],
  ['Accent', ACCENT, 'The eye and one action per area, never text on light'],
  ['Allow', '#86e0aa', 'Only ever means allowed'],
  ['Disallow', '#ffa198', 'Only ever means disallowed'],
  ['Paper', PAPER, 'Light grounds'],
  ['Ink', INK, 'Text and the logo on light'],
];

function logoCard(l: Logo): string {
  const links = [`<li><a href="files/${l.svg}" download>SVG</a> <span class="text-muted">(${size(l.svg)})</span></li>`];
  for (const w of l.pngs?.widths ?? []) {
    const f = `png/${l.pngs?.name}-${w}.png`;
    links.push(`<li><a href="files/${f}" download>PNG ${w} px</a> <span class="text-muted">(${size(f)})</span></li>`);
  }
  return `        <article class="logo-card">
          <div class="logo-card__preview" data-ground="${l.ground}"><img src="files/${l.svg}" alt="${escapeHtml(l.alt)}" loading="lazy"></div>
          <div class="flow" data-space="2xs">
            <h3>${escapeHtml(l.name)}</h3>
            <p class="text-sm text-muted">${escapeHtml(l.note)}</p>
            <ul class="cluster text-sm" data-space="xs">
              ${links.join('\n              ')}
            </ul>
          </div>
        </article>`;
}

export function render(d: SiteData & { page: { url: string } }): string {
  const lang = DEFAULT_LANG;
  const path = '/press/';
  const s = strings(d.dicts, lang, d.figures.tracked);
  const ctx: PageContext = { lang, path, assets: assetsFor(path), home: relative(path, homePath(lang)), s, active: d.languages, alternates: { [lang]: path } };
  const title = 'Press kit';
  const description = 'The sus.bot logo, colours and type, with a short description for writing about sus.bot.';
  const swatches = COLOURS.map(([name, hex, use]) => `        <li class="swatch"><svg class="swatch__chip" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="1" height="1" fill="${hex}"/></svg><span class="font-bold">${name}</span> <code>${hex}</code><br><span class="text-sm text-muted">${escapeHtml(use)}</span></li>`).join('\n');
  const body = `${SiteHeader(ctx)}
  <main id="main" class="wrapper flow pt-8" data-space="xl">

    <div class="flow" data-space="s">
      <h1>${title}</h1>
      <p class="text-lg text-muted max-w-prose">Logos, colours and type for writing about sus.bot. Every file below is also in one zip file, with a short guide.</p>
      <p><a class="button" data-variant="primary" href="files/${ZIP_NAME}" download>Download the press kit (ZIP, ${size(ZIP_NAME)})</a></p>
    </div>

    <section class="flow" data-space="s" aria-labelledby="press-logo">
      <h2 id="press-logo">Logo</h2>
      <p class="max-w-prose">The mark is two brackets for the robots.txt file and an eye for the crawler reading it. The wordmark is set in Space Grotesk Bold; in these files it is converted to outlines, so no font is needed.</p>
      <div class="grid" data-align="stretch">
${LOGOS.map(logoCard).join('\n')}
      </div>
    </section>

    <section class="flow" data-space="s" aria-labelledby="press-colour">
      <h2 id="press-colour">Colour</h2>
      <p class="max-w-prose">Dark by default. The yellow is used for one point of focus at a time. Green and salmon only ever mean allowed and disallowed.</p>
      <ul class="grid" data-min="s">
${swatches}
      </ul>
    </section>

    <section class="flow" data-space="s" aria-labelledby="press-type">
      <h2 id="press-type">Type</h2>
      <ul class="press-list flow max-w-prose" data-space="xs">
        <li><span class="font-bold">Space Grotesk Bold</span> for the wordmark only, at -4.5% tracking.</li>
        <li><span class="font-bold">Atkinson Hyperlegible Next</span> for all text on the site, and <span class="font-bold">Atkinson Hyperlegible Mono</span> for paths, rules and code.</li>
        <li>All three are free under the SIL Open Font License.</li>
      </ul>
    </section>

    <section class="flow" data-space="s" aria-labelledby="press-use">
      <h2 id="press-use">Using the logo</h2>
      <ul class="press-list flow max-w-prose" data-space="xs">
        <li>Keep clear space equal to the height of the mark on all four sides.</li>
        <li>Use the horizontal logo at 104 px (28 mm) wide or more, and the mark alone at 16 px or more. Below 16 px, use the favicon.</li>
        <li>Put the dark-background files on dark grounds and the light-background files on light grounds.</li>
        <li>Do not colour the brackets yellow, rotate the logo, round its corners, add outlines, shadows or gradients, stretch it, change the gap between icon and wordmark, or set the wordmark in another typeface.</li>
      </ul>
    </section>

    <section class="flow" data-space="s" aria-labelledby="press-about">
      <h2 id="press-about">About sus.bot</h2>
      <blockquote class="press-quote max-w-prose">
        <p>sus.bot is a free robots.txt checker made by Sitefig. It fetches a site's robots.txt and shows which search engines and AI crawlers may visit which pages, and which paths the file reveals to anyone who reads it. It runs in the browser in the 24 official EU languages, and the same checks are available as a command-line tool and a GitHub Action. sus.bot also keeps a daily history of the robots.txt files of ${d.figures.tracked} large sites.</p>
      </blockquote>
      <p>For press questions, contact <a href="https://sitefig.eu/" rel="noopener">Sitefig</a>.</p>
    </section>

  </main>

${SiteFooter(ctx)}`;
  return Document(ctx, { title: `${title} | sus.bot`, description, script: 'page.js', jsonld: pageJsonLd(lang, path, title, description), body });
}
