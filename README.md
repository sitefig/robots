# sus.bot

**Every site on the web publishes, at `/robots.txt`, exactly which crawlers it lets in. Yours, and your competitors'.** sus.bot reads that file and says what it means: which AI companies are being fed for free, which search engines are being turned away by accident, and what the file gives away about the systems behind it.

**[Check a site now at sus.bot](https://sus.bot/)** — paste a domain, read the answer in a second. Nothing to install, nothing to sign up for, and the file never leaves your browser.

```
cargo install susbot && susbot https://a-competitor.example
```

## What a business learns in one check

- **Who is training on your content.** One line per AI crawler, marked Allowed, Restricted or Blocked: GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, meta-externalagent, Amazonbot and the rest of a list of 134. If you believe you blocked them, this is where you find out whether the rule does that.
- **What your competitors allow.** Their file is public, so the same check works on any domain. Run it across a set of them and you see who lets the AI crawlers in, which SEO tools they pay for, what platform they run on, and what they changed last month.
- **Where you are losing search traffic.** The trailing-slash trap, where `Disallow: /shop` also blocks `/shopping`. Blocking every URL with a query string, which removes your paginated and filtered pages. Blocking scripts, styles or images, which stops search engines rendering the page at all.
- **What the file gives away.** Disallow lines are a map: admin panels, staging hosts, backups, cloud buckets with their names, internal APIs, and the emails, ticket numbers and dates left in comments. Attackers read robots.txt first; this shows you what they find.
- **Whether your server treats bots differently from people.** The access check refetches the file as each crawler, with its real user agent, and flags servers that answer one thing to a browser and another to GPTBot.

## What the market is doing, measured

200 well-known domains are rechecked every day and the result is public. On 2026-09-23:

| Crawler | Blocked | Restricted | Open |
| --- | ---: | ---: | ---: |
| CCBot | 17% | 115 | 47 |
| Bytespider | 16% | 116 | 47 |
| ClaudeBot | 15% | 115 | 50 |
| Diffbot | 14% | 122 | 46 |
| GPTBot | 11% | 121 | 52 |
| Google-Extended | 11% | 125 | 49 |
| OAI-SearchBot | 7% | 133 | 48 |

Most sites have not decided: they sit in "Restricted", where a rule written for someone else happens to catch an AI crawler too. The [leaderboard](https://github.com/sitefig/robots-engine/tree/main/data/famous-100) updates daily and its git history is the change log, so you can see the day a competitor changed its mind.

Twice a year the same engine reads the public web, most recently 36 million hosts that serve a robots.txt. Those measurements decide what this tool warns about: a mistake that appears on a quarter of all sites is a note, not a warning.

## Watch it over time

A robots.txt changes quietly, and one line can cut a site out of an AI index or out of Google. `susbot diff` says what changed in words rather than in characters: crawler verdicts that flipped, sensitive paths that appeared, issues that were introduced.

```
susbot diff old.txt new.txt --domain example.com            # what changed, crawler by crawler
susbot diff old.txt new.txt --fail-on-change                # CI gate: fail when the file moves
susbot track --config domains.json --data-dir data --webhook https://hooks.slack.com/...
```

`track` keeps one directory per domain, writes a leaderboard and a digest, and posts changes to Slack or Discord, either all of them or only the ones that matter. Point it at your own sites, at your clients', or at the market you sell into. [Sitefig](https://sitefig.eu) runs this as a service for companies that would rather be told than remember to look.

## Ways to run it

| Where | Install | Good for |
| --- | --- | --- |
| Browser | [sus.bot](https://sus.bot/) | one site, right now, in 24 languages |
| Command line | `cargo install susbot` | scripting, bulk checks, client reports |
| Python | `pip install susbot` | notebooks and data pipelines |
| Node and browsers | `npm install @sitefig/susbot` | your own dashboards and tools |
| GitHub Action | `uses: sitefig/robots-engine@main` | a gate in CI, so a bad deploy cannot ship |

```
susbot https://example.com                                     # summary, issues, security findings, actions
susbot https://example.com --format markdown --out audit.md    # a client-ready audit
susbot https://example.com --format json | jq .summary         # machine readable, against the published schema
susbot https://example.com --access-check                      # refetch as every crawler
susbot robots.txt --config my-rules.toml --fail-on warning
```

```yaml
- uses: sitefig/robots-engine@main
  with:
    url: https://example.com
    format: markdown        # also lands in the job summary
    fail-on: warning
    fail-on-security: high
```

Exit codes: 0, 1 when findings reach `--fail-on` (`error`, `warning`) or `--fail-on-security` (`high`, `medium`, `low`), 2 on fetch or config errors. In Python, `susbot.Analysis(text, site_url=...)` gives the report as a dict, plus `allowed(user_agent, path)`, the Markdown and HTML audits, the CSV tabs and `susbot.diff(old, new)`; the [npm package](https://github.com/sitefig/robots-engine/blob/main/npm/susbot/README.md) offers the same in JavaScript.

## What it reports

- rule matching as Google's RFC 9309 implementation does it, per crawler, with the rule that decided, and a tester for any URL,
- lint findings: rules before any User-agent, misspelt directives read as what they meant, unsupported directives named for what they are, and what does not belong in the file at all, from HTML markup and caching-plugin output to stack traces, injected spam and UTF-16 text,
- how the file was served: 5xx and 429, which Google reads as "block everything", 401 and 403, which crawlers read as "no restrictions", a content type other than text/plain, and an HTML page served at /robots.txt,
- SEO traps, sitemap hygiene, and what the `*` group blocks for everyone,
- security notes, with a platform's own boilerplate marked as such so the real findings stand out,
- reconnaissance: the platform, the tool that wrote the file, cloud buckets, other hostnames, API endpoints, data feeds, file types, and the metadata left in comments,
- exports: a client audit in Markdown or HTML, four spreadsheet tabs as CSV or TSV, and a JSON report that validates against [the published schema](https://sus.bot/schema/report.schema.json).

Every check, crawler and signature lives in one TOML file, and a file of your own merges over it:

```toml
[rules]
disabled = ["seo.caseSensitive"]
[rules.levels]
"seo.trailingSlash" = "info"

[security]
ignore = ['^/uploads/']

[[security.signatures]]        # replaces the default list; copy it to extend
category = "admin"
severity = "high"
reason = "Our back office"
keywords = ["backoffice-v2"]
```

The browser always runs the defaults; custom rules are a command-line and Action feature.

## Languages

Every language has its own URL: `https://sus.bot/de/`, `/fr/`, `/nl/`, and so on for `bg cs da de el en es et fi fr ga hr hu it lt lv mt nl pl pt ro sk sl sv`. German, French, Dutch, Spanish and Italian are translated in full, including the analysis text and the exports; the others have the interface in their own language and the analysis in English. Corrections are welcome as pull requests.

## Repositories

This repository is the website. The engine, the CLI, the GitHub Action and the Python and npm packages live in [sitefig/robots-engine](https://github.com/sitefig/robots-engine) and are carried here as a submodule at `engine/`, which is where the analysis, the dictionaries, the report schema and the default configuration come from.

```
git clone --recurse-submodules https://github.com/sitefig/robots.git
git submodule update --remote engine     # move the site to a newer engine
```

## Development

```
npm test                   # site build and browser i18n tests
npm ci && npm run build    # the WebAssembly engine, then the Eleventy site into _site/
npm start                  # rebuild and serve _site/ on http://localhost:8888
npm run a11y               # axe-core, html-validate and pa11y over every page and UI state
npm run lighthouse         # Lighthouse against the live site
```

The site is TypeScript: components in `src/components/`, pages in `src/site/`, browser code in `src/client/`, CUBE CSS on Tailwind in `css/`. To add a page, put a Markdown file with `layout: page` and a `title` in its front matter under `src/site/` and push; it gets the header and footer, joins the sitemap and is published by the `Deploy site` workflow. The Cloudflare Worker in `worker/` fetches robots.txt on the page's behalf, because a browser may not set a user agent and most sites send no CORS headers on that file.

Rule matching follows [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) as implemented by Google's open-source matcher. Built by [Sitefig](https://sitefig.eu).

## Licence

sus.bot is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may use, copy and change it for any noncommercial purpose, including personal use, research, education, and use by charities and public bodies. Commercial use, including running the CLI or the GitHub Action in a company's CI, needs a licence from [Sitefig](https://sitefig.eu).

The fonts in `fonts/` are Atkinson Hyperlegible Next and Mono under the SIL Open Font License (see `fonts/LICENSE.txt`). Dependencies keep their own licences.
