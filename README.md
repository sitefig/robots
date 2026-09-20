# sus.bot

A robots.txt audit: what the file means for search engines and AI crawlers, what is wrong with it, what it leaks, and what to do about it. Use it at [sus.bot](https://sus.bot/) in all 24 official EU languages, on the command line, or as a GitHub Action.

The engine is one Rust crate, compiled to WebAssembly for the browser and to a native binary for CI, so every check behaves the same everywhere. Every rule it applies comes from a TOML file you can override.

## What you get

- a summary of what the file means for crawlers without their own group,
- an AI scraping status card: one pill per AI training crawler (GPTBot, ClaudeBot, CCBot, Bytespider, Google-Extended, Diffbot, and more) and per AI search crawler, each marked Allowed, Restricted or Blocked,
- a per-crawler table for search engines, AI training, AI search, advertising, social previewers, SEO tools, archives and scrapers, 134 crawlers in all,
- a path tester that shows which rule matched and why,
- a real access check (browser and CLI) that refetches the file with each crawler's genuine User-Agent and highlights servers that answer differently to bots,
- lint warnings: rules before any User-agent, misspelt fields (found by edit distance, so `Disllow` and `Diasllow` are read as the rule they meant), unsupported directives, and so on,
- what does not belong in the file at all: HTML markup, caching-plugin output, PHP warnings and stack traces, injected spam scripts, UTF-16 text, invisible characters and look-alike letters in directive names, and rules silently swallowed by a missing line break,
- directives that are not RFC 9309 named for what they are: the AI-policy proposals (`LLM-Policy`, `TDM-Reservation`, `License`), Cloudflare's `Content-Signal` with its values checked, meta-robots values written as directives, and bare URLs meant as sitemaps,
- how the file was served: 5xx and 429 (which Google reads as "block everything"), 401 and 403 (which crawlers read as "no restrictions"), a Content-Type other than text/plain, and an HTML page served at /robots.txt,
- sitemap checks: http sitemaps on https sites, sitemaps on another domain, other-subdomain notes, duplicates,
- SEO trap warnings: the trailing-slash trap (`Disallow: /shop` also blocks `/shopping`), self-blocking `/robots.txt`, case-sensitivity notes, redundant, duplicated or always-overridden rules, and what the `*` group blocks for everyone: every query string, scripts and styles, images,
- security notes: Disallow rules that advertise admin panels, staging sites, backups, config files, private APIs, user data, version files, installers and server internals; a path that belongs to the detected platform's stock file is kept but marked as a note, because every site on that platform publishes it,
- reconnaissance: the CMS or platform (about fifty signatures), the tool that wrote the file (Yoast, Wix, Shopify, Joomla, Drupal, hosting panels and more), cloud buckets and CDNs with bucket names, staging and other hostnames, API gateways, Swagger and GraphQL endpoints, data feeds and partner portals, file types with risk ratings, and the emails, names, ticket IDs and dates left in comments,
- a page for site owners at [sus.bot/bot](https://sus.bot/bot/): what the crawler fetches (only `/robots.txt`), why, and how to block it,
- exports: a client audit in Markdown or HTML, four spreadsheet tabs as CSV/TSV, and a JSON report validating against `schema/report.schema.json`.

## Command line

```
cargo install susbot                  # from crates.io (same as susbot-cli)
pip install susbot                    # from PyPI: the same command plus Python bindings
npm install -g @sitefig/susbot        # from npm: the same command plus the WebAssembly engine for JavaScript
susbot https://example.com             # summary with issues, security findings and recommended actions
susbot https://example.com --format markdown --out audit.md
susbot https://example.com --format json | jq .summary
susbot robots.txt --site-url https://example.com --config my-rules.toml --fail-on warning
susbot https://example.com --access-check   # refetch with every crawler's User-Agent
susbot --print-default-config > my-rules.toml
susbot https://example.com --lang de --locale-dir locales
```

Published packages, all the same engine and the same `susbot` command:

| Registry | Package | Contents |
| --- | --- | --- |
| crates.io | [susbot](https://crates.io/crates/susbot) | the command; [susbot-cli](https://crates.io/crates/susbot-cli) is the same crate under its long name and [susbot-core](https://crates.io/crates/susbot-core) is the engine as a Rust library |
| PyPI | [susbot](https://pypi.org/project/susbot/) | the command and Python bindings (`susbot.Analysis`), wheels for Linux, macOS and Windows |
| npm | [@sitefig/susbot](https://www.npmjs.com/package/@sitefig/susbot) | the command and the engine as WebAssembly for Node and browsers |

In Python, `susbot.Analysis(text, site_url=...)` gives the report as a dict, `allowed(user_agent, path)`, the Markdown and HTML audits, the CSV tabs and `susbot.diff(old, new)`. See [`crates/python/README.md`](crates/python/README.md). The npm package offers the same API in JavaScript (`import { Analysis } from '@sitefig/susbot'`, Node and browsers); see [`npm/susbot/README.md`](npm/susbot/README.md).

Exit codes: 0, 1 when findings reach `--fail-on` (`error`, `warning`) or `--fail-on-security` (`high`, `medium`, `low`), 2 on fetch or config errors.

### diff, track and crawl

```
susbot diff old.txt new.txt --domain example.com            # crawler flips, new sensitive paths, issues, sitemaps, text diff
susbot diff old.txt new.txt --format social --diff-url URL  # short text for a chat or social post
susbot diff old.txt new.txt --fail-on-change                # CI gate: exit 1 when the files differ
susbot track --config config/famous-100.json --data-dir data/famous-100 --summary-out out.md --webhook https://hooks.slack.com/...
susbot crawl --input top-1m.csv --limit 100000 --concurrency 64 --out susbot-census.jsonl.gz --summary summary.json
```

`track` keeps one directory per domain (`robots.txt` and `meta.json`) so git history is the change log, writes a leaderboard `README.md` into the data directory, a Markdown digest, social drafts, and posts changed domains to a Slack or Discord incoming webhook (a per-site `webhook_url` in the list wins; `--webhook-high-impact-only` limits posts to crawler flips, new high-severity paths and new errors). `crawl` audits a domain list on a thread pool and writes gzip JSON Lines (one record per domain) that DuckDB or pandas read directly.

Three workflows use them: `Track famous domains` runs daily and commits `data/famous-100`; `Monitor customers` runs every six hours against a private repository named in the `CUSTOMERS_REPO` secret, using the write deploy key in `CUSTOMERS_DEPLOY_KEY`; `sus.bot census` runs twice a year and publishes the dataset as a GitHub Release.

## GitHub Action

```yaml
- uses: sitefig/robots@main
  with:
    url: https://example.com
    config: .github/robots-audit.toml   # optional
    format: markdown                    # also lands in the job summary
    fail-on: warning
    fail-on-security: high
```

The Action builds the CLI from this repository with a cached Rust toolchain and prints the report to the log.

## Configuration

`config/default.toml` holds every rule: which checks run, the crawler list, security signatures and their severities, CMS fingerprints, cloud providers, API and data-feed patterns, file-extension risks, and comment detectors. A user file is merged on top (tables and scalars override, arrays replace). Examples:

```toml
[checks]
security = false              # skip the sensitive-path scan

[rules]
disabled = ["seo.caseSensitive", "parser.noSitemap"]
[rules.levels]
"seo.trailingSlash" = "info"

[security]
ignore = ['^/uploads/']        # never report these Disallow paths

[[security.signatures]]        # add your own (this replaces the default list; copy it to extend)
category = "admin"
severity = "high"
reason = "Our back office"
keywords = ["backoffice-v2"]

[recon.cms]
disabled = ["Blogger"]
```

The browser page always uses the default configuration; custom rules are for the CLI and the GitHub Action.

## Languages

Every language has its own URL: `https://sus.bot/de/`, `/fr/`, `/nl/`, and so on for `bg cs da de el en es et fi fr ga hr hu it lt lv mt nl pl pt ro sk sl sv`. The root is English and the `x-default`; every page lists every other language as an `hreflang` alternate and in the language menu, and `sitemap.xml` lists them all. German, French, Dutch, Spanish and Italian are translated in full, including the analysis text and exports. The other languages have the interface in their own language and the analysis text in English. Corrections are welcome as pull requests.

GitHub Pages cannot read `Accept-Language`, so the root page redirects once, client-side, to the browser's first EU language; picking a language in the menu or opening a language URL directly remembers the choice.

## Development

```
cargo test --workspace     # engine tests
npm test                   # site build, translations and locale tests
npm ci && npm run build    # WebAssembly engine, then the Eleventy site into _site/ (needs the wasm32 target and wasm-bindgen-cli)
npm start                  # rebuild the site and serve _site/ on http://localhost:8888
npm run i18n:sync          # after editing po/en.po: merge into every language, regenerate locales/*.json
npm ci && npm run a11y     # accessibility: axe-core in Chrome, html-validate, pa11y (HTML_CodeSniffer), all pages and every UI state with the worst robots.txt ever
npm run lighthouse         # Lighthouse against the live site; the deploy workflow runs it after every publish
```

Layout: `crates/core` (engine), `crates/wasm` (browser bindings), `crates/cli`, `config/default.toml`, `po/*.po` (translations; `locales/*.json` is generated from them), `src/site/` (Eleventy pages and Markdown), `src/components/` (TypeScript page components), `src/client/` (TypeScript browser code), `css/src/` (CUBE CSS on Tailwind), `tools/i18n.ts`, `worker/` (Cloudflare proxy), `schema/report.schema.json`, `examples/kitchen-sink.robots.txt` (one file that triggers every check; open `?example=kitchen-sink`).

## Deploy

GitHub Pages serves the site from the `Deploy site` workflow (source: GitHub Actions), which builds the WASM and the Eleventy site and publishes `_site/`. The site is TypeScript: components in `src/components/`, pages in `src/site/`, browser code in `src/client/`. To add a page, put a Markdown file with `layout: page` and a `title` in its front matter under `src/site/` (a `de/` folder makes it German) and push; it gets the site header and footer, joins the sitemap and is published by the workflow. Translations are gettext files in `po/`. The Cloudflare Worker in `worker/` fetches robots.txt on the page's behalf; keep `https://sus.bot` in `ALLOWED_ORIGINS` and the worker URL in `src/client/config.ts`.

Rule matching follows [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) as implemented by Google's open-source matcher. Built by [Sitefig](https://sitefig.eu).

## Licence

sus.bot is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may use, copy and change it for any noncommercial purpose, including personal use, research, education, and use by charities and public bodies. Commercial use, including running the CLI or the GitHub Action in a company's CI, needs a separate licence from [Sitefig](https://sitefig.eu).

The fonts in `fonts/` are Atkinson Hyperlegible Next and Mono under the SIL Open Font License (see `fonts/LICENSE.txt`). Dependencies keep their own licences.

