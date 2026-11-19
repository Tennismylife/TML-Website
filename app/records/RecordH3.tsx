"use client";

import { useRecordsTour } from "./AtpRecordCommentary";
import { recordHeading } from "./tour-labels";

export default function RecordH3({ label, className }: { label: string; className?: string }) {
  return <h3 className={className}>{recordHeading(label, useRecordsTour())}</h3>;
}
