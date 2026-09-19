// Static server for the accessibility runs plus mock origins that answer
// /robots.txt in every way the page has a state for. One Node process, one
// port per behaviour; every mock adds CORS headers so the page's direct
// fetch succeeds cross-origin.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { rootPath, sitePath } from './lib.mjs';

export const PORTS = { site: 8877, worst: 8890, notFound: 8891, serverError: 8892, html: 8893, empty: 8894, gone: 8895 };
export const WORST = readFileSync(join(rootPath, 'tests/a11y/fixtures/worst.robots.txt'), 'utf8');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.toml': 'application/toml' };

function mock(port, handler) {
  return http.createServer((req, res) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
    if (req.url.split('?')[0] !== '/robots.txt') {
      res.writeHead(404, cors);
      return res.end('not here');
    }
    const [status, headers, body] = handler();
    res.writeHead(status, { ...cors, ...headers });
    res.end(body);
  }).listen(port, '127.0.0.1');
}

/** The site folder on PORTS.site plus the mock origins; `site` defaults to _site/. */
export function startServers(site = sitePath) {
  const servers = [];
  servers.push(http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(WORST);
    }
    if (p.endsWith('/')) p += 'index.html';
    const file = join(site, p);
    if (!file.startsWith(site) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(PORTS.site, '127.0.0.1'));
  servers.push(mock(PORTS.worst, () => [200, { 'Content-Type': 'text/plain' }, WORST]));
  servers.push(mock(PORTS.notFound, () => [404, { 'Content-Type': 'text/html' }, '<html><body>nope</body></html>']));
  servers.push(mock(PORTS.gone, () => [410, { 'Content-Type': 'text/plain' }, 'gone']));
  servers.push(mock(PORTS.serverError, () => [503, { 'Content-Type': 'text/plain' }, 'down']));
  servers.push(mock(PORTS.html, () => [200, { 'Content-Type': 'text/html; charset=utf-8' }, '<!DOCTYPE html><html><body><h1>Soft 404</h1></body></html>']));
  servers.push(mock(PORTS.empty, () => [200, { 'Content-Type': 'text/plain' }, '']));
  return { close: () => servers.forEach((s) => s.close()) };
}

/**
 * Responses for the proxy, keyed by the `ua` query parameter, so the access
 * check renders every row state without touching the real worker.
 */
export function mockProxy(url) {
  const u = new URL(url);
  const target = u.searchParams.get('url') || '';
  const ua = u.searchParams.get('ua') || '';
  const json = (status, body) => ({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  if (target.includes(':' + PORTS.notFound)) return json(200, { robotsUrl: target, finalUrl: target, redirects: [], redirectLimit: false, status: 404, statusText: 'Not Found', contentType: 'text/html', bytes: 4, truncated: false, text: 'nope', durationMs: 12 });
  if (target.includes('loop.invalid')) return json(200, { robotsUrl: target, finalUrl: 'https://loop.invalid/step6', redirects: [1, 2, 3, 4, 5, 6].map((i) => ({ from: `https://loop.invalid/step${i - 1}`, status: 301, to: `https://loop.invalid/step${i}` })), redirectLimit: true, status: 301, statusText: 'Moved', contentType: '', bytes: 0, truncated: false, text: '', durationMs: 40 });
  if (target.includes('moved.invalid')) return json(200, { robotsUrl: target, finalUrl: 'https://elsewhere.invalid/robots.txt', redirects: [{ from: target, status: 301, to: 'https://elsewhere.invalid/robots.txt' }], redirectLimit: false, status: 200, statusText: 'OK', contentType: 'text/plain', bytes: WORST.length, truncated: true, text: WORST, durationMs: 40 });
  if (/GPTBot/i.test(ua)) return json(200, { robotsUrl: target, finalUrl: target, redirects: [], redirectLimit: false, status: 403, statusText: 'Forbidden', contentType: 'text/html', bytes: 9, truncated: false, text: 'forbidden', durationMs: 5 });
  if (/ClaudeBot/i.test(ua)) return json(200, { robotsUrl: target, finalUrl: target, redirects: [], redirectLimit: false, status: 200, statusText: 'OK', contentType: 'text/plain', bytes: 20, truncated: false, text: 'User-agent: *\nDisallow: /', durationMs: 7 });
  if (/CCBot/i.test(ua)) return json(429, { error: 'Too many requests' });
  if (/Bytespider/i.test(ua)) return json(502, { error: 'Could not reach the site' });
  return json(200, { robotsUrl: target, finalUrl: target, redirects: [], redirectLimit: false, status: 200, statusText: 'OK', contentType: 'text/plain', bytes: WORST.length, truncated: false, text: WORST, durationMs: 9 });
}
