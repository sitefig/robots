// The report sections, hidden until a file has been analysed. Each section
// has a [data-slot] the matching client component (src/client/components/)
// renders into.
//
// The order is the argument, and it is the business one. What the file gives
// away and what it says about the systems behind it come first, because that is
// what the person who opened this page is answerable for; then who is being let
// in and who is taking the content; then the offer.
//
// Everything that needs a text editor to act on goes last, in one group with its
// own heading: the issue list with its line numbers, the path tester, the
// user-agent check and the file itself. That group starts with the two buttons
// that hand it to whoever edits the file, because the founder reading the top of
// this page is usually not that person.

import type { PageContext } from '../context.ts';
import { escapeHtml } from '../../lib/site.ts';
import { PRICING } from '../../client/config.ts';

function SecurityAndRecon(ctx: PageContext): string {
  const { e } = ctx.s;
  return `      <div class="grid" data-min="l" data-align="stretch">
        <section class="panel flow" data-space="s" id="security" aria-labelledby="security-heading">
          <h2 id="security-heading">${e('page.security')}</h2>
          <p class="text-muted">${e('page.securityIntro')}</p>
          <div data-slot class="flow" data-space="s"></div>
        </section>
        <section class="panel flow" data-space="s" id="recon" aria-labelledby="recon-heading">
          <h2 id="recon-heading">${e('page.recon')}</h2>
          <p class="text-muted">${e('page.reconIntro')}</p>
          <div data-slot class="flow" data-space="s"></div>
          <section class="card flow" data-space="xs" id="sitemaps" aria-labelledby="sitemaps-heading">
            <h3 id="sitemaps-heading">${e('page.sitemaps')}</h3>
            <div data-slot class="flow" data-space="xs"></div>
          </section>
        </section>
      </div>
`;
}

function AiStatus(ctx: PageContext, blockRate: string): string {
  const { e } = ctx.s;
  return `      <section class="flow" data-space="s" aria-labelledby="ai-status-heading">
        <div class="section-title">
          <h2 id="ai-status-heading">${e('page.aiStatus')}</h2>
          <p class="text-sm text-muted" id="ai-status-meta"></p>
        </div>
        <div class="with-sidebar">
          <div class="panel flow" data-space="s" id="ai-status">
            <div data-slot class="flow" data-space="s"></div>
          </div>
          <aside class="panel flow" data-tone="surface" data-space="xs" aria-labelledby="ai-watch-heading">
            <h3 id="ai-watch-heading">${e('page.aiWatch.title')}</h3>
            <p class="text-sm">${e('page.aiWatch.body')}</p>
            <dl class="defs text-sm">
              <div><dt>${e('page.aiWatch.agents')}</dt><dd class="font-mono" data-fill="ai-agents">–</dd></div>
              <div><dt>${e('page.aiWatch.rate')}</dt><dd class="font-mono">${escapeHtml(blockRate)}</dd></div>
            </dl>
            ${PRICING.show ? `<a class="button w-full" href="#pricing">${e('page.aiWatch.cta')}</a>` : ''}
          </aside>
        </div>
      </section>
`;
}

function Agents(ctx: PageContext): string {
  const { e, raw } = ctx.s;
  return `      <section id="agents" class="flow" data-space="s" aria-labelledby="agents-heading">
        <div class="section-title">
          <h2 id="agents-heading">${e('page.agents')}</h2>
          <p class="text-sm text-muted" id="agents-meta"></p>
        </div>
        <p class="text-muted max-w-prose">${raw('page.agentsIntro')}</p>
        <div data-slot class="flow" data-space="s"></div>
      </section>
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

/**
 * The work, for the person who does it. Headings inside are h3: this whole group
 * is one step down from the report above it, and the level says so.
 */
function ForEditors(ctx: PageContext): string {
  const { e } = ctx.s;
  return `      <section class="flow" data-space="s" id="for-editors" aria-labelledby="for-editors-heading">
        <div class="section-title">
          <h2 id="for-editors-heading">${e('page.forEditors.title')}</h2>
        </div>
        <p class="text-muted max-w-prose">${e('page.forEditors.body')}</p>
        <div id="handoff"><div data-slot class="cluster" data-space="xs"></div></div>
        <div class="grid" data-min="l">
          <section class="panel flow" data-space="s" id="warnings" aria-labelledby="warnings-heading">
            <div class="section-title">
              <h3 id="warnings-heading">${e('page.issues')}</h3>
              <p class="text-sm text-muted" id="issues-meta"></p>
            </div>
            <div data-slot class="flow" data-space="s"></div>
          </section>
          <section class="panel flow" data-space="s" id="tester" aria-labelledby="tester-heading">
            <h3 id="tester-heading">${e('page.tester')}</h3>
            <p class="text-muted">${e('page.testerIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
        </div>
        <div class="grid" data-min="l" data-align="stretch">
          <section class="panel flow" data-space="s" id="access" aria-labelledby="access-heading">
            <h3 id="access-heading">${e('page.access')}</h3>
            <p class="text-muted">${e('page.accessIntro')}</p>
            <div data-slot class="flow" data-space="s"></div>
          </section>
          <section class="panel" data-padding="none" id="raw" aria-labelledby="raw-heading">
            <div class="panel__header">
              <h3 id="raw-heading" class="me-auto">${e('page.raw')}</h3>
              <div data-slot="actions" class="cluster" data-space="xs"></div>
            </div>
            <div data-slot></div>
          </section>
        </div>
      </section>
`;
}

export function Results(ctx: PageContext, blockRate: string): string {
  return `    <div id="results" class="flow" data-space="xl" hidden>

${SecurityAndRecon(ctx)}
${AiStatus(ctx, blockRate)}
${Agents(ctx)}
${Regression(ctx)}
${ForEditors(ctx)}
    </div>
`;
}
