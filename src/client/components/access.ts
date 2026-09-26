// Real access by user-agent: refetches the file through the proxy with each
// crawler's user-agent and compares status and body with a browser baseline.

import { t } from '../i18n.ts';
import { el, badge, replace, slot, scrollable, formatBytes, formatMs } from '../dom.ts';
import { proxyConfigured, ACCESS_CHECK_CONCURRENCY } from '../config.ts';
import { fetchViaProxy, type FetchError, type FetchResult } from '../fetcher.ts';
import { state, current } from '../state.ts';
import { trackAccessCheck } from '../track.ts';

export function renderAccess(): void {
  const container = slot('access');
  if (!state.fetch) {
    replace(container, el('p', { class: 'text-sm text-muted' }, t('ui.access.pastedOnly')));
    return;
  }
  if (!proxyConfigured()) {
    replace(container, el('p', { class: 'text-sm text-muted' }, t('ui.access.noProxy')));
    return;
  }
  const count = 1 + current().crawlers.list.filter((a) => a.ua).length;
  const button = el('button', { type: 'button', class: 'button', onclick: () => runAccessCheck(button, container) }, t('ui.access.run'));
  replace(container, el('div', { class: 'cluster' }, button, el('span', { class: 'font-mono text-sm text-muted' }, t('ui.access.requests', { count, concurrency: ACCESS_CHECK_CONCURRENCY }))));
}

interface Target {
  name: string;
  ua: string | null;
}

async function runAccessCheck(button: HTMLButtonElement, container: HTMLElement): Promise<void> {
  button.disabled = true;
  const robotsUrl = state.fetch?.robotsUrl ?? '';
  const crawlers = current().crawlers;
  const targets: Target[] = [{ name: t('ui.access.baseline'), ua: crawlers.browser_ua }, ...crawlers.list.filter((a) => a.ua)];
  trackAccessCheck(targets.length);
  const rows = new Map<string, HTMLElement>();
  const tbody = el('tbody');
  for (const target of targets) {
    const tr = el('tr', {}, el('td', {}, target.name), el('td', { class: 'text-muted' }, t('ui.access.queued')), el('td'), el('td'), el('td'));
    rows.set(target.name, tr);
    tbody.append(tr);
  }
  const headers = ['ua', 'status', 'size', 'time', 'diff'].map((k) => t(`ui.access.th.${k}`));
  const table = el('table', { class: 'data-table' }, el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col' }, h)))), tbody);
  replace(container, el('div', { class: 'table-frame' }, scrollable(t('page.access'), table)), el('div', { class: 'cluster' }, button));
  let baseline: FetchResult | null = null;

  async function runOne(target: Target): Promise<FetchResult | null> {
    const tds = (rows.get(target.name) as HTMLElement).querySelectorAll('td');
    tds[1].textContent = t('ui.access.fetching');
    try {
      const r = await fetchViaProxy(robotsUrl, target.ua);
      replace(tds[1], badge(String(r.status), r.status < 300 ? 'ok' : r.status < 500 ? 'warning' : 'error'));
      tds[1].className = '';
      tds[2].textContent = formatBytes(r.bytes);
      tds[3].textContent = formatMs(r.durationMs);
      if (target === targets[0]) tds[4].textContent = '–';
      else if (!baseline) tds[4].textContent = t('ui.access.noBaseline');
      else if (r.status !== baseline.status) {
        tds[4].textContent = t('ui.access.statusDiffers');
        tds[4].dataset.diff = 'differs';
      } else if (r.text !== baseline.text) {
        tds[4].textContent = t('ui.access.bodyDiffers');
        tds[4].dataset.diff = 'differs';
      } else tds[4].textContent = t('ui.access.same');
      return r;
    } catch (err) {
      const e = err as FetchError;
      replace(tds[1], badge(e.status === 429 ? t('ui.access.rateLimited') : t('ui.access.error'), 'error'));
      tds[1].className = '';
      tds[4].textContent = e.message;
      return null;
    }
  }

  baseline = await runOne(targets[0]);
  const queue = targets.slice(1);
  await Promise.all(Array.from({ length: ACCESS_CHECK_CONCURRENCY }, async () => {
    while (queue.length) await runOne(queue.shift() as Target);
  }));
  button.disabled = false;
  button.textContent = t('ui.access.runAgain');
}
