// The documentation pages: one per thing sus.bot can report.
//
// Three sources meet here and each owns its half:
//
//   - src/data/findings.json, written by tools/findings.ts out of the engine:
//     the id, the level and the sentence a report shows. The engine owns every
//     check, so the catalogue is read from it rather than written here, and
//     tests/pages.test.js fails if the two drift apart.
//   - src/data/docs/*.ts: what a page says about that finding, which is this
//     repository's, because it is page copy and not analysis.
//   - src/data/social-proof.json: stories from the people who ran into it,
//     synced from a third-party feed. Everything in there today is invented and
//     marked `sample: true`; the page says so where it shows them.
//
// English only, like /bot/ and /press/.

import { readFileSync } from 'node:fs';
import { DOCS } from '../data/docs/index.ts';

const DATA = new URL('../data/', import.meta.url);

export interface Finding {
  id: string;
  family: string;
  level: string;
  message: string;
  variants?: Record<string, string>;
}

interface Catalogue {
  engine: string;
  findings: Finding[];
  security: { id: string; label: string; advice: string }[];
  recon: string[];
}

/** What a page says. The engine's own sentence is not repeated here. */
export interface Doc {
  /** The heading, and what somebody would type into a search box. */
  title: string;
  /** One sentence, used as the page description and in the index. */
  summary: string;
  /** What the check looks at, and what makes it fire. */
  what: string;
  /** What it costs to leave alone. */
  why: string;
  /** What to do about it. */
  fix: string;
  /** A robots.txt before and after, where one helps. */
  example?: { wrong?: string; right?: string };
  /** Other pages worth reading next, by id. */
  also?: string[];
}

export interface Story {
  id: string;
  /** The pages this story belongs under. */
  docs: string[];
  author: { name: string; role?: string; company?: string; handle?: string };
  source: { app: string; url?: string };
  postedAt: string;
  text: string;
  /** False only once a real feed has replaced it. Nothing real is in there yet. */
  sample: boolean;
}

interface SocialFile {
  provider: { app: string; endpoint: string; format: string; docs?: string };
  syncedAt: string;
  sample: boolean;
  stories: Story[];
}

export interface DocPage {
  /** The engine's id, "seo.trailingSlash", or "security.backups", "recon.cloud". */
  id: string;
  /** The kind of thing it is: a finding family, "security" or "recon". */
  family: string;
  /** /docs/<family>/<name>/ */
  path: string;
  level: string;
  /** The sentence a report shows, where the engine has one. */
  message: string;
  variants?: Record<string, string>;
  doc: Doc;
  stories: Story[];
}

export const FAMILY_LABEL: Record<string, string> = {
  parser: 'Syntax and parsing',
  seo: 'Search traffic',
  lint: 'Rules that do nothing',
  sitemap: 'Sitemap lines',
  fetch: 'How the file is served',
  security: 'What the file exposes',
  recon: 'What the file reveals',
};

const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(name, DATA), 'utf8')) as T;

export const slugFor = (id: string): string => {
  const [family, ...rest] = id.split('.');
  const name = rest[rest.length - 1]
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${family}/${name}`;
};

let cache: DocPage[] | null = null;

export function docPages(): DocPage[] {
  if (cache) return cache;
  const cat = read<Catalogue>('findings.json');
  const social = read<SocialFile>('social-proof.json');
  const storiesFor = (id: string): Story[] => social.stories.filter((s) => s.docs.includes(id));

  const entries: { id: string; family: string; level: string; message: string; variants?: Record<string, string> }[] = [
    ...cat.findings.map((f) => ({ id: f.id, family: f.family, level: f.level, message: f.message, variants: f.variants })),
    ...cat.security.map((c) => ({ id: `security.${c.id}`, family: 'security', level: 'varies', message: c.advice })),
    ...cat.recon.map((m) => ({ id: `recon.${m}`, family: 'recon', level: 'info', message: '' })),
  ];

  cache = entries
    .filter((e) => DOCS[e.id])
    .map((e) => ({ ...e, path: `/docs/${slugFor(e.id)}/`, doc: DOCS[e.id], stories: storiesFor(e.id) }));
  return cache;
}

/** Everything in the catalogue, written up or not: the index and the test use it. */
export function catalogueIds(): string[] {
  const cat = read<Catalogue>('findings.json');
  return [...cat.findings.map((f) => f.id), ...cat.security.map((c) => `security.${c.id}`), ...cat.recon.map((m) => `recon.${m}`)];
}

/** Where the stories come from, for the line that has to say so. */
export function socialSource(): { provider: SocialFile['provider']; syncedAt: string; sample: boolean } {
  const social = read<SocialFile>('social-proof.json');
  return { provider: social.provider, syncedAt: social.syncedAt, sample: social.sample };
}

export function byFamily(): { family: string; label: string; pages: DocPage[] }[] {
  const pages = docPages();
  return Object.keys(FAMILY_LABEL)
    .map((family) => ({ family, label: FAMILY_LABEL[family], pages: pages.filter((p) => p.family === family) }))
    .filter((group) => group.pages.length > 0);
}
