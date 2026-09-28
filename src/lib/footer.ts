// The footer's link groups. To grow the footer, add a group or a link here;
// labels are dictionary keys (add them to po/en.po, then npm run i18n:sync
// and translate), targets are one of:
//   { home: '#pricing' }   a section of the home page in the page's language
//   { site: '/press/' }    a site path
//   { url: 'https://…' }   an outside address
//   { dialog: 'consent' }  a button that opens a dialog on the page
// A group renders as a column with its heading; columns wrap on narrow
// screens, so the number of groups is not limited.

import { LINKS } from './site.ts';
import { PRICING } from '../client/config.ts';

export type Target = { home: string } | { site: string } | { url: string } | { dialog: 'consent' };

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
      { label: 'page.nav.cli', to: { url: `${LINKS.engine}#readme` } },
      ...(LINKS.extension ? [{ label: 'page.nav.extension', to: { url: LINKS.extension } as Target }] : []),
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
      { label: 'ui.privacy.title', to: { site: '/privacy/' } },
      // Withdrawing consent has to be as easy as giving it, so the choice is
      // reachable from every page (src/client/components/consent.ts).
      { label: 'ui.consent.footer', to: { dialog: 'consent' } },
      // The address is the label: it reads the same in every language.
      { label: 'receipt@sus.bot', to: { url: 'mailto:receipt@sus.bot' } },
      { label: 'page.footer.licence', to: { url: `${LINKS.repo}/blob/main/LICENSE.md` } },
      { label: 'Sitefig', to: { url: 'https://sitefig.eu/' } },
    ],
  },
];
