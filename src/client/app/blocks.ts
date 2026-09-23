// Every block type a page JSON may contain, and how it looks.
//
// A page is a list of blocks; each block has a `type` that names one of the
// renderers below. Adding a section to a page means adding an object to its
// JSON file, not writing code, which is the point: uploading JSON changes the
// app. A block may carry its items inline or name an `endpoint` to fetch them
// from, so the same list works for fixed copy and for live data.

import { t, tx } from './i18n.ts';

export interface Node {
  key?: string;
  text?: string;
  label?: string;
  title?: string;
  [k: string]: unknown;
}

export interface Block extends Node {
  type: string;
  items?: Node[];
  endpoint?: string;
  columns?: Node[];
  fields?: Node[];
  empty?: Node;
  lead?: string;
  href?: string;
  more?: string;
  limit?: number;
  numbered?: boolean;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | null> = {}, ...children: (Node_ | string | null | false)[]): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null) node.setAttribute(k, v);
  for (const c of children) if (c) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
};
type Node_ = globalThis.Node;

const severityState: Record<string, string> = { critical: 'bad', high: 'bad', medium: 'warn', low: 'info', info: 'info' };
const statusState: Record<string, string> = { allowed: 'bad', partial: 'warn', blocked: 'ok', ok: 'ok', error: 'bad', warning: 'warn' };

const badge = (text: string, state: string): HTMLElement => el('span', { class: 'badge', 'data-state': state }, text);

/** The heading every block shares, with an optional link to the full page. */
function header(block: Block): HTMLElement | null {
  const title = tx(block);
  if (!title) return null;
  const head = el('div', { class: 'cluster', 'data-justify': 'between' }, el('h2', {}, title));
  if (block.href && block.more) head.append(el('a', { href: block.href }, t(undefined, block.more)));
  return head;
}

const lead = (block: Block): HTMLElement | null => (block.lead ? el('p', { class: 'text-muted' }, block.lead) : null);

function emptyState(block: Block): HTMLElement | null {
  const e = block.empty as Node | undefined;
  if (!e) return null;
  const box = el('p', { class: 'callout', 'data-state': 'info' }, tx(e));
  if (typeof e.href === 'string' && typeof e.cta === 'string') box.append(' ', el('a', { href: e.href }, e.cta));
  return box;
}

// A block with a title renders an h2, so its children start at h3; a block
// without one starts its children at h2, which keeps the heading order of
// the page unbroken however the JSON is arranged.
type Heading = 'h2' | 'h3';
type Render = (block: Block, data: Record<string, unknown> | null, h: Heading) => (Node_ | null)[];

const itemsOf = (block: Block, data: Record<string, unknown> | null): Node[] =>
  ((data?.items as Node[] | undefined) ?? (block.items as Node[] | undefined) ?? []).slice(0, block.limit ?? Infinity);

const renderers: Record<string, Render> = {
  stats: (block, data) => [
    el('div', { class: 'stat-grid' }, ...itemsOf(block, data).map((s) =>
      el('div', { class: 'stat-card' },
        el('span', { class: 'text-sm text-muted' }, tx(s)),
        el('span', { class: 'stat-card__value' }, String(s.value ?? ''), s.unit ? el('span', { class: 'stat-card__unit' }, String(s.unit)) : null),
        s.delta ? el('span', { class: 'text-sm text-muted' }, String(s.delta)) : null,
      ))),
  ],

  list: (block, data) => {
    const items = itemsOf(block, data);
    if (items.length === 0) return [emptyState(block)];
    return [el('ul', { class: 'issue-list' }, ...items.map((i) => {
      const line = el('li', {});
      const title = el('span', { class: 'font-bold' }, tx(i));
      if (typeof i.href === 'string') line.append(el('a', { href: i.href }, title));
      else line.append(title);
      if (i.severity) line.append(' ', badge(String(i.severity), severityState[String(i.severity)] ?? 'info'));
      if (i.status) line.append(' ', badge(String(i.status), 'info'));
      if (i.meta) line.append(el('span', { class: 'text-sm text-muted' }, ` ${String(i.meta)}`));
      if (i.when) line.append(el('span', { class: 'text-sm text-muted' }, ` ${String(i.when)}`));
      return line;
    }))];
  },

  table: (block, data) => {
    const rows = itemsOf(block, data);
    if (rows.length === 0) return [emptyState(block)];
    const cols = (block.columns ?? []) as Node[];
    const keys = cols.map((c) => String(c.key ?? '').replace(/^col\./, ''));
    return [el('div', { class: 'table-frame' }, el('table', { class: 'data-table' },
      el('thead', {}, el('tr', {}, ...cols.map((c) => el('th', { scope: 'col' }, tx(c))))),
      el('tbody', {}, ...rows.map((r) => el('tr', {}, ...keys.map((k) => {
        const value = r[k];
        const cell = el('td', {});
        if (typeof value === 'string' && statusState[value]) cell.append(badge(value, statusState[value]));
        else cell.append(value === undefined || value === null ? '' : String(value));
        return cell;
      })))),
    ))];
  },

  matrix: (block, data) => {
    const bots = ((data?.bots as Node[] | undefined) ?? (block.items as Node[] | undefined) ?? []);
    if (bots.length === 0) return [emptyState(block)];
    return [el('ul', { class: 'matrix' }, ...bots.map((b) =>
      el('li', {},
        el('span', {}, String(b.name ?? ''), b.operator ? el('span', { class: 'text-sm text-muted' }, ` ${String(b.operator)}`) : null),
        badge(String(b.status ?? ''), statusState[String(b.status)] ?? 'info'),
      )))];
  },

  timeline: (block, data) => {
    const markers = ((data?.markers as Node[] | undefined) ?? []);
    const filters = (block.filters as Node[] | undefined) ?? [];
    const out: (Node_ | null)[] = [];
    if (filters.length > 0) {
      out.push(el('div', { class: 'cluster', role: 'group', 'aria-label': t('filter.label', 'Filter the timeline') },
        ...filters.map((f) => el('button', { type: 'button', class: 'chip', 'aria-pressed': 'true' }, tx(f)))));
    }
    if (markers.length === 0) out.push(emptyState(block));
    else {
      out.push(el('ul', { class: 'timeline' }, ...markers.map((m) => {
        const line = el('li', { 'data-kind': String(m.kind ?? 'change') },
          el('span', { class: 'text-sm text-muted font-mono' }, String(m.date ?? '')),
          el('span', { class: 'timeline__dot' }),
        );
        const label = el('span', {}, String(m.title ?? ''));
        line.append(typeof m.href === 'string' ? el('a', { href: m.href }, label) : label);
        return line;
      })));
    }
    return out;
  },

  checklist: (block, data) => [
    el('ul', { class: 'stack' }, ...itemsOf(block, data).map((i) =>
      el('li', {},
        el('a', { href: String(i.href ?? '#') }, tx(i)),
        i.priority ? el('span', { class: 'text-sm text-muted' }, ' — worth doing first') : null,
      ))),
  ],

  steps: (block, data) => [
    el('ol', { class: 'steps', 'data-numbered': block.numbered ? 'true' : 'false' }, ...itemsOf(block, data).map((s) =>
      el('li', {}, el('div', {},
        el('p', { class: 'font-bold' }, tx(s)),
        s.text ? el('p', { class: 'text-sm text-muted' }, String(s.text)) : null,
      )))),
  ],

  cards: (block, data, h) => [
    el('div', { class: 'grid', 'data-min': 's' }, ...itemsOf(block, data).map((c) => {
      const card = el('article', { class: 'card' }, el(h, {}, tx(c)), c.text ? el('p', { class: 'text-sm' }, String(c.text)) : null);
      if (typeof c.href === 'string') card.append(el('a', { href: c.href }, t('action.open', 'Open')));
      return card;
    })),
  ],

  actions: (block, data) => [
    el('div', { class: 'cluster', role: 'group', 'aria-label': tx(block) || t('actions.label', 'Actions') },
      ...itemsOf(block, data).map((a) => {
        const attrs = { class: 'button', 'data-variant': a.variant === 'primary' ? 'primary' : null };
        const node = typeof a.href === 'string'
          ? el('a', { ...attrs, href: String(a.href) }, tx(a))
          : el('button', { ...attrs, type: 'button' }, tx(a));
        return a.note ? el('p', { class: 'stack' }, node, el('span', { class: 'text-sm text-muted' }, String(a.note))) : node;
      })),
  ],

  links: (block, data) => [
    el('ul', { class: 'cluster' }, ...itemsOf(block, data).map((l) =>
      el('li', {}, typeof l.href === 'string' ? el('a', { href: l.href }, tx(l)) : el('span', {}, tx(l))))),
  ],

  summary: (block, data) => {
    const fields = (block.fields ?? []) as Node[];
    return [el('dl', { class: 'defs' }, ...fields.flatMap((f) => {
      const name = String(f.key ?? '').replace(/^field\./, '');
      const value = data?.[name];
      return [
        el('div', {}, el('dt', {}, tx(f)), el('dd', {}, value === undefined ? '—' : String(value))),
      ];
    }))];
  },

  note: (block) => {
    const box = el('p', { class: 'callout', 'data-state': 'info' }, tx(block));
    if (block.href && typeof block.cta === 'string') box.append(' ', el('a', { href: block.href }, String(block.cta)));
    return [box];
  },

  form: (block) => {
    const form = el('form', { class: 'stack' });
    for (const f of (block.fields ?? []) as Node[]) {
      const id = `f-${String(f.key ?? Math.random()).replace(/\W+/g, '-')}`;
      form.append(el('div', { class: 'stack' },
        el('label', { for: id }, tx(f)),
        el('input', { id, type: String(f.type ?? 'text'), placeholder: f.placeholder ? String(f.placeholder) : null, autocomplete: 'off' }),
        f.note ? el('span', { class: 'text-sm text-muted' }, String(f.note)) : null,
      ));
    }
    const submit = block.submit as Node | undefined;
    if (submit) form.append(el('button', { type: 'submit', class: 'button', 'data-variant': 'primary' }, tx(submit)));
    const alternate = block.alternate as Node | undefined;
    if (alternate) form.append(el('button', { type: 'button', class: 'button' }, tx(alternate)));
    return [form];
  },

  filters: (block) => [
    el('div', { class: 'cluster', role: 'group', 'aria-label': t('filters.label', 'Filters') },
      ...((block.items ?? []) as Node[]).map((f) => {
        const id = `filter-${String(f.key ?? '').replace(/\W+/g, '-')}`;
        const options = (f.options as string[] | undefined) ?? [];
        return el('div', { class: 'stack' },
          el('label', { for: id }, tx(f)),
          el('select', { id }, el('option', {}, t('filter.any', 'Any')), ...options.map((o) => el('option', {}, o))),
        );
      })),
  ],

  progress: (block) => {
    const items = (block.items ?? []) as Node[];
    const current = Number(block.current ?? 0);
    return [el('ol', { class: 'progress' }, ...items.map((s, i) =>
      el('li', { 'aria-current': i === current ? 'step' : null, 'data-done': i < current ? 'true' : 'false' },
        i < current && typeof s.href === 'string' ? el('a', { href: s.href }, tx(s)) : el('span', {}, tx(s)))))];
  },

  status: (block, data) => [
    el('p', { class: 'callout', 'data-state': 'info' }, String(data?.message ?? tx(block))),
    block.text ? el('p', { class: 'text-sm text-muted' }, String(block.text)) : null,
  ],

  preview: (block, data) => {
    if (!data) return [emptyState(block)];
    const findings = (data.findings as string[] | undefined) ?? [];
    return [
      el('p', {}, `${String(data.domain ?? '')} — HTTP ${String(data.status ?? '')}, ${String(data.lines ?? 0)} lines`),
      el('ul', { class: 'issue-list' }, ...findings.map((f) => el('li', {}, f))),
    ];
  },

  diff: (block, data) => {
    const lines = (data?.lines as Node[] | undefined) ?? [];
    if (lines.length === 0) return [emptyState(block)];
    return [el('pre', { class: 'diff' }, ...lines.map((l) =>
      el('div', { 'data-kind': String(l.kind ?? 'context') }, `${l.kind === 'added' ? '+' : l.kind === 'removed' ? '-' : ' '} ${String(l.text ?? '')}`)))];
  },

  log: (block, data) => [
    el('ol', { class: 'stack' }, ...itemsOf(block, data).map((e) =>
      el('li', {}, el('span', { class: 'text-sm text-muted font-mono' }, `${String(e.when ?? '')} `), String(e.text ?? '')))),
  ],

  plans: (block, data, h) => [
    el('div', { class: 'grid', 'data-min': 's' }, ...itemsOf(block, data).map((p) =>
      el('article', { class: 'plan', 'data-featured': p.featured ? 'true' : 'false' },
        el(h, {}, String(p.name ?? '')),
        el('p', { class: 'text-sm text-muted' }, String(p.blurb ?? '')),
        el('ul', { class: 'plan__features' }, ...((p.features as string[] | undefined) ?? []).map((f) => el('li', {}, f))),
        el('button', { type: 'button', class: 'button', 'data-variant': p.featured ? 'primary' : null }, t('action.choosePlan', 'Choose')),
      ))),
  ],

  editor: (block, data) => {
    const groups = (data?.groups as Node[] | undefined) ?? [];
    const modes = (block.modes as Node[] | undefined) ?? [];
    return [
      el('div', { class: 'seg', role: 'group', 'aria-label': t('editor.mode', 'Editor mode') },
        ...modes.map((m, i) => el('button', { type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false' }, tx(m)))),
      el('ul', { class: 'stack' }, ...groups.map((g) =>
        el('li', {},
          el('p', { class: 'font-bold font-mono' }, `User-agent: ${((g.agents as string[] | undefined) ?? []).join(', ')}`),
          el('ul', {}, ...(((g.rules as Node[] | undefined) ?? []).map((r) =>
            el('li', { class: 'font-mono text-sm' }, `${r.type === 'allow' ? 'Allow' : 'Disallow'}: ${String(r.path ?? '')}`)))),
        ))),
    ];
  },

  tester: (block) => {
    const form = el('form', { class: 'cluster' });
    for (const f of (block.fields ?? []) as Node[]) {
      const id = `t-${String(f.key ?? '').replace(/\W+/g, '-')}`;
      form.append(el('div', { class: 'stack' },
        el('label', { for: id }, tx(f)),
        el('input', { id, type: 'text', placeholder: f.placeholder ? String(f.placeholder) : null }),
      ));
    }
    form.append(el('button', { type: 'submit', class: 'button' }, t('action.test', 'Test')));
    const result = block.result as Node | undefined;
    return [form, result ? el('p', { class: 'text-sm text-muted' }, tx(result)) : null];
  },
};

/** Render one block, with the data its endpoint returned (or null). */
export function renderBlock(block: Block, data: Record<string, unknown> | null): HTMLElement {
  const section = document.createElement('section');
  section.className = 'flow';
  section.dataset.block = block.type;
  const head = header(block);
  const heading: Heading = head ? 'h3' : 'h2';
  if (head) {
    const id = `b-${String(block.key ?? block.type).replace(/\W+/g, '-')}`;
    head.querySelector('h2')?.setAttribute('id', id);
    section.setAttribute('aria-labelledby', id);
    section.append(head);
  }
  const l = lead(block);
  if (l) section.append(l);
  const render = renderers[block.type];
  if (!render) {
    section.append(el('p', { class: 'callout', 'data-state': 'warn' }, t('block.unknown', `No renderer for a block of type "${block.type}".`)));
    return section;
  }
  for (const node of render(block, data, heading)) if (node) section.append(node);
  return section;
}

export const blockTypes = (): string[] => Object.keys(renderers);
