# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**This repository is sus.bot: the website, and the free tool that is also the sales pitch.** A visitor
arrives with a domain, gets the whole report in their browser in a second, and pays nothing: no account,
no install, no limit, one site at a time. That free check is the product on this side, and what it sells
is the paid app, which watches a robots.txt over time instead of looking at it once.

Four repositories, and the split matters:

| Repository | What it is | Public |
| --- | --- | --- |
| `sitefig/robots` (this one) | The website: the free one-off check, the sales copy, the tracking | yes |
| [`sitefig/robots-engine`](https://github.com/sitefig/robots-engine) | The analysis: the Rust engine, the CLI, the GitHub Action, the Python and npm packages. Carried here as a submodule at `engine/` | yes |
| `sitefig/app.sitefig.net` | The paid app a visitor signs up for: accounts, dashboards, alerts, billing | no |
| `sitefig/robots-worker` | The Cloudflare Worker that fetches robots.txt for the page | no |

**Nothing about how the analysis works lives here.** The parser, the RFC 9309 matcher, the checks, the
security signatures, the recon modules, the report schema, the configuration format, the CLI and every
release to crates.io, PyPI and npm are the engine repository's, and its own CLAUDE.md documents them.
Work on a check or a crawler list happens there, and reaches this site when the submodule pointer moves.

What this repository takes from the submodule: the analysis compiled to WebAssembly (`engine/crates/wasm`,
built by `npm run build:wasm`), every dictionary (`engine/locales/`, generated from `engine/po/`, so page
and interface copy is edited there too), the default configuration, the report schema, the kitchen-sink
example and the tracking figures the home page quotes. `git submodule update --remote engine` moves the
site to a newer engine; the commit that moves the pointer is what ships it.

The page always runs the engine's default configuration. There is deliberately no way for a visitor to
supply their own rules: no panel, no `?config=`. Custom rules are a command line and GitHub Action
feature, which is one of the reasons to install those.

## What the page sells, and where

The order on the home page is the argument, and it is not negotiable without a reason:

1. **The check is the hero.** A bordered field, large type, nothing above it but the headline. A visitor
   who came to test a file can do it without reading anything.
2. **The verdict, then the report.** Everything the engine found, free and complete. No teaser, no
   "upgrade to see the rest": a report that withholds something is worth less than one that does not,
   and the withheld part is what would have earned trust.
3. **Then the offer** (`src/components/home/sales.ts`, `#keep-watching`): a free forever account, doing
   it yourself with the CLI, or having us watch the market. The section is built `hidden` and
   `src/client/components/sales.ts` shows it after an analysis, leading with the sentence that report
   earned (`sales.after.errors`, `.training`, `.warnings`, `.clean`; `leadKey()`, covered by
   `tests/sales.test.js`). **Nothing is sold above the report.**

`PRICING.show` in `src/client/config.ts` is false while the prices are being worked out, which removes
the pricing section and every link that pointed at it. The free account link carries the checked origin
as `?site=`, which the app does not read yet.

`src/client/track.ts` measures the funnel and nothing else: `check` (the verdict, the AI training
verdict, issue counts, the platform, and a `trigger` saying whether a person asked or the page
re-checked on load), `offer_click`, `export`, `access_check`. **No event carries the address that was
checked**, and `page_location` is stripped of its query string before the first hit, because `?url=`
would otherwise put every domain anyone looked at into the analytics property as a page path.

## Commands

```
./start.sh                             # a fresh clone: submodule, npm ci, WASM, site, serve (--no-serve, --dev, --port)
npm test                               # the Node tests: Eleventy build, pages, browser i18n
npm run typecheck                      # tsc over src/, tools/ and the Eleventy config (needs the WASM .d.ts from a build)
npm run test:all                       # typecheck and the site tests
npm run build                          # build:wasm then build:site
npm run build:dev                      # same, WASM without optimisation
npm run build:wasm                     # engine/scripts/build-wasm.sh with OUT_DIR=src/client/wasm (generated, gitignored)
npm run build:site                     # Eleventy -> _site/ (pages, sitemap, copied assets), then build:css and build:client
npm run build:css                      # Tailwind: css/src/site.css -> _site/css/site.css; watch:css rebuilds on change
npm run build:client                   # tsc -p tsconfig.client.json: src/client/*.ts -> _site/js/*.js
npm start                              # build:site, then serve _site/ on :8888 (ES modules need an HTTP origin); build:wasm once first
npm run dev                            # eleventy --serve (pages only; run build:css and build:client for the rest)
npm run i18n                           # runs the engine's tooling in engine/ (commit there, then move the submodule)
npm run i18n:sync                      # the same, after editing engine/po/en.po
npm run cli -- <url|file> [flags]      # the submodule's CLI, for checking the engine behaves as the page shows
npm run a11y                           # the three accessibility checkers against _site/ (needs npm ci, a Chrome, and a build); a11y:axe, a11y:html, a11y:pa11y run one
node tests/a11y/pixels.mjs <old-site>  # screenshot every UI state of two builds and compare them byte for byte
npm run lighthouse -- [url ...]        # Lighthouse (performance, accessibility, best practices, SEO; mobile and desktop); defaults to the live site
```

Toolchain: Node 24, which runs the TypeScript site, tools and tests directly by stripping types, so **only erasable TypeScript is allowed** here: no enums, namespaces or parameter properties. Building the WebAssembly also needs stable Rust with the `wasm32-unknown-unknown` target and `wasm-bindgen-cli` at the version pinned in `engine/crates/wasm/Cargo.toml`, plus `wasm-opt` (binaryen) if you want it optimised; nothing else in this repository needs Rust, and `npm test` does not.

Worker: **not in this repository.** The proxy is `sitefig/robots-worker`, which is private, and it deploys itself from there (`npm run deploy`, or its own `deploy.yml` on a push to its `main`). Nothing here builds or deploys it, and the only link between the two is `WORKER_URL` in `src/client/config.ts`. Its `ALLOWED_ORIGINS` must list this site's origin, so a new origin means a change there, not here.

Hosting: `.github/workflows/pages.yml` runs the tests, builds the WASM and the site (`npm run build`), type-checks, publishes `_site/` with `actions/deploy-pages`, then runs Lighthouse against the published English and German home pages (job `lighthouse`: accessibility, best practices and SEO must be 100 and performance at least 90, on mobile and desktop; reports are kept as an artifact). Each URL is fetched once before it is audited and a score under its threshold is measured again, because the first page of a run meets a cold CDN edge and loses 10 to 15 performance points for it (measurable: reverse the two URLs and the dip moves with the order); the Pages source must be "GitHub Actions". A new Markdown page is published by pushing it. `.github/workflows/test.yml` has two jobs: `site` (`npm test`, the page generator and the browser i18n, fast so it fails before the slow one starts) and `accessibility` (builds the WASM and the site, type-checks, `npm run a11y`). Nothing here runs `cargo test`: the engine's own repository does that, and a submodule bump that broke the analysis would be caught there. The repo holds no built artifacts: pages, CSS and JS exist only in `_site/`.

Only `src/client/config.ts` needs editing for deployment (`WORKER_URL`; `SITE_URL` for the absolute hreflang/canonical/sitemap URLs). `ANALYTICS_ID` is the Google Analytics 4 measurement ID; the site build writes the Google tag into every page's `<head>` when it is set and leaves it out when empty. The page view is queued at once, but gtag.js itself loads on the first interaction or 8 s after load, so it stays out of page load (visits shorter than that with no interaction are not counted). The root page's language redirect sets `window.susRedirect` first so a redirected visit is counted once, on the language page; the accessibility checkers block the tag's hosts. **`page_location` is set to the origin and path before anything is sent**, because the address being checked is in the query string (`?url=`) and no analytics property should hold a list of the domains visitors looked at; `tests/pages.test.js` fails if that `gtag('set', …)` stops coming before the `config` call. The tag also puts `gtag` on `window` so `src/client/track.ts` can reach it from a module. It also holds `LINKS` (repository, gallery, change history, extension) and `PRICING` (currency, per-plan monthly and annual prices, checkout `url`, `featured`, and `show`). **`show` is false at the moment, while the prices are being worked out:** that takes the pricing section off the home page and removes every link and button that pointed at it, in the header, the footer, the promo block and the two monitoring calls to action, and drops the `pricing-annual` accessibility state. The plans stay in the file, so one flip brings all of it back. Plan words live in the locale under `ui.plan.<id>.*` (`name`, `tag`, `blurb`, `f1`…`f6`, `cta`); a plan with an empty `url` shows a disabled "coming soon" button, never a dead link. The worker's `ALLOWED_ORIGINS` (in `wrangler.jsonc` of `sitefig/robots-worker`) must list the site origin (origin only, so language sub-paths need nothing).

## Hard constraints

- **No analysis logic in this repository.** `src/client/` fetches, renders and translates page chrome; every finding, label and number comes out of the engine. A check that exists for the browser exists for the CLI and the Action too, because it is the same crate. If something needs a new check, a new crawler or a different wording of a finding, that is a change in `engine/`, committed there, and shipped here by moving the submodule pointer.
- **Everything runs in the browser** except the proxy fetch. Keep the WASM bundle lean (the build prints its size; it is about 1.6 MB before gzip).
- **The free check stays free and whole.** No sign-up wall, no rate limit, no part of the report held back for a paid plan. What is paid is watching a file over time, not seeing it once.
- **CUBE CSS with Tailwind as the utility layer**, see below. No CSS-in-JS, no inline `style` attributes, no component classes from Tailwind (`@apply` is not used).
- **No runtime npm dependencies**; the browser loads plain ES modules compiled from TypeScript, one file per module. The npm packages are `devDependencies`: Eleventy (`@11ty/eleventy`), TypeScript (`typescript`), Tailwind (`tailwindcss`, `@tailwindcss/cli`), all pinned, and the accessibility checkers (`axe-core`, `html-validate`, `pa11y`, and `puppeteer` through pa11y).
- **Plain copy.** Page and UI text is written as plain sentences: no slogans, no three-part lists for rhythm, no middle-dot separators, arrows or em dashes, no "quietly", "seamless", "in one pass" style phrasing, sentence case. Be specific: never "things", "some" or "places", name what is meant ("sensitive files and folders", "pages", "rules"), and use the plain word where there is one ("crawler", not "user-agent", which is kept only for the line in the file). Numbers shown on the page come from the engine or the tracking data, never from copy. The product is called sus.bot.
- **Accessibility gate.** `npm run a11y` must pass: `tests/a11y/axe.mjs` (axe-core in headless Chrome on all 24 pages as served, then on every interactive state listed in `tests/a11y/states.mjs` in English and German, light and dark, WCAG 2.x A/AA plus best practices; it also saves the DOM of each state to `tests/a11y/.snapshots/`), `tests/a11y/html-validate.mjs` (html-validate `a11y` and `document` presets on every page and every saved state snapshot), `tests/a11y/pa11y.mjs` (HTML_CodeSniffer at WCAG 2.1 AA on the root, a language page and the states its action language can drive). `tests/a11y/server.mjs` serves the repo plus mock origins whose `/robots.txt` answers 200/404/410/503/HTML/empty, and mocks the worker so the access check, the redirect-limit and cross-host cases run offline; the input is `tests/a11y/fixtures/worst.robots.txt`, the kitchen-sink example plus BOM, CRLF, a 3,000-character line, Unicode and percent-encoded paths, and hundreds of rules. **A new UI state (a new panel, status, filter or button result) gets an entry in `states.mjs`.** Each state runs in its own browser context because the theme choice lives in localStorage. CI runs it in the `accessibility` job of `test.yml`. Rules that came out of it: every `aria-label` sits on an element with a role (`role="group"` for button clusters), horizontally scrollable table wrappers are `scrollable(label, …)` in `app.js` (a focusable, named `<section>`), every `<th>` has `scope`, placeholders use `--color-muted`, an empty card is marked with a dashed border rather than opacity (which would fail contrast), the doctype is uppercase.

## Browser limits that shape the design

- **Browsers cannot set `User-Agent` on fetch** (forbidden header) and **most sites do not send CORS headers on robots.txt**. Hence the worker: it fetches with CORS headers for our origin and forwards a `ua` parameter as the real User-Agent.
- Fetch order in `src/client/fetcher.ts`: direct cross-origin fetch first, then the proxy, then the user can paste the text. If `WORKER_URL` is the placeholder, the proxy step and the access check are disabled with a message rather than an error.
- GitHub Pages cannot read `Accept-Language`, so the root page redirects once, client-side, to the browser's EU language; a stored choice wins. See "Languages".

## The engine, as far as this site is concerned

`engine/` is a submodule with its own CLAUDE.md. Read that one before changing anything in it. From here,
the surface is small:

- `npm run build:wasm` runs `engine/scripts/build-wasm.sh` into the git-ignored `src/client/wasm/`.
  The bundle exports `Analysis` (constructor takes the text and options as JSON; methods return JSON
  strings or text), `defaultConfig()`, `validateConfig(toml)` and `version()`.
- `src/client/engine.ts` wraps it: `loadEngine()`, then `new Analysis(text, options)` with `.report`
  already parsed. `src/client/types.ts` is this site's view of the report, and it has to match
  `engine/schema/report.schema.json`. **When the engine's schema version changes, those types and the
  components that read them are what needs checking.** `schemaVersion` is semver: a minor bump only adds
  fields, so a minor engine release cannot break the page.
- Findings arrive already translated, in the language the page asked for; the schema's enums (`level`,
  `kind`, `severity`, `confidence`, `role`, `risk`, `relation`, `source`, `verdict`) arrive raw and are
  translated at render time through `enum.*`.
- The engine never fetches. `src/client/fetcher.ts` does, and hands the result in as `FetchInfo` so the
  engine can report on how the file was served (5xx, 429, 401/403, a wrong content type, an HTML page at
  /robots.txt).

## Languages (i18n)

**The dictionaries are the submodule's.** Translations are gettext `.po` files in `engine/po/`, one per
language, and they are the source; `engine/locales/<code>.json` is generated from them and committed
there. This site reads those JSON files at build time (page chrome) and at run time (the client and the
engine's own findings).

To change any wording on the page, including sales copy:

1. edit `engine/po/en.po`,
2. `npm run i18n:sync` (it runs in `engine/`: adds new keys untranslated to the other 23 languages, drops
   removed ones, flags changed English as fuzzy, regenerates the JSON and `engine/crates/core/data/en.json`),
3. commit `po/` and `locales/` **inside `engine/`** and push that repository,
4. then commit the moved submodule pointer here. Both halves are needed: without the pointer the live site
   shows the old words, and without the engine push CI cannot check the submodule out at all.

Keys: `page.*` is static chrome, resolved at build time; `ui.*` is the client; the rest (`parser.*`,
`seo.*`, `sitemap.*`, `lint.*`, `fetch.*`, `security.*`, `agents.*`, `ai.*`, `recon.<module>.*`, `md.*`,
`csv.*`, `enum.*`) belong to the engine and arrive already translated.

- **A language gets its own home page once every `page.*` entry is translated.** That is why the offer's
  copy uses a `sales.*` prefix instead: new sales wording is going to change often, and a single
  untranslated `page.*` key would take a language's home page off the site. `sales.*` falls back to
  English string by string. Think before adding a `page.*` key.
- `de fr nl es it` are complete; the other 18 EU languages have the page chrome and the AI section
  translated, and English analysis text.
- **Never call `t()` at module top level** in the client; constants hold keys, and `t()` runs inside
  functions once a dictionary is loaded.
- In client components, a sentence that wraps an element uses `tx(key, params)`; page components use
  `e()` (escaped), `raw()` (the few `page.*` values with inline HTML) and `text()`.
- The engine's repository owns the checks that the `.po` files round-trip, that every locale has the keys
  and plural forms English has, and that nothing references a key English lacks. `npm test` here fails if
  the pages do not build or a language's home page is missing.

## Site (Eleventy, `src/`)

Eleventy 3 builds `_site/` from `src/site/` with `eleventy.config.ts`; every template and component is TypeScript that Node runs directly.

- `src/site/index.11ty.ts` – the home page, paginated over the languages with a complete dictionary: `/` (English, with the client-side language redirect) and `/<code>/`. `src/components/` holds its parts as functions `(ctx) => html`: `document.ts` (head: meta, analytics, canonical, hreflang, preload, styles, theme script, entry script, JSON-LD), `header.ts`, `footer.ts`, and `home/` (`hero`, `verdict`, `promo`, `results`, `pricing`, `more`). `ctx` (`context.ts`) carries the language, path, asset prefix, strings (`e()` escaped, `raw()` for the few `page.*` values with inline HTML, `text()` unescaped), the active languages and the page's translations.
- **Markdown pages:** any `.md` under `src/site/` with `layout: page` becomes a page with the site header and footer (`src/site/_includes/page.11ty.ts`). Front matter: `title`, `description`, optionally `lang` (otherwise taken from the folder, `src/site/de/about.md` is German, else English) and `translationKey` (otherwise the path without its language folder, so `about.md` and `de/about.md` are translations of each other). Translations get hreflang links and the language menu links between them, falling back to a language's home page. Content pages load `js/page.js` (theme and language menu only). `sitemap: false` in front matter keeps a page out of the sitemap.
- **The crawler page** (`src/site/bot.md`, `/bot/`, English) is what a site owner finds when `susbot` shows up in their log: the two user agent strings, that only `/robots.txt` is fetched, why (the twice-yearly analysis and the checks people ask for), the rate, and how to block it. `crawlers.bot_ua` in the config is the string the census crawl and the tracking runs send (`net::our_ua`), and the worker's `DEFAULT_UA` is the check one; both link to that page, so changing one means changing the page. `browser_ua` stays what the access check compares against.
- `src/site/sitemap.11ty.ts` – loops over every page in the collection, groups translations, and lists each with its alternates and `x-default` (English).
- `src/lib/site.ts` – build helpers: dictionaries, active languages, escaping, URLs (`relative`, `assetsFor`, `homePath`), hreflang, language menu, redirect script, analytics tag, JSON-LD, tracking figures (`{tracked}` and the GPTBot block rate from `data/famous-100/README.md`). `src/lib/pages.ts` – page language and translation groups. `src/lib/po.ts` – gettext.
- Copied as is into `_site/`: `src/site/robots.txt` (the site's own file, allow-all with the sitemap and a link to `/bot/`), `src/site/ads.txt` (the IAB authorised-sellers line) and `src/site/humans.txt` (who made it and how; linked from every page as `rel="author"`), `fonts/`, `locales/`, `schema/`, `examples/`, the WASM (`src/client/wasm/` to `js/wasm/`), `config/default.toml` as `default-config.toml`, `src/site/favicon.svg` (linked from every page, so browsers do not request a missing `/favicon.ico`), `.nojekyll`, `CNAME`.

The home page is a landing page and the tool in one: headline and intro on the left, the URL form on the right, the verdict card below both (shown only after an analysis, with quick exports), a monitoring banner, the report sections (AI status with an aside, crawler table, tester and access check, issues and security, a regression banner, recon with sitemaps, file contents), then the offer, then pricing, and cards for the CLI, the gallery and the extension. **Nothing is sold above the report:** the offer section (`src/components/home/sales.ts`, `#keep-watching`) is built `hidden` and `components/sales.ts` shows it after an analysis, leading with the sentence the report earned (`sales.after.errors`, `.training`, `.warnings` or `.clean`, chosen by `leadKey()`, which `tests/sales.test.js` covers) and handing the checked origin to the app as `?site=`. Long lists (issues, security findings) show the first few entries and the rest behind "Show all" (`capped()` in `dom.ts`).

`tests/pages.test.js` builds the site in memory with Eleventy and checks languages, redirect, hreflang, the switcher, escaping, the Markdown layout and the sitemap. `node tests/a11y/pixels.mjs <old-site-dir>` screenshots every UI state of two builds and compares them byte for byte; the TypeScript rewrite was checked this way against the last hand-written build.

## Front end (`src/client/`)

Compiled by `tsc -p tsconfig.client.json` to `_site/js/`, one ES module per file, no bundler. `boot.ts` – entry point of the home page (dictionaries, then `app.ts`). The WebAssembly engine is not part of page load: `app.ts` starts loading it on the visitor's first focus, pointer, key or touch, and every analysis awaits `loadEngine()`, so the 1.6 MB engine never blocks the first paint or input (this took Lighthouse mobile performance from 45 to 100; an idle-time prefetch still cost a cold visit 1.9 s of blocking time on CI). `page.ts` – entry point of content pages. `engine.ts` – WASM wrapper, typed by the generated `wasm/*.d.ts`. `i18n.ts` – page-side `t()`. `config.ts` – `WORKER_URL`, `SITE_URL`, analytics, timeouts, size cap, concurrency, links, pricing. `fetcher.ts` – the only module calling `fetch()` for robots.txt; `normaliseSiteUrl` turns any input into `origin + /robots.txt`; errors are `FetchError` with a `code`. `types.ts` – the engine's report shapes the page reads. `state.ts` – the single state object (`input`, `text`, `fetch`, `siteUrl`, `analysis`). `dom.ts` – `el()` (no innerHTML), `tx()`, `replace()`, badges, `capped()`, formatting. `app.ts` – fetch or paste, run the engine, then each component renders its section's `[data-slot]`: `components/summary`, `export`, `ai-status`, `agents`, `tester`, `access`, `issues`, `security`, `recon`, `sitemaps`, `raw`, plus `pricing`, `sales`, `recent` and `preferences` (theme, language). `track.ts` – the funnel in GA4 (`check` with the verdict, the AI training verdict, issue counts, the platform and a `trigger` saying whether a person asked for it or the page re-checked on load; `offer_click`; `export`; `access_check`), never the address that was checked, and a no-op when `ANALYTICS_ID` is empty. Non-2xx bodies are discarded by the engine before parsing. `?url=` triggers analysis on load; `?example=kitchen-sink` loads the example with an assumed site URL. The theme switch stores `theme` and the language menu `lang` in localStorage. `recent` holds up to five origins the visitor checked (newest first, written on a successful fetch); with no `?url=` or `?example=`, the newest is analysed on load, and the list shows as chips with a Clear button under the form. The site in `document.referrer` is offered as a chip unless it is this site, a search engine or a social network (`GENERIC_REFERRERS`); browsers expose no other history to a page. `paths.ts` resolves `schema/` and `examples/` from the compiled script's location, so they work from every language page.

## CSS (CUBE on Tailwind)

`css/src/site.css` is the only entry. Tailwind v4 builds it into `_site/css/site.css`, the one stylesheet the pages load. Its `@theme` block switches the default Tailwind theme off (`--*: initial`) and defines our tokens only, so every utility maps to a token: type scale (`text-xs` 15px to `text-3xl`; body 18px, nothing under 15px, all rem), colours as `light-dark()` pairs (`bg`, `surface`, `raise`, `line`, `control`, `ink`, `muted`, `link`, `signal`, state colours with `-bg` tints), spacing base, radii, the `prose`/`narrow` measures and breakpoints. `@source` scans `src/components`, `src/site` and `src/client` (not the WASM glue), so a utility class must appear there as a complete string; `@source not inline(...)` lists words in the TypeScript that look like utilities but are not classes.

The CUBE layers are hand-written and placed in Tailwind's cascade layers:

1. `global.css` (layer `base`, after Tailwind's preflight) – element defaults: type, underlined links, focus ring, controls (at least 16px text, 44px tall, 3:1 borders), tables, reduced motion. No classes.
2. `composition.css` (layer `components`) – layout only: `.wrapper`, `.flow`, `.cluster`, `.stack`, `.grid`, `.with-sidebar`, `.push-end`, `.defs`. Spacing variants are data attributes (`data-space="2xs|xs|s|l|xl"`, `data-min`, `data-align`, `data-justify`).
3. Utilities – generated by Tailwind (layer `utilities`), used in markup for type size, colour, weight, `sr-only`, small margins.
4. `blocks.css` (layer `components`) – `.site-header`, `.brand`, `.nav`, `.site-footer`, `.panel`, `.section-title`, `.card`, `.stat__value`, `.promo`, `.diff-sample`, `.button`, `.link-button`, `.seg`, `.chip`, `.lang-menu`, `.status`, `.callout`, `.verdict`, `.badge`, `.bot-pill`, `.table-frame`, `.scroller`, `.data-table`, `.issue-list`, `.finding`, `.more`, `.raw`, `.plan`, `.cmd`.
5. `exceptions.css` (layer `components`) – state through data attributes and ARIA state only (`data-state`, `data-variant="primary"`, `aria-pressed`, `aria-current`, `data-verdict`, `data-hidden`, `data-level`, `data-kind`, `data-empty`, `data-featured`), and the `[data-theme]` override.

Utilities come last in the cascade, so a block never sets a property a utility on the same element is meant to control. `fonts.css` holds the self-hosted Atkinson Hyperlegible Next and Mono (latin and latin-ext woff2 in `fonts/`, SIL OFL, licence in `fonts/LICENSE.txt`); Greek and Cyrillic fall back to the system stack. The logo follows the claude.ai/design project "sus.bot Identity": `BrandMark()` in `src/components/header.ts` draws the mark inline (brackets in the text colour, the eye in `--color-brand-eye`, yellow on dark and ink on light, because the guide's light lockup is all one ink), and the wordmark is Space Grotesk Bold at -4.5% tracking from `fonts/SpaceGrotesk-700-wordmark.woff2`, a 1.3 KB subset holding only the letters of "sus.bot". Do not recolour the brackets yellow, round the caps, or set the wordmark in another face. `src/site/favicon.svg` is the guide's small-size cut and `src/site/apple-touch-icon.png` the 180 px app icon. The press kit at `/press/` (`src/site/press.11ty.ts`, English) offers every logo file, colours, type, usage rules and a boilerplate paragraph; the files in `src/site/press/files/` (SVGs with the wordmark as outlines from `src/lib/wordmark.json`, PNG renders, README and `susbot-press-kit.zip`) are generated by `node tools/brand.ts` from `src/lib/brand.ts` and committed. The easter egg: the context menu (right click, long press or menu key) on any `.brand` logo opens `#brand-menu` (rendered in `header.ts`, a manual popover handled by `src/client/components/brand-menu.ts`, which closes on Escape, a press outside, focus leaving or scroll) with the logo files and the press kit link. The footer is built from `FOOTER` in `src/lib/footer.ts`: groups of links with dictionary-key labels and targets (`{ home }`, `{ site }` or `{ url }`); add a group or link there to extend it. The look is deliberately plain: white or near-black surfaces, one signal yellow (`#ffd60a`, always with dark text) for the primary action per area and the brand, links always underlined, no shadows, blur, gradients or animation.

## Worker

**The worker is not in this repository.** It is `sitefig/robots-worker`, private, holding `src/index.js`, `wrangler.jsonc`, its own deploy and logs workflows and a `package.json` pinning Wrangler 4.135.0. What it does, because the page depends on the behaviour: it requires an allowed `Origin` header, refuses private and loopback targets, rate-limits per IP (90/min) and globally (40/10 s) via rate-limit bindings (429 with `Retry-After`; `X-Proxy-Limits` reports which are active), follows redirects by hand up to five hops, caps the body at 512 KiB, and returns HTTP 200 whenever the target answered, with the target's own status inside the JSON. **Cost model: it must stay on the Workers Free plan** (hard stop at 100k requests/day, never a bill); `PAUSED = "true"` in the dashboard is the kill switch, answered with 503 and shown on the page as `fetch.error.paused`. `observability` is set in its config rather than only in the dashboard, because a deploy writes what the config says and a missing block switches Workers Logs off again. A change to any of that is a change over there: what this repository holds is `WORKER_URL`, the fetch order in `src/client/fetcher.ts`, and the mock in `tests/a11y/server.mjs` that lets the proxy cases run offline. On the GitHub side every workflow job here has `timeout-minutes`, superseded runs are cancelled, and the site deploy ignores files that never reach the site; this repository is public so Actions minutes and Pages are free.

**Costs and safeguards** (kept here, not in the public readme): everything runs on free tiers with hard stops rather than bills.
- **Cloudflare Worker** (the proxy, in the private repository): Workers Free plan, 100,000 requests a day, then errors until midnight UTC and never a charge. Per-IP (90/min) and global (40/10 s) rate limits keep one client or a burst from burning the quota. `PAUSED = "true"` in the dashboard switches the proxy off instantly; the page then asks visitors to paste the file. Do not move the account to Workers Paid; if you do, turn on the usage-based-billing notification.
- **GitHub Actions**: the repository is public, so runner minutes are free. Every job has a `timeout-minutes`, superseded runs are cancelled, and the site only rebuilds when files that reach the site change. If the repository is ever made private, set the Actions spending limit to $0 in the billing settings (the default) so minutes stop instead of billing.
- **GitHub Pages**: free, with a soft limit of 100 GB of bandwidth a month. The WASM engine is about 1.6 MB, gzipped to roughly 640 KB in transit and cached for ten minutes by Pages, so a month's limit is about 150,000 first visits. Putting the domain behind Cloudflare's proxy (free plan) caches it at the edge and lifts that ceiling.
- **The CLI and the GitHub Action** are the engine repository's, and they run on the user's own machine or their own Actions minutes. They fetch robots.txt themselves and never call our worker, so no amount of command line use costs us anything. That is why pointing a developer at `cargo install susbot` is a good answer and not a lost sale.
