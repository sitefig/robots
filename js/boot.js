// Entry point of every page. Loads the English dictionary, the page's locale
// (from <html lang>) and the WebAssembly engine, then app.js. This and app.js
// are the only modules touching the DOM.

import { setEnglish, setLocale, DEFAULT_LANG, LANGUAGES } from './i18n.js';
import { loadEngine } from './engine.js';

const code = (document.documentElement.lang || DEFAULT_LANG).toLowerCase().split('-')[0];
const localeUrl = (c) => new URL(`../locales/${c}.json`, import.meta.url);

async function fetchJson(url) {
  // 'no-cache' revalidates with the server (a 304 when unchanged). The old
  // 'force-cache' reused a stale dictionary after a deploy, so new keys
  // showed up as raw key names (ui.plan.free.name) for returning visitors.
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const [en, strings] = await Promise.all([
  fetchJson(localeUrl('en')),
  code !== DEFAULT_LANG && Object.hasOwn(LANGUAGES, code) ? fetchJson(localeUrl(code)).catch((err) => {
    console.warn(`Locale "${code}" could not be loaded; falling back to English.`, err);
    return {};
  }) : Promise.resolve(null),
  loadEngine(),
]);
setEnglish(en);
if (strings) setLocale(code, strings);

await import('./app.js');
