// One page per crawler, at /crawlers/<slug>/.
//
// Everything on it is a fact we already hold: the name, the tokens a robots.txt
// has to name to address it, the user-agent string its operator publishes, the
// address inside that string where the operator documents it, the note the engine
// carries about it, and two figures from the tracking data. Nothing is inferred
// about a crawler we have not measured, and no link is invented: 38 of the 134
// publish a user-agent string with an address in it, and the rest simply do not
// get one.
//
// English only, like /bot/ and /press/. The header and footer still follow the
// language menu, which links each language's home page from here.

import type { PageContext } from '../components/context.ts';
import { Document } from '../components/document.ts';
import { SiteHeader } from '../components/header.ts';
import { SiteFooter } from '../components/footer.ts';
import { strings, assetsFor, relative, homePath, pageJsonLd, escapeHtml, DEFAULT_LANG } from '../lib/site.ts';
import { crawlers, measuredCount, credit, type Crawler } from '../lib/crawlers.ts';
import type { SiteData } from '../../eleventy.config.ts';

interface Data extends SiteData {
  crawler: Crawler;
}

export const data = {
  crawlerList: crawlers(),
  // Every page in the collections, not just the last of the pagination, so all
  // 134 reach the sitemap. tests/pages.test.js counts them against the build.
  pagination: { data: 'crawlerList', size: 1, alias: 'crawler', addAllPagesToCollections: true },
  permalink: (d: Data) => `/crawlers/${d.crawler.slug}/index.html`,
  eleventyComputed: {
    translationKey: (d: Data) => `crawler-${d.crawler.slug}`,
  },
  lang: DEFAULT_LANG,
};

/** Bing is the only crawler that honours Crawl-delay, which is worth saying once. */
const HONOURS_DELAY = ['bingbot', 'msnbot', 'adidxbot', 'bingpreview'];

const count = (n: number): string => n.toLocaleString('en-GB');

export function render(d: Data): string {
  const c = d.crawler;
  const path = `/crawlers/${c.slug}/`;
  const s = strings(d.dicts, DEFAULT_LANG, d.figures.tracked);
  const ctx: PageContext = { lang: DEFAULT_LANG, path, assets: assetsFor(path), home: relative(path, homePath(DEFAULT_LANG)), s, active: d.languages, alternates: { [DEFAULT_LANG]: path } };
  const kind = s.text(`agents.category.${c.category}`);
  const tracked = measuredCount();
  const source = credit();
  const delay = c.tokens.some((token) => HONOURS_DELAY.includes(token));
  // A note in the configuration is either a dictionary key or the sentence
  // itself, which is how the engine reads it too: a key that is not in the
  // dictionary is shown as written.
  const note = c.note ? (d.dicts[DEFAULT_LANG][c.note] as string | undefined) ?? c.note : '';

  // The line a visitor came for: what to write to speak to this crawler. The
  // first token is the one its operator documents; the others are what it also
  // answers to, which is why they are listed under it.
  const block = `User-agent: ${c.tokens[0]}\nDisallow: /`;

  // "an SEO tools crawler", "an AI training crawler", "a search crawler": an
  // initialism takes the article its first letter sounds like, not the one it
  // looks like.
  const first = kind.split(/[\s/]/)[0];
  const article = /^[aeiou]/i.test(kind) || (/^[A-Z]{2,}/.test(first) && 'AEFHILMNORSX'.includes(first[0])) ? 'an' : 'a';

  const facts: string[] = [
    `<div><dt>Kind</dt><dd>${escapeHtml(kind)}</dd></div>`,
    `<div><dt>Matches</dt><dd>${c.tokens.map((token) => `<code>${escapeHtml(token)}</code>`).join(' ')}</dd></div>`,
    `<div><dt>Named by</dt><dd>${c.named} of ${tracked} large sites</dd></div>`,
  ];
  if (c.board) facts.push(`<div><dt>Blocked by</dt><dd>${c.board.blocked} of ${tracked} (${c.board.percent}%)</dd></div>`);
  if (c.world) facts.push(`<div><dt>Named across the web</dt><dd>${count(c.world.total)} files (${escapeHtml(c.world.percent)})</dd></div>`);
  if (c.info) facts.push(`<div><dt>Documented at</dt><dd><a href="${escapeHtml(c.info)}" rel="nofollow noopener">${escapeHtml(c.info.replace(/^https?:\/\//, ''))}</a></dd></div>`);

  const body = `${SiteHeader(ctx)}
  <main id="main" class="wrapper flow pt-8" data-space="l">
    <div class="flow max-w-prose" data-space="2xs">
      <p class="eyebrow font-mono"><a href="/crawlers/">All crawlers</a></p>
      <h1 class="text-3xl">${escapeHtml(c.name)}</h1>
      <p class="text-lg text-muted">${escapeHtml(c.name)} is ${article} ${escapeHtml(kind)} crawler. sus.bot checks every robots.txt against it, and this page is what it knows about it.</p>
    </div>

    <section class="panel flow" data-space="s" aria-labelledby="facts-heading">
      <h2 id="facts-heading">The facts</h2>
      <dl class="defs">
${facts.join('\n')}
      </dl>
      ${note ? `<p class="callout" data-state="info">${escapeHtml(note)}</p>` : ''}
    </section>

    <section class="flow" data-space="s" aria-labelledby="address-heading">
      <h2 id="address-heading">How to block it, or let it in</h2>
      <p class="text-muted max-w-prose">A group in your robots.txt speaks to this crawler when its <code>User-agent</code> line names ${c.tokens.length > 1 ? 'any of its tokens' : 'its token'}. Matching ignores case, so <code>${escapeHtml(c.tokens[0])}</code> and <code>${escapeHtml(c.tokens[0].toUpperCase())}</code> are the same thing.</p>
      <pre class="cmd">${escapeHtml(block)}</pre>
      <p class="text-muted max-w-prose">Replace <code>Disallow: /</code> with <code>Allow: /</code> to let it in, or with the paths you want kept back. A crawler that has no group of its own falls back to <code>User-agent: *</code>, so a rule there reaches it too.</p>
      ${delay ? '<p class="text-muted max-w-prose">This is one of the crawlers that honours <code>Crawl-delay</code>. Bing is the only operator that still does; Google and Yandex ignore it.</p>' : ''}
    </section>

    ${c.ua ? `<section class="flow" data-space="s" aria-labelledby="ua-heading">
      <h2 id="ua-heading">What it says it is</h2>
      <p class="text-muted max-w-prose">The user-agent string its operator publishes. Anything can send this string, so it is not proof of who is asking${c.info ? ', and the address in it is where the operator documents the crawler' : ''}.</p>
      <!-- Focusable, because a long user-agent string scrolls sideways and a
           scrollable region has to be reachable without a pointer. The file panel
           in a report does the same. -->
      <pre class="raw" tabindex="0"><span class="raw__line">${escapeHtml(c.ua)}</span></pre>
    </section>` : ''}

    <section class="flow" data-space="s" aria-labelledby="figures-heading">
      <h2 id="figures-heading">What large sites do about it</h2>
      <p class="text-muted max-w-prose">sus.bot fetches the robots.txt of ${tracked} large sites every day and keeps the history. ${c.named === 0
    ? `None of them names ${escapeHtml(c.name)} in a <code>User-agent</code> line of its own, so for all of them it is covered by <code>User-agent: *</code>, or by nothing at all.`
    : `${c.named} of them name ${escapeHtml(c.name)} in a <code>User-agent</code> line of its own, which is how a site says something about this crawler rather than about crawlers in general.`}</p>
      ${c.board ? `<p class="text-muted max-w-prose">Of those ${tracked} sites, ${c.board.blocked} shut it out of everything (${c.board.percent}%), ${c.board.restricted} keep part of the site back from it, and ${c.board.open} leave it the whole site. Those three come out of the engine, not out of a count of names.</p>` : ''}
      <p><a href="/">Check your own robots.txt</a> to see what it says to ${escapeHtml(c.name)}, line by line.</p>
    </section>

    ${c.world && source ? `<section class="flow" data-space="s" aria-labelledby="world-heading">
      <h2 id="world-heading">What the whole web does about it</h2>
      <p class="text-muted max-w-prose">${escapeHtml(source.credit)} crawls robots.txt files at a scale we do not: ${count(c.world.total)} of the files in their dataset name ${escapeHtml(c.name)}, which is ${escapeHtml(c.world.percent)} of all of them.</p>
      <dl class="defs">
        <div><dt>Shut out of everything</dt><dd>${count(c.world.disallowAll)} files${c.world.total > 0 ? ` (${Math.round((c.world.disallowAll / c.world.total) * 100)}% of the files that name it)` : ''}</dd></div>
        <div><dt>Allowed, never disallowed</dt><dd>${count(c.world.allowOnly)} files</dd></div>
        ${c.world.crawlDelayCount > 0 ? `<div><dt>Given a Crawl-delay</dt><dd>${count(c.world.crawlDelayCount)} files, ${c.world.avgCrawlDelay} seconds on average</dd></div>` : ''}
      </dl>
      <p class="text-sm text-muted">Figures from <a href="${escapeHtml(source.source)}" rel="noopener">${escapeHtml(source.credit)}</a>, dataset ${escapeHtml(source.dataset)}, used under <a href="${escapeHtml(source.licenceUrl)}" rel="license noopener">${escapeHtml(source.licence)}</a>.</p>
    </section>` : ''}
  </main>

${SiteFooter(ctx)}`;

  const title = `${c.name} and your robots.txt`;
  const description = `What ${c.name} is, the tokens a robots.txt must name to address it, how to block it or let it in, and what ${tracked} large sites do about it.`;
  return Document(ctx, { title: `${title} | sus.bot`, description, script: 'page.js', jsonld: pageJsonLd(DEFAULT_LANG, path, title, description), body });
}
