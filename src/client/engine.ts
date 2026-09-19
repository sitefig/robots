// The analysis engine: a thin wrapper over the WebAssembly build of
// crates/core. Everything crosses the boundary as JSON strings. Build the
// bundle with `npm run build:wasm` (scripts/build-wasm.sh); ./wasm/ is generated.

import init, { Analysis as WasmAnalysis, version } from './wasm/susbot_wasm.js';
import type { AccessResult, CrawlerList, FetchInfo, Report } from './types.ts';

let ready: ReturnType<typeof init> | null = null;

/** Loads the WASM once; safe to call repeatedly. */
export function loadEngine(): ReturnType<typeof init> {
  if (!ready) ready = init({ module_or_path: new URL('./wasm/susbot_wasm_bg.wasm', import.meta.url) });
  return ready;
}

export { version };

/** susbot_core::Options in JSON form. */
export interface Options {
  siteUrl?: string | null;
  fetch?: FetchInfo | null;
  lang?: string;
  locale?: string | null;
  now?: string;
  schemaUrl?: string;
}

/** One analysis of one robots.txt. */
export class Analysis {
  inner: WasmAnalysis;
  report: Report;
  crawlers: CrawlerList;

  constructor(text: string, options: Options = {}) {
    this.inner = new WasmAnalysis(text, JSON.stringify(options));
    this.report = JSON.parse(this.inner.reportJson()) as Report;
    this.crawlers = JSON.parse(this.inner.crawlers()) as CrawlerList;
  }
  checkAccess(tokens: string[], path: string): AccessResult {
    return JSON.parse(this.inner.checkAccess(JSON.stringify(tokens), path)) as AccessResult;
  }
  cleanParams(path: string): { removed: string[]; path: string } {
    return JSON.parse(this.inner.cleanParams(path));
  }
  markdown(): string {
    return this.inner.markdown();
  }
  html(): string {
    return this.inner.html();
  }
  json(): string {
    return this.inner.reportJsonPretty();
  }
  csvTabs(): Record<string, string> {
    return JSON.parse(this.inner.csvTabs());
  }
  taggedCsv(): string {
    return this.inner.taggedCsv();
  }
  tsv(tab: string): string {
    return this.inner.tsv(tab) ?? '';
  }
  tabLabels(): Record<string, string> {
    return JSON.parse(this.inner.tabLabels());
  }
  filename(): string {
    return this.inner.filename();
  }
  lines(): { kind: string }[] {
    return JSON.parse(this.inner.lines());
  }
  free(): void {
    this.inner.free();
  }
}
