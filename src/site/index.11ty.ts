// The home page in every language with a complete dictionary: "/" for
// English, "/<code>/" for the others.

import type { PageContext } from '../components/context.ts';
import { Document } from '../components/document.ts';
import { HomeBody } from '../components/home/index.ts';
import { strings, homePath, assetsFor, redirectScript, homeJsonLd, DEFAULT_LANG, type Alternates } from '../lib/site.ts';
import type { SiteData } from '../../eleventy.config.ts';

interface Data extends SiteData {
  code: string;
}

export const data = {
  pagination: { data: 'languages', size: 1, alias: 'code', addAllPagesToCollections: true },
  permalink: (d: Data) => `${homePath(d.code)}index.html`,
  translationKey: 'home',
  eleventyComputed: {
    lang: (d: Data) => d.code,
  },
};

export function render(d: Data): string {
  const path = homePath(d.code);
  const alternates: Alternates = Object.fromEntries(d.languages.map((c) => [c, homePath(c)]));
  const s = strings(d.dicts, d.code, d.figures.tracked);
  const ctx: PageContext = { lang: d.code, path, assets: assetsFor(path), home: '', s, active: d.languages, alternates };
  const rateValue = d.figures.gptbotBlocked === null ? '' : s.text('page.aiWatch.rateValue').replace('{pct}', String(d.figures.gptbotBlocked)).replace('{n}', String(d.figures.tracked));
  return Document(ctx, {
    title: s.text('page.title'),
    description: s.text('page.description'),
    redirect: d.code === DEFAULT_LANG ? redirectScript(d.languages) : '',
    script: 'boot.js',
    jsonld: homeJsonLd(d.code, s),
    body: HomeBody(ctx, rateValue),
  });
}
