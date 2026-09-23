// Translation for the app, fetched at runtime.
//
// Content JSON carries English and a key: { "key": "nav.overview", "text":
// "Dashboard" }. The key wins when the catalogue has it, the English in the
// file is the fallback, so an untranslated language reads correctly rather
// than showing a key. The catalogue is a .po file fetched over the network,
// which means adding a language is uploading one file.

import { parsePo, type Catalogue } from './po.ts';

const catalogue: Catalogue = new Map();
let current = 'en';

/** The language to use: ?lang=, then the stored choice, then the browser. */
export function pickLanguage(available: string[]): string {
  const asked = new URLSearchParams(location.search).get('lang');
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('lang');
  } catch {
    // A private window with storage blocked still gets a language.
  }
  const browser = (navigator.languages ?? [navigator.language]).map((l) => String(l).toLowerCase().split('-')[0]);
  for (const candidate of [asked, stored, ...browser]) {
    if (candidate && available.includes(candidate)) return candidate;
  }
  return 'en';
}

/** Load `<base>/<lang>.po`. A missing file leaves the English in the JSON. */
export async function loadCatalogue(base: string, lang: string): Promise<void> {
  current = lang;
  catalogue.clear();
  if (lang === 'en') return;
  try {
    const res = await fetch(`${base}/${lang}.po`, { headers: { accept: 'text/plain' } });
    if (!res.ok) return;
    for (const [k, v] of parsePo(await res.text())) catalogue.set(k, v);
  } catch {
    // Offline or blocked: the English text in the content files still reads.
  }
}

export const language = (): string => current;

/**
 * The translation for `key`, or `fallback` (the English in the content file),
 * with `{name}` placeholders replaced.
 */
export function t(key: string | undefined, fallback: string, params: Record<string, string | number> = {}): string {
  const text = (key && catalogue.get(key)) || fallback || '';
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** Shorthand for content nodes shaped { key, text } or { key, label }. */
export function tx(node: { key?: string; text?: string; label?: string; title?: string } | undefined, params?: Record<string, string | number>): string {
  if (!node) return '';
  return t(node.key, node.text ?? node.label ?? node.title ?? '', params);
}
