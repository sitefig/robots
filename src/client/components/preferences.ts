// Theme switch and language menu.

import { getLocale, DEFAULT_LANG } from '../i18n.ts';
import { readStored } from '../dom.ts';

export function initTheme(): void {
  const buttons = document.querySelectorAll<HTMLElement>('[data-theme-choice]');
  const read = () => readStored('theme') || 'system';
  const apply = (choice: string) => {
    if (choice === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
    try {
      if (choice === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', choice);
    } catch {
      // storage unavailable; the choice still applies for this page view
    }
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)));
  };
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.themeChoice ?? 'system')));
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === read())));
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
