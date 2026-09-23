// The two custom elements the app is made of.
//
//   <sus-nav src="/app/nav.json">          the shell: sidebar, domain, alerts
//   <sus-page src="/app/pages/overview.json">   the page: title, lead, blocks
//
// Both fetch their JSON, so changing what the app says is uploading a file.
// They render into their own light DOM rather than a shadow root, on purpose:
// the site's stylesheet, its focus ring and the accessibility checkers all
// work on the page as it stands, with no per-component style duplication.

import { renderBlock, type Block, type Node as ContentNode } from './blocks.ts';
import { loadCatalogue, pickLanguage, t, tx } from './i18n.ts';

const LANGUAGES = ['en', 'de', 'fr', 'nl', 'es', 'it'];
const I18N_BASE = '/app/i18n';

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Load the catalogue once, whichever element renders first. */
let ready: Promise<void> | null = null;
function translationsReady(): Promise<void> {
  ready ??= loadCatalogue(I18N_BASE, pickLanguage(LANGUAGES));
  return ready;
}

interface NavData {
  brand: ContentNode;
  primary: ContentNode[];
  account: ContentNode[];
  shell: Record<string, ContentNode>;
}

class SusNav extends HTMLElement {
  async connectedCallback(): Promise<void> {
    await translationsReady();
    const data = await json<NavData>(this.getAttribute('src') ?? '/app/nav.json');
    if (!data) {
      this.hidden = true;
      return;
    }
    const here = location.pathname.replace(/\/?$/, '/');
    const list = document.createElement('ul');
    list.className = 'app-nav__list';
    for (const item of data.primary) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = String(item.href ?? '#');
      a.textContent = tx(item);
      if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
      li.append(a);
      list.append(li);
    }
    const nav = document.createElement('nav');
    nav.className = 'app-nav';
    nav.setAttribute('aria-label', t('nav.label', 'Sections'));
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = String(data.brand.href ?? '/app/');
    brand.textContent = tx(data.brand);
    nav.append(brand, list);

    const account = document.createElement('ul');
    account.className = 'app-nav__list';
    for (const item of data.account) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = String(item.href ?? '#');
      a.textContent = tx(item);
      li.append(a);
      account.append(li);
    }
    const accountBox = document.createElement('div');
    accountBox.className = 'stack';
    const accountHeading = document.createElement('h2');
    accountHeading.className = 'text-sm text-muted';
    accountHeading.id = 'account-nav';
    accountHeading.textContent = t('nav.account', 'Account');
    accountBox.append(accountHeading, account);
    account.setAttribute('aria-labelledby', 'account-nav');
    nav.append(accountBox);

    this.replaceChildren(nav);
    void this.renderStatus(data);
  }

  /** The bits of the shell that come from live data, all optional. */
  private async renderStatus(data: NavData): Promise<void> {
    const bar = document.querySelector('[data-app-bar]');
    if (!bar) return;
    const status = data.shell?.crawlStatus;
    if (status?.endpoint) {
      const crawl = await json<{ nextCrawl?: string }>(String(status.endpoint));
      if (crawl?.nextCrawl) {
        const pill = document.createElement('span');
        pill.className = 'chip';
        pill.textContent = t(status.key, String(status.text ?? 'Next crawl {time}'), { time: crawl.nextCrawl });
        bar.append(pill);
      }
    }
    const alerts = data.shell?.notifications;
    if (alerts?.endpoint) {
      const feed = await json<{ unread?: number }>(String(alerts.endpoint));
      if (feed?.unread) {
        const pill = document.createElement('span');
        pill.className = 'badge';
        pill.dataset.state = 'warn';
        pill.textContent = `${tx(alerts)}: ${feed.unread}`;
        bar.append(pill);
      }
    }
  }
}

interface PageData {
  title: string;
  key?: string;
  lead?: string;
  blocks: Block[];
}

class SusPage extends HTMLElement {
  async connectedCallback(): Promise<void> {
    await translationsReady();
    const src = this.getAttribute('src');
    if (!src) return;
    const page = await json<PageData>(src);
    if (!page) {
      this.append(note(t('page.unavailable', 'This page could not be loaded. Try again in a moment.')));
      return;
    }
    // The heading is in the HTML already, so the page reads and is indexed
    // before this runs; translate it in place rather than replacing it.
    const heading = document.querySelector('h1');
    if (heading) heading.textContent = t(page.key, page.title);
    const leadNode = document.querySelector('[data-page-lead]');
    if (leadNode && page.lead) leadNode.textContent = t(page.key ? `${page.key}.lead` : undefined, page.lead);

    const fragment = document.createDocumentFragment();
    for (const block of page.blocks ?? []) {
      const data = block.endpoint ? await json<Record<string, unknown>>(String(block.endpoint)) : null;
      fragment.append(renderBlock(block, data));
    }
    this.replaceChildren(fragment);
  }
}

function note(text: string): HTMLElement {
  const p = document.createElement('p');
  p.className = 'callout';
  p.dataset.state = 'warn';
  p.textContent = text;
  return p;
}

export function register(): void {
  if (!customElements.get('sus-nav')) customElements.define('sus-nav', SusNav);
  if (!customElements.get('sus-page')) customElements.define('sus-page', SusPage);
}
