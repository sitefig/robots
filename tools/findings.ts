// The catalogue of everything sus.bot can report, written to
// src/data/findings.json for the documentation pages to build from.
//
// The engine owns every finding: the id, the level and the sentence a report
// shows are all its. This reads them back out of it so /docs/ cannot invent a
// check that does not exist, or miss one that does:
//
//   - a finding id is a string literal in engine/crates/core/src that has an
//     English message in the engine's locale,
//   - its level is the one the engine pushes it with, or "varies" where the
//     call site decides at runtime,
//   - the security categories and the recon modules come out of the engine's
//     configuration, because those are declared there rather than in code.
//
//   node tools/findings.ts
//
// tests/pages.test.js runs the same extraction and fails if the committed file
// has drifted, so an engine that gains a check fails the build here until it
// has a page.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const ENGINE = new URL('engine/', ROOT);
const SRC = new URL('crates/core/src/', ENGINE);
const OUT = new URL('src/data/findings.json', ROOT);

export interface Finding {
  id: string;
  /** parser, seo, lint, sitemap or fetch: the half of the id before the dot. */
  family: string;
  /** "error", "warning", "info", or "varies" when the call site decides. */
  level: string;
  /** The English sentence a report shows, with its {placeholders} intact. */
  message: string;
  /** One message per variant, for the findings that word themselves two ways. */
  variants?: Record<string, string>;
}

export interface Catalogue {
  engine: string;
  findings: Finding[];
  security: { id: string; label: string; advice: string }[];
  recon: string[];
}

const FAMILIES = ['parser', 'seo', 'lint', 'sitemap', 'fetch'];

function rustFiles(dir: URL): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...rustFiles(new URL(`${entry.name}/`, dir)));
    else if (entry.name.endsWith('.rs')) out.push(readFileSync(new URL(entry.name, dir), 'utf8'));
  }
  return out;
}

export function catalogue(): Catalogue {
  const sources = rustFiles(SRC);
  const locale = JSON.parse(readFileSync(new URL('locales/en.json', ENGINE), 'utf8')) as Record<string, string>;
  const keys = Object.keys(locale);

  const literals = new Set<string>();
  const levels = new Map<string, Set<string>>();
  for (const text of sources) {
    for (const m of text.matchAll(new RegExp(`"((?:${FAMILIES.join('|')})\\.[A-Za-z][A-Za-z.]*)"`, 'g'))) literals.add(m[1]);
    // The level sits next to the id in the same statement, whichever way the
    // call is written: `w.push(Level::Warning, line, "parser.bom", ...)` in the
    // parser, `out.push(w(Level::Error, "fetch.warn.htmlBody", ...))` in the
    // fetch checks. Take the nearest Level:: before the id, within one
    // statement, and treat a level the call site worked out as "varies".
    for (const statement of text.split(';')) {
      // A statement can name two ids under one level, as the empty Allow and
      // the empty Disallow do with a ternary, so take the level at the front of
      // each segment and give it to every id in that segment.
      const segments = statement.split(/Level::([A-Za-z]+)|push(?:_variant|_kind)?\(\s*(level|lvl)\b/);
      for (let i = 1; i < segments.length; i += 3) {
        const level = segments[i] ? segments[i].toLowerCase() : 'varies';
        for (const m of (segments[i + 2] ?? '').matchAll(new RegExp(`"((?:${FAMILIES.join('|')})\\.[A-Za-z][A-Za-z.]*)"`, 'g'))) {
          (levels.get(m[1]) ?? levels.set(m[1], new Set()).get(m[1])!).add(level);
        }
      }
    }
  }

  const spoken = (id: string): boolean => id in locale || keys.some((k) => k.startsWith(`${id}.`));
  const ids = [...literals].filter(spoken).sort();
  // "seo.overridden.disallow" is how "seo.overridden" words itself, not a
  // finding of its own, so a literal under another literal is a variant.
  const findings = ids.filter((id) => !ids.some((parent) => parent !== id && id.startsWith(`${parent}.`)));

  return {
    engine: readFileSync(new URL('Cargo.toml', ENGINE), 'utf8').match(/^version = "([^"]+)"/m)?.[1] ?? '',
    findings: findings.map((id) => {
      const variants = Object.fromEntries(keys.filter((k) => k.startsWith(`${id}.`)).map((k) => [k.slice(id.length + 1), locale[k]]));
      const seen = [...(levels.get(id) ?? [])];
      return {
        id,
        family: id.split('.')[0],
        level: seen.length === 1 ? seen[0] : seen.length > 1 ? 'varies' : 'varies',
        message: locale[id] ?? Object.values(variants)[0] ?? '',
        ...(Object.keys(variants).length > 0 ? { variants } : {}),
      };
    }),
    security: [...readFileSync(new URL('config/default.toml', ENGINE), 'utf8').matchAll(/\[\[security\.categories\]\]\nid = "([^"]+)"\nlabel = "([^"]+)"\nadvice = "([^"]+)"/g)]
      .map((m) => ({ id: m[1], label: locale[m[2]] ?? m[2], advice: locale[m[3]] ?? m[3] })),
    // The report's own recon sections, from the schema that describes it.
    recon: Object.keys((JSON.parse(readFileSync(new URL('schema/report.schema.json', ENGINE), 'utf8')) as { properties: { recon: { properties: Record<string, unknown> } } }).properties.recon.properties),
  };
}

const data = catalogue();
writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`findings: ${data.findings.length} findings, ${data.security.length} security categories, ${data.recon.length} recon modules (engine ${data.engine})`);
