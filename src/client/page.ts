// Entry point of content pages (Markdown, press kit): the theme switch, the
// language menu and the logo's menu; no engine, no dictionary download.

import { setLocale, DEFAULT_LANG, LANGUAGES } from './i18n.ts';
import { initTheme, initLanguage } from './components/preferences.ts';
import { initBrandMenu } from './components/brand-menu.ts';

const code = (document.documentElement.lang || DEFAULT_LANG).toLowerCase().split('-')[0];
if (code !== DEFAULT_LANG && Object.hasOwn(LANGUAGES, code)) setLocale(code, {});
initTheme();
initLanguage();
initBrandMenu();
