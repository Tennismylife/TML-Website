export function hideServerModals() {
  try {
    const hideAll = () => {
      document.querySelectorAll('.server-modal-content').forEach((el: any) => { (el as HTMLElement).style.display = 'none'; });
    };

    hideAll();

    // Watch for newly injected server modal nodes for a short period and hide them too
    const mo = new MutationObserver(() => {
      hideAll();
    });

    mo.observe(document.body, { childList: true, subtree: true });

    // Stop observing after 800ms
    const t = setTimeout(() => {
      mo.disconnect();
      clearTimeout(t);
    }, 800);
  } catch (e) {
    // ignore errors
  }
}

export function showServerModals() {
  try {
    document.querySelectorAll('.server-modal-content').forEach((el: any) => { (el as HTMLElement).style.display = ''; });
  } catch (e) {
    // ignore
  }
}
