# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

sus.bot: a free robots.txt auditor. A Rust engine (`crates/core`) parses the file, matches it like Google's RFC 9309 implementation, runs lint checks, flags sensitive Disallow paths, and reports what the file gives away (platform, cloud buckets, other hosts, APIs, data feeds, file types, comment metadata). The same crate is compiled two ways:

- **Browser** (`crates/wasm` → WebAssembly). The static site at `https://sus.bot/` (root: English; `/<code>/` for the other 23 EU languages) fetches a site's `/robots.txt` (directly, or through the Cloudflare Worker proxy in `worker/`), hands the text to the engine and renders the report. It can also refetch the file through the proxy with each crawler's real User-Agent to spot servers that treat bots differently.
- **CLI** (`crates/cli` → the `susbot` binary) for terminals, CI and the composite GitHub Action in `action.yml`.

Everything the engine does is configurable from one TOML file (`config/default.toml` is embedded; a user file merges on top), and every human-readable string comes from a locale dictionary (`locales/<code>.json`).

Planned later: record each fetched robots.txt in a database. The worker is the natural place for that (fire-and-forget via `ctx.waitUntil`). The front end must keep working without it.

## Commands

```
cargo test --workspace                 # engine tests (crates/core/tests, unit tests)
npm test                               # page generator, locale consistency, JS i18n
npm run test:all                       # both
npm run build                          # build:css, then scripts/build-wasm.sh: cargo (wasm32) + wasm-bindgen + wasm-opt -> js/wasm/ (generated, gitignored)
npm run build:dev                      # same, WASM without optimisation
npm run build:css                      # Tailwind: css/src/site.css -> css/site.css (generated, gitignored); watch:css rebuilds on change
npm start                              # python3 -m http.server 8888 (ES modules need an HTTP origin); run npm run build first
npm run gen                            # render index.html, <code>/index.html and sitemap.xml from tools/page.template.html + locales/*.json; commit the output
npm run cli -- <url|file> [flags]      # the CLI via cargo; or cargo build -p susbot-cli --release, then target/release/susbot
npm run a11y                           # the three accessibility checkers (needs npm ci, a Chrome, and js/wasm/ from npm run build); a11y:axe, a11y:html, a11y:pa11y run one
cargo test -p susbot-core --test recon # one test file; --test-name-pattern is not needed, use `-- name`
```

Toolchain: stable Rust with the `wasm32-unknown-unknown` target, `wasm-bindgen-cli` at the exact version pinned in `crates/wasm/Cargo.toml`, optionally `wasm-opt` (binaryen), Node 22.

Worker (from `worker/`): `npx wrangler dev` for local, `npx wrangler deploy` to publish. See `worker/README.md`. `.github/workflows/deploy-worker.yml` deploys it when `worker/` changes on `main`.

Hosting: `.github/workflows/pages.yml` builds the WASM, renders the pages, assembles `dist/` (with `CNAME` = sus.bot) and deploys with `actions/deploy-pages`; the Pages source must be "GitHub Actions". `.github/workflows/test.yml` runs `cargo test`, builds the CLI, and runs `npm test` on every push. The repo holds no built artifacts.

Only `js/config.js` needs editing for deployment (`WORKER_URL`; `SITE_URL` for the absolute hreflang/canonical/sitemap URLs). `ANALYTICS_ID` is the Google Analytics 4 measurement ID; the generator writes Google's gtag.js snippet into every page's `<head>` when it is set and leaves it out when empty (the root page's language redirect sets `window.susRedirect` first so a redirected visit is counted once, on the language page; the accessibility checkers block the tag's hosts). It also holds `LINKS` (repository, gallery, change history, extension) and `PRICING` (currency, per-plan monthly and annual prices, checkout `url`, `featured`, and `show` to hide paid plans). Plan words live in the locale under `ui.plan.<id>.*` (`name`, `tag`, `blurb`, `f1`…`f6`, `cta`); a plan with an empty `url` shows a disabled "coming soon" button, never a dead link. The worker's `ALLOWED_ORIGINS` in `worker/wrangler.toml` must list the site origin (origin only, so language sub-paths need nothing).

## Hard constraints

- **The engine is the only implementation.** No analysis logic in JavaScript: `js/` fetches, renders and translates page chrome. A check or signature that exists in one place exists for the browser, the CLI and the Action alike.
- **Everything is configurable through `config/default.toml`.** New checks, crawlers, signatures and labels go into the config schema (`crates/core/src/config.rs`) and the default file, not into code constants. Regexes in the config use `fancy-regex` syntax (`(?i)` for case-insensitivity, lookaround allowed).
- **No analysis I/O in the core.** `susbot-core` never fetches; the CLI and the browser pass in `FetchInfo` and get fetch-level findings back.
- **Everything runs in the browser** except the proxy fetch. The WASM bundle is the only build product the page loads; keep it lean (size is checked by eye in `scripts/build-wasm.sh` output; the current bundle is about 1.6 MB before gzip).
- **CUBE CSS with Tailwind as the utility layer**, see below. No CSS-in-JS, no inline `style` attributes, no component classes from Tailwind (`@apply` is not used).
- **No runtime npm dependencies**; the JS is vanilla ES modules and the generator and unit tests use only Node built-ins. The npm packages are `devDependencies`: Tailwind (`tailwindcss`, `@tailwindcss/cli`, pinned) for the stylesheet build, and the accessibility checkers (`axe-core`, `html-validate`, `pa11y`, and `puppeteer` through pa11y).
- **Plain copy.** Page and UI text is written as plain sentences: no slogans, no three-part lists for rhythm, no middle-dot separators, arrows or em dashes, no "quietly", "seamless", "in one pass" style phrasing, sentence case. Numbers shown on the page come from the engine or the tracking data, never from copy. The product is called sus.bot.
- **Accessibility gate.** `npm run a11y` must pass: `tests/a11y/axe.mjs` (axe-core in headless Chrome on all 24 pages as served, then on every interactive state listed in `tests/a11y/states.mjs` in English and German, light and dark, WCAG 2.x A/AA plus best practices; it also saves the DOM of each state to `tests/a11y/.snapshots/`), `tests/a11y/html-validate.mjs` (html-validate `a11y` and `document` presets on every page and every saved state snapshot), `tests/a11y/pa11y.mjs` (HTML_CodeSniffer at WCAG 2.1 AA on the root, a language page and the states its action language can drive). `tests/a11y/server.mjs` serves the repo plus mock origins whose `/robots.txt` answers 200/404/410/503/HTML/empty, and mocks the worker so the access check, the redirect-limit and cross-host cases run offline; the input is `tests/a11y/fixtures/worst.robots.txt`, the kitchen-sink example plus BOM, CRLF, a 3,000-character line, Unicode and percent-encoded paths, and hundreds of rules. **A new UI state (a new panel, status, filter or button result) gets an entry in `states.mjs`.** Each state runs in its own browser context because the theme choice lives in localStorage. CI runs it in the `accessibility` job of `test.yml`. Rules that came out of it: every `aria-label` sits on an element with a role (`role="group"` for button clusters), horizontally scrollable table wrappers are `scrollable(label, …)` in `app.js` (a focusable, named `<section>`), every `<th>` has `scope`, placeholders use `--color-muted`, an empty card is marked with a dashed border rather than opacity (which would fail contrast), the doctype is uppercase.

## Browser limits that shape the design

- **Browsers cannot set `User-Agent` on fetch** (forbidden header) and **most sites do not send CORS headers on robots.txt**. Hence the worker: it fetches with CORS headers for our origin and forwards a `ua` parameter as the real User-Agent.
- Fetch order in `js/fetcher.js`: direct cross-origin fetch first, then the proxy, then the user can paste the text. If `WORKER_URL` is the placeholder, the proxy step and the access check are disabled with a message rather than an error.
- GitHub Pages cannot read `Accept-Language`, so the root page redirects once, client-side, to the browser's EU language; a stored choice wins. See "Languages".

## Engine (`crates/core`)

`Analysis::new(text, Options) -> Analysis` is the entry point (`analysis.rs`): it builds the `Engine` from the default config plus the user TOML, the `Locale` from the dictionary JSON, parses, runs the enabled checks and the fetch-level findings, applies `[rules]` overrides (disabled ids, level changes), and builds the `Report`. The struct keeps the model for the path tester (`check_access`, `clean_params`) and produces every export.

- `config.rs` – serde structs for the TOML, `Config::merged(user)` (deep-merge: tables and scalars override, arrays replace), and `Engine::from_config` which compiles every regex once and validates references (crawler categories, levels, bucket specs). `DEFAULT_TOML` is `include_str!` of `config/default.toml`.
- `i18n.rs` – `Locale`: flat dotted keys, `{name}` placeholders, plural objects picked with `plural.rs` (CLDR cardinal rules for the 24 EU languages). `t(key, params)` falls back to the embedded `locales/en.json`, then to the key itself, so plain text in a config file (a custom category label) is shown as written. The `params!` macro builds the parameter list.
- `model.rs` – the parsed model and the finding shape `Warning { level, kind, id, line, message }`. `id` is the dictionary key of the message and is stable across languages; exports and tests match on it.
- `parser.rs` – text in, model out, plus the `Warner` helper every check uses (`push`, `push_variant` for wording that depends on a condition while the id stays the same). Tolerates misspellings, comments, BOM, CRLF. Facts baked into messages: Yandex dropped `Host` and `Crawl-delay` in 2018; only Bing honours `Crawl-delay`.
- `analyser.rs` – RFC 9309 matching: `select_groups` (tokens most specific first, then `*`, then "no group = allow all"), `path_matches` with `*` and trailing `$`, percent-encoding normalisation on both sides, longest normalised pattern wins, Allow wins ties, `/robots.txt` always allowed, `apply_clean_params`, `summarise` for the verdict (`open`, `partial`, `blocked`).
- `checks.rs` – SEO traps (trailing slash, self-block, case notes, shadowed rules), sitemap hygiene, absolute URLs in rules; `run_checks` honours `[checks]`; `apply_rule_overrides` honours `[rules]`.
- `security.rs` – Disallow paths against `[[security.signatures]]` (keyword lists become segment-bounded regexes; `pattern` is raw), highest severity wins, `ignore` regexes skip paths, categories carry a label and advice key or plain text.
- `recon/` – one module per card, each `(model, engine, locale) -> data`: `cms` (scored signatures, `platform_kinds` decide the primary), `cloud` (provider host regex plus a bucket spec mini-language: `host:N`, `segment:N`, `path:REGEX`, `|` alternatives, `+` concatenation), `hosts`, `api`, `data`, `extensions`, `comments` (the detector regexes parse robots.txt content and stay English). `recon()` runs the enabled ones.
- `agents.rs`, `ai_status.rs` – per-crawler summaries from `[crawlers]` and the AI scraping card (`ai_categories[0]` is the training group).
- `fetch.rs` – `FetchInfo` (what the caller fetched) and `fetch_warnings` (redirect chain, cross-host, wrong path).
- `report.rs` – `build_report` produces the normalised object described by `schema/report.schema.json`; `tests/report.rs` validates the kitchen-sink report against it with the `jsonschema` crate. **Adding a field means updating both the builder and the schema, and bumping `SCHEMA_VERSION` for breaking changes** (1.2.0 added `tool.version`, `crawlers[].note`, `aiStatus.groups[].crawlers[].explanation`, `securityCategories`).
- `export/markdown.rs` – the client audit (`md.*` keys keep their Markdown markup), `recommended_actions` (matches issues by id), a Markdown-to-HTML renderer for the emitted subset, `audit_html`. `export/csv.rs` – four tabs, tagged CSV, TSV.
- `url_util.rs` – `root_domain` (knows common two-level suffixes), URL and hostname extraction, private IP test.

Tests live in `crates/core/tests/*.rs` (ported from the original JavaScript suites) with shared helpers in `tests/common/mod.rs`; `report.rs` also builds the kitchen-sink report under each complete locale and fails if any string still equals its English rendering. Keep `examples/kitchen-sink.robots.txt` triggering every check; its English comments are test fixtures and are never translated.

## Bindings and CLI

- `crates/wasm/src/lib.rs` – `Analysis` (constructor takes the text and `Options` as JSON; methods return JSON strings or text), `defaultConfig()`, `validateConfig(toml)`, `version()`. `js/engine.js` wraps it (`loadEngine()`, `new Analysis(text, options)` with `.report` parsed).
- `crates/cli/` – subcommands, one module each. `audit.rs`: `susbot audit <url|file|-> [--config x.toml] [--format json|markdown|html|csv|summary] [--out f] [--lang de --locale-dir locales] [--site-url u] [--fail-on never|error|warning] [--fail-on-security never|high|medium|low] [--access-check]` (a bare `susbot <target>` is rewritten to `audit` in `main.rs`, which is what `action.yml` relies on). `diff_cmd.rs`: `susbot diff old new [--format markdown|json|social] [--fail-on-change]`. `track.rs`: `susbot track --config list.json --data-dir dir [--summary-out] [--social-out] [--changed-out] [--webhook] [--webhook-high-impact-only] [--git-base-url] [--dry-run]`; both sides of a diff are analysed with the same options (site URL, no fetch info) so only the text decides `is_changed`; 404/410 answers are stored as an empty snapshot like crawlers see them; a bot wall (403, 429, 5xx or an HTML body) keeps the last snapshot and never seeds a first one; the apex host falls back to `www.` when it accepts no connection; the leaderboard README is rewritten only when a snapshot changed. `crawl.rs`: `susbot crawl --input list --out x.jsonl.gz [--summary s.json] [--limit] [--offset] [--concurrency]` on a thread pool sharing one `Arc<Engine>` (`Analysis::with_engine`). `net.rs`: fetch with a reported redirect chain (five hops, 512 KiB cap), the clock, webhooks. Exit 1 on a threshold, 2 on errors. Tests in `crates/cli/tests/cli.rs` run the binary offline.
- `crates/core/src/diff.rs` – `diff_analyses(old, new)`: crawler verdict flips, security findings that appeared or went away (keyed by path and category), issues (keyed by id and message, not line), sitemap adds/removes, an LCS unified text diff with three lines of context; `to_markdown`, `to_social_post`, `has_high_impact`.
- Workflows on top of the CLI: `famous-100.yml` (daily `track` of the 200 domains in `config/famous-100.json`, the name is historical, into `data/famous-100`, committed by the workflow; `ALERT_WEBHOOK` secret optional), `customer-monitor.yml` (six-hourly `track` against the private repo named by the `CUSTOMERS_REPO` secret, checked out and pushed with the write deploy key in `CUSTOMERS_DEPLOY_KEY`; falls back to the placeholder `config/customers.json`; each entry's `webhook_url` is where that customer's alerts go), `census.yml`, the sus.bot census (semi-annual `crawl` of the Tranco list, published as a GitHub Release named `susbot-census-<year>-H<half>`). All have timeouts and concurrency groups.
- `action.yml` – composite Action wrapping the CLI (`uses: sitefig/robots@main`, inputs `url`, `config`, `format`, `output`, `fail-on`, `fail-on-security`, `lang`, `access-check`); Markdown output also lands in the job summary.

## Configuration (`config/default.toml`)

Sections: `[tool]`, `[rules]` (`disabled` ids, `levels` overrides), `[checks]` and `[checks.recon]` toggles, `[crawlers]` (`categories`, `ai_categories`, `browser_ua`, `[[crawlers.list]]`), `[security]` (`ignore`, `[[security.categories]]`, `[[security.signatures]]`), `[recon.cms]` (`disabled`, `platform_kinds`, `[[recon.cms.signatures]]`), `[[recon.cloud.providers]]`, `[recon.hosts]`, `[[recon.api.signatures]]`, `[recon.data]`, `[[recon.extensions.groups]]`, `[recon.comments]`. In TOML, plain keys of a table must come before its `[[array]]` entries (see `feed_fallback`). A user file replaces arrays wholesale; to extend a list, copy it from the default file. The browser page always runs the default configuration: it deliberately has no way for a visitor to supply TOML (no panel, no `?config=` URL), so custom rules are a CLI and GitHub Action feature only.

## Languages (i18n)

Every user-facing string comes from `locales/<code>.json`, a flat map of dotted keys; English is the reference and is embedded in the engine. The engine formats analysis text, exports and labels; `js/i18n.js` formats only page chrome (`ui.*`, `page.*`) and fetch errors with the same rules. Keys: `page.*` (static chrome, generator only), `ui.*` (app.js), `parser.*`, `seo.*`, `sitemap.*`, `lint.*`, `fetch.*`, `security.*`, `agents.*`, `ai.*`, `recon.<module>.*`, `md.*`, `csv.*`, `enum.*`.

- **Never call `t()` at module top level** in JS; constants hold keys. In Rust, `Locale::t`/`s` run inside functions by construction.
- **Free text produced inside the engine is translated at detection time** (issue messages, security `reason`, recon `kind`/`label`/`note`/`risk`, AI-status text, `securityCategories`), so the JSON report is in one language, recorded in `report.language`. **Schema enums** (`level`, `kind`, `severity`, `confidence`, `role`, `risk`, `relation`, `source`, `verdict`) stay raw and are translated at render time through `enum.*`.
- **Never translated:** the kitchen-sink example, detector regexes in the config, directive names, agent names, `sources[].source` values, `report_filename`, `report.tool`.
- In `app.js`, a sentence that wraps an element uses `tx(key, params)`.
- `js/boot.js` is the page entry point: it loads `locales/en.json`, the page's locale (from `<html lang>`), the WASM, then `app.js`. The locale JSON is passed to the engine for non-English pages.

To add a string: add the key to `locales/en.json`, use it. `tests/locales.test.js` fails if `js/`, `tools/`, `crates/` or `config/` reference a key `en.json` lacks, or if a locale has a key, placeholder or plural form English does not.

To add or complete a language: edit `locales/<code>.json` (a subset of English; missing keys fall back string by string), translate the `page.*` keys first, `npm run gen`, commit `<code>/index.html` and `sitemap.xml`. `de fr nl es it` are complete; the other 18 EU languages have their page chrome translated and English analysis text.

The page is a landing page and the tool in one: hero with the form and the verdict card (summary plus quick exports), a monitoring banner, the report sections (AI status with an upsell aside, crawler table, tester and access check, issues and security, recon with sitemaps, file contents), pricing, and cards for the CLI, the gallery and the extension. Long lists (issues, security findings) show the first few entries and the rest behind a "Show all" disclosure (`capped()` in `app.js`). The generator also writes the page's JSON-LD (`WebApplication`, `WebPage` and `Organization`, describing only what the page is) and fills figures from the tracking data: the number of tracked domains (`{tracked}` in a `page.*` value) and the share of them blocking GPTBot, read from `data/famous-100/README.md`.

Pages: `tools/page.template.html` is the single HTML source (`{{key}}` escaped, `{{{key}}}` raw for the few `page.*` values with inline HTML). `tools/gen-pages.js` renders the root `index.html` (English, plus the client-side language redirect) and `<code>/index.html` for every locale whose `page.*` keys are complete, each with a `canonical`, `hreflang` alternates for every language plus `x-default` → root, and a switcher of plain links (`a[data-lang]`). The redirect runs only on the root, only when no `lang` is stored, and only towards a non-English match of `navigator.languages`; `initLanguage()` in `app.js` stores the choice. Language pages reference assets as `../…`; `app.js` resolves `examples/`, `schema/` and the WASM through `import.meta.url`. `tests/pages.test.js` fails when a committed page is stale.

## Front end (`js/`)

- `boot.js` – entry point (locale, engine, then app). `engine.js` – WASM wrapper. `i18n.js` – page-side `t()`. `config.js` – `WORKER_URL`, `SITE_URL`, timeouts, size cap, concurrency. `fetcher.js` – the only module calling `fetch()` for robots.txt; `normaliseSiteUrl` turns any input into `origin + /robots.txt`; errors are `FetchError` with a `code`. `app.js` – renders the report: state is one object (`text`, `fetch`, `siteUrl`, `analysis`); `render()` fills each `<section>`'s `[data-slot]` using a small `el()` helper (no innerHTML). Non-2xx bodies are discarded by the engine before parsing. `?url=` triggers analysis on load; `?example=kitchen-sink` loads the example with an assumed site URL. The theme switch stores `theme` and the language menu `lang` in localStorage. `recent` holds up to five origins the visitor checked (newest first, written on a successful fetch); with no `?url=` or `?example=`, the newest is analysed on load, and the list shows as chips with a Clear button under the form. The site in `document.referrer` is offered as a chip unless it is this site, a search engine or a social network (`GENERIC_REFERRERS`); browsers expose no other history to a page.

## CSS (CUBE on Tailwind)

`css/src/site.css` is the only entry. Tailwind v4 builds it into `css/site.css`, the one stylesheet the pages load. Its `@theme` block switches the default Tailwind theme off (`--*: initial`) and defines our tokens only, so every utility maps to a token: type scale (`text-xs` 15px to `text-3xl`; body 18px, nothing under 15px, all rem), colours as `light-dark()` pairs (`bg`, `surface`, `raise`, `line`, `control`, `ink`, `muted`, `link`, `signal`, state colours with `-bg` tints), spacing base, radii, the `prose`/`narrow` measures and breakpoints. `@source` scans `tools/page.template.html` and `js/app.js`, so a utility class must appear there as a complete string.

The CUBE layers are hand-written and placed in Tailwind's cascade layers:

1. `global.css` (layer `base`, after Tailwind's preflight) – element defaults: type, underlined links, focus ring, controls (at least 16px text, 44px tall, 3:1 borders), tables, reduced motion. No classes.
2. `composition.css` (layer `components`) – layout only: `.wrapper`, `.flow`, `.cluster`, `.stack`, `.grid`, `.with-sidebar`, `.push-end`, `.defs`. Spacing variants are data attributes (`data-space="2xs|xs|s|l|xl"`, `data-min`, `data-align`, `data-justify`).
3. Utilities – generated by Tailwind (layer `utilities`), used in markup for type size, colour, weight, `sr-only`, small margins.
4. `blocks.css` (layer `components`) – `.site-header`, `.brand`, `.nav`, `.site-footer`, `.panel`, `.section-title`, `.card`, `.stat__value`, `.promo`, `.diff-sample`, `.button`, `.link-button`, `.seg`, `.chip`, `.lang-menu`, `.status`, `.callout`, `.verdict`, `.badge`, `.bot-pill`, `.table-frame`, `.scroller`, `.data-table`, `.issue-list`, `.finding`, `.more`, `.raw`, `.plan`, `.cmd`.
5. `exceptions.css` (layer `components`) – state through data attributes and ARIA state only (`data-state`, `data-variant="primary"`, `aria-pressed`, `aria-current`, `data-verdict`, `data-hidden`, `data-level`, `data-kind`, `data-empty`, `data-featured`), and the `[data-theme]` override.

Utilities come last in the cascade, so a block never sets a property a utility on the same element is meant to control. `fonts.css` holds the self-hosted Atkinson Hyperlegible Next and Mono (latin and latin-ext woff2 in `fonts/`, SIL OFL, licence in `fonts/LICENSE.txt`); Greek and Cyrillic fall back to the system stack. The look is deliberately plain: white or near-black surfaces, one signal yellow (`#ffd60a`, always with dark text) for the primary action per area and the brand, links always underlined, no shadows, blur, gradients or animation.

## Worker

`worker/src/index.js` is a single-file Cloudflare Worker. It requires an allowed `Origin` header, refuses private/loopback targets, rate-limits per IP (90/min) and globally (40/10 s) via `[[ratelimits]]` bindings (429 with `Retry-After`; `X-Proxy-Limits` reports which are active), follows redirects by hand up to five hops, caps the body at 512 KiB, and returns HTTP 200 whenever the target answered, with the target's own status inside the JSON. **Cost model: the worker must stay on the Workers Free plan** (hard stop at 100k requests/day, never a bill); `PAUSED = "true"` in the dashboard is the kill switch, answered with 503 and shown on the page as `fetch.error.paused`. The CI deploy pins Wrangler 4.132.0 because older versions ignore `[[ratelimits]]`. On the GitHub side every workflow job has `timeout-minutes`, superseded runs are cancelled, and the site deploy ignores files that never reach the site; the repository is public so Actions minutes and Pages are free (see README, "Costs and safeguards").
