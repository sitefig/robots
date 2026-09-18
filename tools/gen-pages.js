#!/usr/bin/env node
// Renders the static pages: index.html (English, at the site root) and one
// <code>/index.html per language whose dictionary has every page.* string,
// plus sitemap.xml. Everything comes from tools/page.template.html and
// locales/*.json; run `npm run gen` after changing either and commit the
// output. tests/pages.test.js fails when the committed files are stale.
//
// Template syntax: {{key}} inserts an escaped dictionary value, {{{key}}} a
// raw one (only page.* values that contain HTML). The generator also fills
// lang, assets, canonical, hreflang, langMenu and redirect.
//
// No dependencies, no build step for the browser: the output is plain HTML.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LANGUAGES, DEFAULT_LANG } from '../js/i18n.js';
import { SITE_URL, LINKS, ANALYTICS_ID } from '../js/config.js';

const LOCALES = new URL('../locales/', import.meta.url);
const readLocale = (code) => JSON.parse(readFileSync(new URL(`${code}.json`, LOCALES), 'utf8'));
const en = readLocale('en');

const ROOT = new URL('../', import.meta.url);

/** Figures from the tracking data, so the marketing copy states real numbers. */
function trackingFigures() {
  const tracked = JSON.parse(readFileSync(new URL('config/famous-100.json', ROOT), 'utf8')).length;
  let gptbotBlocked = null;
  try {
    const board = readFileSync(new URL('data/famous-100/README.md', ROOT), 'utf8');
    const m = board.match(/^\| GPTBot \| \d+ \((\d+)%\)/m);
    if (m) gptbotBlocked = Number(m[1]);
  } catch {
    // no leaderboard yet
  }
  return { tracked, gptbotBlocked };
}
const FIGURES = trackingFigures();

/**
 * Structured data that describes what the page is: a free web application
 * published by Sitefig, in this language. Nothing beyond what the page shows.
 */
function jsonLd(code, dict) {
  const t = (k) => dict[k] ?? en[k];
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}#app`,
        name: 'sus.bot',
        url: pageUrl(code),
        description: t('page.description'),
        inLanguage: code,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (runs in the browser)',
        browserRequirements: 'Requires JavaScript and WebAssembly',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        featureList: [t('page.agents'), t('page.tester'), t('page.access'), t('page.security'), t('page.recon')],
        publisher: { '@id': 'https://sitefig.eu/#org' },
        sameAs: LINKS.repo,
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl(code)}#page`,
        url: pageUrl(code),
        name: t('page.title'),
        description: t('page.description'),
        inLanguage: code,
        mainEntity: { '@id': `${SITE_URL}#app` },
        publisher: { '@id': 'https://sitefig.eu/#org' },
      },
      { '@type': 'Organization', '@id': 'https://sitefig.eu/#org', name: 'Sitefig', url: 'https://sitefig.eu/' },
    ],
  });
}
const TEMPLATE = readFileSync(new URL('./page.template.html', import.meta.url), 'utf8');
const PAGE_KEYS = Object.keys(en).filter((k) => k.startsWith('page.'));

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Every locale dictionary keyed by code; a missing file counts as empty. */
export async function loadLocales() {
  const dicts = {};
  for (const code of Object.keys(LANGUAGES)) {
    try {
      dicts[code] = readLocale(code);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      dicts[code] = {};
    }
  }
  return dicts;
}

/** Codes whose dictionary can render a complete static page, in LANGUAGES order. */
export function activeLanguages(dicts) {
  return Object.keys(LANGUAGES).filter((code) => code === DEFAULT_LANG || PAGE_KEYS.every((k) => Object.hasOwn(dicts[code] || {}, k)));
}

const pageUrl = (code) => (code === DEFAULT_LANG ? SITE_URL : `${SITE_URL}${code}/`);

function hreflangLinks(active) {
  const lines = active.map((code) => `  <link rel="alternate" hreflang="${code}" href="${pageUrl(code)}">`);
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${SITE_URL}">`);
  return lines.join('\n');
}

function langMenu(code, active, dict) {
  const label = escapeHtml(dict['page.langLabel'] ?? en['page.langLabel']);
  const relative = (target) => (code === DEFAULT_LANG ? (target === DEFAULT_LANG ? './' : `${target}/`) : target === DEFAULT_LANG ? '../' : `../${target}/`);
  const items = active
    .map((target) => {
      const current = target === code ? ' aria-current="true"' : '';
      return `            <li><a href="${relative(target)}" hreflang="${target}" lang="${target}" data-lang="${target}"${current}>${escapeHtml(LANGUAGES[target])}</a></li>`;
    })
    .join('\n');
  return [
    `          <details class="lang-menu">`,
    `            <summary aria-label="${label}"><span lang="${code}">${escapeHtml(LANGUAGES[code])}</span></summary>`,
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
function redirectScript(active) {
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
 * The Google tag (gtag.js) as Google supplies it. On the root page the
 * language redirect runs first and sets window.susRedirect, so a visitor who
 * is sent on to their language page is counted once, on that page.
 */
function analyticsTag() {
  if (!ANALYTICS_ID) return '';
  const id = JSON.stringify(ANALYTICS_ID);
  return `<!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    if (!window.susRedirect) {
      gtag('js', new Date());
      gtag('config', ${id});
    }
  </script>
`;
}

/** Render one page. `dicts` is the full locale map from loadLocales(). */
export function renderPage(code, dicts) {
  const active = activeLanguages(dicts);
  const dict = dicts[code] || {};
  const root = code === DEFAULT_LANG;
  const special = {
    lang: code,
    assets: root ? '' : '../',
    canonical: pageUrl(code),
    hreflang: hreflangLinks(active),
    langMenu: langMenu(code, active, dict),
    redirect: root ? redirectScript(active) : '',
    jsonld: jsonLd(code, dict),
    analytics: analyticsTag(),
    repoUrl: LINKS.repo,
    galleryUrl: LINKS.gallery,
    diffsUrl: LINKS.diffs,
    blockRate: FIGURES.gptbotBlocked === null ? '' : (dict['page.aiWatch.rateValue'] ?? en['page.aiWatch.rateValue']).replace('{pct}', String(FIGURES.gptbotBlocked)).replace('{n}', String(FIGURES.tracked)),
  };
  // Dictionary values may carry the tracking figures as placeholders.
  const fill = (v) => String(v).replace('{tracked}', String(FIGURES.tracked));
  const lookup = (key) => {
    if (Object.hasOwn(special, key)) return special[key];
    if (Object.hasOwn(dict, key)) return fill(dict[key]);
    if (Object.hasOwn(en, key)) return fill(en[key]);
    throw new Error(`Template key "${key}" is not in the dictionary`);
  };
  return TEMPLATE.replace(/\{\{\{([a-zA-Z0-9_.]+)\}\}\}/g, (m, key) => lookup(key)).replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (m, key) => escapeHtml(lookup(key)));
}

export function renderSitemap(active) {
  const alternates = active.map((c) => `    <xhtml:link rel="alternate" hreflang="${c}" href="${pageUrl(c)}"/>`).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}"/>`).join('\n');
  const urls = active.map((c) => `  <url>\n    <loc>${pageUrl(c)}</loc>\n${alternates}\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

/** Every generated file as { relativePath: content }. */
export async function outputs() {
  const dicts = await loadLocales();
  const active = activeLanguages(dicts);
  const out = {};
  for (const code of active) out[code === DEFAULT_LANG ? 'index.html' : `${code}/index.html`] = renderPage(code, dicts);
  out['sitemap.xml'] = renderSitemap(active);
  return out;
}

async function main() {
  const files = await outputs();
  for (const [rel, content] of Object.entries(files)) {
    const target = new URL(rel, ROOT);
    mkdirSync(new URL('./', target), { recursive: true });
    const before = (() => {
      try {
        return readFileSync(target, 'utf8');
      } catch {
        return null;
      }
    })();
    if (before === content) continue;
    writeFileSync(target, content);
    console.log(`${before === null ? 'created' : 'updated'} ${rel}`);
  }
  console.log(`${Object.keys(files).length - 1} pages, sitemap.xml`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
