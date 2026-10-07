// Runtime configuration. This is the only file that needs editing to deploy.

// URL of the deployed Cloudflare Worker (sitefig/robots-worker, private). This
// site uses the free one, `robots-proxy-free`, which is the deployment on the
// Workers Free plan with the per-IP and global rate limits; the accounts app has
// its own, `robots-proxy-accounts`, and the two must not be mixed up, because
// only this one is guaranteed never to bill. Leave the placeholder and the site
// still works for sites that send CORS headers, plus paste mode.
export const WORKER_URL = 'https://robots-proxy-free.sitefig.workers.dev';

// Public URL of the site with a trailing slash. Used by the site build for
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

export function proxyConfigured(): boolean {
  return Boolean(WORKER_URL) && !WORKER_URL.includes('YOUR-WORKER');
}

// The paid app: where a free account is created and where the watching happens.
// One constant, because the sales section and the export box both link to it.
export const APP_URL = 'https://app.sitefig.net';

// Public places the page links to. `extension` is empty until one exists.
export const LINKS = {
  repo: 'https://github.com/sitefig/robots',
  // The engine, the CLI, the Action and the packages, split out on 2026-09-23.
  engine: 'https://github.com/sitefig/robots-engine',
  gallery: 'https://github.com/sitefig/robots-engine/tree/main/data/famous-100',
  diffs: 'https://github.com/sitefig/robots-engine/commits/main/data/famous-100',
  // Every crawler, one page each, with what the whole web does about it. Its own
  // site, built from the Common Crawl robots.txt analysis, not from this repo.
  crawlers: 'https://www.opencrawlers.com/',
  extension: '',
};

export interface Plan {
  id: string;
  monthly: number;
  annual: number;
  url: string | null;
  featured: boolean;
}

// Pricing shown on the page. Copy lives in the locale (ui.plan.*); numbers
// and checkout links live here. A plan with an empty `url` renders its call
// to action as "coming soon" rather than a dead link. `show: false` keeps
// only the free tier. Annual prices are per month, billed yearly.
// show = false while the prices are being worked out: it takes the pricing
// section off the home page and removes every link and button that pointed
// at it (the header, the footer, and the two monitoring calls to action).
// The plans below are kept as they are, so one flip brings them all back.
export const PRICING: { show: boolean; currency: string; plans: Plan[] } = {
  show: false,
  currency: '£',
  plans: [
    { id: 'free', monthly: 0, annual: 0, url: null, featured: false },
    { id: 'extension', monthly: 4, annual: 3, url: '', featured: false },
    { id: 'scheduler', monthly: 19, annual: 15, url: '', featured: true },
    { id: 'agency', monthly: 79, annual: 65, url: '', featured: false },
  ],
};
