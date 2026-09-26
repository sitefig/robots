// What the site measures, beyond the page view the Google tag counts on its own.
//
// Selling needs the funnel: someone checked a site, this is what the report
// said, and this is the offer they clicked. That answers the only questions
// worth asking here. Which findings make a visitor want monitoring? Do the
// people who export an audit ever come back? Is the free account taken by
// visitors whose own file is broken, or by the ones who came to read about a
// competitor?
//
// What is never sent: the address that was checked. The domain someone types
// is their business, and often their employer's, so no event carries a URL, a
// hostname or the text of a file. Every parameter below is either a word from
// a fixed list or a count, which is what a decision needs anyway. The page URL
// itself is stripped of its query string before the tag sees it (analyticsTag
// in src/lib/site.ts), because `?url=` would otherwise put every checked
// domain in the page path.
//
// With ANALYTICS_ID empty, nothing here does anything.

import { ANALYTICS_ID } from './config.ts';
import { getLocale } from './i18n.ts';
import type { Report, Verdict } from './types.ts';

type Value = string | number | boolean;

interface TagWindow {
  /** Defined by the inline Google tag in analyticsTag(), which queues into dataLayer. */
  gtag?: (command: string, name: string, params: Record<string, Value>) => void;
  susRedirect?: boolean;
}

/** One event, with its parameters. A no-op when there is no tag on the page. */
export function track(name: string, params: Record<string, Value> = {}): void {
  if (!ANALYTICS_ID) return;
  const w = window as unknown as TagWindow;
  // A root visit that is being redirected is counted on the language page.
  if (w.susRedirect) return;
  try {
    // Not `language`: GA4 records the browser's own language under that name.
    // This is the language the page was read in, which is a different thing.
    w.gtag?.('event', name, { ...params, page_language: getLocale() });
  } catch {
    // Analytics must never be the reason a page stops working.
  }
}

/** How the file reached the page. The words are fixed, so they group in GA4. */
export type CheckSource = 'direct' | 'proxy' | 'paste' | 'example';

/**
 * Who asked for the check. The page re-checks the last site a visitor looked
 * at when it loads, and follows `?url=` and `?example=` the same way, so
 * without this a returning visitor would look like someone checking a site.
 * Count `user` when reading the funnel.
 */
export type CheckTrigger = 'user' | 'load';

/** Verdict of the AI training group, which is the crawler group people come for. */
function trainingVerdict(report: Report): Verdict | 'none' {
  const group = report.aiStatus.groups[0];
  if (!group) return 'none';
  const { blocked, partial, open } = group.counts;
  if (open === 0 && partial === 0) return 'blocked';
  if (blocked > 0 || partial > 0) return 'partial';
  return 'open';
}

/**
 * An analysis finished. The parameters are what a sales decision turns on:
 * how open the file is, whether AI crawlers are being fed, how bad the file
 * is, and what wrote it.
 */
export function trackCheck(report: Report, source: CheckSource, trigger: CheckTrigger): void {
  const { summary, security, recon } = report;
  const high = security.filter((f) => f.severity === 'high').length;
  track('check', {
    source,
    trigger,
    verdict: summary.defaultPolicy.verdict,
    ai_training: trainingVerdict(report),
    errors: summary.issues.errors,
    warnings: summary.issues.warnings,
    security_high: high,
    security_findings: security.length,
    sitemaps: summary.sitemaps,
    rules: summary.rules,
    platform: recon.stack.primary?.name ?? 'unknown',
  });
}

/** An offer was clicked, and what the visitor had just been told when they clicked it. */
export function trackOffer(offer: string, report: Report | null): void {
  track('offer_click', {
    offer,
    verdict: report ? report.summary.defaultPolicy.verdict : 'none',
    ai_training: report ? trainingVerdict(report) : 'none',
    after_check: Boolean(report),
  });
}

/** An export was downloaded. `format` comes from the file extension. */
export function trackExport(format: string): void {
  track('export', { format });
}

/** The access check ran: the strongest signal on the page that someone means it. */
export function trackAccessCheck(crawlers: number): void {
  track('access_check', { crawlers });
}
