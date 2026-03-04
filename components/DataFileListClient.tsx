'use client';
import DataFileList from './DataFileList';

type DataFile = { name: string; url: string; size?: number; mtime?: string };

export default function DataFileListClient({ full = true, initialFiles }: { full?: boolean; initialFiles?: DataFile[] }) {
  // Passes SSR-pre-populated file list to DataFileList to avoid client-fetch CLS
  return <DataFileList full={full} initialFiles={initialFiles} />;
}