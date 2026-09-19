#!/usr/bin/env node
// Writes the press kit into src/site/press/files/: every SVG from
// src/lib/brand.ts, PNG renders (headless Chrome, transparent background),
// a README and a zip of all of it. The output is committed; run this again
// after changing the logo:  node tools/brand.ts
//
// Needs Chrome (puppeteer, a devDependency) only here, not in the site build.

import { mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import puppeteer from 'puppeteer';
import { brandFiles, README, ZIP_NAME } from '../src/lib/brand.ts';

const OUT = fileURLToPath(new URL('../src/site/press/files/', import.meta.url));

/** A system Chrome if there is one, else the one puppeteer downloaded. */
const chromePath = (): string =>
  ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p)) ?? puppeteer.executablePath();

/** A zip archive (deflate) of files given as [name, bytes]; fixed timestamps so rebuilds are identical. */
function zip(entries: [string, Buffer][]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = (2026 - 1980) << 9 | 9 << 5 | 19;
  for (const [name, data] of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6);
    head.writeUInt16LE(8, 8);
    head.writeUInt16LE(DOS_TIME, 10);
    head.writeUInt16LE(DOS_DATE, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    local.push(head, nameBuf, packed);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(packed.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += head.length + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

rmSync(OUT, { recursive: true, force: true });
const files = brandFiles();
for (const f of files) {
  if (!f.svg) continue;
  mkdirSync(dirname(join(OUT, f.file)), { recursive: true });
  writeFileSync(join(OUT, f.file), f.svg);
}
writeFileSync(join(OUT, 'README.txt'), README);

const browser = await puppeteer.launch({ executablePath: chromePath(), args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const f of files) {
  if (!f.png) continue;
  const source = readFileSync(join(OUT, f.png.from), 'utf8');
  const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(source) as RegExpExecArray;
  const height = Math.round((f.png.width * Number(h)) / Number(w));
  await page.setViewport({ width: f.png.width, height, deviceScaleFactor: 1 });
  const sized = source.replace(/width="\d+" height="\d+"/, `width="${f.png.width}" height="${height}"`);
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:transparent">${sized}</body></html>`);
  mkdirSync(dirname(join(OUT, f.file)), { recursive: true });
  await page.screenshot({ path: join(OUT, f.file), omitBackground: true, clip: { x: 0, y: 0, width: f.png.width, height } });
}
await browser.close();

const entries = walk(OUT).sort().map((p) => [`susbot-press-kit/${relative(OUT, p)}`, readFileSync(p)] as [string, Buffer]);
writeFileSync(join(OUT, ZIP_NAME), zip(entries));
console.log(`${entries.length} files and ${ZIP_NAME} in src/site/press/files/`);
