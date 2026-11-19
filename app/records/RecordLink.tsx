"use client";

import Link from "@/components/TourLink";
import type { ComponentProps } from "react";
import { recordTourPath } from "@/lib/record-tour-path";
import { useRecordsTour } from "./AtpRecordCommentary";

export default function RecordLink({ href, ...props }: ComponentProps<typeof Link>) {
  const tour = useRecordsTour();
  const destination = typeof href === "string"
    ? recordTourPath(href, tour)
    : { ...href, pathname: href.pathname ? recordTourPath(href.pathname, tour) : href.pathname };
  return <Link {...props} href={destination} />;
}

export function RecordAnchor({ href, ...props }: ComponentProps<"a">) {
  const tour = useRecordsTour();
  return <a {...props} href={href ? recordTourPath(href, tour) : href} />;
}
