// What to fix, in order: the report as a worklist instead of six tables.
//
// Everything here already existed somewhere on the page. The issue list had the
// findings, the security panel had the sensitive paths, the recon cards had the
// comments, the AI section had the policy question. What none of them had was an
// order, an owner, or a sentence you could send to the person who will do the
// work. A founder cannot act on "37 warnings across four panels"; they can act
// on "this one first, and here is the message for your developer".
//
// The order is the argument: what is broken now, then what the file gives away,
// then what is merely untidy, and last the one item that is not a mistake at all
// but a decision somebody has to make about AI.
//
// Business and IT are the same fix with different amounts of detail, not two
// different texts. The engine writes one message per finding, and inventing a
// second wording here would put analysis logic in the front end. IT adds the
// line as it stands, the paths and the finding id, which is what you need to
// change the file. The ticket is always the technical one, because that is its
// job.

import { t, formatNumber } from '../i18n.ts';
import { el, badge, replace, slot, lineText, LEVEL_ORDER, type Child } from '../dom.ts';
import { current } from '../state.ts';
import { resetSelection, select, onSelect } from '../selection.ts';
import type { Analysis } from '../engine.ts';
import type { Level, SecurityFinding } from '../types.ts';

interface Fix {
  rank: number;
  /** Badge colour, and the tint of the card. */
  level: Level;
  /** Critical, high, medium or a decision to make. */
  sev: Sev;
  area: string;
  title: string;
  /** The consequence, from the engine. Empty when the title says it all. */
  body: string;
  /** What IT needs on top of it: the line as it stands, paths, ids. */
  detail: Child[];
  owner: string;
  lines: number[];
  /** The message to send. Plain text, because it is going into a ticket. */
  ticket: string;
}

/**
 * How bad it is, in four words a business uses. The engine grades findings as
 * error / warning / note and security findings as high / medium / low, which is
 * the right vocabulary for the file and the wrong one for deciding what to do
 * first. These four are that decision: something is broken, something is exposed,
 * something is untidy, something is yours to choose.
 */
const SEV = ['critical', 'high', 'medium', 'decision'] as const;
type Sev = typeof SEV[number];

/** The colour each one carries, from the four the page already uses. */
const SEV_STATE: Record<Sev, string> = { critical: 'error', high: 'warning', medium: 'info', decision: 'info' };

/**
 * How much work it is. Coarse on purpose: the engine knows what is wrong, not how
 * long your deploy takes, so this says what kind of change it is rather than
 * inventing a number of minutes.
 */
const EFFORT: Record<Sev, string> = { critical: 'line', high: 'check', medium: 'line', decision: 'call' };

/** Who acts on a finding of this kind. A judgement about people, not the file. */
const OWNER: Record<string, string> = {
  'seo-trap': 'devSeo',
  sitemap: 'devSeo',
  security: 'devSec',
  syntax: 'dev',
  lint: 'dev',
  fetch: 'dev',
};

const SEVERITY_LEVEL: Record<string, Level> = { high: 'error', medium: 'warning', low: 'info', info: 'info' };
const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };

const owner = (kind: string): string => t(`ui.fix.owner.${OWNER[kind] || 'dev'}`);
const area = (kind: string): string => t(`ui.fix.area.${kind}`);

/** The line as it stands in the file, for whoever has to find it. */
function sourceLine(lines: string[], n: number): string {
  return (lines[n - 1] ?? '').trim();
}

function lineCode(lines: string[], n: number): Child {
  return el(
    'div',
    { class: 'fix__code font-mono text-sm' },
    el('span', { class: 'text-muted' }, `${n}  `),
    sourceLine(lines, n) || t('ui.fix.emptyLine'),
  );
}

function fromIssues(raw: string[]): Fix[] {
  return current().report.issues
    .filter((w) => w.level !== 'info')
    .map((w) => ({
      rank: w.level === 'error' ? 0 : 40,
      level: w.level,
      sev: w.level === 'error' ? 'critical' : 'medium',
      area: area(w.kind),
      title: w.message,
      body: '',
      detail: [w.line ? lineCode(raw, w.line) : null, el('p', { class: 'text-xs font-mono text-muted' }, w.id)],
      owner: owner(w.kind),
      lines: w.line ? [w.line] : [],
      ticket: w.line
        ? t('ui.ticket.issue', { line: w.line, text: sourceLine(raw, w.line), message: w.message })
        : t('ui.ticket.noLine', { message: w.message }),
    }));
}

/**
 * One fix per kind of sensitive path, not one per path. "37 sensitive paths" is
 * a number nobody acts on; "the file names your backup folder, on five lines" is
 * a change. The advice is the engine's, translated with the category.
 */
function fromSecurity(): Fix[] {
  const r = current().report;
  const groups = new Map<string, SecurityFinding[]>();
  for (const f of r.security) {
    if (f.severity === 'info') continue;
    const list = groups.get(f.category);
    if (list) list.push(f);
    else groups.set(f.category, [f]);
  }
  const fixes: Fix[] = [];
  for (const [id, findings] of groups) {
    const category = r.securityCategories.find((c) => c.id === id);
    const worst = findings.reduce((a, b) => (SEVERITY_RANK[a.severity] <= SEVERITY_RANK[b.severity] ? a : b));
    const lines = [...new Set(findings.map((f) => f.line))].sort((a, b) => a - b);
    const advice = category?.advice || worst.reason;
    fixes.push({
      rank: 10 + SEVERITY_RANK[worst.severity],
      level: SEVERITY_LEVEL[worst.severity],
      sev: worst.severity === 'high' ? 'high' : 'medium',
      area: area('security'),
      title: t('ui.fix.security.title', { n: findings.length, what: category?.label || id }),
      body: advice,
      detail: [el('ul', { class: 'fix__paths' }, findings.map((f) => el('li', { class: 'font-mono text-sm' }, `${f.line}  ${f.path}`)))],
      owner: owner('security'),
      lines,
      ticket: t('ui.ticket.security', { lines: lines.join(', '), paths: findings.map((f) => f.path).join(', '), advice }),
    });
  }
  return fixes;
}

/** What was left in the comments. The engine reads them; nobody else should. */
function fromComments(): Fix[] {
  const comments = current().report.recon.comments;
  if (comments.length === 0) return [];
  const lines = [...new Set(comments.map((c) => c.line))].sort((a, b) => a - b);
  return [{
    rank: 30,
    level: 'warning',
    sev: 'high',
    area: area('security'),
    title: t('ui.fix.comments.title', { n: comments.length }),
    body: t('ui.fix.comments.body'),
    detail: [el('ul', { class: 'fix__paths' }, comments.map((c) => el('li', { class: 'font-mono text-sm' }, `${c.line}  ${c.value}`)))],
    owner: owner('security'),
    lines,
    ticket: t('ui.ticket.comments', { lines: lines.join(', ') }),
  }];
}

/**
 * The only item on the list that is not a fault. Somebody has to decide whether
 * AI companies may train on the site; the file cannot decide it and neither can
 * we. It sits last because it is a choice, and it carries no line because there
 * is nothing wrong with the lines that are there.
 */
function fromAi(): Fix[] {
  const ai = current().report.aiStatus;
  const training = ai.groups[0];
  if (!training) return [];
  const { open, partial, blocked } = training.counts;
  if (open === 0 && partial === 0) return [];
  return [{
    rank: 50,
    level: 'info',
    sev: 'decision',
    area: area('ai'),
    title: t('ui.fix.ai.title', { n: open + partial, total: training.crawlers.length }),
    body: ai.callout.text,
    detail: ai.groups.map((g) => el('p', { class: 'text-sm' }, t('ui.fix.ai.counts', { label: g.label, blocked: g.counts.blocked, total: g.crawlers.length }))),
    owner: t('ui.fix.owner.marketing'),
    lines: [],
    ticket: t('ui.ticket.ai', { n: open + partial, blocked }),
  }];
}

// Built once per analysis: the verdict counts, the handoff message and the list
// itself all ask for it.
let cached: { analysis: Analysis; fixes: Fix[] } | null = null;

function allFixes(): Fix[] {
  const analysis = current();
  if (cached && cached.analysis === analysis) return cached.fixes;
  const raw = analysis.report.raw.split(/\r\n|\r|\n/);
  const fixes = [...fromIssues(raw), ...fromSecurity(), ...fromComments(), ...fromAi()]
    .sort((a, b) => a.rank - b.rank || LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || (a.lines[0] ?? Infinity) - (b.lines[0] ?? Infinity));
  cached = { analysis, fixes };
  return fixes;
}

let mode: 'business' | 'it' = 'business';

export function renderFixes(): void {
  const fixes = allFixes();

  // The file viewer asks which fix a line belongs to, so the map is built here,
  // once, and handed over with the reset.
  const owners = new Map<number, number>();
  fixes.forEach((fix, i) => { for (const line of fix.lines) if (!owners.has(line)) owners.set(line, i); });
  resetSelection(owners);

  if (fixes.length === 0) {
    replace(slot('fixes'), el('p', { class: 'callout', 'data-state': 'ok' }, t('ui.fixes.none')));
    return;
  }

  const cards = fixes.map((fix, i) => card(fix, i));
  replace(
    slot('fixes'),
    modeToggle(() => { for (const node of cards) node.dataset.mode = mode; }),
    el('div', { class: 'flow', 'data-space': 'xs' }, cards),
  );

  // A click in the file has to move the list too.
  onSelect((s) => {
    cards.forEach((node, i) => { node.dataset.selected = i === s.index ? 'true' : 'false'; });
  });
}

/** "Explain for: Business | IT", which sets how much detail every card shows. */
function modeToggle(apply: () => void): HTMLElement {
  const buttons: HTMLButtonElement[] = [];
  const set = (next: 'business' | 'it'): void => {
    mode = next;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    apply();
  };
  for (const name of ['business', 'it'] as const) {
    buttons.push(el('button', { type: 'button', class: 'chip', 'data-mode': name, 'aria-pressed': String(mode === name), onclick: () => set(name) }, t(`ui.fixes.${name}`)));
  }
  return el(
    'div',
    { class: 'cluster', 'data-space': 'xs', 'data-justify': 'end' },
    el('span', { class: 'text-sm text-muted', id: 'fixes-mode-label' }, t('ui.fixes.explainFor')),
    el('div', { class: 'seg', role: 'group', 'aria-labelledby': 'fixes-mode-label' }, buttons),
  );
}

function card(fix: Fix, index: number): HTMLElement {
  const id = `fix-ticket-${index}`;
  const copy = el('button', { type: 'button', class: 'button', onclick: async () => {
    try {
      await navigator.clipboard.writeText(fix.ticket);
      copy.textContent = t('ui.done');
    } catch {
      copy.textContent = t('ui.failed');
    }
    setTimeout(() => { copy.textContent = t('ui.fixes.copy'); }, 1600);
  } }, t('ui.fixes.copy'));
  const ticket = el(
    'div',
    { class: 'fix__ticket flow', id, 'data-space': 'xs', hidden: true },
    el('div', { class: 'cluster', 'data-justify': 'between', 'data-space': 'xs' }, el('span', { class: 'text-xs font-mono' }, t('ui.fixes.ticketLabel')), copy),
    el('pre', { class: 'fix__message' }, fix.ticket),
  );

  const hint = fix.lines.length
    ? t('ui.file.hint.some', { title: fix.title, lines: fix.lines.join(', ') })
    : t('ui.file.hint.none');

  const head = el(
    'button',
    { type: 'button', class: 'fix__head', 'aria-expanded': 'false', 'aria-controls': id, onclick: () => {
      const open = Boolean(ticket.hidden);
      ticket.hidden = !open;
      head.setAttribute('aria-expanded', String(open));
      select({ index, lines: fix.lines, hint });
    } },
    el(
      'span',
      { class: 'fix__meta text-sm' },
      badge(t(`ui.sev.${fix.sev}`), SEV_STATE[fix.sev]),
      el('span', { class: 'text-muted' }, fix.area),
      el('span', { class: 'text-muted push-end' }, t(`ui.effort.${EFFORT[fix.sev]}`)),
    ),
    el('span', { class: 'fix__title' }, fix.title),
    fix.body ? el('span', { class: 'fix__body' }, fix.body) : null,
  );

  const chips = fix.lines.map((n) =>
    el('button', { type: 'button', class: 'chip font-mono', onclick: () => {
      select({ index, lines: fix.lines, hint });
      document.getElementById(`line-${n}`)?.scrollIntoView({ block: 'center' });
    } }, lineText(n)));

  return el(
    'article',
    { class: 'fix flow', 'data-space': 'xs', 'data-level': fix.level, 'data-mode': mode, 'data-selected': 'false' },
    head,
    el('div', { class: 'fix__detail flow', 'data-space': '2xs' }, fix.detail),
    el(
      'div',
      { class: 'cluster text-sm', 'data-space': 'xs' },
      el('span', { class: 'text-muted' }, t('ui.fixes.who'), ' ', el('span', { class: 'font-bold text-ink' }, fix.owner)),
      chips.length
        ? el('span', { class: 'cluster', 'data-space': '2xs', role: 'group', 'aria-label': t('ui.fixes.linesLabel') }, chips)
        : el('span', { class: 'text-muted' }, t('ui.fixes.decision')),
    ),
    ticket,
  );
}

/** The count line under the verdict: what the list adds up to. */
export function fixCounts(): string {
  const fixes = allFixes();
  const count = (sev: Sev): string => formatNumber(fixes.filter((f) => f.sev === sev).length);
  return t('ui.fixes.counts', { critical: count('critical'), high: count('high'), medium: count('medium'), decision: count('decision') });
}

/** Everything on the list as one plain-text message, for the handoff. */
export function allTickets(): string {
  return allFixes().map((fix, i) => `${i + 1}. [${t(`ui.sev.${fix.sev}`)}] ${fix.title}\n${fix.ticket}`).join('\n\n');
}

/** How many fixes there are, for the label on the button that copies them all. */
export function fixTotal(): number {
  return allFixes().length;
}
