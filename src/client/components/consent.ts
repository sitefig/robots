// The analytics choice: ask once, blocking, and honour the answer.
//
// The dialog ships in the HTML of every page (src/components/consent.ts, which
// carries the reasoning about what the law allows). This decides when it opens,
// what each answer does, and how somebody changes their mind later.
//
// Three rules it enforces:
//
// 1. Nothing loads before a yes. window.susLoadAnalytics is the only thing that
//    requests gtag.js, and it is called from exactly one place below.
// 2. Silence is not consent. Escape and the backdrop do not postpone the
//    question, they answer it with no: refusing is recorded, the visitor gets
//    the whole site, and they are not asked again. A dialog that reappears until
//    you agree is a wall by other means.
// 3. Changing your mind is as easy as the original choice, through the footer
//    link, which reopens this with no default selected.

import { t } from '../i18n.ts';
import { readStored } from '../dom.ts';
import { ANALYTICS_ID } from '../config.ts';

type Choice = 'granted' | 'denied';

interface ConsentWindow {
  susLoadAnalytics?: () => void;
  susRedirect?: boolean;
}

const KEY = 'consent';

function stored(): Choice | null {
  const value = readStored(KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

function remember(choice: Choice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Storage blocked: the choice holds for this page view and is asked again
    // next time, which is the safe direction to fail in.
  }
}

function applyGranted(): void {
  (window as unknown as ConsentWindow).susLoadAnalytics?.();
}

/**
 * Opens the question and wires the answers. Returns nothing: every path either
 * records a choice or leaves the page exactly as it was.
 */
export function initConsent(): void {
  const dialog = document.getElementById('consent') as HTMLDialogElement | null;
  const accept = document.getElementById('consent-accept');
  const reject = document.getElementById('consent-reject');
  const opener = document.querySelector<HTMLElement>('[data-consent-open]');
  if (!dialog || !accept || !reject) return;

  // With no measurement ID there is nothing to consent to, so the question is
  // not worth asking and the footer link has nothing to open.
  if (!ANALYTICS_ID) {
    opener?.closest('li')?.remove();
    dialog.remove();
    return;
  }

  let returnTo: HTMLElement | null = null;

  const decide = (choice: Choice): void => {
    remember(choice);
    if (choice === 'granted') applyGranted();
    if (dialog.open) dialog.close();
    // Focus goes back where it came from, or to the field the page is for.
    (returnTo ?? document.getElementById('site-url'))?.focus();
    returnTo = null;
    // Only a refusal is confirmed in words. Agreeing says nothing, except that
    // it takes back the refusal's sentence when that is still on the page.
    const status = document.getElementById('status');
    if (!status) return;
    const refused = t('ui.consent.saved.denied');
    if (choice === 'denied') status.textContent = refused;
    else if (status.textContent === refused) status.textContent = '';
  };

  accept.addEventListener('click', () => decide('granted'));
  reject.addEventListener('click', () => decide('denied'));
  // Escape, or anything else the browser treats as dismissing it, is a no.
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    decide('denied');
  });

  const ask = (): void => {
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
  };

  opener?.addEventListener('click', (e) => {
    e.preventDefault();
    ask();
  });

  const choice = stored();
  if (choice === 'granted') applyGranted();
  // A first visit is asked, except on the root page while it is redirecting to a
  // language page: the question belongs on the page the visitor lands on.
  if (!choice && !(window as unknown as ConsentWindow).susRedirect) ask();
}
