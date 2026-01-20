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

// As a safety net, register a global handler that hides server-injected modals when
// any 'open-modal' event is dispatched. This prevents race conditions where the
// event happens before modal outlets attach their listeners (useful in tests).
try {
  if (typeof window !== 'undefined') {
    window.addEventListener('open-modal', () => {
      try { document.querySelectorAll('.server-modal-content').forEach((el: any) => { (el as HTMLElement).style.display = 'none'; }); } catch (e) {}
    });
  }
} catch (e) {}
