// The site is built by Eleventy from TypeScript components (src/site,
// src/components). These tests run the real build in memory and check the
// invariants of the output, then render the Markdown layout and the sitemap
// with made-up content pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Eleventy from '@11ty/eleventy';
import { loadLocales, activeLanguages, trackingFigures } from '../src/lib/site.ts';
import { render as renderHome } from '../src/site/index.11ty.ts';
import { render as renderLayout } from '../src/site/_includes/page.11ty.ts';
import { render as renderSitemap } from '../src/site/sitemap.11ty.ts';
import { LANGUAGES, DEFAULT_LANG } from '../src/client/i18n.ts';
import { SITE_URL } from '../src/client/config.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const eleventy = new Eleventy(`${ROOT}src/site`, `${ROOT}_site`, { configPath: `${ROOT}eleventy.config.ts`, quietMode: true });
const built = await eleventy.toJSON();
const files = Object.fromEntries(built.map((p) => [p.outputPath.replace(/^.*?_site\//, ''), p.content]));
const dicts = loadLocales();
const active = activeLanguages(dicts);
const figures = trackingFigures();

test('all 24 EU languages have a home page', () => {
  assert.deepEqual(active, Object.keys(LANGUAGES));
  for (const code of active) assert.ok(files[code === DEFAULT_LANG ? 'index.html' : `${code}/index.html`], code);
});

test('root page is English and carries the redirect; language pages do not redirect', () => {
  const root = files['index.html'];
  assert.ok(root.includes('<html lang="en">'));
  assert.ok(root.includes('location.replace('));
  assert.ok(root.includes('href="css/site.css"'));
  assert.ok(root.includes('src="js/boot.js"'));
  for (const code of active.filter((c) => c !== DEFAULT_LANG)) {
    const page = files[`${code}/index.html`];
    assert.ok(page.includes(`<html lang="${code}">`), code);
    assert.ok(!page.includes('location.replace('), `${code} must not redirect`);
    assert.ok(page.includes('href="../css/site.css"'), code);
    assert.ok(page.includes('src="../js/boot.js"'), code);
    assert.ok(page.includes('href="../" hreflang="en"'), `${code} links back to English`);
    assert.ok(page.includes(`<link rel="canonical" href="${SITE_URL}${code}/">`), code);
  }
});

test('every home page lists every language as hreflang alternate plus x-default', () => {
  for (const [rel, page] of Object.entries(files)) {
    if (!rel.endsWith('.html')) continue;
    for (const code of active) {
      const href = code === DEFAULT_LANG ? SITE_URL : `${SITE_URL}${code}/`;
      assert.ok(page.includes(`<link rel="alternate" hreflang="${code}" href="${href}">`), `${rel} lacks hreflang ${code}`);
    }
    assert.ok(page.includes(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}">`), rel);
    for (const code of active) assert.ok(page.includes(`data-lang="${code}"`), `${rel} switcher lacks ${code}`);
    assert.equal((page.match(/aria-current="true"/g) || []).length, 1, rel);
  }
});

test('pages are translated and contain no unresolved placeholders', () => {
  for (const [rel, page] of Object.entries(files)) assert.ok(!/\$\{|\{\{|\{tracked\}/.test(page), `${rel} has an unresolved placeholder`);
  assert.ok(files['de/index.html'].includes(`<title>${dicts.de['page.title']}</title>`));
  assert.ok(files['de/index.html'].includes(dicts.de['page.analyse']));
});

test('sitemap lists every home page with all its alternates', () => {
  const xml = files['sitemap.xml'];
  for (const code of active) assert.ok(xml.includes(`<loc>${code === DEFAULT_LANG ? SITE_URL : `${SITE_URL}${code}/`}</loc>`), code);
  assert.equal((xml.match(/<url>/g) || []).length, active.length);
  assert.equal((xml.match(/hreflang="x-default"/g) || []).length, active.length);
});

test('components escape dictionary text but keep page HTML raw', () => {
  const page = renderHome({ code: 'en', dicts: { ...dicts, en: { ...dicts.en, 'page.verdict': 'A & B <x>', 'page.intro': '<code>x</code>' } }, languages: active, figures });
  assert.ok(page.includes('A &amp; B &lt;x&gt;'));
  assert.ok(page.includes('<code>x</code>'));
});

// ---------------------------------------------------------------- Markdown pages

const item = (url, data = {}) => ({ url, data: { page: { url, inputPath: '' }, ...data } });
const homes = active.map((c) => item(c === DEFAULT_LANG ? '/' : `/${c}/`, { lang: c, translationKey: 'home' }));
const contentPages = [item('/about/', { title: 'About' }), item('/de/about/', { title: 'Über' }), item('/guide/', { title: 'Guide' })];
const all = [...homes, ...contentPages];

test('the Markdown layout wraps content in the site frame, in the page language', () => {
  const html = renderLayout({ dicts, languages: active, figures, title: 'Über', content: '<p>Hallo</p>', collections: { all }, page: { url: '/de/about/', inputPath: 'src/site/de/about.md' } });
  assert.ok(html.includes('<html lang="de">'), 'language from the folder');
  assert.ok(html.includes('<title>Über | sus.bot</title>'));
  assert.ok(html.includes('<p>Hallo</p>'));
  assert.ok(html.includes('src="../../js/page.js"'), 'content pages load the small script');
  assert.ok(html.includes('href="../../css/site.css"'));
  assert.ok(html.includes(`<link rel="alternate" hreflang="en" href="${SITE_URL}about/">`), 'links its English version');
  assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}about/">`));
  assert.ok(html.includes('<a href="../#pricing">'), 'section links go to the German home page');
  assert.ok(html.includes('href="../../about/" hreflang="en"'), 'switcher goes to the English page');
  assert.ok(html.includes('href="../../fr/" hreflang="fr"'), 'switcher falls back to the French home page');
  assert.ok(html.includes(dicts.de['page.skip']), 'chrome in German');
});

test('the sitemap loops over every page and groups translations', () => {
  const xml = renderSitemap({ collections: { all: [...all, item('/feed.xml'), item('/draft/', { sitemap: false })] } });
  assert.equal((xml.match(/<url>/g) || []).length, active.length + 3);
  assert.ok(xml.includes(`<loc>${SITE_URL}about/</loc>`));
  assert.ok(xml.includes(`<loc>${SITE_URL}de/about/</loc>`));
  const about = xml.split('<url>').find((b) => b.includes(`<loc>${SITE_URL}de/about/</loc>`));
  assert.ok(about.includes(`hreflang="en" href="${SITE_URL}about/"`) && about.includes(`hreflang="x-default" href="${SITE_URL}about/"`));
  const guide = xml.split('<url>').find((b) => b.includes(`<loc>${SITE_URL}guide/</loc>`));
  assert.equal((guide.match(/hreflang=/g) || []).length, 2, 'a page without translations lists itself and x-default');
  assert.ok(!xml.includes('draft') && !xml.includes('feed.xml'));
});
