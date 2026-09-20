// The footer's link groups. To grow the footer, add a group or a link here;
// labels are dictionary keys (add them to po/en.po, then npm run i18n:sync
// and translate), targets are one of:
//   { home: '#pricing' }   a section of the home page in the page's language
//   { site: '/press/' }    a site path
//   { url: 'https://…' }   an outside address
// A group renders as a column with its heading; columns wrap on narrow
// screens, so the number of groups is not limited.

import { LINKS } from './site.ts';
import { PRICING } from '../client/config.ts';

export type Target = { home: string } | { site: string } | { url: string };

export interface FooterLink {
  label: string;
  to: Target;
}

export interface FooterGroup {
  heading: string;
  links: FooterLink[];
}

export const FOOTER: FooterGroup[] = [
  {
    heading: 'page.footer.product',
    links: [
      { label: 'page.footer.check', to: { home: '#main' } },
      // Only while the prices are published; see PRICING.show in src/client/config.ts.
      ...(PRICING.show ? [{ label: 'page.nav.pricing', to: { home: '#pricing' } as Target }] : []),
      { label: 'page.nav.cli', to: { home: '#cli' } },
      { label: 'page.nav.extension', to: { home: '#extension' } },
    ],
  },
  {
    heading: 'page.footer.resources',
    links: [
      { label: 'page.nav.gallery', to: { url: LINKS.gallery } },
      { label: 'page.footer.history', to: { url: LINKS.diffs } },
      { label: 'page.footer.schema', to: { site: '/schema/report.schema.json' } },
      { label: 'page.footer.source', to: { url: LINKS.repo } },
    ],
  },
  {
    heading: 'page.footer.company',
    links: [
      { label: 'page.footer.press', to: { site: '/press/' } },
      { label: 'page.footer.bot', to: { site: '/bot/' } },
      { label: 'page.footer.licence', to: { url: `${LINKS.repo}/blob/main/LICENSE.md` } },
      { label: 'Sitefig', to: { url: 'https://sitefig.eu/' } },
    ],
  },
];
