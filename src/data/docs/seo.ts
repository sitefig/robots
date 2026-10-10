// Search traffic: the rules that are syntactically fine and still cost you
// pages. See src/data/docs/index.ts for the house rules.

import type { Doc } from '../../lib/docs.ts';

export const SEO: Record<string, Doc> = {
  'seo.trailingSlash': {
    title: 'A rule without a trailing slash blocks more than the folder',
    summary: 'Disallow: /shop has no trailing slash, so it also blocks /shopping, /shop-sale and every other path that starts with those five characters.',
    what: 'A rule in robots.txt is a prefix, not a folder. "Disallow: /shop" matches every URL whose path begins with /shop, which includes /shop/, /shopping/, /shop-sale and /shoplifting-policy. sus.bot reports this when a rule names what looks like a directory and stops short of the slash, so the rule reaches further than the name suggests.',
    why: 'The pages that disappear are the ones nobody was looking at: a category called /shopping while you meant /shop, a /news-archive while you meant /news. They drop out of search results and nothing announces it, because robots.txt never reports an error. The traffic goes first and the question comes months later.',
    fix: 'Decide which of the two you meant. "Disallow: /shop/" blocks the folder and nothing else. "Disallow: /shop$" blocks that one URL exactly. Leave the rule as it is only when you really do want every path that starts with those characters.',
    example: {
      wrong: 'User-agent: *\nDisallow: /shop',
      right: 'User-agent: *\nDisallow: /shop/',
    },
    also: ['seo.caseSensitive', 'seo.queryStringBlock'],
  },
  'seo.selfBlock': {
    title: 'The file blocks itself',
    summary: 'A rule matches /robots.txt, which does nothing useful and tells anyone reading that the rules were never tested.',
    what: 'A Disallow rule in the file matches the path of the file itself, usually as a side effect of a broad rule like "Disallow: /r" or "Disallow: /*.txt". sus.bot reports it because the rule is both pointless and a sign that nothing was checked against a real URL.',
    why: 'Crawlers fetch robots.txt before they read it, so the rule stops nobody. What it does is make the file look unmaintained to anyone who reads it, and a rule broad enough to catch /robots.txt by accident is broad enough to catch pages you wanted indexed.',
    fix: 'Find the rule that matches and narrow it. If it was meant to block text files, name the folder they live in rather than the extension.',
    example: {
      wrong: 'User-agent: *\nDisallow: /*.txt',
      right: 'User-agent: *\nDisallow: /exports/',
    },
    also: ['seo.trailingSlash'],
  },
  'seo.queryStringBlock': {
    title: 'Blocking every URL with a question mark removes your filtered pages',
    summary: 'Disallow: /*? blocks every address that carries a parameter, which is most paginated, filtered and tracked pages on a shop.',
    what: 'The rule matches any path containing a question mark, so it covers ?page=2, ?colour=blue, ?utm_source=newsletter and every other parameter at once. sus.bot reports it because the rule is almost always aimed at one problem and catches the whole site.',
    why: 'On a shop, pagination and filters are where the long tail lives: the second page of a category, the size and colour combinations people actually search for. Blocking them keeps search engines on the first page of each category, and a product only reachable through a filter becomes unreachable.',
    fix: 'Block the parameters that duplicate content, not the question mark. Name them one at a time, and use canonical links rather than robots.txt for near-duplicates, because a blocked page cannot tell a search engine which URL to prefer.',
    example: {
      wrong: 'User-agent: *\nDisallow: /*?',
      right: 'User-agent: *\nDisallow: /*?sessionid=\nDisallow: /*?sort=',
    },
    also: ['seo.trailingSlash', 'seo.assetBlock'],
  },
};
