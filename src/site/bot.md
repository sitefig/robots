---
layout: page
title: The sus.bot crawler
description: What susbot fetches, why, and how to allow or block it. It reads /robots.txt and nothing else.
translationKey: bot
---

If `susbot` appeared in your server log, this page explains what it did and why. It asked for one file, `/robots.txt`, and read nothing else on your site.

sus.bot is a robots.txt checker run by [Sitefig](https://sitefig.eu/). It is free to use at [sus.bot](https://sus.bot/).

## The user agents it sends

```
Mozilla/5.0 (compatible; susbot/2.2; +https://sus.bot/bot/)
Mozilla/5.0 (compatible; susbot-check/2.2; +https://sus.bot/bot/)
```

The first is our own crawl. The second is a check that a person asked for, usually the owner of the site, by typing an address into sus.bot.

A third case looks different in your log. When someone runs an access check for their site, sus.bot fetches `/robots.txt` again with the real user agent of each crawler it knows, GPTBot and Googlebot among them, to show whether your server answers those crawlers differently from a browser. Those requests carry the crawler's own string, not ours, because that is the whole point of the test. They only ever happen when a person starts that check, and they still only ask for `/robots.txt`.

## What it fetches

Only `/robots.txt`, over HTTP GET. It follows up to five redirects and reads at most 512 KiB. It never requests a page, an image, a sitemap or an API, and it submits no forms. Nothing on your site is crawled, indexed or copied beyond that one file.

## Why

**Analysis.** Twice a year sus.bot reads the robots.txt of a public list of domains and publishes what it finds as an open dataset: which crawlers sites allow, which they block, how common each mistake is, how the AI crawlers are treated. The published figures are counts across millions of sites. The dataset carries the files themselves, which were already public at that address.

**Checks.** Every day sus.bot rechecks a small list of sites whose robots.txt is tracked over time, so a change can be reported, and it fetches on demand whenever someone asks it to check a site.

## Rate

It asks for one file per site and moves on. A site is fetched once per run, a few times a year for the analysis, daily for a tracked site, and once per check someone asks for. If a fetch fails it is not retried in the same run. Fetches come from GitHub Actions and Cloudflare, so there is no fixed address range to allow-list; the user agent is the identifier.

## Allowing or blocking it

susbot follows RFC 9309, the robots.txt standard. To keep it out:

```
User-agent: susbot
Disallow: /
```

That is honoured for everything except `/robots.txt` itself, which the standard exempts, because a crawler has to read the file to learn it is unwelcome. Since that file is the only thing susbot asks for, a block stops nothing in practice, but it is recorded and respected everywhere else. If you would rather the file were left out of the published dataset, write to [Sitefig](https://sitefig.eu/) with the domain and it is removed.

Blocking `susbot` does not affect the checks you run yourself on your own site.

## Verifying a request is ours

Anything can copy a user agent string, so treat a `susbot` line in your log as a claim, not proof. The requests come from GitHub Actions runners and Cloudflare, whose address ranges both operators publish and both change. If a request claiming to be susbot asks for anything other than `/robots.txt`, it is not us.

## Contact

Questions, or a domain you want left out: [Sitefig](https://sitefig.eu/). The code is open, so you can also read exactly what it does: [github.com/sitefig/robots](https://github.com/sitefig/robots).
