// The offer, which exists only once there is a report.
//
// The section is `hidden` in the built page: a visitor who has just arrived is
// here to check a file, and nothing is asked of them until they have the
// answer. After an analysis it appears with a lead sentence about what was
// actually found, because "your file has errors in it right now" is a reason
// to act and "keep an eye on your robots.txt" is not.
//
// The free account link carries the origin that was just checked, as `?site=`.
// The app does not read that parameter yet: its signup page only looks at
// `next`, and the domain is typed again in the first onboarding step. Sending
// it costs nothing and is what the app needs to skip that step, so it is here
// waiting for the other side.

import { t } from '../i18n.ts';
import { state } from '../state.ts';
import { trackOffer } from '../track.ts';
import type { Report } from '../types.ts';

const SECTION = '#keep-watching';

/** The pristine hrefs, kept because render() rewrites them and can run twice. */
const hrefs = new WeakMap<HTMLAnchorElement, string>();

function offers(): HTMLAnchorElement[] {
  return [...document.querySelectorAll<HTMLAnchorElement>(`${SECTION} [data-offer]`)];
}

/**
 * Which sentence the report earns. Errors first, because something is broken
 * now; then AI crawlers, which is what most visitors came to see; then
 * warnings; then a file with nothing wrong, where the only thing left to sell
 * is being told when that stops being true.
 *
 * Exported so tests/sales.test.js can check the four branches without a browser.
 */
export function leadKey(report: Report): string {
  const { issues } = report.summary;
  if (issues.errors > 0) return 'sales.after.errors';
  const training = report.aiStatus.groups[0];
  if (training && training.counts.blocked === 0 && training.counts.partial === 0 && training.counts.open > 0) return 'sales.after.training';
  if (issues.warnings > 0) return 'sales.after.warnings';
  return 'sales.after.clean';
}

/** Counts a click on an offer, with what the visitor had just been told. */
export function initSales(): void {
  for (const link of offers()) {
    hrefs.set(link, link.getAttribute('href') ?? '');
    link.addEventListener('click', () => trackOffer(link.dataset['offer'] ?? 'unknown', state.analysis?.report ?? null));
  }
}

/** Shows the offer and fits it to the report. Called after every analysis. */
export function renderSales(): void {
  const section = document.querySelector<HTMLElement>(SECTION);
  if (!section || !state.analysis) return;
  const report = state.analysis.report;

  const lead = section.querySelector<HTMLElement>('[data-slot="sales-lead"]');
  if (lead) lead.textContent = t(leadKey(report));

  // Hand the checked site over, so the app knows what to watch.
  const origin = state.fetch ? new URL(state.fetch.robotsUrl).origin : null;
  if (origin) {
    for (const link of offers()) {
      const base = hrefs.get(link);
      if (!base || !base.includes('/signup/')) continue;
      link.href = `${base}?${new URLSearchParams({ site: origin })}`;
    }
  }

  section.hidden = false;
}
