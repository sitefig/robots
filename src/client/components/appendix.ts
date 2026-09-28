// The counts on the folded rows of the appendix.
//
// A row that says only "Crawler access" gives no reason to open it; "Crawler
// access 134" does. The number is bare on purpose: the row title already says
// what is being counted, which saves a noun in 24 languages.

import { formatNumber } from '../i18n.ts';
import { current } from '../state.ts';

function fill(name: string, value: string): void {
  document.querySelectorAll(`[data-fill="count-${name}"]`).forEach((node) => { node.textContent = value; });
}

export function renderAppendix(): void {
  const r = current().report;
  const rc = r.recon;
  const reconFindings = rc.generators.length + rc.cloud.length + rc.hosts.hosts.length + rc.hosts.paths.length
    + rc.api.length + rc.data.feeds.length + rc.data.portals.length + rc.data.search.paths.length
    + rc.extensions.length + rc.comments.length + rc.stack.detections.length;
  fill('issues', formatNumber(r.issues.length));
  fill('agents', formatNumber(r.crawlers.length));
  fill('ai', formatNumber(r.aiStatus.groups.reduce((n, g) => n + g.crawlers.length, 0)));
  fill('security', formatNumber(r.security.length));
  fill('recon', formatNumber(reconFindings));
}
