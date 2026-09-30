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

export function signupLink(intent?: string): string {
  const origin = state.fetch ? new URL(state.fetch.robotsUrl).origin : null;
  const params = new URLSearchParams();
  if (origin) params.set('site', origin);
  if (intent) params.set('intent', intent);
  const query = params.toString();
  return query ? `${APP_URL}/signup/?${query}` : `${APP_URL}/signup/`;
}
