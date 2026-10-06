// Takes the OpenRobotsTxt bot statistics and keeps the rows for the crawlers we
// list, as src/data/openrobotstxt.json.
//
// Their CSV is 3.6 MB and 64,757 user-agents; we need about 150 of those rows, so
// the repository carries the slice rather than the file. The slice keeps the
// source, the licence, the dataset it came from and the day it was taken, because
// the data is published under CC BY 4.0 and every page that shows a figure from
// it says where it came from.
//
//   node tools/openrobotstxt.ts                  # downloads the current dataset
//   node tools/openrobotstxt.ts bot_statistics.csv   # or reads one you have
//
// The figures are a snapshot of a crawl, not a live feed: re-run this when
// OpenRobotsTxt publishes a new dataset, and the date on the pages moves with it.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SOURCE = 'https://openrobotstxt.org/stats/most-directed';
const LICENCE = 'CC BY 4.0';
const LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const INDEX = 'https://openrobotstxt.org/stats/most-directed';
const OUT = new URL('../src/data/openrobotstxt.json', import.meta.url);

interface Row {
  /** Files that name this user-agent at all. */
  total: number;
  /** Share of all the files in the dataset. */
  percent: string;
  /** Files that shut it out of everything. */
  disallowAll: number;
  /** Files that only allow, never disallow. */
  allowOnly: number;
  /** Seconds, where a Crawl-delay is set at all. */
  avgCrawlDelay: number;
  crawlDelayCount: number;
}

async function csv(): Promise<{ text: string; dataset: string }> {
  const local = process.argv[2];
  if (local) return { text: readFileSync(local, 'utf8'), dataset: local.replace(/^.*\//, '') };
  // The newest dataset is named on the stats page, as /files/<id>/bot_statistics.csv.
  const page = await fetch(INDEX);
  if (!page.ok) throw new Error(`${INDEX}: HTTP ${page.status}`);
  const found = (await page.text()).match(/\/files\/([0-9-]+)\/bot_statistics\.csv/);
  if (!found) throw new Error('no dataset link on the stats page; pass a CSV path instead');
  const url = `https://openrobotstxt.org${found[0]}`;
  const file = await fetch(url);
  if (!file.ok) throw new Error(`${url}: HTTP ${file.status}`);
  return { text: await file.text(), dataset: found[1] };
}

const { crawlers } = await import('../src/lib/crawlers.ts');

const wanted = new Map<string, string>();
for (const c of crawlers()) for (const token of c.tokens) wanted.set(token.toLowerCase(), token.toLowerCase());
wanted.set('*', '*');

const { text, dataset } = await csv();
const lines = text.split('\n');
const head = lines[0].split(',');
const column = (name: string): number => head.indexOf(name);
const rows: Record<string, Row> = {};
let kept = 0;
for (const line of lines.slice(1)) {
  if (!line) continue;
  const cells = line.split(',');
  const agent = cells[0]?.trim().toLowerCase();
  if (!agent || !wanted.has(agent)) continue;
  rows[agent] = {
    total: Number(cells[column('Total')]) || 0,
    percent: cells[column('TotalPercentage')]?.trim() || '',
    disallowAll: Number(cells[column('DisallowAll')]) || 0,
    allowOnly: Number(cells[column('AllowOnly')]) || 0,
    avgCrawlDelay: Number(cells[column('AvgCrawlDelay')]) || 0,
    crawlDelayCount: Number(cells[column('CrawlDelayCount')]) || 0,
  };
  kept++;
}

mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  source: SOURCE,
  credit: 'OpenRobotsTxt',
  licence: LICENCE,
  licenceUrl: LICENCE_URL,
  dataset,
  retrieved: new Date().toISOString().slice(0, 10),
  rows,
}, null, 2)}\n`);
console.log(`openrobotstxt: ${kept} of ${wanted.size} user-agents found in dataset ${dataset}`);
