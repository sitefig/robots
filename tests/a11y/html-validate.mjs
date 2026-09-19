// Checker 2: html-validate with its accessibility preset on every generated
// page (static markup: landmarks, labels, headings, alt text, lang, tables).
// The axe checker saves the DOM of every interactive state it reaches into
// tests/a11y/.snapshots/; those are validated here as well when present.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { HtmlValidate } from 'html-validate';
import { pages, rootPath, sitePath } from './lib.mjs';

const validator = new HtmlValidate({
  extends: ['html-validate:recommended', 'html-validate:a11y', 'html-validate:document'],
  rules: {
    // Presentational choices the checker is not about.
    'no-inline-style': 'off',
    'long-title': 'off',
    'require-sri': 'off',
    'no-trailing-whitespace': 'off',
    'attribute-boolean-style': 'off',
    'attribute-empty-style': 'off',
    // The theme script runs before first paint on purpose.
    'script-type': 'off',
    'no-implicit-close': 'off',
    'element-required-content': 'off',
    // Pages under /xx/ link to "../", which is a valid relative URL.
    'allowed-links': 'off',
    // The language list uses a <details> as a menu; role is fine.
    'prefer-native-element': 'error',
  },
});

const SNAPSHOTS = `${rootPath}tests/a11y/.snapshots/`;
const targets = pages().map((p) => ({ file: p.file, path: `${sitePath}${p.file}` }));
if (existsSync(SNAPSHOTS)) {
  for (const f of readdirSync(SNAPSHOTS).filter((f) => f.endsWith('.html')).sort()) targets.push({ file: `state ${f.slice(0, -5)}`, path: `${SNAPSHOTS}${f}` });
}
let errors = 0;
for (const p of targets) {
  const report = await validator.validateString(readFileSync(p.path, 'utf8'), p.file);
  for (const r of report.results) {
    for (const m of r.messages) {
      if (m.severity === 2) errors++;
      console.log(`  ${p.file}:${m.line}:${m.column} ${m.severity === 2 ? 'error' : 'warning'} ${m.ruleId}: ${m.message}`);
    }
  }
}
console.log(`html-validate: ${pages().length} pages + ${targets.length - pages().length} state snapshots, ${errors} error(s)`);
process.exit(errors ? 1 : 0);
