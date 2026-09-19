// What every page component receives: the language, where the page lives,
// its strings and the language links.

import type { Strings, Alternates } from '../lib/site.ts';

export interface PageContext {
  /** Language code of the page. */
  lang: string;
  /** Site path of the page ("/", "/de/", "/about/"). */
  path: string;
  /** Prefix for site assets: "" at the root, "../" one level down. */
  assets: string;
  /** Prefix for links to sections of the home page ("" on a home page). */
  home: string;
  s: Strings;
  /** Languages with a complete site, in switcher order. */
  active: string[];
  /** This page in each language it exists in. */
  alternates: Alternates;
}
