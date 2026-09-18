# sus.bot

Free robots.txt audit: what the file means for search engines and AI crawlers, what is wrong with it, what it leaks, and what to do about it. Available at [sus.bot](https://sus.bot/) in all 24 official EU languages, as a command-line tool, and as a GitHub Action.

The engine is one Rust crate, compiled to WebAssembly for the browser and to a native binary for CI, so every check behaves the same everywhere. Every rule it applies comes from a TOML file you can override.

## What you get

- a summary of what the file means for crawlers without their own group,
- an AI scraping status card: one pill per AI training crawler (GPTBot, ClaudeBot, CCBot, Bytespider, Google-Extended, Diffbot, and more) and per AI search crawler, each marked Allowed, Restricted or Blocked,
- a per-crawler table for search engines, AI training, AI search, social previewers and SEO tools,
- a path tester that shows which rule matched and why,
- a real access check (browser and CLI) that refetches the file with each crawler's genuine User-Agent and highlights servers that answer differently to bots,
- lint warnings: rules before any User-agent, misspelt fields, unsupported directives, and so on,
- sitemap checks: http sitemaps on https sites, sitemaps on another domain, other-subdomain notes, duplicates,
- SEO trap warnings: the trailing-slash trap (`Disallow: /shop` also blocks `/shopping`), self-blocking `/robots.txt`, case-sensitivity notes, redundant, duplicated or always-overridden rules,
- security notes: Disallow rules that advertise admin panels, staging sites, backups, config files, private APIs or user data,
- reconnaissance: the CMS or platform (about forty-five signatures), cloud buckets and CDNs with bucket names, staging and other hostnames, API gateways, Swagger and GraphQL endpoints, data feeds and partner portals, file types with risk ratings, and the emails, names, ticket IDs and dates left in comments,
- exports: a client audit in Markdown or HTML, four spreadsheet tabs as CSV/TSV, and a JSON report validating against `schema/report.schema.json`.

## Command line

```
cargo install --path crates/cli        # or cargo build -p susbot-cli --release
susbot https://example.com             # summary with issues, security findings and recommended actions
susbot https://example.com --format markdown --out audit.md
susbot https://example.com --format json | jq .summary
susbot robots.txt --site-url https://example.com --config my-rules.toml --fail-on warning
susbot https://example.com --access-check   # refetch with every crawler's User-Agent
susbot --print-default-config > my-rules.toml
susbot https://example.com --lang de --locale-dir locales
```

Exit codes: 0, 1 when findings reach `--fail-on` (`error`, `warning`) or `--fail-on-security` (`high`, `medium`, `low`), 2 on fetch or config errors.

### diff, track and crawl

```
susbot diff old.txt new.txt --domain example.com            # crawler flips, new sensitive paths, issues, sitemaps, text diff
susbot diff old.txt new.txt --format social --diff-url URL  # short text for a chat or social post
susbot diff old.txt new.txt --fail-on-change                # CI gate: exit 1 when the files differ
susbot track --config config/famous-100.json --data-dir data/famous-100 --summary-out out.md --webhook https://hooks.slack.com/...
susbot crawl --input top-1m.csv --limit 100000 --concurrency 64 --out open-robots.jsonl.gz --summary summary.json
```

`track` keeps one directory per domain (`robots.txt` and `meta.json`) so git history is the change log, writes a leaderboard `README.md` into the data directory, a Markdown digest, social drafts, and posts changed domains to a Slack or Discord incoming webhook (a per-site `webhook_url` in the list wins; `--webhook-high-impact-only` limits posts to crawler flips, new high-severity paths and new errors). `crawl` audits a domain list on a thread pool and writes gzip JSON Lines (one record per domain) that DuckDB or pandas read directly.

Three workflows use them: `Track famous domains` runs daily and commits `data/famous-100`; `Monitor customers` runs every six hours against a private repository named in the `CUSTOMERS_REPO` secret, using the write deploy key in `CUSTOMERS_DEPLOY_KEY`; `OpenRobots crawl` runs twice a year and publishes the dataset as a GitHub Release.

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

Every language has its own URL: `https://sus.bot/de/`, `/fr/`, `/nl/`, and so on for `bg cs da de el en es et fi fr ga hr hu it lt lv mt nl pl pt ro sk sl sv`. The root is English and the `x-default`; every page lists every other language as an `hreflang` alternate and in the language menu, and `sitemap.xml` lists them all. German, French, Dutch, Spanish and Italian are translated in full, including the analysis text and exports; the other languages have their page translated and show the analysis in English until their `locales/<code>.json` is completed. Corrections are welcome as pull requests.

GitHub Pages cannot read `Accept-Language`, so the root page redirects once, client-side, to the browser's first EU language; picking a language in the menu or opening a language URL directly remembers the choice.

## Development

```
cargo test --workspace     # engine tests
npm test                   # page generator and locale tests
npm run build              # WebAssembly bundle into js/wasm/ (needs wasm32 target and wasm-bindgen-cli)
npm start                  # http://localhost:8888
npm run gen                # regenerate the language pages after editing the template or a locale
npm ci && npm run a11y     # accessibility: axe-core in Chrome, html-validate, pa11y (HTML_CodeSniffer), all pages and every UI state with the worst robots.txt ever
```

Layout: `crates/core` (engine), `crates/wasm` (browser bindings), `crates/cli`, `config/default.toml`, `locales/*.json`, `js/` (page), `css/` (CUBE CSS), `tools/` (page generator), `worker/` (Cloudflare proxy), `schema/report.schema.json`, `examples/kitchen-sink.robots.txt` (one file that triggers every check; open `?example=kitchen-sink`).

## Costs and safeguards

The project is built to run for free, with hard stops rather than bills:

- **Cloudflare Worker** (the proxy): Workers Free plan, 100,000 requests a day, then errors until midnight UTC and never a charge. Per-IP (90/min) and global (40/10 s) rate limits keep one client or a burst from burning the quota. `PAUSED = "true"` in the dashboard switches the proxy off instantly; the page then asks visitors to paste the file. Do not move the account to Workers Paid; if you do, turn on the usage-based-billing notification.
- **GitHub Actions**: the repository is public, so runner minutes are free. Every job has a `timeout-minutes`, superseded runs are cancelled, and the site only rebuilds when files that reach the site change. If the repository is ever made private, set the Actions spending limit to $0 in the billing settings (the default) so minutes stop instead of billing.
- **GitHub Pages**: free, with a soft limit of 100 GB of bandwidth a month. The WASM engine is 1.6 MB, gzipped to about 640 KB in transit and cached for ten minutes by Pages, so a month's limit is roughly 150,000 first visits. Putting the domain behind Cloudflare's proxy (free plan) caches it at the edge and lifts that ceiling.
- **The GitHub Action** (`action.yml`) and the CLI run on the user's own account and machine, and never call the worker.

## Deploy

GitHub Pages serves the site from the `Deploy site` workflow (source: GitHub Actions), which builds the WASM, renders the pages and uploads `dist/` with the `CNAME` for sus.bot. The Cloudflare Worker in `worker/` fetches robots.txt on the page's behalf; keep `https://sus.bot` in `ALLOWED_ORIGINS` and the worker URL in `js/config.js`.

Rule matching follows [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) as implemented by Google's open-source matcher. A free tool by [Sitefig](https://sitefig.eu).

## Licence

sus.bot is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may use, copy and change it for any noncommercial purpose, including personal use, research, education, and use by charities and public bodies. Commercial use, including running the CLI or the GitHub Action in a company's CI, needs a separate licence from [Sitefig](https://sitefig.eu).

The fonts in `fonts/` are Atkinson Hyperlegible Next and Mono under the SIL Open Font License (see `fonts/LICENSE.txt`). Dependencies keep their own licences.

