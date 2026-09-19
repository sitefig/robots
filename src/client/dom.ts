// Shared DOM helpers for the components: element creation (no innerHTML),
// sentences that wrap elements, badges, capped lists and formatting.

import { t, formatNumber, type Params } from './i18n.ts';
import type { Level, Verdict } from './types.ts';

export type Child = Node | string | number | null | undefined | false | Child[];
export type AttrValue = string | number | boolean | null | undefined | ((event: Event) => void);

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;
export const slot = (id: string): HTMLElement => $(`#${id} > [data-slot]`);

function flatten(children: Child[]): (Node | string | number)[] {
  const out: (Node | string | number)[] = [];
  for (const child of children) {
    if (Array.isArray(child)) out.push(...flatten(child));
    else if (child !== null && child !== undefined && child !== false) out.push(child);
  }
  return out;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, AttrValue> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of flatten(children)) {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Translate a sentence that wraps elements; Node-valued params are spliced back in. */
export function tx(key: string, params: Record<string, string | number | Node> = {}): (string | Node)[] {
  const flat: Params = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v instanceof Node ? `{${k}}` : v]));
  return t(key, flat)
    .split(/(\{[a-zA-Z0-9_]+\})/)
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^\{([a-zA-Z0-9_]+)\}$/);
      const value = m ? params[m[1]] : undefined;
      return value instanceof Node ? value : part;
    });
}

/** A horizontally scrollable wrapper that keyboard users can reach and scroll. */
export function scrollable(title: string, ...children: Child[]): HTMLElement {
  // A named <section> is a region landmark natively, so keyboard users can
  // reach and scroll a wide table; the label keeps each region distinct.
  return el('section', { class: 'scroller', tabindex: '0', 'aria-label': t('ui.scrollTable', { title }) }, children);
}

export function replace(container: Element, ...children: Child[]): void {
  // Like the original children.flat(Infinity).filter(Boolean): empty strings
  // and zeros are dropped here too.
  container.replaceChildren(...flatten(children).filter(Boolean).map((c) => (c instanceof Node ? c : String(c))));
}

export function badge(text: string, stateName?: string | null): HTMLElement {
  return el('span', { class: 'badge', 'data-state': stateName }, text);
}

/**
 * The first `limit` items as they are, the rest behind a "Show all" disclosure,
 * so a file with hundreds of findings keeps the page short. `wrap` builds the
 * container for a slice of rendered items.
 */
export function capped<T>(list: T[], limit: number, render: (item: T) => Node, wrap: (items: Node[]) => Node): Child {
  const head = wrap(list.slice(0, limit).map(render));
  if (list.length <= limit) return head;
  return [head, el('details', { class: 'more' }, el('summary', {}, t('ui.showAll', { n: list.length })), wrap(list.slice(limit).map(render)))];
}

/** Section heading figure ("12 of 32 crawlers"), set by each renderer. */
export function meta(id: string, ...content: Child[]): void {
  const node = $(`#${id}`);
  if (node) replace(node, content);
}

export const VERDICT_STATE: Record<Verdict, string> = { open: 'ok', partial: 'warning', blocked: 'error' };
export const LEVEL_ORDER: Record<Level, number> = { error: 0, warning: 1, info: 2 };
export const verdictText = (v: Verdict): string => t(`enum.verdict.${v}`);

export function verdictBadge(verdict: Verdict): HTMLElement {
  if (verdict === 'open') return badge(t('ui.open'), 'ok');
  if (verdict === 'blocked') return badge(t('ui.blocked'), 'error');
  return badge(t('enum.verdict.partial'), 'warning');
}

export const levelLabel = (level: Level): string => t(`enum.level.${level}`);
export const lineText = (n: number): string => t('ui.line', { n });
export const lineLink = (n: number): HTMLElement => el('a', { href: `#line-${n}`, class: 'text-sm whitespace-nowrap' }, lineText(n));

export function formatBytes(n: number): string {
  if (n < 1024) return t('ui.bytes.b', { n: formatNumber(n) });
  return t('ui.bytes.kib', { n: formatNumber(n / 1024, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });
}

export const formatMs = (ms: number): string => t('ui.ms', { n: formatNumber(Math.round(ms)) });

export function setStatus(kind: string, message: string): void {
  const s = $('#status');
  s.dataset.state = kind;
  s.textContent = message;
}

export function readStored(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}
