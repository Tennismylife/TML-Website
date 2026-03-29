"use client";
import React from 'react';

export default function DropdownNavSelect({
  name,
  value,
  options,
  className = '',
  resetPage = true,
  pathMode = false,
}: {
  name: string;
  value?: string | number | null;
  options: Array<{ value: string; label: string }>;
  className?: string;
  resetPage?: boolean;
  /** When true, navigates to path/<value> instead of ?name=value */
  pathMode?: boolean;
}) {
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (pathMode) {
      const parts = window.location.pathname.split('/');
      const lastPart = parts[parts.length - 1];
      if (/^\d+$/.test(lastPart)) {
        parts[parts.length - 1] = v;
      } else {
        parts.push(v);
      }
      window.location.assign(parts.join('/'));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (!v) params.delete(name);
    else params.set(name, v);
    if (resetPage) params.delete('page');
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.location.assign(newUrl);
  };

  return (
    <select value={value ?? ''} onChange={onChange} className={`px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600 ${className}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}