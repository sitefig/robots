// The app at /app/ is built from JSON that is uploaded without a build, so
// the JSON is what these tests check: every page names block types the
// renderer knows, every link points at a route that exists, every endpoint
// has a file behind it, and the translation catalogues parse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { blockTypes } from '../src/client/app/blocks.ts';
import { parsePo } from '../src/client/app/po.ts';
import { urlOf } from '../src/site/app.11ty.ts';

const root = new URL('../app/', import.meta.url);
const read = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
const pageFiles = readdirSync(new URL('pages/', root)).filter((f) => f.endsWith('.json'));
const pages = pageFiles.map((f) => ({ file: f, data: read(`pages/${f}`) }));
const nav = read('nav.json');
const routes = new Set(pages.map((p) => urlOf(p.data.route)));

test('every page has a route, a title, a key and blocks', () => {
  assert.ok(pages.length >= 20, 'the sitemap is covered');
  for (const { file, data } of pages) {
    assert.match(data.route, /^\/app\//, `${file}: route starts at /app/`);
    assert.ok(data.title && data.title.length < 60, `${file}: has a short title`);
    assert.match(data.key ?? '', /^page\./, `${file}: has a translation key`);
    assert.ok(Array.isArray(data.blocks) && data.blocks.length > 0, `${file}: has blocks`);
  }
});

test('routes are unique once parameters are mapped to a static path', () => {
  const urls = pages.map((p) => urlOf(p.data.route));
  assert.equal(new Set(urls).size, urls.length, 'no two pages want the same URL');
  assert.equal(urlOf('/app/incidents/:id/'), '/app/incidents/detail/');
  assert.equal(urlOf('/app/versions/:a...:b/'), '/app/versions/detail/');
});

test('every block names a type the renderer knows', () => {
  const known = new Set(blockTypes());
  for (const { file, data } of pages) {
    for (const block of data.blocks) {
      assert.ok(block.type, `${file}: a block with no type`);
      assert.ok(known.has(block.type), `${file}: no renderer for "${block.type}"`);
      assert.ok(block.key === undefined || /^(block|filter)\./.test(block.key), `${file}: odd block key ${block.key}`);
    }
  }
});

test('every internal link points at a page that exists', () => {
  const links = [];
  const walk = (node, where) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, where));
    if (!node || typeof node !== 'object') return;
    if (typeof node.href === 'string') links.push([where, node.href]);
    for (const value of Object.values(node)) walk(value, where);
  };
  walk(nav, 'nav.json');
  for (const { file, data } of pages) walk(data, file);
  assert.ok(links.length > 20, 'the pages link to each other');
  for (const [where, href] of links) {
    if (/^https?:|^#|^mailto:/.test(href)) continue;
    if (!href.startsWith('/app/')) continue;
    // Detail pages are reached with a query string, so strip it before looking.
    const clean = href.split('?')[0];
    const known = routes.has(clean) || clean === '/app/signout/';
    assert.ok(known, `${where}: ${href} has no page`);
  }
});

test('every endpoint a block fetches has a file behind it', () => {
  const endpoints = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.endpoint === 'string') endpoints.add(node.endpoint);
    for (const value of Object.values(node)) walk(value);
  };
  walk(nav);
  for (const { data } of pages) walk(data);
  assert.ok(endpoints.size >= 10, 'the app reads live data');
  for (const endpoint of endpoints) {
    assert.match(endpoint, /^\/app\/data\//, `${endpoint} is served from /app/data/`);
    const file = endpoint.replace('/app/', '');
    assert.ok(existsSync(new URL(file, root)), `${endpoint} has no file`);
  }
});

test('the translation catalogues parse, and English is the fallback', () => {
  const dir = new URL('i18n/', root);
  const files = readdirSync(dir).filter((f) => f.endsWith('.po'));
  assert.ok(files.includes('en.po'), 'English exists as the reference');
  for (const file of files) {
    const catalogue = parsePo(readFileSync(new URL(file, dir), 'utf8'));
    assert.ok(catalogue.size > 5, `${file} has entries`);
    for (const [key, value] of catalogue) {
      assert.match(key, /^[a-z][a-zA-Z0-9.]+$/, `${file}: odd key ${key}`);
      assert.ok(value.trim(), `${file}: ${key} is empty`);
    }
  }
  const de = parsePo(readFileSync(new URL('de.po', dir), 'utf8'));
  assert.equal(de.get('nav.overview'), 'Übersicht', 'a translated string survives the parser');
  assert.equal(de.get('nothing.here'), undefined, 'a missing key falls back to the English in the JSON');
});

test('the navigation is complete and points into the app', () => {
  assert.ok(nav.primary.length >= 7, 'every section of the app is reachable');
  for (const item of [...nav.primary, ...nav.account]) {
    assert.match(item.key ?? '', /^nav\./, `${item.text}: has a translation key`);
    assert.ok(item.text, 'has English to fall back to');
  }
  for (const [name, node] of Object.entries(nav.shell)) {
    assert.ok(node.key && node.text, `shell.${name} has a key and English`);
  }
});
