'use client';
import { useTourRouter as useRouter } from "@/lib/tour-navigation";

import { useEffect, useState, useTransition } from 'react';

import styles from './dashboard.module.css';

export default function RefreshControl() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          startTransition(() => router.refresh());
          return 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <button type="button" className={styles.refresh} onClick={() => { setSeconds(60); startTransition(() => router.refresh()); }} disabled={pending}>
      <span aria-hidden="true">↻</span> {pending ? 'Aggiornamento…' : 'Aggiorna'} <small>· auto {seconds}s</small>
    </button>
  );
}
