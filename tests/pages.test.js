// The static pages are generated from tools/page.template.html and the
// locale dictionaries. These tests fail when a committed page is stale (run
// `npm run gen`) or when the generator breaks an invariant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { outputs, loadLocales, activeLanguages, renderPage } from '../tools/gen-pages.js';
import { LANGUAGES, DEFAULT_LANG } from '../js/i18n.js';
import { SITE_URL } from '../js/config.js';

const ROOT = new URL('../', import.meta.url);
const files = await outputs();
const dicts = await loadLocales();
const active = activeLanguages(dicts);

test('every generated file on disk matches the generator', () => {
  for (const [rel, content] of Object.entries(files)) {
    const onDisk = readFileSync(new URL(rel, ROOT), 'utf8');
    assert.equal(onDisk, content, `${rel} is stale: run npm run gen`);
  }
});

test('all 24 EU languages have a page', () => {
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

test('every page lists every language as hreflang alternate plus x-default', () => {
  for (const [rel, page] of Object.entries(files)) {
    if (!rel.endsWith('.html')) continue;
    for (const code of active) {
      const href = code === DEFAULT_LANG ? SITE_URL : `${SITE_URL}${code}/`;
      assert.ok(page.includes(`<link rel="alternate" hreflang="${code}" href="${href}">`), `${rel} lacks hreflang ${code}`);
    }
    assert.ok(page.includes(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}">`), rel);
    // switcher: one crawlable link per language, the current one marked
    for (const code of active) assert.ok(page.includes(`data-lang="${code}"`), `${rel} switcher lacks ${code}`);
    assert.equal((page.match(/aria-current="true"/g) || []).length, 1, rel);
  }
});

test('pages contain no unresolved template keys and translated chrome', () => {
  for (const [rel, page] of Object.entries(files)) {
    assert.ok(!/\{\{/.test(page), `${rel} has an unresolved placeholder`);
  }
  assert.ok(files['de/index.html'].includes(`<title>${dicts.de['page.title']}</title>`));
  assert.ok(files['de/index.html'].includes(dicts.de['page.analyse']));
});

test('sitemap lists every page with alternates', () => {
  const xml = files['sitemap.xml'];
  for (const code of active) assert.ok(xml.includes(`<loc>${code === DEFAULT_LANG ? SITE_URL : `${SITE_URL}${code}/`}</loc>`), code);
  assert.equal((xml.match(/<url>/g) || []).length, active.length);
});

test('renderPage escapes dictionary text but keeps page HTML raw', () => {
  const page = renderPage('en', { ...dicts, en: { ...dicts.en, 'page.verdict': 'A & B <x>', 'page.intro': '<code>x</code>' } });
  assert.ok(page.includes('A &amp; B &lt;x&gt;'));
  assert.ok(page.includes('<code>x</code>'));
});
