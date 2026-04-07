"use client";

import React from 'react';
import DropdownNavSelect from '@/components/DropdownNavSelect';

export default function RecordsCountControls({ initialTop }: { initialTop: number }) {
  const options = Array.from({ length: 50 }, (_, i) => ({ value: String(i + 1), label: `No. ${i + 1}` }));

  return (
    <div className="flex items-center gap-4 mb-4">
      <label className="text-gray-200 font-medium">Rank (exact):</label>
      <DropdownNavSelect name="rank" value={String(initialTop)} options={options} pathMode />
    </div>
  );
} 
