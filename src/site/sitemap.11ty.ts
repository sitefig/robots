// sitemap.xml: every page of the site, with its translations as hreflang
// alternates and x-default pointing at the English version. Loops over the
// full collection, so a new Markdown page is listed without changes here.

import { absolute, LANGUAGES, DEFAULT_LANG } from '../lib/site.ts';
import { sitePages, pageLang, translationKey, type PageData } from '../lib/pages.ts';

interface Data {
  collections: { all: { url: string | false; data: PageData }[] };
}

export const data = {
  permalink: '/sitemap.xml',
  eleventyExcludeFromCollections: true,
};

const ORDER = Object.keys(LANGUAGES);

export function render(d: Data): string {
  const pages = sitePages(d.collections.all);
  const groups = new Map<string, { lang: string; url: string }[]>();
  for (const p of pages) {
    const key = translationKey(p.data);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push({ lang: pageLang(p.data), url: p.url as string });
  }
  const blocks: string[] = [];
  for (const members of groups.values()) {
    members.sort((a, b) => ORDER.indexOf(a.lang) - ORDER.indexOf(b.lang));
    const fallback = members.find((m) => m.lang === DEFAULT_LANG) ?? members[0];
    const alternates = members
      .map((m) => `    <xhtml:link rel="alternate" hreflang="${m.lang}" href="${absolute(m.url)}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(fallback.url)}"/>`)
      .join('\n');
    for (const m of members) blocks.push(`  <url>\n    <loc>${absolute(m.url)}</loc>\n${alternates}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${blocks.join('\n')}\n</urlset>\n`;
}
