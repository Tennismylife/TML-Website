"use client";

import { Suspense } from "react";
import StatisticsInner from "./StatisticsInner";

export default function StatisticsPage() {
  return (
    <Suspense fallback={<div className="text-white p-4">Loading...</div>}>
      <StatisticsInner />
    </Suspense>
  );
}
