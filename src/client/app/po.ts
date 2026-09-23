// A gettext reader small enough to run in the browser. The app fetches the
// .po file itself rather than a compiled dictionary, so a translator can drop
// a new file next to the JSON and the next reload speaks the language.
//
// Only what a .po really needs: msgctxt as the key, msgid as the English,
// msgstr as the translation, C-style escapes, and strings continued over
// several lines. Plurals are left to the engine, which formats the analysis
// text; the app chrome has none.

export type Catalogue = Map<string, string>;

const unescape = (s: string): string =>
  s.replace(/\\(["\\nt])/g, (_, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));

/** Parse a .po file into key to translation, keyed by msgctxt. */
export function parsePo(text: string): Catalogue {
  const out: Catalogue = new Map();
  let ctxt = '';
  let msgstr = '';
  let field: 'ctxt' | 'str' | null = null;

  const flush = (): void => {
    if (ctxt && msgstr) out.set(ctxt, msgstr);
    ctxt = '';
    msgstr = '';
    field = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      if (!line) flush();
      continue;
    }
    const start = line.match(/^(msgctxt|msgid|msgid_plural|msgstr(?:\[\d+\])?)\s+"(.*)"$/);
    if (start) {
      const [, name, value] = start;
      if (name === 'msgctxt') {
        flush();
        ctxt = unescape(value);
        field = 'ctxt';
      } else if (name === 'msgstr' || name === 'msgstr[0]') {
        msgstr = unescape(value);
        field = 'str';
      } else {
        field = null;
      }
      continue;
    }
    // A string continued on its own line belongs to the field above it.
    const cont = line.match(/^"(.*)"$/);
    if (cont && field === 'str') msgstr += unescape(cont[1]);
    else if (cont && field === 'ctxt') ctxt += unescape(cont[1]);
  }
  flush();
  return out;
}
