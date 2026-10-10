// What each documentation page says, by the engine's own id for the thing.
//
// One file per family, so a check added to the engine lands next to its
// neighbours. The catalogue of ids is not written here: it comes out of the
// engine through src/data/findings.json, and tests/pages.test.js fails if an id
// in that file has no entry below, which is how a new check gets a page instead
// of being left out with nobody noticing.
//
// House rules for the copy, the same as the rest of the site: plain sentences,
// sentence case, no slogans, no em dashes, name the thing rather than calling it
// something. Numbers belong to the engine, not to the copy.

import type { Doc } from '../../lib/docs.ts';
import { PARSER_A } from './parser-a.ts';
import { PARSER_B } from './parser-b.ts';
import { SEO } from './seo.ts';
import { SEO_MORE } from './seo-more.ts';
import { LINT } from './lint.ts';
import { SITEMAP } from './sitemap.ts';
import { FETCH } from './fetch.ts';
import { SECURITY } from './security.ts';
import { RECON } from './recon.ts';

export const DOCS: Record<string, Doc> = { ...PARSER_A, ...PARSER_B, ...SEO, ...SEO_MORE, ...LINT, ...SITEMAP, ...FETCH, ...SECURITY, ...RECON };
