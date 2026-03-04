"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SearchPlayerClient = dynamic(() => import('./SearchPlayerClient'), { ssr: false, loading: () => <div className="h-12" /> });

export default function SearchPlayerLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const promote = () => setReady(true);
    if ('requestIdleCallback' in window) {
      (requestIdleCallback as any)(promote, { timeout: 1000 });
    } else {
      const t = setTimeout(promote, 1000);
      return () => clearTimeout(t);
    }
  }, []);

  return ready ? <SearchPlayerClient /> : <div className="h-12" />;
}
