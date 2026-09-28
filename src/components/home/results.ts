// The report, hidden until a file has been analysed. Each section has a
// [data-slot] the matching client component (src/client/components/) renders
// into, and the ids are the contract: the fix chips, the tiles and every link
// anyone has shared point at them.
//
// The shape is the argument. The verdict says what it costs, the worklist says
// what to do about it in order, the file beside the worklist shows the evidence,
// the handoff sends it to whoever will act, and everything that was a panel
// before is folded away at the bottom for the person who edits the file.
//
// Nothing was deleted to make room: the crawler table, the AI section, the
// issues, the security findings, the recon cards, the tester and the user-agent
// check are all still here, with their slots and their ids, one disclosure away.

import type { PageContext } from '../context.ts';
import { escapeHtml } from '../../lib/site.ts';
import { PRICING } from '../../client/config.ts';

/**
 * One folded row of the appendix, wrapping a section that used to be a panel.
 * The description says what is inside, because a title alone gives no reason to
 * open it, and the count comes from the report once there is one.
 */
function Row(id: string, title: string, what: string, body: string): string {
  return `        <details class="appendix__row" id="row-${id}">
          <summary>
            <span class="appendix__row-title">
              <span class="appendix__title">${title}</span>
              <span class="text-sm text-muted">${what}</span>
            </span>
            <span class="appendix__count font-mono text-sm text-muted" data-fill="count-${id}"></span>
          </summary>
${body}        </details>
`;
}

/**
 * How you compare, which is the question straight after "is my file right". The
 * form is here in the markup so it exists before the engine does; the table and
 * the offer are rendered by components/compare.ts when a competitor is named.
 */
function Compare(ctx: PageContext): string {
  const { e } = ctx.s;
  return `      <section class="flow" data-space="s" id="compare-section" aria-labelledby="compare-heading">
        <div class="flow" data-space="2xs">
          <p class="text-sm font-mono text-muted">${e('ui.compare.eyebrow')}</p>
          <h2 id="compare-heading">${e('ui.compare.title')}</h2>
          <p class="text-muted max-w-prose">${e('ui.compare.body')}</p>
        </div>
        <div class="panel flow" data-space="s">
          <div class="cluster" data-align="stretch" data-space="xs">
            <span id="compare-you" class="font-bold"></span>
            <label for="compare-site" class="sr-only">${e('ui.compare.label')}</label>
            <input id="compare-site" type="text" inputmode="url" spellcheck="false">
            <button type="button" class="button" id="compare-run">${e('ui.compare.run')}</button>
          </div>
          <p id="compare-status" class="status" role="status" aria-live="polite" data-state="idle"></p>
          <div id="compare"><div data-slot class="flow" data-space="s"></div></div>
        </div>
      </section>
`;
}

function Fixes(ctx: PageContext): string {
  const { e } = ctx.s;
  return `      <div class="grid" data-min="l">
        <section class="flow" data-space="s" id="fixes" aria-labelledby="fixes-heading">
          <div class="section-title">
            <h2 id="fixes-heading">${e('ui.fixes.title')}</h2>
          </div>
          <div data-slot class="flow" data-space="s"></div>

          <div class="panel flow" data-space="xs" id="handoff-panel" aria-labelledby="handoff-heading">
            <h3 id="handoff-heading">${e('sales.handoff.title')}</h3>
            <p class="text-muted">${e('sales.handoff.body')}</p>
            <div id="handoff"><div data-slot class="cluster" data-space="xs"></div></div>
          </div>
        </section>

        <aside class="panel file-panel" data-padding="none" id="raw" aria-labelledby="raw-heading">
          <div class="panel__header">
            <div class="flow" data-space="2xs">
              <h2 id="raw-heading">${e('page.raw')}</h2>
              <p class="text-sm text-muted" id="raw-hint"></p>
            </div>
            <div data-slot="actions" class="cluster push-end" data-space="xs"></div>
          </div>
          <div data-slot></div>
        </aside>
      </div>
`;
}

function Regression(ctx: PageContext): string {
  const { e } = ctx.s;
  return `      <aside class="promo cluster" data-justify="between" aria-labelledby="regression-heading">
        <div class="flow max-w-prose" data-space="2xs">
          <h2 id="regression-heading">${e('page.regression.title')}</h2>
          <p>${e('page.regression.body')}</p>
        </div>
        ${PRICING.show ? `<a class="button" data-variant="primary" href="#pricing">${e('page.regression.cta')}</a>` : ''}
      </aside>
`;
}

/** Everything the old report showed, in the order it used to show it. */
function Appendix(ctx: PageContext, blockRate: string): string {
  const { e, raw } = ctx.s;
  const issues = `          <section class="flow" data-space="s" id="warnings" aria-labelledby="warnings-heading">
            <div class="section-title">
              <h3 id="warnings-heading">${e('page.issues')}</h3>
              <p class="text-sm text-muted" id="issues-meta"></p>
            </div>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  const agents = `          <section class="flow" data-space="s" id="agents" aria-labelledby="agents-heading">
            <div class="section-title">
              <h3 id="agents-heading">${e('page.agents')}</h3>
              <p class="text-sm text-muted" id="agents-meta"></p>
            </div>
            <p class="text-muted max-w-prose">${raw('page.agentsIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  const ai = `          <div class="with-sidebar">
            <section class="flow" data-space="s" id="ai-status" aria-labelledby="ai-status-heading">
              <div class="section-title">
                <h3 id="ai-status-heading">${e('page.aiStatus')}</h3>
                <p class="text-sm text-muted" id="ai-status-meta"></p>
              </div>
              <div data-slot class="flow" data-space="s"></div>
            </section>
            <aside class="panel flow" data-tone="surface" data-space="xs" aria-labelledby="ai-watch-heading">
              <h4 id="ai-watch-heading">${e('page.aiWatch.title')}</h4>
              <p class="text-sm">${e('page.aiWatch.body')}</p>
              <dl class="defs text-sm">
                <div><dt>${e('page.aiWatch.agents')}</dt><dd class="font-mono" data-fill="ai-agents">–</dd></div>
                <div><dt>${e('page.aiWatch.rate')}</dt><dd class="font-mono">${escapeHtml(blockRate)}</dd></div>
              </dl>
              ${PRICING.show ? `<a class="button w-full" href="#pricing">${e('page.aiWatch.cta')}</a>` : ''}
            </aside>
          </div>
`;
  const security = `          <section class="flow" data-space="s" id="security" aria-labelledby="security-heading">
            <h3 id="security-heading">${e('page.security')}</h3>
            <p class="text-muted">${e('page.securityIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  const recon = `          <section class="flow" data-space="s" id="recon" aria-labelledby="recon-heading">
            <h3 id="recon-heading">${e('page.recon')}</h3>
            <p class="text-muted">${e('page.reconIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
            <section class="card flow" data-space="xs" id="sitemaps" aria-labelledby="sitemaps-heading">
              <h4 id="sitemaps-heading">${e('page.sitemaps')}</h4>
              <div data-slot class="flow" data-space="xs"></div>
            </section>
          </section>
`;
  const tester = `          <section class="flow" data-space="s" id="tester" aria-labelledby="tester-heading">
            <h3 id="tester-heading">${e('page.tester')}</h3>
            <p class="text-muted">${e('page.testerIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  const access = `          <section class="flow" data-space="s" id="access" aria-labelledby="access-heading">
            <h3 id="access-heading">${e('page.access')}</h3>
            <p class="text-muted">${e('page.accessIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  return `      <section class="flow" data-space="s" id="appendix" aria-labelledby="appendix-heading">
        <div class="flow" data-space="2xs">
          <h2 id="appendix-heading">${e('ui.appendix.title')}</h2>
          <p class="text-sm text-muted max-w-prose">${e('ui.appendix.body')}</p>
        </div>
        <div class="appendix">
${Row('issues', e('page.issues'), e('ui.appendix.issues'), issues)}${Row('agents', e('page.agents'), e('ui.appendix.agents'), agents)}${Row('ai', e('page.aiStatus'), e('ui.appendix.ai'), ai)}${Row('security', e('page.security'), e('ui.appendix.security'), security)}${Row('recon', e('page.recon'), e('ui.appendix.recon'), recon)}${Row('tester', e('page.tester'), e('ui.appendix.tester'), tester)}${Row('access', e('page.access'), e('ui.appendix.access'), access)}        </div>
        <p class="text-sm text-muted max-w-prose">${e('ui.appendix.footnote')}</p>
      </section>
`;
}

export function Results(ctx: PageContext, blockRate: string): string {
  return `    <div id="results" class="flow" data-space="xl" hidden>

${Fixes(ctx)}
${Compare(ctx)}
${Regression(ctx)}
${Appendix(ctx, blockRate)}
    </div>
`;
}
