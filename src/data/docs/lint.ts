// Rules that do nothing: lines that read as rules and are not, because they
// name a full address instead of a path, sit behind a hash, or block tools
// that never read robots.txt in the first place.

import type { Doc } from '../../lib/docs.ts';

export const LINT: Record<string, Doc> = {
  'lint.absoluteUrl': {
    title: 'A rule with a full address in it matches no URL',
    summary: 'Allow and Disallow take a path, so Disallow: https://www.example.com/admin/ blocks nothing and publishes the hostname on the way.',
    what: 'sus.bot reports any Allow or Disallow whose value starts with http:// or https://. A crawler compares that value with the path of the URL it is about to request, and a path starts with a slash, so a value that starts with a scheme can never match one. The finding also shows what becomes of the path once the rest of the file is read.',
    why: 'Two costs at once. The folder the line names stays crawlable, while the file reads as though it were closed, and this is the sort of rule people write for an admin area or an export folder. The line also publishes a hostname in a file anyone can read, so a staging or internal host spelled out in full is now public.',
    fix: 'Write the path on its own, from the first slash. Sitemap is the one directive that takes a full address. If the hostname belonged to a staging server, take it out of the file and keep that server off the public internet with a login or an IP restriction, because this rule was never hiding it.',
    example: {
      wrong: 'User-agent: *\nDisallow: https://www.example.com/admin/',
      right: 'User-agent: *\nDisallow: /admin/',
    },
    also: ['parser.bareUrl', 'security.staging', 'recon.hosts'],
  },
  'lint.commentedRule': {
    title: 'A rule that is commented out does nothing',
    summary: 'A line that starts with a hash is a comment, so a Disallow behind one blocks nothing, however much it reads like a rule.',
    what: 'The line holds nothing but a comment, and the comment begins with a directive name: Disallow, Allow, User-agent, Sitemap or Crawl-delay. sus.bot reports it with the directive it found, because a commented rule reads as a rule to everybody except a crawler. How much space sits after the hash makes no difference.',
    why: 'The cost is what the file makes people believe. A rule switched off for a migration and never switched back leaves the folder it named open, and the next person to read the file counts that folder as blocked and goes looking for the problem elsewhere. A Disallow: / kept as a comment is also one careless edit away from blocking the whole site.',
    fix: 'Delete the line if the rule is finished, or take the hash off if it was meant to be live. Where a line is kept for the next migration, write it as a sentence instead of as a directive, so that nobody can read it as a rule or switch it on by removing one character.',
    example: {
      wrong: 'User-agent: *\n# Disallow: /checkout/',
      right: 'User-agent: *\nDisallow: /checkout/',
    },
    also: ['parser.gluedComment', 'parser.starBlocksAll'],
  },
  'lint.legacyBadBots': {
    title: 'A long block list of 1990s download tools stops nobody',
    summary: 'The list of scrapers, offline downloaders and e-mail harvesters has never blocked anything, because none of those tools read robots.txt.',
    what: 'sus.bot holds a list of offline downloaders, link grabbers and e-mail harvesters from the 1990s, names like Teleport Pro, WebZip, EmailSiphon and Zeus, which have been copied from one robots.txt to the next for decades. The finding appears once the file names at least ten of them, and points at the line the list starts on.',
    why: 'robots.txt is a request, and a tool written to copy a whole site was never going to honour it, so the list has turned nobody away since the day it was pasted in. What it costs is the file itself: the rules that do decide something sit under a hundred lines nobody reads, and a rule added in a hurry lands in the wrong group.',
    fix: 'Delete the block, keeping any crawler you have really seen in the logs and want to turn away. A scraper that ignores robots.txt is stopped where it can be stopped: a rate limit, a user agent rule or a firewall rule at the server or the CDN.',
    example: {
      wrong: 'User-agent: EmailSiphon\nDisallow: /\n\nUser-agent: WebZip\nDisallow: /\n\nUser-agent: Teleport Pro\nDisallow: /',
      right: 'User-agent: *\nDisallow: /cart/\n\nSitemap: https://www.example.com/sitemap.xml',
    },
    also: ['lint.commentedRule', 'parser.tokenRepeated'],
  },
};
