// Pricing cards: numbers and checkout links from PRICING in config.ts,
// words from the dictionary (ui.plan.<id>.*), monthly or yearly.

import { t, formatNumber } from '../i18n.ts';
import { el, replace, slot } from '../dom.ts';
import { PRICING } from '../config.ts';

type Cycle = 'monthly' | 'annual';

/** Plan cards from PRICING (numbers, links) and the dictionary (words). */
function renderPricing(cycle: Cycle): void {
  const container = slot('pricing');
  if (!container) return;
  const plans = PRICING.plans.filter((p) => PRICING.show || p.id === 'free');
  const features = (id: string): string[] => {
    const out: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const key = `ui.plan.${id}.f${i}`;
      const text = t(key);
      if (text === key) break;
      out.push(text);
    }
    return out;
  };
  replace(
    container,
    plans.map((p) => {
      const price = cycle === 'annual' ? p.annual : p.monthly;
      let cta: HTMLElement;
      if (p.id === 'free') cta = el('button', { type: 'button', class: 'button', disabled: true }, t('ui.plan.free.cta'));
      else if (p.url) cta = el('a', { class: 'button', 'data-variant': p.featured ? 'primary' : null, href: p.url, rel: 'noopener' }, t(`ui.plan.${p.id}.cta`));
      else cta = el('button', { type: 'button', class: 'button', disabled: true }, t('ui.plan.soon'));
      return el(
        'article',
        { class: 'plan', 'data-featured': p.featured ? 'true' : 'false', 'aria-labelledby': `plan-${p.id}` },
        el('h3', { id: `plan-${p.id}` }, t(`ui.plan.${p.id}.name`)),
        el('p', {}, el('span', { class: 'plan__price' }, `${PRICING.currency}${formatNumber(price)}`), price > 0 && el('span', { class: 'text-sm text-muted' }, ` ${cycle === 'annual' ? t('ui.plan.perMonthAnnual') : t('ui.plan.perMonth')}`)),
        el('p', { class: 'text-sm text-muted' }, t(`ui.plan.${p.id}.blurb`)),
        el('ul', { class: 'plan__features' }, features(p.id).map((f) => el('li', {}, f))),
        cta,
      );
    }),
  );
}

export function initPricing(): void {
  const buttons = document.querySelectorAll<HTMLElement>('#billing-cycle [data-cycle]');
  if (!buttons.length) return;
  const apply = (cycle: Cycle) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cycle === cycle)));
    renderPricing(cycle);
  };
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.cycle as Cycle)));
  apply('monthly');
}
