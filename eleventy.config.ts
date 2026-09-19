// Eleventy builds the site into _site/: the home page in every language
// (src/site/index.11ty.ts), content pages from Markdown (any .md under
// src/site with `layout: page`), and sitemap.xml. Components are TypeScript
// functions in src/components/ returning HTML; Node runs them directly.
//
// The rest of _site/ comes from other steps: css/site.css (Tailwind,
// npm run build:css) and js/*.js (tsc, npm run build:client). Everything
// else is copied here as is.

import { loadLocales, activeLanguages, trackingFigures } from './src/lib/site.ts';
import type { Dictionary } from './src/client/i18n.ts';

export interface SiteData {
  dicts: Record<string, Dictionary>;
  languages: string[];
  figures: { tracked: number; gptbotBlocked: number | null };
}

// Eleventy's config API, as far as this file uses it.
interface EleventyConfig {
  addExtension(ext: string[], options: { key: string }): void;
  addTemplateFormats(formats: string): void;
  addLayoutAlias(alias: string, file: string): void;
  addGlobalData(name: string, value: unknown): void;
  addPassthroughCopy(paths: string | Record<string, string>): void;
  addWatchTarget(path: string): void;
}

export default function (config: EleventyConfig) {
  config.addExtension(['11ty.ts'], { key: '11ty.js' });
  config.addTemplateFormats('11ty.ts');
  config.addLayoutAlias('page', 'page.11ty.ts');

  const dicts = loadLocales();
  config.addGlobalData('dicts', dicts);
  config.addGlobalData('languages', activeLanguages(dicts));
  config.addGlobalData('figures', trackingFigures());

  config.addPassthroughCopy({
    fonts: 'fonts',
    locales: 'locales',
    schema: 'schema',
    examples: 'examples',
    'src/client/wasm/susbot_wasm.js': 'js/wasm/susbot_wasm.js',
    'src/client/wasm/susbot_wasm_bg.wasm': 'js/wasm/susbot_wasm_bg.wasm',
    'config/default.toml': 'default-config.toml',
    'src/site/favicon.svg': 'favicon.svg',
    '.nojekyll': '.nojekyll',
    CNAME: 'CNAME',
  });
  config.addWatchTarget('src/components/');
  config.addWatchTarget('src/lib/');
  config.addWatchTarget('locales/');

  return {
    dir: { input: 'src/site', includes: '_includes', output: '_site' },
    templateFormats: ['md', '11ty.ts'],
    markdownTemplateEngine: false,
  };
}
