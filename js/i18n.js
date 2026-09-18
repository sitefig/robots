// Page-side translation for the strings the browser renders itself (ui.*,
// page.*, fetch.error.*). The analysis text is formatted inside the engine
// from the same dictionaries (locales/<code>.json); this module only needs
// the small subset the DOM uses, but loads the whole file for simplicity.
//
// t(key, params): current locale, then English, then the key itself.
// A value may be a plural object keyed by Intl.PluralRules category; the
// reserved `n` parameter selects the form.

export const DEFAULT_LANG = 'en';

// Official EU languages with their native names, in switcher order. Data only.
export const LANGUAGES = {
  bg: 'български', cs: 'čeština', da: 'dansk', de: 'Deutsch', el: 'Ελληνικά', en: 'English', es: 'español', et: 'eesti',
  fi: 'suomi', fr: 'français', ga: 'Gaeilge', hr: 'hrvatski', hu: 'magyar', it: 'italiano', lt: 'lietuvių', lv: 'latviešu',
  mt: 'Malti', nl: 'Nederlands', pl: 'polski', pt: 'português', ro: 'română', sk: 'slovenčina', sl: 'slovenščina', sv: 'svenska',
};

let lang = DEFAULT_LANG;
let english = {};
let dict = {};
let plurals = new Intl.PluralRules(DEFAULT_LANG);

/** The English dictionary must be set once before any t() call. */
export function setEnglish(strings) {
  english = strings;
  if (lang === DEFAULT_LANG) dict = strings;
}

export function setLocale(code = DEFAULT_LANG, strings = {}) {
  lang = code || DEFAULT_LANG;
  dict = lang === DEFAULT_LANG ? english : strings;
  try {
    plurals = new Intl.PluralRules(lang);
  } catch {
    plurals = new Intl.PluralRules(DEFAULT_LANG);
  }
}

export function getLocale() {
  return lang;
}

/** The raw JSON text of the current locale, for the engine. */
export function currentDictionary() {
  return dict;
}

function pick(value, n) {
  if (value === null || typeof value !== 'object') return value;
  const category = typeof n === 'number' ? plurals.select(n) : 'other';
  return value[category] ?? value.other;
}

const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

export function t(key, params = {}) {
  let template = pick(dict[key], params.n);
  if (template === undefined) template = pick(english[key], params.n);
  if (template === undefined) return key;
  return String(template).replace(PLACEHOLDER, (m, name) => (Object.hasOwn(params, name) ? String(params[name]) : m));
}

export function formatNumber(n, options) {
  return new Intl.NumberFormat(lang, options).format(n);
}
