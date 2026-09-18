// Runs the three accessibility checkers in turn and fails if any fails.
import { spawnSync } from 'node:child_process';
const checks = ['axe', 'html-validate', 'pa11y'];
let failed = 0;
for (const c of checks) {
  console.log(`\n== ${c}`);
  const r = spawnSync(process.execPath, [new URL(`./${c}.mjs`, import.meta.url).pathname], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`\naccessibility: ${checks.length - failed}/${checks.length} checkers passed`);
process.exit(failed ? 1 : 0);
