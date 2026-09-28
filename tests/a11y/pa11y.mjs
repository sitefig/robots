// Checker 3: pa11y with the HTML_CodeSniffer runner (a different engine from
// axe) at WCAG 2.1 AA in headless Chrome, against the mock servers: the
// English root, one language page, and the states its action language can
// drive (paste of the worst robots.txt, the tester, the rules panel, the
// filter, the fetched report in every HTTP outcome).
import pa11y from 'pa11y';
import { requireWasm, chromePath } from './lib.mjs';
import { startServers, PORTS } from './server.mjs';

requireWasm();
const servers = startServers();
await new Promise((r) => setTimeout(r, 300));
const base = `http://127.0.0.1:${PORTS.site}`;
const origin = (port) => `http://127.0.0.1:${port}`;
const common = {
  standard: 'WCAG2AA',
  runners: ['htmlcs'],
  timeout: 60000,
  chromeLaunchConfig: { executablePath: await chromePath(), args: ['--no-sandbox', '--disable-gpu'] },
};
// pa11y's action language cannot carry a multi-line value, so the worst
// robots.txt reaches the page through the mock origin instead of the paste
// box, and the crawler <select> (which needs a change event) is left to axe.
// pa11y drives its own browser, so it meets the analytics question exactly as a
// first-time visitor does: the dialog is modal, and the page behind it is inert,
// which is why a target whose first action is a click has to answer it first.
// The root and the German page deliberately keep it open, so the blocking state
// itself is audited.
const decide = 'click element #consent-reject';
// The report is rendered once the worklist has cards in it. The recon cards are
// no longer a signal: they live in the appendix now, folded away until asked for.
const rendered = ['wait for #results to be visible', 'wait for #fixes .fix to be added'];
const worst = `${base}/?url=${origin(PORTS.worst)}`;
const targets = [
  { url: `${base}/`, label: 'root' },
  { url: `${base}/de/`, label: 'de' },
  { url: `${base}/`, label: 'paste empty error', actions: [decide, 'click element #paste-details > summary', 'click element #analyse-pasted', 'wait for #status[data-state="error"] to be added'] },
  { url: `${base}/`, label: 'pasted example', actions: [decide, 'click element #paste-details > summary', 'click element #load-example', ...rendered] },
  { url: worst, label: 'fetched worst', actions: rendered },
  { url: `${base}/de/?url=${origin(PORTS.worst)}`, label: 'de fetched worst', actions: rendered },
  { url: worst, label: 'tester blocked path', actions: [decide, ...rendered, 'click element #row-tester > summary', 'set field #tester-path to /gen/3', 'wait for #tester .callout[data-state="error"] to be added'] },
  { url: worst, label: 'filter chip', actions: [decide, ...rendered, 'click element #row-agents > summary', 'click element #agents .chip:nth-child(3)', 'wait for #agents tr[data-hidden="true"] to be added'] },
  { url: `${base}/?url=${origin(PORTS.notFound)}`, label: 'fetched 404', actions: [decide, 'wait for #results to be visible'] },
  { url: `${base}/?url=${origin(PORTS.serverError)}`, label: 'fetched 503', actions: [decide, 'wait for #results to be visible'] },
  { url: `${base}/?url=${origin(PORTS.html)}`, label: 'fetched html', actions: [decide, 'wait for #results to be visible'] },
  { url: `${base}/?url=${origin(PORTS.empty)}`, label: 'fetched empty', actions: [decide, 'wait for #results to be visible'] },
];
let total = 0;
let unreachable = 0;
try {
  for (const t of targets) {
    let result;
    try {
      result = await pa11y(t.url, { ...common, actions: t.actions || [] });
    } catch (err) {
      unreachable++;
      console.log(`  ${t.label}: could not reach the state: ${err.message.split('\n')[0]}`);
      continue;
    }
    const issues = result.issues.filter((i) => i.type === 'error');
    total += issues.length;
    console.log(`  ${t.label}: ${issues.length} error(s), ${result.issues.length - issues.length} warning/notice(s)`);
    for (const i of issues.slice(0, 25)) console.log(`      ${i.code}\n        ${i.selector}\n        ${i.message}`);
  }
} finally {
  servers.close();
}
console.log(`pa11y: ${targets.length} targets, ${total} error(s), ${unreachable} target(s) not reached`);
process.exit(total || unreachable ? 1 : 0);
