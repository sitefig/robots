# robots-proxy worker

Fetches `robots.txt` for the front end, because browsers cannot read it cross-origin
without CORS headers and cannot set the `User-Agent` header themselves.

## Deploy

```
cd worker
npx wrangler login
npx wrangler deploy
```

The deployed URL is `https://robots-proxy.sitefig.workers.dev`.
Put that in `src/client/config.ts` as `WORKER_URL`.

Edit `ALLOWED_ORIGINS` in `wrangler.jsonc` before deploying so it lists the GitHub Pages
origin. Requests from any other Origin, or with no Origin header, get a 403.

## Run locally

```
npx wrangler dev
```

Then point `WORKER_URL` at `http://localhost:8787` while developing.

## Test with curl

The worker requires an allowed `Origin` header:

```
curl -H "Origin: http://localhost:8888" "http://localhost:8787/?url=https://example.com&ua=Googlebot"
```

## API

`GET /?url=<site>&ua=<user-agent>`

| Field | Meaning |
| --- | --- |
| `robotsUrl` | The URL fetched, always `origin + /robots.txt` |
| `finalUrl` | After redirects |
| `redirects` | Chain of `{ from, status, to }` hops that were followed |
| `redirectLimit` | `true` when a sixth redirect was refused; `status` is then the last 3xx and `text` is empty |
| `status`, `statusText`, `contentType` | From the target |
| `text`, `bytes`, `truncated` | Body, capped at 512 KiB |
| `userAgent` | The UA string actually sent |
| `durationMs`, `fetchedAt` | Timing |

Non-200 from the worker itself means the request was bad (400), the Origin was not
allowed (403), or the target could not be reached (502). The body is `{ "error": "..." }`.

## Cost and abuse limits

The worker is meant to run on the Workers **Free** plan: 100,000 requests a day, no
overage billing. When the quota is used up Cloudflare returns errors until midnight
UTC; nothing is charged. Do not upgrade the account to Workers Paid unless you want
to pay for traffic beyond that.

Two rate limits (free bindings, configured in `wrangler.jsonc`) keep one client or a
burst from burning the daily quota:

| Limit | Scope | Response |
| --- | --- | --- |
| 90 requests / 60 s | per client IP | 429, `Retry-After: 60` |
| 40 requests / 10 s | whole worker | 429, `Retry-After: 10` |

The front end's "real access by user-agent" check sends about 31 requests at three
in flight, which fits under both. The response header `X-Proxy-Limits` lists the
limiters that are active, so a missing binding is visible from outside.

`PAUSED` in `wrangler.jsonc` (also editable in the dashboard under Settings > Variables,
no deploy needed) is the kill switch: set to `true` the worker answers 503 to every
request at once, the page tells the visitor to paste the file instead, and nothing is
fetched. Use it if traffic ever looks abusive or if the account is on a paid plan and
the month's usage should stop.

These limits are best-effort: Cloudflare counts them in memory on each edge server,
not centrally. Tested: 70 requests over one keep-alive connection were cut off after
about 40 with 429s, while 150 requests over 25 parallel connections all passed because
they were spread across servers. That is enough against browsers and naive scripts;
the hard backstop against anything larger is the Free plan itself, which stops the
worker at 100k requests a day at no cost. Loopback, private and link-local targets are
refused with 400.

Worst case if the account is ever moved to Workers Paid: the global limiter allows at
most 40 requests per 10 seconds per edge server (about 345k/day per server); at the paid
rate of $0.30 per million requests that is under $0.11 per server per day, so even a
sustained flood across a few dozen servers stays in the low single digits per day, and
`PAUSED` stops it entirely. Turn on Cloudflare's "Usage based billing" notification
(dashboard > Notifications) to be emailed before any of that happens.
