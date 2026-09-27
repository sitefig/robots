// Fetch layer. The only module that calls fetch() for a robots.txt.
// Strategy: direct cross-origin fetch first (works when the site sends CORS
// headers), then the Cloudflare Worker proxy, which can also set User-Agent.

import { WORKER_URL, proxyConfigured, DIRECT_TIMEOUT_MS, PROXY_TIMEOUT_MS, MAX_BYTES } from './config.ts';
import { t } from './i18n.ts';
import type { Redirect } from './types.ts';

export class FetchError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'FetchError';
    this.code = code;
  }
}

/** A fetched robots.txt, from the browser or the proxy. */
export interface FetchResult {
  source: 'direct' | 'proxy';
  robotsUrl: string;
  finalUrl: string;
  status: number;
  statusText?: string;
  contentType?: string;
  userAgent?: string | null;
  durationMs: number;
  text: string;
  bytes: number;
  truncated: boolean;
  redirects?: Redirect[];
  redirectLimit?: boolean;
}

/** Turn whatever the user typed into { origin, robotsUrl }. */
/**
 * Whatever is on the clipboard, turned into one origin and its robots.txt.
 *
 * People do not paste hostnames. They paste the address bar, a link from an
 * email with angle brackets still round it, a marketing URL with a tracking
 * query, an `ftp://` address from an old document, a `mailto:` from a contact
 * page, or the robots.txt itself because that is what they were told to check.
 * Every one of those names a site, so every one of them is accepted: refusing
 * on a technicality when the intent is obvious is just rudeness.
 *
 * What survives from the input is the host, the port, and http when http was
 * asked for explicitly. Everything after the host is dropped, because the file
 * is only ever at the root, which is also why pasting the robots.txt URL itself
 * works out as the same request.
 */
export function normaliseSiteUrl(input: string): { origin: string; robotsUrl: string } {
  let s = (input || '').trim();
  // Wrapping a link is what mail clients and chat apps do to it.
  s = s.replace(/^[<("'`\[]+/, '').replace(/[>)"'`\]]+$/, '').trim();
  // A sentence's full stop or comma is not part of the address.
  s = s.replace(/[.,;:!?]+$/, '').trim();
  if (!s) throw new FetchError('empty', t('fetch.error.empty'));

  // An address, or a mailto: holding one, names a site by its domain.
  const email = s.match(/^(?:mailto:)?\s*[^\s@]+@([^\s@/?#]+)$/i);
  if (email) s = email[1];

  // Any other scheme is dropped rather than refused: ftp://, sftp://, webcal://
  // and the protocol-relative //host all name a host we can ask over https.
  // http:// is kept, because someone who typed it may mean a site with no TLS.
  const scheme = s.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  const keepHttp = Boolean(scheme) && scheme![1].toLowerCase() === 'http';
  if (scheme) s = s.slice(scheme[0].length);
  else s = s.replace(/^\/\//, '');
  // Credentials in a pasted URL belong to the person, not to us.
  s = s.replace(/^[^/@]*@/, '');
  s = `${keepHttp ? 'http' : 'https'}://${s}`;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new FetchError('invalid-url', t('fetch.error.invalidUrl', { input: input.trim() }));
  }
  if (!u.hostname || (!u.hostname.includes('.') && u.hostname !== 'localhost')) {
    throw new FetchError('invalid-url', t('fetch.error.notHostname', { host: u.hostname || input.trim() }));
  }
  return { origin: u.origin, robotsUrl: `${u.origin}/robots.txt` };
}

function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/** Read a Response body as UTF-8 text, stopping after `max` bytes. */
async function readCapped(res: Response, max: number): Promise<{ text: string; bytes: number; truncated: boolean }> {
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

const isAbort = (err: unknown): boolean => err instanceof Error && err.name === 'AbortError';

export async function fetchDirect(robotsUrl: string): Promise<FetchResult> {
  const { signal, clear } = timeoutSignal(DIRECT_TIMEOUT_MS);
  const started = performance.now();
  let res: Response;
  try {
    res = await fetch(robotsUrl, { mode: 'cors', redirect: 'follow', cache: 'no-store', signal });
  } catch (err) {
    clear();
    if (isAbort(err)) throw new FetchError('timeout', t('fetch.error.directTimeout'), err);
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

export async function fetchViaProxy(robotsUrl: string, userAgent: string | null = null): Promise<FetchResult> {
  if (!proxyConfigured()) {
    throw new FetchError('no-proxy', t('fetch.error.noProxy'));
  }
  const url = new URL(WORKER_URL);
  url.searchParams.set('url', robotsUrl);
  if (userAgent) url.searchParams.set('ua', userAgent);

  const { signal, clear } = timeoutSignal(PROXY_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(url, { signal });
    } catch (err) {
      if (isAbort(err)) throw new FetchError('timeout', t('fetch.error.proxyTimeout'), err);
      throw new FetchError('proxy', t('fetch.error.proxyUnreachable'), err);
    }
    // The worker's JSON: the fetch result without `source`, or { error }.
    let data: Omit<FetchResult, 'source'> & { error?: string };
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
        : t('fetch.error.proxy', { status: res.status, detail: data.error || '' }).trim();
      const err = new FetchError(res.status === 429 ? 'rate-limited' : 'proxy', message);
      err.status = res.status;
      throw err;
    }
    return { source: 'proxy', ...data };
  } finally {
    clear();
  }
}

/** Fetch a site's robots.txt, direct first then via proxy. */
export async function fetchRobots(
  input: string,
  { onAttempt }: { onAttempt?: (phase: 'direct' | 'proxy', previousError?: FetchError) => void } = {},
): Promise<FetchResult & { origin: string }> {
  const { origin, robotsUrl } = normaliseSiteUrl(input);

  onAttempt?.('direct');
  let directError: FetchError;
  try {
    return { origin, ...(await fetchDirect(robotsUrl)) };
  } catch (err) {
    directError = err as FetchError;
  }

  if (!proxyConfigured()) {
    throw new FetchError('cors', t('fetch.error.noProxyFallback', { reason: directError.message }), directError);
  }

  onAttempt?.('proxy', directError);
  try {
    return { origin, ...(await fetchViaProxy(robotsUrl)) };
  } catch (err) {
    const e = err as FetchError;
    throw new FetchError(e.code || 'proxy', t('fetch.error.couldNotFetch', { url: robotsUrl, reason: e.message }), e);
  }
}
