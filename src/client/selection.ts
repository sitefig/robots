// Which fix is selected, shared by the fix list and the file viewer.
//
// Those two are one thought in two forms: a sentence about a consequence, and
// the lines that cause it. Selecting either has to move the other, so neither
// owns the state. This module does, and both subscribe.
//
// It holds line ownership as well, so a click in the file can find the fix that
// explains it without the viewer knowing anything about fixes.

export interface Selection {
  /** Index into the fix list, or -1 when nothing is selected. */
  index: number;
  /** The lines that fix points at. */
  lines: number[];
  /** What to say above the file, already translated. */
  hint: string;
}

type Listener = (s: Selection) => void;

const EMPTY: Selection = { index: -1, lines: [], hint: '' };

let selection: Selection = EMPTY;
let owners = new Map<number, number>();
const listeners = new Set<Listener>();

function announce(): void {
  for (const fn of listeners) fn(selection);
}

/**
 * A new analysis: nothing is selected, the old line owners are gone, and the
 * subscribers are dropped. Both components subscribe again as they render, so
 * keeping the old closures would leave them repainting detached cards.
 */
export function resetSelection(lineOwners: Map<number, number>): void {
  owners = lineOwners;
  selection = EMPTY;
  listeners.clear();
}

export function selected(): Selection {
  return selection;
}

export function select(next: Selection): void {
  selection = next;
  announce();
}

/** The fix that explains this line, if any fix does. */
export function ownerOfLine(line: number): number | undefined {
  return owners.get(line);
}

export function onSelect(fn: Listener): void {
  listeners.add(fn);
}
