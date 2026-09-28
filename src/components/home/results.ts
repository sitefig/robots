// What only exists once there is a report: the comparison, and the appendix that
// holds every panel the report used to open with.
//
// The ids are the contract. The tiles link to them, the fix chips link to the
// file's lines, and every #line-N anyone has ever shared still lands. Nothing was
// deleted to make room for the design: the crawler table, the AI section, the
// issues, the security findings, the recon cards, the tester, the user-agent
// check, the exports and the fetch details are all here, one disclosure away.

import type { PageContext } from '../context.ts';
import { escapeHtml } from '../../lib/site.ts';
import { PRICING } from '../../client/config.ts';

/**
 * One folded row: a title, a line saying what is inside, a count filled in by
 * the client, and the marker the design draws on the right.
 */
function Row(id: string, title: string, what: string, body: string): string {
  return `        <details class="appendix__row" id="row-${id}">
          <summary>
            <span class="appendix__row-title">
              <span class="appendix__title">${title}</span>
              <span class="text-sm text-muted">${what}</span>
            </span>
            <span class="appendix__count font-mono text-sm text-muted" data-fill="count-${id}"></span>
            <span class="appendix__marker" aria-hidden="true">&#9656;</span>
          </summary>
${body}        </details>
`;
}

/**
 * How you compare, which is the question straight after "is my file right". The
 * form is in the markup so it exists before the engine does; the table and the
 * offer are rendered by components/compare.ts once a competitor is named.
 */
function Compare(ctx: PageContext): string {
  const { e } = ctx.s;
  return `      <section class="flow" data-space="s" id="compare-section" aria-labelledby="compare-heading">
        <div class="flow" data-space="3xs">
          <p class="eyebrow font-mono">${e('ui.compare.eyebrow')}</p>
          <h2 id="compare-heading">${e('ui.compare.title')}</h2>
          <p class="text-muted measure-body">${e('ui.compare.body')}</p>
        </div>
        <div class="panel" data-padding="none">
          <div class="compare-bar">
            <span id="compare-you" class="font-bold"></span>
            <label for="compare-site" class="sr-only">${e('ui.compare.label')}</label>
            <input id="compare-site" type="text" inputmode="url" spellcheck="false">
            <button type="button" class="button" id="compare-run">${e('ui.compare.run')}</button>
          </div>
          <p id="compare-status" class="status compare-status" role="status" aria-live="polite" data-state="idle"></p>
          <div id="compare"><div data-slot></div></div>
        </div>
      </section>
`;
}

/** Everything the report used to open with, in the order it used to open it. */
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
            <p class="text-muted measure-body">${raw('page.agentsIntro')}</p>
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
            <p class="text-muted measure-body">${e('page.securityIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  const recon = `          <section class="flow" data-space="s" id="recon" aria-labelledby="recon-heading">
            <h3 id="recon-heading">${e('page.recon')}</h3>
            <p class="text-muted measure-body">${e('page.reconIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
            <section class="card flow" data-space="xs" id="sitemaps" aria-labelledby="sitemaps-heading">
              <h4 id="sitemaps-heading">${e('page.sitemaps')}</h4>
              <div data-slot class="flow" data-space="xs"></div>
            </section>
          </section>
`;
  const tester = `          <section class="flow" data-space="s" id="tester" aria-labelledby="tester-heading">
            <h3 id="tester-heading">${e('page.tester')}</h3>
            <p class="text-muted measure-body">${e('page.testerIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  const access = `          <section class="flow" data-space="s" id="access" aria-labelledby="access-heading">
            <h3 id="access-heading">${e('page.access')}</h3>
            <p class="text-muted measure-body">${e('page.accessIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
`;
  const exports = `          <div id="export" class="flow" data-space="xs">
            <div data-slot class="flow" data-space="xs"></div>
          </div>
`;
  const served = `          <div id="summary-facts">
            <div data-slot></div>
          </div>
`;
  return `      <section class="flow" data-space="s" id="appendix" aria-labelledby="appendix-heading">
        <div class="flow" data-space="3xs">
          <h2 id="appendix-heading" class="text-xl">${e('ui.appendix.title')}</h2>
          <p class="text-sm text-muted measure-body">${e('ui.appendix.body')}</p>
        </div>
        <div class="appendix">
${Row('issues', e('page.issues'), e('ui.appendix.issues'), issues)}${Row('agents', e('page.agents'), e('ui.appendix.agents'), agents)}${Row('ai', e('page.aiStatus'), e('ui.appendix.ai'), ai)}${Row('security', e('page.security'), e('ui.appendix.security'), security)}${Row('recon', e('page.recon'), e('ui.appendix.recon'), recon)}${Row('tester', e('page.tester'), e('ui.appendix.tester'), tester)}${Row('access', e('page.access'), e('ui.appendix.access'), access)}${Row('export', e('ui.appendix.exports'), e('ui.appendix.exportsWhat'), exports)}${Row('served', e('ui.appendix.served'), e('ui.appendix.servedWhat'), served)}        </div>
      </section>
`;
}

export function Results(ctx: PageContext, blockRate: string): string {
  return `    <div id="results" class="flow" data-space="l" hidden>
${Compare(ctx)}
${Appendix(ctx, blockRate)}
    </div>
`;
}
