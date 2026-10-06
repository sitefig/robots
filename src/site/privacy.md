---
layout: page
title: Privacy
description: What sus.bot collects, what it does not, and how to change your analytics choice. The check itself runs in your browser.
translationKey: privacy
---

sus.bot is run by [Sitefig](https://sitefig.eu/), a company registered in Luxembourg. This page says what happens to information when you use [sus.bot](https://sus.bot/). If anything here is unclear or you want something removed, write to [receipt@sus.bot](mailto:receipt@sus.bot).

There is no account, no sign-up and no payment on this site.

## The check itself

The analysis runs in your browser. The engine is WebAssembly compiled from the same Rust code as the command line tool, and it is downloaded to your machine and run there. No part of a robots.txt is sent to us for analysis, and nothing you paste into the page leaves it.

Two things do reach a server of ours, and only while you are using the page:

- **The address you check.** Browsers refuse to read another site's `/robots.txt` directly unless that site allows it, and they will not let a page send a crawler's user agent. So when the direct attempt fails, the address goes to a small Cloudflare Worker of ours, which fetches the file and hands it back. It keeps no database and writes no record of who asked. The request appears in Cloudflare's operational logs, which hold it for a few days and which we read to see whether the proxy is working.
- **Nothing else.** The worker refuses requests from any other website, refuses private and local addresses, and reads at most 512 KiB of the file.

The last five addresses you checked are kept in your own browser, in `localStorage`, so the page can offer them again. They are never sent anywhere. Clearing them is the "Clear" button under the form, or clearing site data for sus.bot.

Your theme and language choices are stored the same way, in your browser only.

## Analytics, only if you say yes

We would like to know how many people use the site and which pages they reach. That is Google Analytics 4, and it is **off until you allow it**: no cookie is set, no request is made to Google, and no page view is sent before you choose. If you refuse, or close the question without answering, nothing is loaded and you are not asked again.

If you do allow it, what Google receives is the usual: the page, the referrer, a randomly generated identifier in a cookie, your approximate location from your IP address, and the device and browser. On top of that we record four events, so we can tell which parts of the site are worth keeping: that a check ran, and what the verdict was; that an export was copied; that the crawler access check was used; and that one of the offers was clicked.

**The address you checked is never part of any of that.** The page puts it in the query string, so the analytics tag is told to report the page without its query string, and no event carries a domain, a hostname or the contents of a file. The figures we see are counts and words from a fixed list, never a list of the sites anyone looked at.

Google acts as our processor for this and may process the data outside the EU. We do not use Google Signals, advertising features or remarketing, and we do not combine this with anything else.

**To change your mind**, use "Analytics choice" in the footer of any page. The question comes back with nothing preselected, and the new answer takes effect at once. Refusing after having agreed stops anything further being sent; to remove the cookie itself, clear site data for sus.bot in your browser.

## Your rights

Under the GDPR you can ask what we hold about you, ask for it to be corrected or deleted, object to it being processed, and complain to a supervisory authority. In Luxembourg that is the [Commission nationale pour la protection des données](https://cnpd.public.lu/). Write to [receipt@sus.bot](mailto:receipt@sus.bot) and we will answer within a month.

Because there is no account, we usually hold nothing that identifies you. If you allowed analytics, tell us roughly when you visited and we will ask Google to delete what it has for that browser.

## Hosting, and the other repositories

The site is static and served by GitHub Pages, which sees the usual web server request data. The proxy runs on Cloudflare Workers. Neither is given anything about you beyond the request itself.

The code for this page, for the engine and for the command line tool is public. The command line tool and the GitHub Action fetch robots.txt themselves and never contact us at all, which is the most private way to use any of this.

This page was last changed on 27 September 2026.
