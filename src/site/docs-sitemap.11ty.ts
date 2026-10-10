// /docs/sitemap.xml: the documentation pages, in a sitemap of their own.
//
// They are not in sitemap.xml, which lists the site itself: a hundred pages
// about findings would bury the twenty-eight pages that sell the tool, and a
// crawler that fetches one sitemap a day is better off with the two sets apart.
// src/site/robots.txt points at both, which is how a crawler finds this one.

import { absolute } from '../lib/site.ts';
import { docPages } from '../lib/docs.ts';

export const data = {
  permalink: '/docs/sitemap.xml',
  eleventyExcludeFromCollections: true,
};

export function render(): string {
  const urls = ['/docs/', ...docPages().map((p) => p.path)];
  const blocks = urls.map((url) => `  <url>\n    <loc>${absolute(url)}</loc>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blocks.join('\n')}\n</urlset>\n`;
}
