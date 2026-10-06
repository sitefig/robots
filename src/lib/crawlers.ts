// The crawler list, read from the engine's configuration at build time, with
// the figures that come out of the tracking data.
//
// The engine owns the list: `[[crawlers.list]]` in engine/config/default.toml is
// the only place a crawler, its tokens or its category is written down, and the
// browser gets the same list through the WebAssembly. This module reads the few
// keys those entries hold so the site can give each crawler a page, and it reads
// nothing else from the file: no rule matching, no checks, no verdicts. Those
// belong to the engine and stay there.
//
// It parses the slice of TOML those blocks use (a quoted string or an array of
// quoted strings per line) rather than pulling in a parser, the way src/lib/po.ts
// reads gettext. tests/pages.test.js fails if the shape drifts.

import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const ENGINE = new URL('engine/', ROOT);
const CONFIG = new URL('config/default.toml', ENGINE);
const TRACKED = new URL('data/famous-100/', ENGINE);

export interface Crawler {
  /** As the operator writes it, which is what the page is titled. */
  name: string;
  /** The page's address: /crawlers/<slug>/. */
  slug: string;
  /** What a robots.txt has to name to address it, lowercase. */
  tokens: string[];
  category: string;
  /** The operator's own user-agent string, when they publish one. */
  ua?: string;
  /** Where the operator documents it, taken out of that string. */
  info?: string;
  /** What the engine has to say about it, when there is something. */
  note?: string;
  /** Whether blocking it stops training, searching, or neither. */
  ai: boolean;
  /** Tracked sites that name it in a User-agent line of their own. */
  named: number;
  /** From the leaderboard, for the crawlers it covers. */
  board?: { blocked: number; percent: number; restricted: number; open: number };
  /** What the whole web does, from OpenRobotsTxt's published dataset. */
  world?: World;
  /** What the ai.robots.txt list records about it, where it is on that list. */
  listed?: Listed;
}

/**
 * One crawler as the ai.robots.txt list has it: who runs it, what they say it
 * is for, whether it is documented as honouring robots.txt, and where to read
 * about it. MIT licensed, so the page that shows it names the list; `aiList()`
 * carries the words for that.
 */
export interface Listed {
  name: string;
  operator?: string;
  operatorUrl?: string;
  purpose?: string;
  /** "yes", "no", "unclear", or whatever sentence the list gives instead. */
  respect: string;
  respectUrl?: string;
  frequency?: string;
  description?: string;
  infoUrl?: string;
  /** The day the list added it, where its releases feed still reaches back. */
  since?: string;
  release?: string;
}

interface ListFile {
  source: string;
  credit: string;
  licence: string;
  licenceUrl: string;
  copyright: string;
  retrieved: string;
  rows: Record<string, Listed>;
}

/**
 * One row of the OpenRobotsTxt bot statistics, which counts every robots.txt it
 * has crawled rather than the 192 we follow. Published under CC BY 4.0, so every
 * page that shows one of these says where it came from; `credit()` carries the
 * words for that.
 */
export interface World {
  total: number;
  rank: number;
  allowRank?: number;
  percent: string;
  disallowAll: number;
  allowOnly: number;
  avgCrawlDelay: number;
  crawlDelayCount: number;
}

interface WorldFile {
  source: string;
  credit: string;
  licence: string;
  licenceUrl: string;
  dataset: string;
  /** How many user-agents the dataset holds, which a rank is out of. */
  agents: number;
  retrieved: string;
  rows: Record<string, World>;
}

let world: WorldFile | null = null;
let aiList: ListFile | null = null;

function listFile(): ListFile | null {
  if (aiList) return aiList;
  try {
    aiList = JSON.parse(readFileSync(new URL('../data/airobots.json', import.meta.url), 'utf8')) as ListFile;
  } catch {
    aiList = null;
  }
  return aiList;
}

/** Where the AI crawler facts come from, for the line that has to say so. */
export function listCredit(): Omit<ListFile, 'rows'> | null {
  const file = listFile();
  if (!file) return null;
  const { rows: _rows, ...rest } = file;
  return rest;
}

/** The list's entry for a crawler, matched on the strings it answers to. */
function listedRow(name: string, tokens: string[]): Listed | undefined {
  const rows = listFile()?.rows;
  if (!rows) return undefined;
  for (const key of [name, ...tokens]) {
    const row = rows[key.toLowerCase()];
    if (row) return row;
  }
  return undefined;
}

function worldFile(): WorldFile | null {
  if (world) return world;
  try {
    world = JSON.parse(readFileSync(new URL('../data/openrobotstxt.json', import.meta.url), 'utf8')) as WorldFile;
  } catch {
    world = null;
  }
  return world;
}

/** Where the web-scale figures come from, for the line that has to say so. */
export function credit(): Omit<WorldFile, 'rows'> | null {
  const file = worldFile();
  if (!file) return null;
  const { rows: _rows, ...rest } = file;
  return rest;
}

/** The row for a crawler: its own token first, then the ones it falls back to. */
function worldRow(tokens: string[]): World | undefined {
  const rows = worldFile()?.rows;
  if (!rows) return undefined;
  for (const token of tokens) {
    const row = rows[token.toLowerCase()];
    if (row) return row;
  }
  return undefined;
}

export const slugFor = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A quoted string, or an array of them, as those blocks write values. */
function value(raw: string): string[] {
  const list = raw.trim();
  if (list.startsWith('[')) return [...list.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  const one = list.match(/^"([^"]*)"/);
  return one ? [one[1]] : [];
}

function topLevelList(toml: string, key: string): string[] {
  const line = toml.match(new RegExp(`^${key} = (\\[[^\\]]*\\])`, 'm'));
  return line ? value(line[1]) : [];
}

/** The URL operators put in their own user-agent string, usually after a plus. */
function infoUrl(ua: string): string | undefined {
  const found = ua.match(/https?:\/\/[^\s;)]+/);
  if (!found) return undefined;
  return found[0].replace(/[.,]$/, '');
}

interface Entry {
  name: string;
  tokens: string[];
  category: string;
  ua?: string;
  note?: string;
}

function entries(toml: string): Entry[] {
  const out: Entry[] = [];
  let current: Partial<Entry> | null = null;
  for (const line of toml.split('\n')) {
    const text = line.trim();
    if (text === '[[crawlers.list]]') {
      if (current?.name) out.push(current as Entry);
      current = {};
      continue;
    }
    // Any other section ends the block, so keys from the rest of the file (the
    // security categories also have a name) cannot leak into a crawler.
    if (text.startsWith('[')) {
      if (current?.name) out.push(current as Entry);
      current = null;
      continue;
    }
    if (!current) continue;
    const pair = text.match(/^([a-z_]+) = (.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    if (key === 'tokens') current.tokens = value(raw);
    else if (key === 'name') current.name = value(raw)[0];
    else if (key === 'category') current.category = value(raw)[0];
    else if (key === 'ua') current.ua = value(raw)[0];
    else if (key === 'note') current.note = value(raw)[0];
  }
  if (current?.name) out.push(current as Entry);
  return out;
}

/**
 * How many tracked sites name each crawler in a User-agent line of their own.
 *
 * Only User-agent lines count: a token inside a Disallow path says nothing about
 * the crawler. This counts names, which is a fact about the text, and says
 * nothing about whether the crawler is allowed or blocked. The leaderboard
 * answers that question for the crawlers it covers, and the engine produced it.
 */
function namedCounts(tokens: Map<string, string[]>): Map<string, number> {
  const counts = new Map<string, number>();
  let domains: string[] = [];
  try {
    domains = readdirSync(TRACKED, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return counts;
  }
  const agentsPerSite: string[][] = [];
  for (const domain of domains) {
    try {
      const text = readFileSync(new URL(`${domain}/robots.txt`, TRACKED), 'utf8').toLowerCase();
      agentsPerSite.push(text.split(/\r\n|\r|\n/)
        .map((line) => line.match(/^\s*user-agent\s*:\s*(.+?)\s*$/)?.[1])
        .filter((name): name is string => Boolean(name)));
    } catch {
      // a domain with no snapshot yet
    }
  }
  for (const [slug, list] of tokens) {
    let named = 0;
    for (const agents of agentsPerSite) if (agents.some((agent) => list.some((token) => agent === token || agent.includes(token)))) named++;
    counts.set(slug, named);
  }
  return counts;
}

/** The AI leaderboard the tracking run writes, row by row. */
function leaderboard(): Map<string, { blocked: number; percent: number; restricted: number; open: number }> {
  const rows = new Map<string, { blocked: number; percent: number; restricted: number; open: number }>();
  let board = '';
  try {
    board = readFileSync(new URL('README.md', TRACKED), 'utf8');
  } catch {
    return rows;
  }
  for (const line of board.split('\n')) {
    const row = line.match(/^\| ([^|]+?) \| (\d+) \((\d+)%\) \| (\d+) \| (\d+) \|/);
    if (!row) continue;
    const label = row[1].replace(/\s*\(.*\)$/, '').trim();
    rows.set(label.toLowerCase(), { blocked: Number(row[2]), percent: Number(row[3]), restricted: Number(row[4]), open: Number(row[5]) });
  }
  return rows;
}

let cache: Crawler[] | null = null;

export function crawlers(): Crawler[] {
  if (cache) return cache;
  const toml = readFileSync(CONFIG, 'utf8');
  const list = entries(toml);
  const ai = new Set(topLevelList(toml, 'ai_categories'));
  const tokens = new Map(list.map((e) => [slugFor(e.name), e.tokens]));
  const named = namedCounts(tokens);
  const board = leaderboard();
  cache = list.map((e) => ({
    name: e.name,
    slug: slugFor(e.name),
    tokens: e.tokens,
    category: e.category,
    ua: e.ua,
    info: e.ua ? infoUrl(e.ua) : undefined,
    note: e.note,
    ai: ai.has(e.category),
    named: named.get(slugFor(e.name)) ?? 0,
    board: board.get(e.name.toLowerCase()),
    world: worldRow(e.tokens),
    listed: listedRow(e.name, e.tokens),
  }));
  return cache;
}

/** The categories in the order the engine lists them, with their crawlers. */
export function byCategory(): { category: string; list: Crawler[] }[] {
  const toml = readFileSync(CONFIG, 'utf8');
  const order = topLevelList(toml, 'categories');
  const all = crawlers();
  return order
    .map((category) => ({ category, list: all.filter((c) => c.category === category) }))
    .filter((group) => group.list.length > 0);
}

/**
 * How many snapshots the figures are actually counted over.
 *
 * The configured list is longer than the snapshots on disk: a domain that has
 * never answered has no file yet. Every figure on these pages uses this number
 * as its denominator, including the leaderboard's percentages, which the engine
 * computed over the same files.
 */
export function measuredCount(): number {
  try {
    return readdirSync(TRACKED, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}
