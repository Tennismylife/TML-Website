export function closeModalFromOutlet() {
  try {
    const st = (window as any).history?.state;
    if (st && st.modal && st.background) {
      const storedBg = (window as any).__modalBackgroundPath || st.background;
      try { window.history.replaceState(null, '', storedBg); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('close-modal')); } catch (e) {}
      try { delete (window as any).__modalBackgroundPath; } catch (e) {}
      try { delete (window as any).__modalOpenedByPush; } catch (e) {}
      return;
    }
  } catch (e) {}

  try { window.history.back(); } catch (e) {}
}
