// Entry point of the home page. Loads the English dictionary and the page's
// locale (from <html lang>), then app.js. The WebAssembly engine is not
// loaded here: app.ts fetches it once the page is idle, or when the first
// analysis needs it, so the page itself renders and responds without it.

import { setEnglish, setLocale, DEFAULT_LANG, LANGUAGES, type Dictionary } from './i18n.ts';

const code = (document.documentElement.lang || DEFAULT_LANG).toLowerCase().split('-')[0];
const localeUrl = (c: string) => new URL(`../locales/${c}.json`, import.meta.url);

async function fetchJson(url: URL): Promise<Dictionary> {
  // 'no-cache' revalidates with the server (a 304 when unchanged). The old
  // 'force-cache' reused a stale dictionary after a deploy, so new keys
  // showed up as raw key names (ui.plan.free.name) for returning visitors.
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const [en, strings] = await Promise.all([
  fetchJson(localeUrl('en')),
  code !== DEFAULT_LANG && Object.hasOwn(LANGUAGES, code)
    ? fetchJson(localeUrl(code)).catch((err: unknown) => {
      console.warn(`Locale "${code}" could not be loaded; falling back to English.`, err);
      return {};
    })
    : Promise.resolve(null),
]);
setEnglish(en);
if (strings) setLocale(code, strings);

await import('./app.ts');
