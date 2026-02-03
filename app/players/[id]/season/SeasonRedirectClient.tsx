"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props { to: string }

export default function SeasonRedirectClient({ to }: Props) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [to, router]);

  return (
    <div className="p-6">
      <div className="text-lg">Redirecting…</div>
      <div className="mt-2 text-sm text-gray-400">If you are not redirected automatically, <a className="underline" href={to}>click here</a>.</div>
      {/* Meta refresh fallback for non-js users */}
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${to}`} />
      </noscript>
    </div>
  );
}
