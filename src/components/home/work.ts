// The worklist and the file, side by side, in both views.
//
// Before a check the left column shows three example fixes and the message one
// of them would send, and the right column shows what the file panel will look
// like plus the textarea for pasting a file instead of fetching one. After a
// check the client replaces both columns with the real thing. The shape does not
// change, which is the whole idea: the page you land on is the page you get.
//
// The example cards are marked as examples in words, not by opacity, and they
// are not buttons: there is nothing to open yet.

import type { PageContext } from '../context.ts';

/** One example fix: the badge, the word "Example", a line chip, and a title. */
function Example(ctx: PageContext, sev: string, state: string, line: string, title: string): string {
  const { e } = ctx.s;
  return `          <div class="fix flow" data-space="2xs" data-example="true">
            <p class="fix__meta text-sm">
              <span class="badge" data-state="${state}">${sev}</span>
              <span class="text-muted">${e('sales.example.area')}</span>
              ${line ? `<span class="chip font-mono push-end" aria-hidden="true">${line}</span>` : ''}
            </p>
            <p class="fix__title">${title}</p>
          </div>
`;
}

export function Work(ctx: PageContext): string {
  const { e } = ctx.s;
  return `    <div class="grid work" data-min="l">
      <section class="flow" data-space="s" id="fixes" aria-labelledby="fixes-heading">
        <div class="cluster" data-justify="between" data-space="xs">
          <h2 id="fixes-heading">${e('ui.fixes.title')}</h2>
          <span class="text-sm text-muted" data-pitch>${e('sales.example.label')}</span>
          <div id="fixes-mode" class="push-end"><div data-slot class="cluster" data-space="xs"></div></div>
        </div>

        <div data-slot class="flow" data-space="xs">
${Example(ctx, e('ui.sev.critical'), 'error', e('sales.sample.line1'), e('sales.example.t1'))}${Example(ctx, e('ui.sev.high'), 'warning', e('sales.sample.line2'), e('sales.example.t2'))}${Example(ctx, e('ui.sev.decision'), 'info', '', e('sales.example.t3'))}          <div class="fix__ticket flow" data-space="2xs" data-example="true">
            <p class="text-xs font-mono">${e('sales.example.ticketLabel')}</p>
            <pre class="fix__message">${e('sales.sample.ticket')}</pre>
          </div>
        </div>

        <div class="panel flow" data-space="xs" id="handoff-panel" aria-labelledby="handoff-heading" hidden>
          <h3 id="handoff-heading">${e('sales.handoff.title')}</h3>
          <p class="text-muted">${e('sales.handoff.body')}</p>
          <div id="handoff"><div data-slot class="flow" data-space="xs"></div></div>
        </div>
      </section>

      <aside class="panel file-panel" data-padding="none" id="raw" aria-labelledby="raw-heading">
        <div class="panel__header">
          <div class="flow" data-space="3xs">
            <h2 id="raw-heading">${e('sales.file.title')}</h2>
            <p class="text-sm text-muted" id="raw-hint">${e('sales.file.hint')}</p>
          </div>
          <div data-slot="actions" class="cluster push-end" data-space="xs"></div>
        </div>
        <div data-slot>
          <pre class="raw" aria-hidden="true"><span class="raw__line"><span class="raw__num">1</span>User-agent: *</span><span class="raw__line"><span class="raw__num">2</span>Disallow: …</span><span class="raw__line" data-level="error"><span class="raw__num">3</span>Disallow: …</span><span class="raw__line"><span class="raw__num">4</span>Sitemap: …</span></pre>
          <div class="file-paste stack">
            <label for="pasted-text" class="sr-only">${e('page.pasteLabel')}</label>
            <textarea id="pasted-text" rows="6" spellcheck="false" placeholder="${e('sales.file.paste')}"></textarea>
            <div class="cluster" data-space="xs">
              <button type="button" class="button" id="analyse-pasted">${e('page.analysePasted')}</button>
              <button type="button" class="link-button text-sm" id="load-example">${e('page.loadExample')}</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
`;
}
