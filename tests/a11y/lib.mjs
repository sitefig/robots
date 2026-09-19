// Shared helpers for the accessibility checkers: the page list, a local
// static server and a headless Chrome. They check the built site in _site/
// (npm run build:site); A11Y_SITE overrides the folder.
import { readdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = new URL('../../', import.meta.url);
export const rootPath = fileURLToPath(ROOT);
export const sitePath = process.env.A11Y_SITE ? `${process.env.A11Y_SITE.replace(/\/$/, '')}/` : `${rootPath}_site/`;
export const PORT = 8877;
export const BASE = `http://127.0.0.1:${PORT}`;

/** Every generated page: [{ code, file, urlPath }]. */
export function pages() {
  const out = [{ code: 'en', file: 'index.html', urlPath: '/' }];
  for (const d of readdirSync(sitePath, { withFileTypes: true })) {
    if (d.isDirectory() && /^[a-z]{2}$/.test(d.name) && existsSync(`${sitePath}${d.name}/index.html`)) out.push({ code: d.name, file: `${d.name}/index.html`, urlPath: `/${d.name}/` });
  }
  return out;
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
