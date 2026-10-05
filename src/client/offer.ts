// Where a free account is made.
//
// Its own module because both the exports and the worklist link to it, and
// having either import the other would tie two unrelated components together
// through a two-line function.
//
// The address carries the site that was checked and what the visitor was trying
// to do when the offer appeared. The app reads neither yet: its signup page only
// looks at `next`, and the domain is typed again in the first onboarding step.
// Sending them costs nothing and is what the other side needs to skip that step.

import { APP_URL } from './config.ts';
import { state } from './state.ts';

const SIGNUP = `${APP_URL}/signup/`;

/** The site this visit checked, or null when a file was pasted. */
function checkedOrigin(): string | null {
  return state.fetch ? new URL(state.fetch.robotsUrl).origin : null;
}

// Sites this visit was compared with, for the checked site only: the app
// watches them for the new account. Five is what it takes.
const rivals = new Set<string>();
let rivalsOf: string | null = null;

/** Remember a compared site. Call fillSignupLinks() after, to put it on the links. */
export function addRival(rivalOrigin: string): void {
  const origin = checkedOrigin();
  if (!origin || rivalOrigin === origin) return;
  if (rivalsOf !== origin) { rivals.clear(); rivalsOf = origin; }
  if (rivals.size < 5) rivals.add(rivalOrigin);
}

const rivalOrigins = (): string[] => (rivalsOf === checkedOrigin() ? [...rivals] : []);

/**
 * Put the checked site on every signup link the page has, whoever wrote it: the
 * one in the navigation that ships in the HTML of all 24 pages, the two in the
 * offer section, and the ones the components build as they render. Setting the
 * parameter rather than appending it means this is safe to run after every
 * analysis, which is when it runs.
 */
export function fillSignupLinks(): void {
  const origin = checkedOrigin();
  if (!origin) return;
  for (const link of document.querySelectorAll<HTMLAnchorElement>(`a[href^="${SIGNUP}"]`)) {
    const url = new URL(link.href);
    url.searchParams.set('site', origin);
    url.searchParams.delete('competitor');
    for (const rival of rivalOrigins()) url.searchParams.append('competitor', rival);
    link.href = url.href;
  }
}

export function signupLink(intent?: string): string {
  const origin = checkedOrigin();
  const params = new URLSearchParams();
  if (origin) params.set('site', origin);
  for (const rival of rivalOrigins()) params.append('competitor', rival);
  if (intent) params.set('intent', intent);
  const query = params.toString();
  return query ? `${SIGNUP}?${query}` : SIGNUP;
}
