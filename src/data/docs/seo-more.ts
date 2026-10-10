// Search traffic, continued: the broad blocks that cut crawlers off from the
// files a page is made of, and the rules that never decide anything because
// another rule in the same file already did. See seo.ts for the first three.

import type { Doc } from '../../lib/docs.ts';

export const SEO_MORE: Record<string, Doc> = {
  'seo.assetBlock': {
    title: 'Blocking /js/ or /css/ stops search engines rendering the page',
    summary: 'A Disallow on the script or stylesheet folder keeps every crawler without its own rules from loading the files the page needs to look like a page.',
    what: 'The check reads the rules a crawler without its own group has to follow, and fires when one of them names the script or the stylesheet folder, with or without the trailing slash. sus.bot asks for a file inside that folder against the whole group first, so a folder that a longer Allow has already reopened is not reported.',
    why: 'A search engine renders the page before it judges it. Without the script that builds the navigation or the stylesheet that lays out the text, it sees a page no visitor sees: the content that arrives by script is missing, and the layout it measures on a phone is whatever the bare HTML does on its own.',
    fix: 'Take the folder out of the rules. If one file in it must not be fetched, name that file rather than the folder. When a build writes source maps or private configuration into the same folder, move those into a folder of their own and block that one.',
    example: {
      wrong: 'User-agent: *\nDisallow: /js/\nDisallow: /css/',
      right: 'User-agent: *\nDisallow: /js/build-config/',
    },
    also: ['seo.cssJsBlock', 'seo.imageBlock', 'seo.trailingSlash'],
  },
  'seo.cssJsBlock': {
    title: 'A rule that ends in .css or .js blocks the files that render the page',
    summary: 'An extension rule like Disallow: /*.js$ covers every script on the site, including the one that builds the page.',
    what: 'sus.bot reports this when a rule the default crawlers follow ends in .css, .js, .css$ or .js$, and a file matching it is still blocked once every rule in the group has been read. The rule does not have to name a folder: an extension pattern reaches every script and stylesheet wherever it is served from.',
    why: 'The rule is usually aimed at one bundle or one source map and takes the theme, the framework and every third-party widget with it. What a search engine then renders is unstyled text in one column, with nothing the scripts would have inserted, and that is the version of the page it judges and keeps.',
    fix: 'Delete the extension rule. If a build artefact should stay out of the index, block the folder it is written to, which is a rule the next reader can check against a real URL. If the worry was bandwidth rather than indexing, caching headers and the CDN are where that is handled.',
    example: {
      wrong: 'User-agent: *\nDisallow: /*.js$',
      right: 'User-agent: *\nDisallow: /assets/sourcemaps/',
    },
    also: ['seo.assetBlock', 'seo.imageBlock'],
  },
  'seo.imageBlock': {
    title: 'Blocking the image folder takes the pictures out of image search',
    summary: 'A Disallow on /images/, /uploads/ or an image extension keeps every crawler without its own rules from fetching the pictures, so none of them can show one.',
    what: 'The check fires when a rule the default crawlers follow names one of the usual image folders, /images/, /img/ or /wp-content/uploads/ among them, or ends in an image extension, and a picture under it really is blocked once the whole group has been applied.',
    why: 'An image search engine cannot show a picture it was never allowed to fetch, and a result that wants a thumbnail does not get one. On a shop or a recipe site the photo is the part people click. The pages themselves stay indexed, which is why nobody notices: only the pictures leave.',
    fix: 'Leave the uploads folder open and block the one folder inside it that holds files you do not want fetched, invoices or customer uploads for instance. If the aim was to stop other sites hotlinking the pictures, that is a referrer rule at the server, not a rule here.',
    example: {
      wrong: 'User-agent: *\nDisallow: /wp-content/uploads/',
      right: 'User-agent: *\nDisallow: /wp-content/uploads/invoices/',
    },
    also: ['seo.assetBlock', 'seo.cssJsBlock'],
  },
  'seo.caseSensitive': {
    title: 'A rule with a capital letter in it only covers URLs written that way',
    summary: 'Paths in robots.txt are compared character by character, so Disallow: /Admin/ leaves /admin/ open.',
    what: 'sus.bot reports every rule whose path holds an uppercase letter, and says what happens to the same address in lower case once the rest of the file has been applied. A crawler compares the rule with the path it is about to request letter by letter, so one capital is enough for the two to miss each other.',
    why: 'Which way it costs you depends on the rule. A Disallow written with a capital leaves the folder it names crawlable, so the login page or the internal search results stay in the index. An Allow written with a capital fails to reopen what a broader Disallow closed, and the section it was written for stays missing.',
    fix: 'Open the site, copy an address out of the browser and paste the path into the rule. Where the server answers on both casings, write a rule for each and then fix the duplicate at the source with a redirect, because one page on two casings is a duplicate content problem of its own.',
    example: {
      wrong: 'User-agent: *\nDisallow: /Admin/',
      right: 'User-agent: *\nDisallow: /admin/',
    },
    also: ['seo.trailingSlash', 'lint.absoluteUrl'],
  },
  'seo.duplicate': {
    title: 'The same rule is written twice',
    summary: 'A line repeats a rule the file already has, in the same group or in another group for the same crawler, so it changes nothing.',
    what: 'Two lines carry the same directive and the same path. sus.bot names the line the rule first appeared on, and when the two sit in different groups that name the same crawler it says so, because the rules of all those groups are read as one list.',
    why: 'The repeat costs no traffic. What it costs is trust in the file: a copied line is usually the mark of two people, or a plugin and a person, editing without reading. The next change lands on one of the two copies, nothing happens, and the file has taught its reader that editing it does not work.',
    fix: 'Delete the later line. If the copies sit in two groups for the same crawler, merge the groups so that every rule for that crawler is in one block, in the order somebody would read them. Find out which system wrote each copy first, because a line a plugin generates comes back on the next deploy.',
    example: {
      wrong: 'User-agent: *\nDisallow: /tmp/\nDisallow: /cart/\nDisallow: /tmp/',
      right: 'User-agent: *\nDisallow: /tmp/\nDisallow: /cart/',
    },
    also: ['seo.redundant', 'seo.mergedScope'],
  },
  'seo.redundant': {
    title: 'A rule that a broader rule of the same kind already covers',
    summary: 'Disallow: /admin/users/ under Disallow: /admin/ adds nothing, because every URL it matches is blocked already.',
    what: 'sus.bot compares each rule with the others its crawlers follow and reports the ones whose every match is covered by a rule of the same kind that reaches further. The broader line is named with its number, and rules merged in from another group for the same crawler are part of the comparison.',
    why: 'Nothing is lost today. The risk is in the next edit: somebody deletes or narrows the broad rule, sees the narrow ones still sitting there and reads the area as covered, while those lines only ever named a part of it. A file full of redundant rules also buries the few lines that decide anything.',
    fix: 'Delete the narrow rule, or, if that is the one you meant to keep, narrow the broad rule to what it should really block. Then check both paths in the tester on the home page, which answers for a real URL instead of for a pattern.',
    example: {
      wrong: 'User-agent: *\nDisallow: /admin/\nDisallow: /admin/users/',
      right: 'User-agent: *\nDisallow: /admin/',
    },
    also: ['seo.duplicate', 'seo.overridden'],
  },
  'seo.overridden': {
    title: 'A rule that another rule beats on every URL it matches',
    summary: 'The line decides nothing, because a rule of the opposite kind wins everywhere it applies, so the path stays open or stays blocked.',
    what: 'Crawlers follow the longest matching rule, and an Allow wins a tie with a Disallow of the same length. sus.bot reports a line when the opposite rule that beats it covers every URL the line matches, and says which line won and whether the path ends up open or blocked.',
    why: 'This is the one that costs pages, and it does it in both directions. A Disallow that loses leaves a folder you meant to hide crawlable, which is how internal search results and checkout pages reach the index. An Allow that loses leaves a section you meant to open blocked, so pages written to be found cannot be.',
    fix: 'Decide which of the two should win, and make that one the longer pattern or delete the other. Where a folder is blocked and one file in it has to stay reachable, the Allow must name the file rather than the folder, because an Allow as long as the Disallow wins the whole folder back.',
    example: {
      wrong: 'User-agent: *\nDisallow: /private/\nAllow: /private/',
      right: 'User-agent: *\nDisallow: /private/\nAllow: /private/summary.pdf',
    },
    also: ['seo.redundant', 'seo.duplicate', 'seo.mergedScope'],
  },
  'seo.mergedScope': {
    title: 'Rules from two groups naming the same crawler are read as one set',
    summary: 'A note added to a duplicate, redundant or overridden finding, to say the two rules came out of different groups that crawlers read as one.',
    what: 'sus.bot adds this to another finding rather than reporting it on its own. When a crawler name appears in two groups, every rule of both applies to it, so the rules are compared across the groups and the finding says which name they were merged under.',
    why: 'Splitting the rules for one crawler over two blocks is how a file comes to contradict itself. Whoever edits the second block cannot see the first, writes an Allow that a Disallow further up already beats, and then reads the file as if the block they edited were all of it. Older crawlers may follow only one group.',
    fix: 'Keep one group per crawler name, with all of its rules inside it. Where two systems write the file, a plugin and a hand-edited block for instance, let one of them own the group for a crawler. If both groups have to stay, read them as a single list before deciding what any rule in them does.',
    example: {
      wrong: 'User-agent: *\nDisallow: /search/\n\nUser-agent: *\nAllow: /search/',
      right: 'User-agent: *\nDisallow: /search/\nAllow: /search/help/',
    },
    also: ['parser.tokenRepeated', 'seo.overridden', 'seo.duplicate'],
  },
};
