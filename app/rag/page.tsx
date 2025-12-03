'use client';

import { useState } from 'react';

export default function RAGPage() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnswer(data.answer);
      } else {
        setAnswer('Errore: ' + data.error);
      }
    } catch (error) {
      setAnswer('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold mb-4">RAG - Domande sui Dati Tennistici</h1>
      <p className="mb-6 text-gray-600">
        Chiedi domande sui match, giocatori e tornei basate sui dati del database.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Es. Chi ha vinto più match su erba nel 2023?"
          className="w-full border rounded p-3 h-24 resize-none"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Caricamento...' : 'Chiedi'}
        </button>
      </form>

      {answer && (
        <div className="border rounded p-4 bg-gray-50">
          <h2 className="font-semibold mb-2">Risposta:</h2>
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </main>
  );
}