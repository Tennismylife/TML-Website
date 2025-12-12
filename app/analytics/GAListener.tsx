"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ReactGA from "react-ga4";

const GA_ID = "G-71D4H6D4VN"; // il tuo ID GA4

// Estendiamo il tipo Window per GA_INITIALIZED
declare global {
  interface Window {
    GA_INITIALIZED?: boolean;
  }
}

export default function GAListener() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    if (!window.GA_INITIALIZED) {
      ReactGA.initialize(GA_ID, { gaOptions: { cookie_domain: "auto" } });
      window.GA_INITIALIZED = true;
    }

    ReactGA.send({ hitType: "pageview", page: pathname });
  }, [pathname]);

  return null;
}
