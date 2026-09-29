// /tracked-changes.json: every tracked domain and the day its robots.txt last
// changed, read from the engine's snapshots at build time.
//
// It is a file rather than data embedded in the page because only the comparison
// needs it, and then only after somebody names a competitor. Six kilobytes on
// every page load for a table most visits never open is not a trade worth making,
// so the page fetches it on demand and keeps it for the rest of the visit.
//
// Excluded from collections, so it stays out of the sitemap and out of the pages
// the accessibility checkers walk.

import { trackedChanges } from '../lib/site.ts';

export const data = {
  permalink: 'tracked-changes.json',
  eleventyExcludeFromCollections: true,
};

export function render(): string {
  return JSON.stringify(trackedChanges());
}
