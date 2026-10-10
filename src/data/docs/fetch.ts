// How the file is served: findings about the answer the server gave when
// robots.txt was fetched, not about what is written inside it. The status, the
// media type, the redirect chain and the body that came back.

import type { Doc } from '../../lib/docs.ts';

export const FETCH: Record<string, Doc> = {
  'fetch.warn.contentType': {
    title: 'robots.txt is served with the wrong content type',
    summary: 'The file arrives as text/html or another media type instead of text/plain, and a crawler is allowed to ignore everything in it.',
    what: 'sus.bot reads the Content-Type header of the response and compares the media type with text/plain, ignoring the charset. Anything else is reported: text/html from a template engine, application/octet-stream from a download handler, text/xml from a misrouted static directory. The rules themselves may be perfect. This finding is about the header the server put in front of them.',
    why: 'RFC 9309 describes robots.txt as a plain text file, so a crawler handed HTML or a binary stream may discard the response and crawl as though there were no file. Every Disallow line stops applying, and nothing in the server logs says so, because the request succeeded with status 200 and the right number of bytes.',
    fix: 'Serve the file as text/plain with UTF-8 as the charset. Usually that is one line in the server configuration, or a static-file rule that keeps the path away from the application. Check the response with curl -I afterwards, because a CDN or a caching plugin can rewrite the header again on the way out.',
    example: {
      wrong: 'Content-Type: text/html; charset=utf-8',
      right: 'Content-Type: text/plain; charset=utf-8',
    },
    also: ['fetch.warn.contentTypeMissing', 'fetch.warn.htmlBody'],
  },
  'fetch.warn.contentTypeMissing': {
    title: 'robots.txt is served without a Content-Type header',
    summary: 'The response names no media type, so every crawler guesses what the file is, and a crawler that guesses wrong ignores the rules.',
    what: 'sus.bot reports this when the answer has status 200 and no Content-Type header at all, or one that is empty. It comes from a hand-written route that writes the body itself, a storage bucket holding the file with no metadata, or a proxy that strips headers it was not told to keep.',
    why: 'A crawler with no media type either sniffs the body or treats the answer as a file to download. Sniffing usually works, which is why this sits unnoticed for years, and then one crawler decides the answer is not plain text and reads the site as having no rules. The file is right, the delivery is not.',
    fix: 'Set the header explicitly on the response rather than relying on a framework default. On object storage the media type is metadata on the stored object, so set it and upload the file again. After the change, read the headers back from outside your network, not from the origin.',
    example: {
      right: 'Content-Type: text/plain; charset=utf-8',
    },
    also: ['fetch.warn.contentType', 'fetch.warn.htmlBody'],
  },
  'fetch.warn.forbidden': {
    title: 'robots.txt answers 401 or 403, so none of your rules apply',
    summary: 'A login wall or a blocking rule in front of robots.txt makes crawlers read the site as having no restrictions at all.',
    what: 'sus.bot reports this when the fetch came back 401 Unauthorized or 403 Forbidden. The usual causes are basic auth over a whole staging host, a firewall rule that refuses requests without browser-like headers, a bot manager that turns away the crawler by its user agent, or file permissions that leave robots.txt unreadable.',
    why: 'RFC 9309 reads a 4xx answer as permission to crawl everything. A host behind basic auth is therefore treated as wide open, so whatever is reachable without the login can be crawled and indexed. Your Disallow lines for an admin path or an export folder stop counting the moment the file stops being readable.',
    fix: 'Let anybody read /robots.txt, including a crawler with no cookies and an unfamiliar user agent. Put an exception for that one path in front of the authentication and the bot manager, then fetch it from outside your network to confirm. A host that should stay out of search gets a readable file with a full Disallow instead.',
    example: {
      right: '<Files "robots.txt">\n    AuthType None\n    Require all granted\n</Files>',
    },
    also: ['fetch.warn.serverError', 'fetch.warn.rateLimited'],
  },
  'fetch.warn.htmlBody': {
    title: 'An HTML page is served at /robots.txt',
    summary: 'The address answers 200 with a web page, usually an error template or a catch-all route, and crawlers read that as a site with no rules.',
    what: 'sus.bot looks at the start of the body and reports this when it begins with a doctype or an html tag. The request reached the application instead of a file: a friendly error page returned with status 200, a single-page app catch-all, or a CMS route that answers every unknown path with the home page.',
    why: 'There are no Disallow lines in a page of markup, so the site is read as unrestricted. Because the status is 200 nothing raises a flag: the uptime check is green, the address loads in a browser, and the only symptom is that the rules are ignored. It also hides the fact that the file was never deployed.',
    fix: 'Put a real robots.txt at the root and make sure that path is handled before the application catch-all. Check the status and the first line of the body, not only that the address loads. If the site should have no file, answer 404, which crawlers understand, rather than a page with status 200.',
    example: {
      wrong: '<!DOCTYPE html>\n<html lang="en">\n<head><title>Page not found</title></head>',
      right: 'User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/sitemap.xml',
    },
    also: ['parser.htmlFragment', 'fetch.warn.contentType', 'fetch.warn.notRobotsPath'],
  },
  'fetch.warn.notRobotsPath': {
    title: 'The redirect ends somewhere other than /robots.txt',
    summary: 'robots.txt redirects to another path, and crawlers read whatever is served there as the rules for the whole site.',
    what: 'sus.bot follows the redirects and compares the path of the address it ended at with /robots.txt. This fires when the chain finishes at /robots, at /static/robots.txt, at /robots.txt/ with a slash added by a rewrite, or at a landing page. Whatever is served there is parsed as the file, correct or not.',
    why: 'If the target holds the rules you meant, nothing breaks today, but the file now lives at an address nobody looks at, and the next person who edits /robots.txt edits a redirect. If the target is a landing page or a directory listing, the site is read as having no rules, and the lines protecting an export folder stop applying.',
    fix: 'Serve the file at /robots.txt itself. Where a redirect cannot be avoided, point it at that same path on the destination host, and find the rewrite that adds or strips the trailing slash. Check the final address in the response, not only the status code, because a chain that ends at 200 can still end in the wrong place.',
    example: {
      wrong: 'Location: https://example.com/static/robots',
      right: 'Location: https://www.example.com/robots.txt',
    },
    also: ['fetch.warn.redirectOtherHost', 'fetch.warn.redirectLimit'],
  },
  'fetch.warn.rateLimited': {
    title: 'robots.txt answers 429 and crawling stops across the site',
    summary: 'A rate limiter counts the request for robots.txt like any other request, and the 429 it returns reads to Google as block everything.',
    what: 'sus.bot reports this when the fetch came back 429 Too Many Requests. Behind it is usually a rate limiter, a bot manager or a CDN rule applied to every path on the host, counting robots.txt against the same budget as product pages. A crawler fetches the file before every run, so it meets the limit first.',
    why: 'RFC 9309 puts 429 with the server errors, so a crawler treats the site as off limits for the moment instead of retrying one address. Crawling stops while it lasts, which means new pages are not picked up and changed pages are not refreshed. Nothing looks broken, because the limiter is doing what it was configured to do.',
    fix: 'Exempt /robots.txt from rate limiting, or give that one path a budget far above the rest of the site. The file is small and cacheable, so answering every request for it costs almost nothing. If the limiter lives in a CDN, cache the file at the edge so the requests never reach the limiter at all.',
    also: ['fetch.warn.serverError', 'fetch.warn.forbidden'],
  },
  'fetch.warn.redirectLimit': {
    title: 'robots.txt sits behind more than five redirects',
    summary: 'The chain to the file is longer than a crawler has to follow, so it gives up and treats the site as having no robots.txt.',
    what: 'sus.bot reports this when the fetch gave up after five hops without reaching a final answer. Long chains build up one rule at a time: http to https, the bare domain to www, a country redirect, a trailing-slash rewrite, a legacy path kept alive after a migration. Each hop is correct on its own.',
    why: 'RFC 9309 asks a crawler to follow at least five redirects and lets it stop there. A crawler that stops has no file, so nothing on the site is restricted and every address is fair game, including the paths the Disallow lines were written for. The chain also costs a round trip per hop on every check.',
    fix: 'Collapse the chain so /robots.txt is one hop away from any starting point, or none. Redirect straight to the final host and scheme rather than passing through each rule in turn, and list the hops with curl -IL to see which rewrite is adding the ones you did not expect.',
    also: ['fetch.warn.redirectSameSite', 'fetch.warn.notRobotsPath'],
  },
  'fetch.warn.redirectOtherHost': {
    title: 'robots.txt redirects to a different host, whose rules take over',
    summary: 'The file for one host is fetched from another, so the host you checked is governed by rules written for somewhere else.',
    what: 'sus.bot compares the host it asked, including the port, with the host it ended at, and reports this when the two differ by more than a www prefix. It happens when a parked domain, a country domain or an old brand points at the main site, or when a shop host sends every unknown path to the corporate site.',
    why: 'Crawlers apply the file they land on, so the rules of the other host now govern this one, Sitemap lines included, and those point somewhere else again. A Disallow written for one URL layout rarely matches the other, so paths meant to stay out of search are crawled and pages meant to be indexed can be blocked.',
    fix: 'Give every host that answers requests its own robots.txt, written for the paths that host serves, even when the rest of it redirects. A host that should not be in search at all gets its own file with a full Disallow, which is a different statement from borrowing the rules of another host.',
    also: ['fetch.warn.redirectSameSite', 'fetch.warn.notRobotsPath', 'sitemap.crossDomain'],
  },
  'fetch.warn.redirectSameSite': {
    title: 'robots.txt redirects to the www or https name of the same site',
    summary: 'The file is reached through a redirect to the same site under its other host name, which crawlers follow, so nothing is lost.',
    what: 'sus.bot reports this for information when the host it asked and the host it ended at differ only by the www prefix, after a redirect to the canonical name or to https. It is not a fault: both names are the same site, and RFC 9309 expects a crawler to follow at least five hops.',
    why: 'No traffic is at risk here. It is worth knowing for two reasons. The file you edit has to be the one on the host that actually serves it, because a file on the name that only redirects is never read. And every hop here is one fewer left over when the next redirect rule is added.',
    fix: 'Nothing has to change. Keep the number of hops small and edit the file on the host the redirect ends at. If you would rather lose the extra round trip, serve robots.txt directly on both names, with the same content, and keep the redirect for everything else.',
    also: ['fetch.warn.redirectOtherHost', 'fetch.warn.redirectLimit'],
  },
  'fetch.warn.serverError': {
    title: 'robots.txt answers with a server error and crawling stops',
    summary: 'A status from 500 to 599 for robots.txt reads to Google as block everything, so crawling pauses for the whole site while the error lasts.',
    what: 'sus.bot reports this when the fetch came back with a status in the 500 range, and the body is thrown away before parsing, because crawlers ignore it too. The file is often generated by the application rather than served as a file, so a database timeout, a half-finished deploy or a broken plugin takes robots.txt down with everything else.',
    why: 'RFC 9309 treats an unreachable robots.txt as a full disallow, and crawling stops while it lasts. New pages are not discovered and changed pages are not refreshed. A few minutes of errors that a visitor would barely notice land on crawling as though the whole site had been blocked on purpose, and the recovery is slower than the outage.',
    fix: 'Serve robots.txt as a static file so it survives whatever breaks in the application, and from a path a CDN can answer out of cache. Add the address to your uptime checks with the status and the first line of the body as the condition, so an error there is noticed as fast as one on the home page.',
    also: ['fetch.warn.rateLimited', 'fetch.warn.forbidden', 'parser.serverErrorOutput'],
  },
};
