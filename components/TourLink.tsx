"use client";

import Link from "next/link";
import { createContext, forwardRef, useContext, type ComponentProps, type ReactNode } from "react";
import { tourPath, type Tour } from "@/lib/tour-path";

const TourContext = createContext<Tour>("ATP");

export function TourProvider({ value, children }: { value: Tour; children: ReactNode }) {
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useLinkTour() {
  return useContext(TourContext);
}

const TourLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(
  function TourLink({ href, ...props }, ref) {
    const tour = useLinkTour();
    const destination = tour !== "WTA" ? href : typeof href === "string"
      ? tourPath(href, tour)
      : { ...href, pathname: href.pathname && !href.host && !href.protocol ? tourPath(href.pathname, tour) : href.pathname };
    return <Link {...props} href={destination} ref={ref} />;
  },
);

export default TourLink;

export const TourAnchor = forwardRef<HTMLAnchorElement, ComponentProps<"a">>(
  function TourAnchor({ href, ...props }, ref) {
    const tour = useLinkTour();
    return <a {...props} href={href && tour === "WTA" ? tourPath(href, tour) : href} ref={ref} />;
  },
);
