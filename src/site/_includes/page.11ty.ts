// Layout for content pages written in Markdown. Front matter:
//
//   ---
//   layout: page
//   title: About sus.bot
//   description: One sentence for search results.
//   lang: de                  # optional; otherwise from the folder, else English
//   translationKey: about     # optional; pages sharing it are translations
//   ---
//
// The page gets the site header and footer in its language, hreflang links
// to its translations, and the theme switch and language menu.

import type { PageContext } from '../../components/context.ts';
import { Document } from '../../components/document.ts';
import { SiteHeader } from '../../components/header.ts';
import { SiteFooter } from '../../components/footer.ts';
import { strings, assetsFor, relative, homePath, pageJsonLd, escapeHtml } from '../../lib/site.ts';
import { pageLang, alternatesOf, type PageData } from '../../lib/pages.ts';
import type { SiteData } from '../../../eleventy.config.ts';

interface Data extends SiteData, PageData {
  title?: string;
  description?: string;
  content: string;
  collections: { all: { url: string | false; data: PageData }[] };
  page: { url: string; inputPath: string };
}

export function render(d: Data): string {
  const lang = pageLang(d);
  const path = d.page.url;
  const s = strings(d.dicts, lang, d.figures.tracked);
  const alternates = alternatesOf(d, d.collections.all);
  if (!Object.hasOwn(alternates, lang)) alternates[lang] = path;
  const ctx: PageContext = { lang, path, assets: assetsFor(path), home: relative(path, homePath(lang)), s, active: d.languages, alternates };
  const title = d.title ?? s.text('page.title');
  const description = d.description ?? s.text('page.description');
  return Document(ctx, {
    title: `${title} | sus.bot`,
    description,
    script: 'page.js',
    jsonld: pageJsonLd(lang, path, title, description),
    body: `${SiteHeader(ctx)}
  <main id="main" class="wrapper pt-8">
    <article class="prose">
      <h1>${escapeHtml(title)}</h1>
${d.content}
    </article>
  </main>

${SiteFooter(ctx)}`,
  });
}
