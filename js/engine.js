// The analysis engine: a thin wrapper over the WebAssembly build of
// crates/core. Everything crosses the boundary as JSON strings. Build the
// bundle with `npm run build` (scripts/build-wasm.sh); js/wasm/ is generated.

import init, { Analysis as WasmAnalysis, version } from './wasm/susbot_wasm.js';

let ready = null;

/** Loads the WASM once; safe to call repeatedly. */
export function loadEngine() {
  if (!ready) ready = init({ module_or_path: new URL('./wasm/susbot_wasm_bg.wasm', import.meta.url) });
  return ready;
}

export { version };

/**
 * One analysis of one robots.txt. `options` mirrors susbot_core::Options:
 * { siteUrl, fetch, lang, locale, now, schemaUrl }.
 */
export class Analysis {
  constructor(text, options = {}) {
    this.inner = new WasmAnalysis(text, JSON.stringify(options));
    this.report = JSON.parse(this.inner.reportJson());
    this.crawlers = JSON.parse(this.inner.crawlers());
  }
  checkAccess(tokens, path) {
    return JSON.parse(this.inner.checkAccess(JSON.stringify(tokens), path));
  }
  cleanParams(path) {
    return JSON.parse(this.inner.cleanParams(path));
  }
  markdown() {
    return this.inner.markdown();
  }
  html() {
    return this.inner.html();
  }
  json() {
    return this.inner.reportJsonPretty();
  }
  csvTabs() {
    return JSON.parse(this.inner.csvTabs());
  }
  taggedCsv() {
    return this.inner.taggedCsv();
  }
  tsv(tab) {
    return this.inner.tsv(tab);
  }
  tabLabels() {
    return JSON.parse(this.inner.tabLabels());
  }
  filename() {
    return this.inner.filename();
  }
  lines() {
    return JSON.parse(this.inner.lines());
  }
  free() {
    this.inner.free();
  }
}
