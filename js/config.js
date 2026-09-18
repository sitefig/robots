// Runtime configuration. This is the only file that needs editing to deploy.

// URL of the deployed Cloudflare Worker (see worker/). Leave the placeholder
// and the site still works for sites that send CORS headers, plus paste mode.
export const WORKER_URL = 'https://robots-proxy.sitefig.workers.dev';

// Public URL of the site with a trailing slash. Used by tools/gen-pages.js for
// the absolute hreflang, canonical and sitemap.xml URLs on every language page.
export const SITE_URL = 'https://sus.bot/';

// Google Analytics 4 measurement ID. Empty string removes the tag from every page.
export const ANALYTICS_ID = 'G-5X33E0N467';

export const DIRECT_TIMEOUT_MS = 8000;
export const PROXY_TIMEOUT_MS = 20000;

// Crawlers stop reading after 500 KiB; we read a little more so we can warn.
export const MAX_BYTES = 512 * 1024;

// How many per-user-agent proxy requests run at once in the access check.
export const ACCESS_CHECK_CONCURRENCY = 3;

export function proxyConfigured() {
  return Boolean(WORKER_URL) && !WORKER_URL.includes('YOUR-WORKER');
}

// Public places the page links to. `extension` is empty until one exists.
export const LINKS = {
  repo: 'https://github.com/sitefig/robots',
  gallery: 'https://github.com/sitefig/robots/tree/main/data/famous-100',
  diffs: 'https://github.com/sitefig/robots/commits/main/data/famous-100',
  extension: '',
};

// Pricing shown on the page. Copy lives in the locale (ui.plan.*); numbers
// and checkout links live here. A plan with an empty `url` renders its call
// to action as "coming soon" rather than a dead link. `show: false` keeps
// only the free tier. Annual prices are per month, billed yearly.
export const PRICING = {
  show: true,
  currency: '£',
  plans: [
    { id: 'free', monthly: 0, annual: 0, url: null, featured: false },
    { id: 'extension', monthly: 4, annual: 3, url: '', featured: false },
    { id: 'scheduler', monthly: 19, annual: 15, url: '', featured: true },
    { id: 'agency', monthly: 79, annual: 65, url: '', featured: false },
  ],
};
