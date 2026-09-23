// The client app at /app/. One page per file in app/pages/: this template
// emits the shell (document head, skip link, navigation slot, heading and
// lead), and the custom elements in src/client/app/ fill in the blocks from
// the same JSON at runtime.
//
// Why both: the heading, the lead and the URL exist in the HTML, so the page
// is readable, indexable and passes the accessibility gate before a single
// fetch happens; everything below it comes from JSON, so changing what the
// app says is uploading a file rather than a deploy. Page content is fetched
// from /app/pages/<file>.json, live data from the endpoints the blocks name,
// and translations from /app/i18n/<lang>.po.

import { readFileSync, readdirSync } from 'node:fs';
import { escapeHtml, SITE_URL } from '../lib/site.ts';

const PAGES = new URL('../../app/pages/', import.meta.url);

interface AppPage {
  route: string;
  title: string;
  key?: string;
  lead?: string;
  chrome?: string;
  blocks: { type: string }[];
}

interface Entry {
  slug: string;
  file: string;
  page: AppPage;
}

/** Every page file, as Eleventy pagination data. */
function entries(): Entry[] {
  return readdirSync(PAGES)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const page = JSON.parse(readFileSync(new URL(file, PAGES), 'utf8')) as AppPage;
      return { slug: file.replace(/\.json$/, ''), file, page };
    });
}

export const data = {
  pagination: { data: 'appPages', size: 1, alias: 'entry' },
  appPages: entries(),
  // Private surface: it has its own navigation and its own translations, and
  // it does not belong in the public sitemap.
  sitemap: false,
  eleventyComputed: {
    permalink: (d: { entry: Entry }) => `${urlOf(d.entry.page.route)}index.html`,
  },
};

/**
 * The URL a route is served at. A segment naming a parameter (":id") becomes
 * "detail", because static hosting cannot answer /app/incidents/482/; that
 * page reads the id from the query string instead, as /app/incidents/detail/?id=482.
 */
export function urlOf(route: string): string {
  const segments = route.replace(/^\//, '').replace(/\/$/, '').split('/');
  const mapped = segments.map((s) => (s.includes(':') ? 'detail' : s));
  return `/${mapped.join('/')}/`.replace(/^\/+/, '/');
}

export function render(d: { entry: Entry }): string {
  const { page, slug } = d.entry;
  const title = escapeHtml(page.title);
  const lead = page.lead ? escapeHtml(page.lead) : '';
  const onboarding = page.chrome === 'onboarding';
  const url = urlOf(page.route);
  const depth = url.replace(/^\/|\/$/g, '').split('/').length;
  const assets = '../'.repeat(depth);

  // A route with a parameter is a template for one item; it must not be
  // indexed, and the runtime fills it from the id in the URL.
  const dynamic = page.route.includes(':');

  return `<!DOCTYPE html>
<html lang="en" data-app>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | sus.bot</title>
  <meta name="description" content="${lead}">
  ${dynamic ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${SITE_URL}${url.replace(/^\//, '')}">`}
  <link rel="icon" href="${assets}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${assets}css/site.css">
  <script type="module" src="${assets}js/app/main.js"></script>
  <script type="module" src="${assets}js/page.js"></script>
</head>
<body class="app-shell"${onboarding ? ' data-chrome="onboarding"' : ''}>
  <a class="skip-link" href="#main">Skip to content</a>
${onboarding ? '' : `  <sus-nav src="/app/nav.json"></sus-nav>\n`}  <main id="main" class="app-main flow">
    <div class="app-bar" data-app-bar>
      <h1>${title}</h1>
      <span class="app-bar__spacer"></span>
    </div>
    ${lead ? `<p class="text-lg text-muted max-w-prose" data-page-lead>${lead}</p>` : ''}
    <sus-page src="/app/pages/${slug}.json"></sus-page>
    <noscript>
      <p class="callout" data-state="warn">This page builds itself from JSON in your browser, so it needs JavaScript. The audit at <a href="${SITE_URL}">sus.bot</a> works without it.</p>
    </noscript>
  </main>
</body>
</html>
`;
}
