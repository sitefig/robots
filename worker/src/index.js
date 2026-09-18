// Cloudflare Worker: fetches a site's robots.txt on behalf of the browser.
//
//   GET /?url=<site or robots.txt URL>[&ua=<User-Agent string>]
//
// Responds with JSON. HTTP 200 whenever the target answered at all (its own
// status code is in the body), 400 for a bad request, 403 for a disallowed
// Origin, 429 when rate limited, 502 when the target could not be reached.
//
// Future: this is where a fetched robots.txt gets recorded to a database
// (ctx.waitUntil(...) after the fetch, so it never delays the response).

const MAX_BYTES = 512 * 1024;
const MAX_UA_LENGTH = 400;
const FETCH_TIMEOUT_MS = 15000;
// RFC 9309 §2.3.1.2: crawlers follow at least five redirects, then treat the
// file as unavailable. Google treats that as a 404 (no restrictions).
const MAX_REDIRECTS = 5;
const DEFAULT_UA = 'Mozilla/5.0 (compatible; SitefigRobotsAnalyser/1.0; +https://sitefig.eu)';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = originAllowed(origin, env);
    const cors = corsHeaders(allowed ? origin : null);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, cors);
    if (!allowed) return json({ error: 'Origin not allowed' }, 403, cors);
    // Kill switch: set PAUSED=true in the Cloudflare dashboard to stop serving
    // without a deploy. The request still counts, but no subrequest is made.
    if (String(env.PAUSED).toLowerCase() === 'true') return json({ error: 'Proxy paused by the operator' }, 503, { ...cors, 'Retry-After': '3600' });

    // Advertise which limiters are active, so a missing binding is visible from outside.
    cors['X-Proxy-Limits'] = [env.PER_IP && 'per-ip', env.GLOBAL && 'global'].filter(Boolean).join(',') || 'none';

    const limited = await rateLimited(request, env);
    if (limited) return json({ error: limited.message }, 429, { ...cors, 'Retry-After': String(limited.retryAfter) });

    const target = new URL(request.url).searchParams.get('url');
    if (!target) return json({ error: 'Missing "url" parameter' }, 400, cors);

    let robotsUrl;
    try {
      robotsUrl = toRobotsUrl(target);
    } catch (err) {
      return json({ error: err.message }, 400, cors);
    }

    const ua = (new URL(request.url).searchParams.get('ua') || DEFAULT_UA).slice(0, MAX_UA_LENGTH);
    const started = Date.now();

    const headers = {
      'User-Agent': ua,
      Accept: 'text/plain,*/*;q=0.8',
      'Accept-Language': 'en',
    };
    const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const redirects = [];
    let redirectLimit = false;
    let url = robotsUrl;
    let res;

    // Follow redirects by hand so the chain is reported and the hop limit applies.
    for (;;) {
      try {
        res = await fetch(url, { headers, redirect: 'manual', cache: 'no-store', signal });
      } catch (err) {
        return json({ error: `Could not reach ${url}: ${err.message}`, robotsUrl, redirects }, 502, cors);
      }
      const location = res.headers.get('location');
      if (!(res.status >= 300 && res.status < 400 && location)) break;

      let next;
      try {
        next = new URL(location, url);
      } catch {
        break; // unusable Location header; report the 3xx as-is
      }
      if (next.protocol !== 'http:' && next.protocol !== 'https:') break;
      if (isBlockedHost(next.hostname)) {
        return json({ error: 'Redirect target host not allowed', robotsUrl, redirects }, 400, cors);
      }
      if (redirects.length >= MAX_REDIRECTS) {
        redirectLimit = true;
        break;
      }
      redirects.push({ from: url, status: res.status, to: next.href });
      res.body?.cancel().catch(() => {});
      url = next.href;
    }

    const body = redirectLimit ? { text: '', bytes: 0, truncated: false } : await readCapped(res.body, MAX_BYTES);

    return json(
      {
        robotsUrl,
        finalUrl: url,
        redirects,
        redirectLimit,
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type') || '',
        bytes: body.bytes,
        truncated: body.truncated,
        text: body.text,
        userAgent: ua,
        durationMs: Date.now() - started,
        fetchedAt: new Date().toISOString(),
      },
      200,
      cors,
    );
  },
};

/**
 * Rate limiting via the Workers rate-limit bindings declared in wrangler.toml.
 * Bindings are optional so `wrangler dev` without them still works.
 */
async function rateLimited(request, env) {
  if (env.PER_IP) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { success } = await env.PER_IP.limit({ key: ip });
    if (!success) return { message: 'Too many requests from your address. Try again in a minute.', retryAfter: 60 };
  }
  if (env.GLOBAL) {
    const { success } = await env.GLOBAL.limit({ key: 'all' });
    if (!success) return { message: 'The proxy is busy right now. Try again in a few seconds.', retryAfter: 10 };
  }
  return null;
}

function originAllowed(origin, env) {
  if (!origin) return false;
  const list = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin);
}

function corsHeaders(origin) {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

/** Validate the target and reduce it to origin + /robots.txt. */
function toRobotsUrl(target) {
  let u;
  try {
    u = new URL(target);
  } catch {
    throw new Error('Invalid URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http and https are supported');
  if (u.username || u.password) throw new Error('Credentials in URLs are not allowed');
  if (isBlockedHost(u.hostname)) throw new Error('Host not allowed');
  return `${u.origin}/robots.txt`;
}

/** Refuse loopback, private and link-local targets so the worker is not an SSRF tool. */
function isBlockedHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h.includes(':')) return true; // IPv6 literals
  if (!h.includes('.')) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

async function readCapped(stream, max) {
  if (!stream) return { text: '', bytes: 0, truncated: false };
  const reader = stream.getReader();
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
