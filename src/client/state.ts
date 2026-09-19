// The page's single piece of state. fetch is null when the text was pasted.
// siteUrl is the origin used for origin-dependent checks: the fetched URL,
// or an assumed one for examples. analysis is the live engine object for
// the current text.

import type { Analysis } from './engine.ts';
import type { FetchInfo } from './types.ts';

export interface State {
  input: string;
  text: string;
  fetch: FetchInfo | null;
  siteUrl: string | null;
  analysis: Analysis | null;
  parseMs?: number;
}

export const state: State = { input: '', text: '', fetch: null, siteUrl: null, analysis: null };

/** The current analysis; components only run once there is one. */
export function current(): Analysis {
  if (!state.analysis) throw new Error('no analysis yet');
  return state.analysis;
}
