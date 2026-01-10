"use client";
import React from 'react';

export default function SubtabDropdown({ baseHref, value, options, className = '' }: {
  baseHref: string;
  value?: string | null;
  options: Array<{ key: string; label: string }>;
  className?: string;
}) {
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const href = v ? `${baseHref}/${encodeURIComponent(v)}` : baseHref;
    window.location.assign(href);
  };

  return (
    <select value={value ?? ''} onChange={onChange} className={`px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600 ${className}`}>
      {options.map(o => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}
