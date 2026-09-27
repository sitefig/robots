// What a visitor pastes into the field, and what it has to become. Nobody types
// a hostname: they paste the address bar, a link out of an email with the angle
// brackets still on it, a mailto: from a contact page, or the robots.txt itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setEnglish } from '../src/client/i18n.ts';
import { normaliseSiteUrl, FetchError } from '../src/client/fetcher.ts';

setEnglish(JSON.parse(readFileSync(new URL('../engine/locales/en.json', import.meta.url), 'utf8')));

const robots = (input) => normaliseSiteUrl(input).robotsUrl;

test('a bare domain, with or without www', () => {
  assert.equal(robots('example.com'), 'https://example.com/robots.txt');
  assert.equal(robots('www.example.com'), 'https://www.example.com/robots.txt');
  assert.equal(robots('  example.com  '), 'https://example.com/robots.txt');
  assert.equal(robots('EXAMPLE.COM'), 'https://example.com/robots.txt');
});

test('anything after the host is dropped, so a page address works', () => {
  assert.equal(robots('https://example.com/shop/item?utm_source=x#top'), 'https://example.com/robots.txt');
  assert.equal(robots('example.com/some/deep/page'), 'https://example.com/robots.txt');
});

test('the robots.txt address itself is the obvious thing to paste', () => {
  assert.equal(robots('https://example.com/robots.txt'), 'https://example.com/robots.txt');
  assert.equal(robots('example.com/robots.txt'), 'https://example.com/robots.txt');
});

test('http is kept when it was asked for, and https is the default', () => {
  assert.equal(robots('http://example.com'), 'http://example.com/robots.txt');
  assert.equal(robots('example.com'), 'https://example.com/robots.txt');
});

test('any other scheme names a host too, so it is used rather than refused', () => {
  assert.equal(robots('ftp://example.com'), 'https://example.com/robots.txt');
  assert.equal(robots('ftp://files.example.com/pub/'), 'https://files.example.com/robots.txt');
  assert.equal(robots('//example.com'), 'https://example.com/robots.txt');
  assert.equal(robots('webcal://example.com/feed.ics'), 'https://example.com/robots.txt');
});

test('an address, typed or as a mailto:, names a site by its domain', () => {
  assert.equal(robots('mailto:someone@example.com'), 'https://example.com/robots.txt');
  assert.equal(robots('someone@example.com'), 'https://example.com/robots.txt');
  assert.equal(robots('first.last+tag@mail.example.com'), 'https://mail.example.com/robots.txt');
});

test('what mail clients and chat apps wrap a link in comes off', () => {
  assert.equal(robots('<https://example.com>'), 'https://example.com/robots.txt');
  assert.equal(robots('"example.com"'), 'https://example.com/robots.txt');
  assert.equal(robots("'example.com'"), 'https://example.com/robots.txt');
  assert.equal(robots('(https://example.com/page)'), 'https://example.com/robots.txt');
  assert.equal(robots('Have a look at example.com.'.split(' ').pop()), 'https://example.com/robots.txt');
});

test('a port survives, because it is part of the origin', () => {
  assert.equal(robots('http://localhost:8888'), 'http://localhost:8888/robots.txt');
  assert.equal(robots('example.com:8443/x'), 'https://example.com:8443/robots.txt');
});

test('credentials in a pasted URL are not carried into the request', () => {
  assert.equal(robots('https://user:secret@example.com/admin'), 'https://example.com/robots.txt');
});

test('what it still refuses, and why', () => {
  assert.throws(() => normaliseSiteUrl(''), (e) => e instanceof FetchError && e.code === 'empty');
  assert.throws(() => normaliseSiteUrl('   '), (e) => e.code === 'empty');
  // One word with no dot is a search, not a site.
  assert.throws(() => normaliseSiteUrl('robots'), (e) => e.code === 'invalid-url');
  assert.throws(() => normaliseSiteUrl('not a url'), (e) => e.code === 'invalid-url');
});

test('localhost is allowed, because the tests and local development need it', () => {
  assert.equal(robots('localhost'), 'https://localhost/robots.txt');
  assert.equal(robots('http://127.0.0.1:8877/'), 'http://127.0.0.1:8877/robots.txt');
});
