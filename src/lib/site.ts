// Build-time helpers shared by the Eleventy templates and components:
// dictionaries, languages, URLs, escaping, and the head snippets (hreflang,
// language menu, root redirect, analytics, structured data).

import { readFileSync, readdirSync } from 'node:fs';
import { LANGUAGES, DEFAULT_LANG, type Dictionary, type Value } from '../client/i18n.ts';
import { SITE_URL, LINKS, ANALYTICS_ID } from '../client/config.ts';

const ROOT = new URL('../../', import.meta.url);
// The engine repository, carried as a submodule: dictionaries, the default
// configuration, the report schema, the example file and the tracking data.
const ENGINE = new URL('engine/', ROOT);
const readEngineJson = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, ENGINE), 'utf8'));

export { LANGUAGES, DEFAULT_LANG, SITE_URL, LINKS };

// ---------------------------------------------------------------- dictionaries

/** Every locale dictionary keyed by code (generated from po/ by tools/i18n.ts). */
export function loadLocales(): Record<string, Dictionary> {
  const dicts: Record<string, Dictionary> = {};
  for (const code of Object.keys(LANGUAGES)) {
    try {
      dicts[code] = readEngineJson(`locales/${code}.json`) as Dictionary;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      dicts[code] = {};
    }
  }
  return dicts;
}

/** Codes whose dictionary has every page.* string, in LANGUAGES order. */
export function activeLanguages(dicts: Record<string, Dictionary>): string[] {
  const pageKeys = Object.keys(dicts[DEFAULT_LANG]).filter((k) => k.startsWith('page.'));
  return Object.keys(LANGUAGES).filter((code) => code === DEFAULT_LANG || pageKeys.every((k) => Object.hasOwn(dicts[code] || {}, k)));
}

export const escapeHtml = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Figures from the tracking data, so the copy states real numbers. */
/**
 * The domains whose robots.txt changed most recently, newest first.
 *
 * The tracking run rewrites a domain's snapshot only when the file changed, so
 * `fetched_at` in its meta.json is the day of its last change. That makes this
 * real data rather than copy, which is the rule for every number on the page: no
 * invented "large fashion retailer", just the sites and the days.
 */
export function recentChanges(limit = 4): { domain: string; iso: string }[] {
  const dir = new URL('data/famous-100/', ENGINE);
  let names: string[];
  try {
    names = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
  const found: { domain: string; iso: string }[] = [];
  for (const domain of names) {
    try {
      const meta = JSON.parse(readFileSync(new URL(`${domain}/meta.json`, dir), 'utf8')) as { fetched_at?: string };
      if (meta.fetched_at) found.push({ domain, iso: meta.fetched_at });
    } catch {
      // a domain with no snapshot yet
    }
  }
  return found.sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, limit);
}

export function trackingFigures(): { tracked: number; gptbotBlocked: number | null } {
  const tracked = (readEngineJson('config/famous-100.json') as unknown[]).length;
  let gptbotBlocked: number | null = null;
  try {
    const board = readFileSync(new URL('data/famous-100/README.md', ENGINE), 'utf8');
    const m = board.match(/^\| GPTBot \| \d+ \((\d+)%\)/m);
    if (m) gptbotBlocked = Number(m[1]);
  } catch {
    // no leaderboard yet
  }
  return { tracked, gptbotBlocked };
}

/**
 * Page-side lookups for one language: `e(key)` escaped, `raw(key)` as HTML
 * (the few page.* values with inline markup). Current language first, then
 * English; `{tracked}` in a value becomes the number of tracked domains.
 */
export interface Strings {
  e: (key: string) => string;
  raw: (key: string) => string;
  text: (key: string) => string;
}

export function strings(dicts: Record<string, Dictionary>, lang: string, tracked: number): Strings {
  const dict = dicts[lang] || {};
  const en = dicts[DEFAULT_LANG];
  const lookup = (key: string): string => {
    const value: Value | undefined = Object.hasOwn(dict, key) ? dict[key] : en[key];
    if (value === undefined) throw new Error(`Template key "${key}" is not in the dictionary`);
    if (typeof value !== 'string') throw new Error(`Template key "${key}" is a plural`);
    return value.replace('{tracked}', String(tracked));
  };
  return { e: (key) => escapeHtml(lookup(key)), raw: lookup, text: lookup };
}

// ---------------------------------------------------------------- URLs

/** Absolute URL of a site path ("/de/" -> "https://sus.bot/de/"). */
export const absolute = (path: string): string => SITE_URL + path.replace(/^\//, '');

/** Relative link between two site directory paths ("/de/about/" -> "/de/" is "../"). */
export function relative(from: string, to: string): string {
  const a = from.split('/').filter(Boolean);
  const b = to.split('/').filter(Boolean);
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) common++;
  // A link to the page itself steps out and back in ("../de/" on /de/), as
  // the language menu always has; only the root links to itself as "./".
  if (common === a.length && common === b.length && common > 0) common--;
  const rest = b.slice(common).map((seg) => `${seg}/`).join('');
  const link = '../'.repeat(a.length - common) + rest;
  return link === '' ? './' : link;
}

/** Prefix for site assets from a page path: "" at the root, "../" one level down. */
export const assetsFor = (path: string): string => '../'.repeat(path.split('/').filter(Boolean).length);

/** The home page path of a language. */
export const homePath = (code: string): string => (code === DEFAULT_LANG ? '/' : `/${code}/`);

// ---------------------------------------------------------------- head and header snippets

/** A page and the versions of it in other languages, by language code. */
export type Alternates = Record<string, string>;

export function hreflangLinks(alternates: Alternates, active: string[]): string {
  const codes = active.filter((c) => Object.hasOwn(alternates, c));
  const lines = codes.map((code) => `  <link rel="alternate" hreflang="${code}" href="${absolute(alternates[code])}">`);
  const fallback = alternates[DEFAULT_LANG] ?? alternates[codes[0]];
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${absolute(fallback)}">`);
  return lines.join('\n');
}

/**
 * The language switcher: one crawlable link per language, to this page in
 * that language when it exists and to that language's home page otherwise.
 */
export function langMenu(code: string, path: string, active: string[], alternates: Alternates, label: string): string {
  const items = active
    .map((target) => {
      const current = target === code ? ' aria-current="true"' : '';
      const href = relative(path, alternates[target] ?? homePath(target));
      return `            <li><a href="${href}" hreflang="${target}" lang="${target}" data-lang="${target}"${current}>${escapeHtml(LANGUAGES[target])}</a></li>`;
    })
    .join('\n');
  return [
    `          <details class="lang-menu">`,
    // The code, not the language's name: "EN" instead of "English" keeps the
    // header on one line, and the menu it opens lists every language in full.
    // The accessible name stays "Language", as it was.
    `            <summary aria-label="${escapeHtml(label)}"><span lang="${code}">${escapeHtml(code.toUpperCase())}</span></summary>`,
    `            <ul class="lang-menu__list">`,
    items,
    `            </ul>`,
    `          </details>`,
  ].join('\n');
}

/**
 * Root-only: send first-time visitors to their browser language once. A
 * stored choice (set by the switcher, or by landing on a language page)
 * wins. Runs before stylesheets are requested so the hop is cheap.
 */
export function redirectScript(active: string[]): string {
  const codes = active.filter((c) => c !== DEFAULT_LANG);
  return `<script>
    // Content negotiation substitute: GitHub Pages cannot read Accept-Language.
    try {
      var L = ${JSON.stringify(codes)};
      var pick = localStorage.getItem('lang');
      if (!pick || (pick !== 'en' && L.indexOf(pick) === -1)) {
        pick = null;
        (navigator.languages || [navigator.language]).some(function (l) {
          var p = String(l || '').toLowerCase().split('-')[0];
          if (p === 'en') { pick = 'en'; return true; }
          if (L.indexOf(p) !== -1) { pick = p; return true; }
          return false;
        });
      }
      if (pick && pick !== 'en') {
        window.susRedirect = true;
        location.replace(pick + '/' + location.search + location.hash);
      }
    } catch (e) {}
  </script>
  `;
}

/**
 * The Google tag (gtag.js), which does nothing at all until a visitor says yes.
 *
 * Analytics is not needed to check a robots.txt, so under the ePrivacy rules it
 * needs prior consent: no cookie, no request to Google, no page view before the
 * choice. That is why `js` and `config` are inside susLoadAnalytics rather than
 * queued here, since `config` is what sends the first page view. Consent Mode is
 * set to denied on the first line of the queue, so any later call is refused by
 * the tag itself even if this ordering were ever broken.
 *
 * A granted choice is applied by src/client/components/consent.ts on the next
 * visit too, which is why gtag.js still loads late rather than in the head: it
 * is about 175 KB and the page does not wait for it. On the root page the
 * language redirect sets window.susRedirect, so a visitor who is sent on to
 * their language page is counted once, on that page.
 *
 * `page_location` is set to the origin and path only, before anything is sent.
 * The page puts the address being checked in the query string (`?url=`), and
 * that is the visitor's business: without this, every domain anyone checked
 * would arrive in the analytics property as a page path. `gtag` is put on
 * window so src/client/track.ts can reach it from a module.
 */
export function analyticsTag(): string {
  if (!ANALYTICS_ID) return '';
  const id = JSON.stringify(ANALYTICS_ID);
  const src = JSON.stringify(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}`);
  return `<!-- Google tag (gtag.js). Nothing is requested or sent before consent. -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    // Consent Mode, denied by default: whatever runs later, this is on the queue
    // first, so a mistake elsewhere cannot turn into tracking without a choice.
    gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('set', { page_location: location.origin + location.pathname });
    // Called by src/client/components/consent.ts, and only after "yes". Loading
    // gtag.js and the page view both live in here, so a visitor who refuses or
    // never answers causes no request to Google at all.
    window.susLoadAnalytics = function () {
      if (window.susRedirect || window.susAnalyticsLoaded) return;
      window.susAnalyticsLoaded = true;
      gtag('consent', 'update', { analytics_storage: 'granted' });
      gtag('js', new Date());
      gtag('config', ${id});
      var s = document.createElement('script');
      s.async = true;
      s.src = ${src};
      document.head.appendChild(s);
    };
  </script>
`;
}

/**
 * Structured data for the home page: a free web application published by
 * Sitefig, in this language. Nothing beyond what the page shows.
 */
export function homeJsonLd(code: string, s: Strings): string {
  const url = absolute(homePath(code));
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}#app`,
        name: 'sus.bot',
        url,
        description: s.text('page.description'),
        inLanguage: code,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (runs in the browser)',
        browserRequirements: 'Requires JavaScript and WebAssembly',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        featureList: [s.text('page.agents'), s.text('page.tester'), s.text('page.access'), s.text('page.security'), s.text('page.recon')],
        publisher: { '@id': 'https://sitefig.eu/#org' },
        sameAs: LINKS.repo,
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#page`,
        url,
        name: s.text('page.title'),
        description: s.text('page.description'),
        inLanguage: code,
        mainEntity: { '@id': `${SITE_URL}#app` },
        publisher: { '@id': 'https://sitefig.eu/#org' },
      },
      { '@type': 'Organization', '@id': 'https://sitefig.eu/#org', name: 'Sitefig', url: 'https://sitefig.eu/' },
    ],
  });
}

/** Structured data for a content page: a WebPage published by Sitefig. */
export function pageJsonLd(code: string, path: string, title: string, description: string): string {
  const url = absolute(path);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: title, description, inLanguage: code, isPartOf: { '@id': `${SITE_URL}#app` }, publisher: { '@id': 'https://sitefig.eu/#org' } },
      { '@type': 'Organization', '@id': 'https://sitefig.eu/#org', name: 'Sitefig', url: 'https://sitefig.eu/' },
    ],
  });
}
