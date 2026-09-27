// Theme toggle and language menu.

import { getLocale, DEFAULT_LANG, t } from '../i18n.ts';
import { readStored } from '../dom.ts';

export function initTheme(): void {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  const apply = (choice: 'light' | 'dark') => {
    document.documentElement.dataset.theme = choice;
    try {
      localStorage.setItem('theme', choice);
    } catch {
      // storage unavailable; the choice still applies for this page view
    }
    // The name says what pressing it will do next, not what the theme is.
    const next = choice === 'dark' ? 'light' : 'dark';
    button.dataset.to = next;
    button.setAttribute('aria-label', t(next === 'light' ? 'ui.theme.toLight' : 'ui.theme.toDark'));
  };
  // Dark unless the visitor has said otherwise. The operating system does not
  // get a vote: the page is drawn dark, and document.ts has already applied a
  // stored choice before the first paint.
  const stored = readStored('theme');
  apply(stored === 'light' ? 'light' : 'dark');
  button.addEventListener('click', () => apply(button.dataset.to === 'light' ? 'light' : 'dark'));
}

/**
 * The switcher is plain links rendered by the site build. Here they gain
 * the current query string (so ?url= survives a switch) and clicking one
 * records the choice, which stops the root page from auto-redirecting.
 */
export function initLanguage(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-lang]').forEach((a) => {
    a.href = a.getAttribute('href') + location.search;
    a.addEventListener('click', () => {
      try {
        localStorage.setItem('lang', a.dataset.lang ?? '');
      } catch {
        // storage unavailable; the navigation still happens
      }
    });
  });
  if (getLocale() !== DEFAULT_LANG) {
    try {
      if (!localStorage.getItem('lang')) localStorage.setItem('lang', getLocale());
    } catch {
      // ignore
    }
  }
}
