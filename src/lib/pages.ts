// How the build sees a page: its language and which other pages are its
// translations. Home pages set both; a Markdown page may set `lang` and
// `translationKey` in its front matter, and otherwise takes its language
// from its folder (src/site/de/about.md is German) and its path as key.

import { LANGUAGES, DEFAULT_LANG, type Alternates } from './site.ts';

export interface PageData {
  lang?: string;
  translationKey?: string;
  page: { url: string | false; inputPath: string };
  eleventyExcludeFromCollections?: boolean;
  sitemap?: boolean;
}

export function pageLang(data: PageData): string {
  if (data.lang && Object.hasOwn(LANGUAGES, data.lang)) return data.lang;
  const first = typeof data.page.url === 'string' ? data.page.url.split('/').filter(Boolean)[0] : undefined;
  return first && first !== DEFAULT_LANG && Object.hasOwn(LANGUAGES, first) ? first : DEFAULT_LANG;
}

/** Group key for translations: the front matter key, or the path without its language folder. */
export function translationKey(data: PageData): string {
  if (data.translationKey) return data.translationKey;
  const url = typeof data.page.url === 'string' ? data.page.url : '';
  const lang = pageLang(data);
  return lang === DEFAULT_LANG ? url : url.replace(new RegExp(`^/${lang}/`), '/');
}

interface CollectionItem {
  url: string | false;
  data: PageData;
}

/** Every HTML page of the site that belongs in the sitemap. */
export function sitePages(all: CollectionItem[]): CollectionItem[] {
  return all.filter((p) => typeof p.url === 'string' && p.url.endsWith('/') && p.data.sitemap !== false);
}

/** This page in each language it exists in, from the full collection. */
export function alternatesOf(data: PageData, all: CollectionItem[]): Alternates {
  const key = translationKey(data);
  const out: Alternates = {};
  for (const p of sitePages(all)) {
    if (translationKey(p.data) === key) out[pageLang(p.data)] = p.url as string;
  }
  return out;
}
