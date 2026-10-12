// /docs/: every page about something sus.bot can report, by kind.
//
// The list is the engine's catalogue (src/data/findings.json, written by
// tools/findings.ts), so it is the checks that exist rather than the ones
// somebody remembered to write about. English only, like /bot/ and /press/.

import type { PageContext } from '../components/context.ts';
import { Document } from '../components/document.ts';
import { SiteHeader } from '../components/header.ts';
import { SiteFooter } from '../components/footer.ts';
import { strings, assetsFor, relative, homePath, pageJsonLd, escapeHtml, DEFAULT_LANG } from '../lib/site.ts';
import { byFamily } from '../lib/docs.ts';
import type { SiteData } from '../../eleventy.config.ts';

export const data = { permalink: '/docs/index.html', translationKey: 'docs', sitemap: false, lang: DEFAULT_LANG };

export function render(d: SiteData): string {
  const path = '/docs/';
  const s = strings(d.dicts, DEFAULT_LANG, d.figures.tracked);
  const ctx: PageContext = { lang: DEFAULT_LANG, path, assets: assetsFor(path), home: relative(path, homePath(DEFAULT_LANG)), s, active: d.languages, alternates: { [DEFAULT_LANG]: path } };

  const groups = byFamily().map((group) => `      <section class="flow" data-space="s" aria-labelledby="family-${group.family}">
        <div class="section-title">
          <h2 id="family-${group.family}">${escapeHtml(group.label)}</h2>
          <p class="text-sm text-muted">${group.pages.length} page${group.pages.length === 1 ? '' : 's'} <a href="#families-heading">Back to the top</a></p>
        </div>
        <ul class="plain-list flow" data-space="s">
${group.pages.map((p) => `          <li class="doc-entry flow" data-space="3xs">
            <h3 class="text-lg"><a href="${p.path}">${escapeHtml(p.doc.title)}</a></h3>
            <p class="max-w-prose text-muted">${escapeHtml(p.doc.summary)}</p>
          </li>`).join('\n')}
        </ul>
      </section>`).join('\n\n');

  const title = 'What goes wrong in a robots.txt';
  const description = `Every problem a robots.txt check can find, one page each: what it costs you, what to do about it, and the lines for whoever edits the file.`;

  const body = `${SiteHeader(ctx)}
  <main id="main" class="wrapper flow pt-8" data-space="l">
    <div class="flow max-w-prose" data-space="2xs">
      <h1 class="text-3xl">${escapeHtml(title)}</h1>
      <p class="text-lg text-muted">Find the problem you were told about. Every page says what it costs you, what to do, and the exact lines for whoever edits the file.</p>
      <p class="text-muted">Not checked your site yet? <a href="/">Check it now</a>, free, and your report links straight to the pages that apply.</p>
    </div>

    <nav class="flow" data-space="xs" aria-labelledby="families-heading">
      <h2 id="families-heading" class="text-lg">Jump to</h2>
      <ul class="plain-list cluster" data-space="xs">
${byFamily().map((group) => `        <li><a class="chip" href="#family-${group.family}">${escapeHtml(group.label)} <span class="text-muted">${group.pages.length}</span></a></li>`).join('\n')}
      </ul>
    </nav>

${groups}
  </main>

${SiteFooter(ctx)}`;

  return Document(ctx, { title: `${title} | sus.bot`, description, script: 'page.js', jsonld: pageJsonLd(DEFAULT_LANG, path, title, description), body });
}
