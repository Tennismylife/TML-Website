'use client';
import DataFileList from './DataFileList';

export default function DataFileListClient({ full = true }: { full?: boolean }) {
  // Simple client wrapper to render the client-only DataFileList from server components
  return <DataFileList full={full} />;
}