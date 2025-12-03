"use client";

interface RecordProps {
  playerId: string;
}

export default function Record({ playerId }: RecordProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-3">Record</h2>
      <div className="text-gray-600">Contenuto Record per il player {playerId} (placeholder).</div>
    </div>
  );
}