// Recent sites: the sites this browser checked, newest first, kept in
// localStorage only, plus the referring site as a suggestion. The newest
// one is analysed by default when the page opens without a URL.

import { t } from '../i18n.ts';
import { el, replace, $ } from '../dom.ts';

const RECENT_KEY = 'recent';
const RECENT_MAX = 5;

// Referrers that say nothing about the visitor's own site.
const GENERIC_REFERRERS = ['google.', 'bing.com', 'duckduckgo.com', 'yahoo.', 'baidu.com', 'yandex.', 'ecosia.org', 'qwant.com', 'startpage.com', 'search.brave.com', 'facebook.com', 't.co', 'x.com', 'twitter.com', 'linkedin.com', 'lnkd.in', 'reddit.com', 'news.ycombinator.com', 'github.com', 'mastodon.', 'bsky.app'];

export function readRecent(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((o): o is string => typeof o === 'string' && /^https?:\/\//.test(o)).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]): void {
  try {
    if (list.length) localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    else localStorage.removeItem(RECENT_KEY);
  } catch {
    // storage unavailable; the list just is not kept
  }
}

/**
 * The site that linked here, when the browser sends it (usually the origin
 * only) and it is not a search engine or social network. Browsers never
 * expose any other history to a page.
 */
function referrerOrigin(): string | null {
  try {
    const u = new URL(document.referrer);
    if (!/^https?:$/.test(u.protocol) || u.origin === location.origin) return null;
    const host = u.hostname.replace(/^www\./, '');
    if (GENERIC_REFERRERS.some((g) => (g.endsWith('.') ? host.startsWith(g) || host.includes(`.${g}`) : host === g || host.endsWith(`.${g}`)))) return null;
    return u.origin;
  } catch {
    return null;
  }
}

const hostOf = (origin: string) => new URL(origin).host;

let onCheck: (origin: string) => void = () => {};

/** The chips under the form; `check` analyses an origin when one is clicked. */
export function renderRecent(check?: (origin: string) => void): void {
  if (check) onCheck = check;
  const box = $('#recent');
  const recent = readRecent();
  const ref = referrerOrigin();
  const suggest = ref && !recent.includes(ref) ? ref : null;
  box.hidden = recent.length === 0 && !suggest;
  replace(
    box,
    suggest && [el('span', { class: 'text-sm text-muted' }, t('ui.recent.from')), el('button', { type: 'button', class: 'chip', onclick: () => onCheck(suggest) }, hostOf(suggest))],
    recent.length > 0 && [
      el('span', { class: 'text-sm text-muted', id: 'recent-label' }, t('ui.recent.label')),
      el('ul', { class: 'cluster', 'data-space': 'xs', 'aria-labelledby': 'recent-label' }, recent.map((o) => el('li', {}, el('button', { type: 'button', class: 'chip', onclick: () => onCheck(o) }, hostOf(o))))),
      el('button', { type: 'button', class: 'link-button text-sm', onclick: () => { writeRecent([]); renderRecent(); } }, t('ui.recent.clear')),
    ],
  );
}

export function remember(origin: string): void {
  writeRecent([origin, ...readRecent().filter((o) => o !== origin)].slice(0, RECENT_MAX));
  renderRecent();
}
