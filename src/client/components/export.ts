// Export and share: quick buttons under the verdict, the rest behind
// "More export options" (client audit, spreadsheet, JSON, share link).

import { t } from '../i18n.ts';
import { el, tx, replace, slot, $, type Child } from '../dom.ts';
import { state, current } from '../state.ts';
import { SCHEMA_URL } from '../paths.ts';

function downloadFile(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Copies rich text (for Google Docs, Notion, email) with a plain-text fallback. */
async function copyRich(html: string, text: string): Promise<void> {
  if (typeof ClipboardItem === 'function' && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) }),
      ]);
      return;
    } catch {
      // fall through to plain text
    }
  }
  await copyText(text);
}

/** Button whose label flashes a result for a moment after an async action. */
function actionButton(label: string, action: () => unknown, { primary = false }: { primary?: boolean } = {}): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'button', 'data-variant': primary ? 'primary' : null }, label);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await action();
      button.textContent = t('ui.done');
    } catch (err) {
      button.textContent = t('ui.failed');
      console.error(err);
    }
    setTimeout(() => {
      button.textContent = label;
      button.disabled = false;
    }, 1400);
  });
  return button;
}

export function renderExport(): void {
  const a = current();
  const base = () => a.filename();
  const shareUrl = state.input ? `${location.origin}${location.pathname}?${new URLSearchParams({ url: state.input })}` : null;
  const tabSelect = el('select', { 'aria-label': t('ui.export.sheetSelect') }, Object.entries(a.tabLabels()).map(([k, v]) => el('option', { value: k }, v)), el('option', { value: 'all' }, t('ui.export.allSheets')));
  const card = (title: string, note: Child, ...rows: Child[]) => el('div', { class: 'card flow', 'data-space': 'xs' }, el('h3', {}, title), el('p', { class: 'text-sm text-muted' }, note), rows);

  $('#export').hidden = false;
  replace(
    slot('export'),
    el(
      'div',
      { class: 'cluster', 'data-space': 'xs' },
      actionButton(t('ui.export.quick.audit'), () => copyText(a.markdown())),
      actionButton(t('ui.export.quick.json'), () => downloadFile(`${base()}.json`, a.json(), 'application/json;charset=utf-8')),
      actionButton(t('ui.export.quick.sheets'), () => copyText(a.tsv('all'))),
    ),
    el(
      'details',
      { class: 'card' },
      el('summary', { class: 'font-bold' }, t('ui.export.more')),
      el(
        'div',
        { class: 'grid mt-3', 'data-min': 's' },
        card(
          t('ui.export.audit.title'),
          t('ui.export.audit.note'),
          el(
            'div',
            { class: 'cluster', 'data-space': 'xs' },
            actionButton(t('ui.export.audit.copyMd'), () => copyText(a.markdown()), { primary: true }),
            actionButton(t('ui.export.audit.copyRich'), () => copyRich(a.html(), a.markdown())),
            actionButton(t('ui.export.audit.downloadMd'), () => downloadFile(`${base()}.md`, a.markdown(), 'text/markdown;charset=utf-8')),
            actionButton(t('ui.export.audit.downloadHtml'), () => downloadFile(`${base()}.html`, a.html(), 'text/html;charset=utf-8')),
          ),
        ),
        card(
          t('ui.export.sheet.title'),
          t('ui.export.sheet.note'),
          el('div', { class: 'cluster', 'data-space': 'xs' }, tabSelect, actionButton(t('ui.export.sheet.copy'), () => copyText(a.tsv(tabSelect.value)), { primary: true })),
          el(
            'div',
            { class: 'cluster', 'data-space': 'xs' },
            actionButton(t('ui.export.sheet.downloadTagged'), () => downloadFile(`${base()}.csv`, a.taggedCsv(), 'text/csv;charset=utf-8')),
            actionButton(t('ui.export.sheet.downloadFiles'), () => {
              const name = base();
              Object.entries(a.csvTabs()).forEach(([k, csv], i) => setTimeout(() => downloadFile(`${name}-${k}.csv`, csv, 'text/csv;charset=utf-8'), i * 300));
            }),
          ),
        ),
        card(
          t('ui.export.json.title'),
          tx('ui.export.json.note', { link: el('a', { href: SCHEMA_URL, target: '_blank', rel: 'noopener' }, 'report.schema.json') }),
          el(
            'div',
            { class: 'cluster', 'data-space': 'xs' },
            actionButton(t('ui.export.json.download'), () => downloadFile(`${base()}.json`, a.json(), 'application/json;charset=utf-8'), { primary: true }),
            actionButton(t('ui.export.json.copy'), () => copyText(a.json())),
          ),
        ),
        card(
          t('ui.export.share.title'),
          shareUrl ? t('ui.export.share.live') : t('ui.export.share.noLive'),
          shareUrl && el('p', { class: 'text-sm' }, el('code', {}, shareUrl)),
          shareUrl && el('div', { class: 'cluster' }, actionButton(t('ui.export.share.copy'), () => copyText(shareUrl), { primary: true })),
        ),
      ),
    ),
  );
}
