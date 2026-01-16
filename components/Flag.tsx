import React from 'react';
import { getFlagImgUrl, getFlagFromIOC } from '@/lib/utils';

export default function Flag({ ioc, className = 'w-5 h-4' }: { ioc?: string | null; className?: string }) {
  const img = getFlagImgUrl(ioc || undefined);
  const emoji = getFlagFromIOC(ioc || undefined) || '';
  if (img) {
    return (
      <img
        src={img}
        alt={emoji || (ioc || '')}
        className={`${className} inline-block rounded-sm object-cover`}
        onError={(e) => {
          // hide broken image; fallback to emoji text
          (e.target as HTMLImageElement).style.display = 'none';
          const parent = (e.target as HTMLImageElement).parentElement;
          if (parent) {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.className = 'inline-block';
            parent.appendChild(span);
          }
        }}
      />
    );
  }
  return <span className={`inline-block ${className}`}>{emoji}</span>;
}
