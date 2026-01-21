'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
        <p className="text-lg mb-8">{error.message}</p>
        <button onClick={reset} className="text-blue-400 hover:underline">Try again</button>
      </div>
    </div>
  );
}