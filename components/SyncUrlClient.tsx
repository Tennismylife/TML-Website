"use client";
import { useEffect } from "react";

export default function SyncUrlClient({ url }: { url?: string }) {
  useEffect(() => {
    // Intentionally do not touch document.title here to avoid stomping on
    // more specific client-side title updates triggered by user actions.

    if (!url) return;
    try {
      const current = window.location.href;
      if (!current || current === url) return;
      // Only replace if origin matches to avoid cross-origin issues
      const currentOrigin = new URL(current).origin;
      const newOrigin = new URL(url).origin;
      if (currentOrigin === newOrigin) {
        window.history.replaceState(null, '', url);
      } else {
        // If origins don't match, only replace path+search
        const u = new URL(url);
        window.history.replaceState(null, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {
      // ignore
    }
  }, [url]);

  return null;
}
