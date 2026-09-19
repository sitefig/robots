// The easter egg: the context menu (right click, long press, or the menu
// key) on a sus.bot logo opens #brand-menu, a popover with the logo files
// and the press kit, at the pointer.
//
// The popover is "manual": the browser's own light dismiss would close it at
// once, because the right button's release comes after the contextmenu
// event. So this closes it on Escape, on a press outside it, when focus
// leaves it, on scroll, and after a link is chosen; focus returns to the logo.

export function initBrandMenu(): void {
  const menu = document.getElementById('brand-menu');
  if (!menu || typeof menu.showPopover !== 'function') return;
  let opener: HTMLElement | null = null;

  const isOpen = () => menu.matches(':popover-open');
  const close = (returnFocus: boolean) => {
    if (!isOpen()) return;
    menu.hidePopover();
    if (returnFocus) opener?.focus();
  };

  document.querySelectorAll<HTMLElement>('.brand').forEach((logo) => {
    logo.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      opener = logo;
      if (!isOpen()) menu.showPopover();
      // Keyboard-opened menus have no pointer position: use the logo's corner.
      const box = logo.getBoundingClientRect();
      const fromPointer = event.clientX !== 0 || event.clientY !== 0;
      const x = fromPointer ? event.clientX : box.left;
      const y = fromPointer ? event.clientY : box.bottom;
      const margin = 8;
      const left = Math.min(Math.max(margin, x), innerWidth - menu.offsetWidth - margin);
      const top = y + menu.offsetHeight + margin > innerHeight ? Math.max(margin, y - menu.offsetHeight) : y;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      menu.querySelector<HTMLElement>('a')?.focus();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      close(true);
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && !menu.contains(event.target as Node) && event.button === 0) close(false);
  });
  menu.addEventListener('focusout', (event) => {
    if (!menu.contains(event.relatedTarget as Node | null) && event.relatedTarget !== null) close(false);
  });
  addEventListener('scroll', () => close(false), { passive: true });
  menu.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) close(false);
  });
}
