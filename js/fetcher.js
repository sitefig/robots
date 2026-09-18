// Fetch layer. The only module that calls fetch().
// Strategy: direct cross-origin fetch first (works when the site sends CORS
// headers), then the Cloudflare Worker proxy, which can also set User-Agent.

import { WORKER_URL, proxyConfigured, DIRECT_TIMEOUT_MS, PROXY_TIMEOUT_MS, MAX_BYTES } from './config.js';
import { t } from './i18n.js';

export class FetchError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'FetchError';
    this.code = code;
  }
}

/** Turn whatever the user typed into { origin, robotsUrl }. */
export function normaliseSiteUrl(input) {
  let s = (input || '').trim();
  if (!s) throw new FetchError('empty', t('fetch.error.empty'));
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;

  let u;
  try {
    u = new URL(s);
  } catch {
    throw new FetchError('invalid-url', t('fetch.error.invalidUrl', { input: input.trim() }));
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new FetchError('invalid-url', t('fetch.error.unsupportedProtocol'));
  }
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') {
    throw new FetchError('invalid-url', t('fetch.error.notHostname', { host: u.hostname }));
  }
  return { origin: u.origin, robotsUrl: `${u.origin}/robots.txt` };
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/** Read a Response body as UTF-8 text, stopping after `max` bytes. */
async function readCapped(res, max) {
  if (!res.body) {
    const text = await res.text();
    return { text: text.slice(0, max), bytes: text.length, truncated: text.length > max };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let bytes = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > max) {
      const keep = value.byteLength - (bytes - max);
      text += decoder.decode(value.subarray(0, keep), { stream: true });
      truncated = true;
      bytes = max;
      reader.cancel().catch(() => {});
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { text, bytes, truncated };
}

export async function fetchDirect(robotsUrl) {
  const { signal, clear } = timeoutSignal(DIRECT_TIMEOUT_MS);
  const started = performance.now();
  let res;
  try {
    res = await fetch(robotsUrl, { mode: 'cors', redirect: 'follow', cache: 'no-store', signal });
  } catch (err) {
    clear();
    if (err.name === 'AbortError') throw new FetchError('timeout', t('fetch.error.directTimeout'), err);
    throw new FetchError('cors', t('fetch.error.cors'), err);
  }
  try {
    const body = await readCapped(res, MAX_BYTES);
    return {
      source: 'direct',
      robotsUrl,
      finalUrl: res.url || robotsUrl,
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get('content-type') || '',
      userAgent: null,
      durationMs: performance.now() - started,
      ...body,
    };
  } finally {
    clear();
  }
}

export async function fetchViaProxy(robotsUrl, userAgent = null) {
  if (!proxyConfigured()) {
    throw new FetchError('no-proxy', t('fetch.error.noProxy'));
  }
  const url = new URL(WORKER_URL);
  url.searchParams.set('url', robotsUrl);
  if (userAgent) url.searchParams.set('ua', userAgent);

  const { signal, clear } = timeoutSignal(PROXY_TIMEOUT_MS);
  try {
    let res;
    try {
      res = await fetch(url, { signal });
    } catch (err) {
      if (err.name === 'AbortError') throw new FetchError('timeout', t('fetch.error.proxyTimeout'), err);
      throw new FetchError('proxy', t('fetch.error.proxyUnreachable'), err);
    }
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new FetchError('proxy', t('fetch.error.proxyUnreadable', { status: res.status }), err);
    }
    if (!res.ok) {
      // The worker's own messages are English; map the common statuses and
      // pass the rest through as a detail.
      const message =
        res.status === 429 ? t('fetch.error.rateLimited')
        : res.status === 503 ? t('fetch.error.paused')
        : res.status === 403 ? t('fetch.error.originRefused')
        : t('fetch.error.proxy', { status: res.status, detail: data.error || '' }, ).trim();
      const err = new FetchError(res.status === 429 ? 'rate-limited' : 'proxy', message);
      err.status = res.status;
      throw err;
    }
    return { source: 'proxy', ...data };
  } finally {
    clear();
  }
}

/**
 * Fetch a site's robots.txt, direct first then via proxy.
 * @param {string} input what the user typed
 * @param {{ onAttempt?: (phase: 'direct'|'proxy', previousError?: FetchError) => void }} opts
 */
export async function fetchRobots(input, { onAttempt } = {}) {
  const { origin, robotsUrl } = normaliseSiteUrl(input);

  onAttempt?.('direct');
  let directError;
  try {
    return { origin, ...(await fetchDirect(robotsUrl)) };
  } catch (err) {
    directError = err;
  }

  if (!proxyConfigured()) {
    throw new FetchError('cors', t('fetch.error.noProxyFallback', { reason: directError.message }), directError);
  }

  onAttempt?.('proxy', directError);
  try {
    return { origin, ...(await fetchViaProxy(robotsUrl)) };
  } catch (err) {
    throw new FetchError(err.code || 'proxy', t('fetch.error.couldNotFetch', { url: robotsUrl, reason: err.message }), err);
  }
}
