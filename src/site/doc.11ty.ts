// One documentation page per thing sus.bot can report, at /docs/<family>/<name>/.
//
// The page answers the question somebody arrives with: the report said this,
// what is it, what does it cost me, and what do I type instead. The sentence
// the report showed is quoted as the engine writes it, placeholders and all, so
// a visitor searching for the words they saw lands here.
//
// The stories at the bottom come from src/data/social-proof.json. Everything in
// that file is invented at the moment and says so, both in the data
// (`sample: true`) and on the page, because a made-up customer presented as a
// real one is a lie whatever the names are.
//
// English only, like /bot/ and /press/.

import type { PageContext } from '../components/context.ts';
import { Document } from '../components/document.ts';
import { SiteHeader } from '../components/header.ts';
import { SiteFooter } from '../components/footer.ts';
import { strings, assetsFor, relative, homePath, pageJsonLd, escapeHtml, DEFAULT_LANG } from '../lib/site.ts';
import { docPages, socialSource, FAMILY_LABEL, type DocPage } from '../lib/docs.ts';
import type { SiteData } from '../../eleventy.config.ts';

interface Data extends SiteData {
  doc: DocPage;
}

export const data = {
  docList: docPages(),
  // Every page in the collections, not only the last of the pagination. They are
  // kept out of the main sitemap on purpose: /docs/sitemap.xml lists them and
  // robots.txt points at it.
  pagination: { data: 'docList', size: 1, alias: 'doc', addAllPagesToCollections: true },
  permalink: (d: Data) => `${d.doc.path}index.html`,
  sitemap: false,
  eleventyComputed: { translationKey: (d: Data) => `doc-${d.doc.id}` },
  lang: DEFAULT_LANG,
};

const LEVEL_WORD: Record<string, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'For information',
  varies: 'Depends on the line',
};

/** The engine fills {these} in with the line it found; say so once, plainly. */
const hasPlaceholder = (message: string): boolean => /\{[a-z]/i.test(message);

export function render(d: Data): string {
  const p = d.doc;
  const s = strings(d.dicts, DEFAULT_LANG, d.figures.tracked);
  const ctx: PageContext = {
    lang: DEFAULT_LANG,
    path: p.path,
    assets: assetsFor(p.path),
    home: relative(p.path, homePath(DEFAULT_LANG)),
    s,
    active: d.languages,
    alternates: { [DEFAULT_LANG]: p.path },
  };
  const source = socialSource();
  const related = (p.doc.also ?? []).map((id) => docPages().find((o) => o.id === id)).filter((o): o is DocPage => Boolean(o));
  const messages = p.variants ? Object.values(p.variants) : p.message ? [p.message] : [];

  const body = `${SiteHeader(ctx)}
  <main id="main" class="wrapper flow pt-8" data-space="l">
    <div class="flow max-w-prose" data-space="2xs">
      <p class="eyebrow font-mono"><a href="/docs/">Documentation</a></p>
      <h1 class="text-3xl">${escapeHtml(p.doc.title)}</h1>
      <p class="text-lg text-muted">${escapeHtml(p.doc.summary)}</p>
      <dl class="defs">
        <div><dt>Reported as</dt><dd><code>${escapeHtml(p.id)}</code></dd></div>
        <div><dt>Kind</dt><dd>${escapeHtml(FAMILY_LABEL[p.family] ?? p.family)}</dd></div>
        <div><dt>Level</dt><dd>${escapeHtml(LEVEL_WORD[p.level] ?? p.level)}</dd></div>
      </dl>
    </div>

    ${messages.length > 0 ? `<section class="panel flow" data-space="s" aria-labelledby="says-heading">
      <h2 id="says-heading">What the report says</h2>
      ${messages.map((m) => `<p>${escapeHtml(m)}</p>`).join('\n      ')}
      ${hasPlaceholder(messages[0]) ? '<p class="text-sm text-muted">The words in braces are filled in with your own line: the rule, the directive or the value sus.bot found.</p>' : ''}
    </section>` : ''}

    <section class="flow" data-space="s" aria-labelledby="what-heading">
      <h2 id="what-heading">What it means</h2>
      <p class="text-muted max-w-prose">${escapeHtml(p.doc.what)}</p>
    </section>

    <section class="flow" data-space="s" aria-labelledby="why-heading">
      <h2 id="why-heading">Why it matters</h2>
      <p class="text-muted max-w-prose">${escapeHtml(p.doc.why)}</p>
    </section>

    <section class="flow" data-space="s" aria-labelledby="fix-heading">
      <h2 id="fix-heading">How to fix it</h2>
      <p class="text-muted max-w-prose">${escapeHtml(p.doc.fix)}</p>
      ${p.doc.example?.wrong ? `<div class="flow" data-space="2xs">
        <p class="text-sm text-muted">What triggers it</p>
        <pre class="cmd">${escapeHtml(p.doc.example.wrong)}</pre>
      </div>` : ''}
      ${p.doc.example?.right ? `<div class="flow" data-space="2xs">
        <p class="text-sm text-muted">What to write instead</p>
        <pre class="cmd">${escapeHtml(p.doc.example.right)}</pre>
      </div>` : ''}
      <p><a href="/?utm_doc=${encodeURIComponent(p.id)}">Check your own robots.txt</a> and see whether this is in your file.</p>
    </section>

    ${p.stories.length > 0 ? `<section class="flow" data-space="s" aria-labelledby="stories-heading">
      <h2 id="stories-heading">What it cost other people</h2>
      ${source.sample ? `<p class="callout" data-state="info">These stories are made up. They are placeholders in the shape of the feed from ${escapeHtml(source.provider.app)}, kept here so the page is finished before the real ones arrive. Nobody below is a real person or a real customer.</p>` : ''}
      <ul class="issue-list">
${p.stories.map((story) => `        <li class="finding">
          <blockquote class="flow" data-space="2xs">
            <p>${escapeHtml(story.text)}</p>
            <footer class="text-sm text-muted">${escapeHtml(story.author.name)}${story.author.role ? `, ${escapeHtml(story.author.role)}` : ''}${story.author.company ? `, ${escapeHtml(story.author.company)}` : ''}${story.sample ? ' <strong>(invented)</strong>' : ''}</footer>
          </blockquote>
        </li>`).join('\n')}
      </ul>
    </section>` : ''}

    ${related.length > 0 ? `<section class="flow" data-space="s" aria-labelledby="also-heading">
      <h2 id="also-heading">Read next</h2>
      <ul class="issue-list">
${related.map((o) => `        <li><a href="${o.path}">${escapeHtml(o.doc.title)}</a></li>`).join('\n')}
      </ul>
    </section>` : ''}
  </main>

${SiteFooter(ctx)}`;

  const title = p.doc.title;
  return Document(ctx, {
    title: `${title} | sus.bot`,
    description: p.doc.summary,
    script: 'page.js',
    jsonld: pageJsonLd(DEFAULT_LANG, p.path, title, p.doc.summary),
    body,
  });
}
