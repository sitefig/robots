// Takes the ai.robots.txt list and keeps what we can show, as
// src/data/airobots.json.
//
// ai.robots.txt (https://github.com/ai-robots-txt/ai.robots.txt) is the list
// most site owners' AI blocks are copied from. Its robots.json holds, per
// crawler, who operates it, what it is for, whether it is documented as
// honouring robots.txt and how often it comes back. That is the "where to find
// info" a crawler page needs, and it is a fact about the crawler rather than
// anything we measured, so it is carried separately and credited.
//
// The list is MIT licensed, so this file keeps the notice with the data and
// every page that shows a line from it names the source and the licence.
//
//   node tools/airobots.ts
//
// It also reads the releases feed, which is how the list records when a crawler
// was added: the ten most recent releases, so a crawler added before those has
// no date and the page says nothing about when it was listed.

import { writeFileSync, mkdirSync } from 'node:fs';

const REPO = 'https://github.com/ai-robots-txt/ai.robots.txt';
const DATA = 'https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/robots.json';
const FEED = `${REPO}/releases.atom`;
const OUT = new URL('../src/data/airobots.json', import.meta.url);

interface Source {
  operator: string;
  respect: string;
  function: string;
  frequency: string;
  description: string;
}

interface Row {
  /** The name the list gives it, which is the user-agent token it sends. */
  name: string;
  operator?: string;
  operatorUrl?: string;
  /** What the list says it is for. */
  purpose?: string;
  /** "yes", "no" or "unclear": whether it is documented as honouring robots.txt. */
  respect: string;
  respectUrl?: string;
  frequency?: string;
  description?: string;
  /** Where the operator or the list documents it. */
  infoUrl?: string;
  /** The release that added it, where the feed still carries it. */
  since?: string;
  release?: string;
}

/** Markdown links carry the fact and the address; we want both, separately. */
function link(raw: string): { text: string; url?: string } {
  const text = (raw ?? '').trim();
  const md = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (md) return { text: md[1].trim(), url: md[2].trim() };
  const inside = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
  const bare = text.match(/^(https?:\/\/\S+)$/);
  if (bare) return { text: bare[1].replace(/^https?:\/\//, ''), url: bare[1] };
  return { text: text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'), url: inside?.[2] };
}

const unclear = (s: string): boolean => /^unclear at this time\.?$/i.test(s.trim());

/** "Yes", "[Yes](url)", "No", a sentence, or nothing anyone knows. */
function respect(raw: string): { value: string; url?: string } {
  const { text, url } = link(raw ?? '');
  if (unclear(text) || !text) return { value: 'unclear', url };
  if (/^yes$/i.test(text)) return { value: 'yes', url };
  if (/^no$/i.test(text)) return { value: 'no', url };
  return { value: text, url };
}

const data = await fetch(DATA);
if (!data.ok) throw new Error(`${DATA}: HTTP ${data.status}`);
const list = (await data.json()) as Record<string, Source>;

// When each crawler was added, from the releases feed: a release names the
// crawlers it added in its notes, so the oldest release in the feed that names
// one is as early as we can date it.
const added = new Map<string, { since: string; release?: string }>();
try {
  const feed = await fetch(FEED);
  if (feed.ok) {
    const xml = await feed.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
    for (const entry of entries.reverse()) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
      const day = (entry.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] ?? '').slice(0, 10);
      const notes = `${title} ${entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? ''}`
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&');
      const version = title.split(':')[0].trim();
      for (const name of Object.keys(list)) {
        if (added.has(name)) continue;
        // "Add X", "add X and Y", "feat: add X": the name has to be there as a
        // whole word, or Code and Spider would match every release note.
        // Not followed by a letter, digit or hyphen, or "Add Diffbot-User"
        // would date Diffbot, which has been on the list for years.
        if (new RegExp(`\\badd(?:s|ed|ing)?\\b[^.]{0,80}?\\b${name.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}(?![-\\w])`, 'i').test(notes)) {
          added.set(name, { since: day, release: /^v[\d.]+$/.test(version) ? version : undefined });
        }
      }
    }
  }
} catch {
  // No feed, no dates: the rest of the file is still worth writing.
}

const rows: Record<string, Row> = {};
for (const [name, entry] of Object.entries(list)) {
  const operator = link(entry.operator ?? '');
  const honours = respect(entry.respect ?? '');
  const purpose = (entry.function ?? '').trim();
  const description = (entry.description ?? '').trim();
  // Most entries end by saying where the crawler is documented, either as
  // "More info can be found at <url>" or as a last sentence carrying a link.
  // That address is worth keeping as a link; the sentence around it is not,
  // because a bare URL in the middle of a paragraph reads as a mistake.
  const sentences = description.split(/(?<=\.)\s+/);
  let infoUrl: string | undefined;
  while (sentences.length > 0) {
    const last = sentences[sentences.length - 1];
    const url = last.match(/https?:\/\/\S+/);
    if (!url) break;
    infoUrl = infoUrl ?? url[0].replace(/[.,)]+$/, '');
    sentences.pop();
  }
  const body = sentences.join(' ').trim();
  const when = added.get(name);
  // The list carries a few crawlers twice, once in each casing, and the two
  // entries are not equally full: keep whichever field says something.
  const seen = rows[name.toLowerCase()];
  const row: Row = {
    name,
    operator: unclear(operator.text) ? undefined : operator.text,
    operatorUrl: operator.url,
    purpose: unclear(purpose) ? undefined : purpose,
    respect: honours.value,
    respectUrl: honours.url,
    frequency: unclear(entry.frequency ?? '') ? undefined : (entry.frequency ?? '').trim() || undefined,
    description: unclear(body) || /^description unavailable/i.test(body) ? undefined : body || undefined,
    infoUrl,
    since: when?.since,
    release: when?.release,
  };
  rows[name.toLowerCase()] = seen
    ? (Object.fromEntries(Object.entries(row).map(([key, v]) => [key, v ?? seen[key as keyof Row]])) as Row)
    : row;
}

mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  source: REPO,
  credit: 'ai.robots.txt',
  licence: 'MIT',
  licenceUrl: `${REPO}/blob/main/LICENSE`,
  copyright: 'Copyright (c) 2024 ai.robots.txt',
  retrieved: new Date().toISOString().slice(0, 10),
  rows,
}, null, 2)}\n`);
console.log(`airobots: ${Object.keys(rows).length} crawlers, ${added.size} with a date from the releases feed`);
