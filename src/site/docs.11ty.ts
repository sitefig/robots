// /docs/: every page about something sus.bot can report, by kind.
//
// The list is the engine's catalogue (src/data/findings.json, written by
// tools/findings.ts), so it is the checks that exist rather than the ones
// somebody remembered to write about. English only, like /bot/ and /press/.

import type { PageContext } from '../components/context.ts';
import { Document } from '../components/document.ts';
import { SiteHeader } from '../components/header.ts';
import { SiteFooter } from '../components/footer.ts';
import { strings, assetsFor, relative, homePath, pageJsonLd, escapeHtml, DEFAULT_LANG } from '../lib/site.ts';
import { byFamily, docPages, socialSource } from '../lib/docs.ts';
import type { SiteData } from '../../eleventy.config.ts';

export const data = { permalink: '/docs/index.html', translationKey: 'docs', sitemap: false, lang: DEFAULT_LANG };

export function render(d: SiteData): string {
  const path = '/docs/';
  const s = strings(d.dicts, DEFAULT_LANG, d.figures.tracked);
  const ctx: PageContext = { lang: DEFAULT_LANG, path, assets: assetsFor(path), home: relative(path, homePath(DEFAULT_LANG)), s, active: d.languages, alternates: { [DEFAULT_LANG]: path } };
  const all = docPages();
  const source = socialSource();

  const groups = byFamily().map((group) => `      <section class="flow" data-space="s" aria-labelledby="family-${group.family}">
        <div class="section-title">
          <h2 id="family-${group.family}">${escapeHtml(group.label)}</h2>
          <p class="text-sm text-muted">${group.pages.length} page${group.pages.length === 1 ? '' : 's'}</p>
        </div>
        <ul class="issue-list">
${group.pages.map((p) => `          <li class="finding flow" data-space="2xs">
            <p><a href="${p.path}">${escapeHtml(p.doc.title)}</a> <code class="text-sm text-muted">${escapeHtml(p.id)}</code></p>
            <p class="text-sm text-muted">${escapeHtml(p.doc.summary)}</p>
          </li>`).join('\n')}
        </ul>
      </section>`).join('\n\n');

  const title = 'What sus.bot reports, and what to do about it';
  const description = `A page for each of the ${all.length} things a sus.bot check can report: what it means, what it costs and what to write instead.`;

  const body = `${SiteHeader(ctx)}
  <main id="main" class="wrapper flow pt-8" data-space="l">
    <div class="flow max-w-prose" data-space="2xs">
      <h1 class="text-3xl">${escapeHtml(title)}</h1>
      <p class="text-lg text-muted">Every check sus.bot runs has a page here: the sentence the report shows, what the line actually does, what it costs to leave alone, and what to write instead. ${all.length} of them.</p>
    </div>

    <div class="panel flow" data-space="xs">
      <p>The list comes out of the engine itself, so it is the checks that exist rather than the ones somebody remembered to write up. A check added to the engine gets a page here or the build fails.</p>
      ${source.sample ? `<p class="text-sm text-muted">The stories on these pages are invented placeholders in the shape of the ${escapeHtml(source.provider.app)} feed, and each page says so. Nothing there is a real person or a real customer yet.</p>` : ''}
      <p class="text-sm text-muted">Want the answer for your own file? <a href="/">Run a check</a>: it is free, it runs in your browser, and it names every one of these it finds.</p>
    </div>

${groups}
  </main>

${SiteFooter(ctx)}`;

  return Document(ctx, { title: `${title} | sus.bot`, description, script: 'page.js', jsonld: pageJsonLd(DEFAULT_LANG, path, title, description), body });
}
