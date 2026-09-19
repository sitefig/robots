// The HTML document around every page: head (meta, analytics, hreflang,
// styles, theme script, entry script, structured data) and body.

import type { PageContext } from './context.ts';
import { escapeHtml, absolute, hreflangLinks, analyticsTag } from '../lib/site.ts';

export interface DocumentProps {
  title: string;
  description: string;
  /** Root page only: the language redirect script. */
  redirect?: string;
  /** Entry module, relative to js/ ("boot.js" for the tool, "page.js" for content pages). */
  script: string;
  jsonld: string;
  body: string;
}

export function Document(ctx: PageContext, p: DocumentProps): string {
  const a = ctx.assets;
  return `<!DOCTYPE html>
<html lang="${ctx.lang}">
<head>
  <meta charset="utf-8">
  ${p.redirect ?? ''}<meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(p.title)}</title>
  <meta name="description" content="${escapeHtml(p.description)}">
  <meta name="color-scheme" content="light dark">
  ${analyticsTag()}<link rel="canonical" href="${absolute(ctx.path)}">
${hreflangLinks(ctx.alternates, ctx.active)}
  <link rel="icon" href="${a}favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${a}fonts/AtkinsonHyperlegibleNext-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${a}fonts/AtkinsonHyperlegibleNext-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${a}css/site.css">
  <script>
    // Apply a saved theme before first paint to avoid a flash. Falls back to the OS setting.
    try {
      const t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch {}
  </script>
  <script type="module" src="${a}js/${p.script}"></script>
  <script type="application/ld+json">${p.jsonld}</script>
</head>
<body>
${p.body}</body>
</html>
`;
}
