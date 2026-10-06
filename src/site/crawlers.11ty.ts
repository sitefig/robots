// /crawlers/: every crawler sus.bot checks a robots.txt against, by kind.
//
// The list is the engine's: [[crawlers.list]] in its configuration is the only
// place a crawler, its tokens or its kind is written down, and the browser gets
// the same list through the WebAssembly. The two figures per row come from the
// tracking data: how many of the large sites we fetch every day name it in a
// User-agent line of their own, and, for the AI crawlers the leaderboard covers,
// how many shut it out altogether.
//
// English only, like /bot/ and /press/.

import type { PageContext } from '../components/context.ts';
import { Document } from '../components/document.ts';
import { SiteHeader } from '../components/header.ts';
import { SiteFooter } from '../components/footer.ts';
import { strings, assetsFor, relative, homePath, pageJsonLd, escapeHtml, DEFAULT_LANG } from '../lib/site.ts';
import { byCategory, crawlers, measuredCount } from '../lib/crawlers.ts';
import type { SiteData } from '../../eleventy.config.ts';

export const data = { permalink: '/crawlers/index.html', translationKey: 'crawlers', lang: DEFAULT_LANG };

export function render(d: SiteData): string {
  const path = '/crawlers/';
  const s = strings(d.dicts, DEFAULT_LANG, d.figures.tracked);
  const ctx: PageContext = { lang: DEFAULT_LANG, path, assets: assetsFor(path), home: relative(path, homePath(DEFAULT_LANG)), s, active: d.languages, alternates: { [DEFAULT_LANG]: path } };
  const tracked = measuredCount();
  const all = crawlers();

  const groups = byCategory().map((group) => {
    const label = s.text(`agents.category.${group.category}`);
    const rows = group.list.map((c) => `            <tr>
              <th scope="row"><a href="/crawlers/${c.slug}/">${escapeHtml(c.name)}</a></th>
              <td class="font-mono text-sm">${c.tokens.map((token) => escapeHtml(token)).join(' ')}</td>
              <td class="font-mono text-sm">${c.named}</td>
              <td class="font-mono text-sm">${c.board ? `${c.board.blocked} (${c.board.percent}%)` : '–'}</td>
            </tr>`).join('\n');
    return `      <section class="flow" data-space="s" aria-labelledby="kind-${group.category}">
        <div class="section-title">
          <h2 id="kind-${group.category}">${escapeHtml(label)}</h2>
          <p class="text-sm text-muted">${group.list.length} crawler${group.list.length === 1 ? '' : 's'}</p>
        </div>
        <div class="table-frame">
          <section class="scroller" tabindex="0" aria-label="${escapeHtml(label)}">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Crawler</th>
                  <th scope="col">Matches</th>
                  <th scope="col">Named by</th>
                  <th scope="col">Shut out by</th>
                </tr>
              </thead>
              <tbody>
${rows}
              </tbody>
            </table>
          </section>
        </div>
      </section>`;
  }).join('\n\n');

  const title = 'Every crawler sus.bot checks for';
  const description = `The ${all.length} crawlers sus.bot resolves a robots.txt against, by kind, with the tokens each one answers to and what ${tracked} large sites do about it.`;

  const body = `${SiteHeader(ctx)}
  <main id="main" class="wrapper flow pt-8" data-space="l">
    <div class="flow max-w-prose" data-space="2xs">
      <h1 class="text-3xl">${title}</h1>
      <p class="text-lg text-muted">Every check resolves your file against all ${all.length} of these, the way each one would read it. Each has a page with the tokens it answers to, how to block it or let it in, and what large sites do about it.</p>
    </div>

    <div class="panel flow" data-space="xs">
      <p><strong>Named by</strong> counts the large sites that name a crawler in a <code>User-agent</code> line of their own, out of the ${tracked} we fetch every day. <strong>Shut out by</strong> counts the sites that block it from everything, and the leaderboard only covers the AI crawlers, so the rest of that column is empty rather than zero.</p>
      <p class="text-sm text-muted">Looking for ours? <a href="/bot/">susbot</a> fetches one file, <code>/robots.txt</code>, and reads nothing else.</p>
    </div>

${groups}
  </main>

${SiteFooter(ctx)}`;

  return Document(ctx, { title: `${title} | sus.bot`, description, script: 'page.js', jsonld: pageJsonLd(DEFAULT_LANG, path, title, description), body });
}
