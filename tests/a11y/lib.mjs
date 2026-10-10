// Shared helpers for the accessibility checkers: the page list, a local
// static server and a headless Chrome. They check the built site in _site/
// (npm run build:site); A11Y_SITE overrides the folder.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = new URL('../../', import.meta.url);
export const rootPath = fileURLToPath(ROOT);
export const sitePath = process.env.A11Y_SITE ? `${process.env.A11Y_SITE.replace(/\/$/, '')}/` : `${rootPath}_site/`;
export const PORT = 8877;
export const BASE = `http://127.0.0.1:${PORT}`;

/** Every built page (home pages and content pages): [{ code, file, urlPath }]. */
export function pages() {
  const out = [];
  const walk = (dir) => {
    for (const d of readdirSync(`${sitePath}${dir}`, { withFileTypes: true })) {
      if (d.isDirectory()) walk(`${dir}${d.name}/`);
      else if (d.name === 'index.html') {
        const code = /^[a-z]{2}\//.test(dir) ? dir.slice(0, 2) : 'en';
        out.push({ code, file: `${dir}index.html`, urlPath: `/${dir}` });
      }
    }
  };
  walk('');
  return out.sort((a, b) => (a.file === 'index.html' ? -1 : b.file === 'index.html' ? 1 : a.file.localeCompare(b.file)));
}

/**
 * The same list, with the generated pages collapsed to one page per shape.
 *
 * There are 97 documentation pages and they are one template filled in 97
 * times, so driving a browser over every one costs twenty minutes to prove the
 * same thing again and again, and the accessibility job has a budget. What axe
 * can see is which optional sections a page carries, so group them by that and
 * keep the first of each group: every arrangement the template can produce is
 * still checked, and a new section makes a new group rather than a silent gap.
 * html-validate reads all of them either way, in seconds, and so do the tests.
 */
const MARKS = ['says-heading', 'stories-heading', 'also-heading', 'What triggers it', 'What to write instead', 'class="callout"'];

export function shapes() {
  const seen = new Set();
  return pages().filter((p) => {
    if (!/^docs\/[^/]+\/[^/]+\/index\.html$/.test(p.file)) return true;
    const html = readFileSync(`${sitePath}${p.file}`, 'utf8');
    const signature = MARKS.map((mark) => (html.includes(mark) ? '1' : '0')).join('');
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

export function requireWasm() {
  if (!existsSync(`${sitePath}js/wasm/susbot_wasm_bg.wasm`) || !existsSync(`${sitePath}js/app.js`) || !existsSync(`${sitePath}css/site.css`)) {
    console.error(`${sitePath} is incomplete: run \`npm run build\` (or build:dev) first`);
    process.exit(2);
  }
}

/** A system Chrome if present, else the one puppeteer downloaded. */
export async function chromePath() {
  const system = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p));
  if (system) return system;
  const puppeteer = await import('puppeteer');
  return puppeteer.default.executablePath();
}

/** Serve the repo root; resolves once it answers. */
export async function serve(port = PORT) {
  const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: sitePath, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/index.html`);
      if (res.ok) return child;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error('static server did not start');
}
