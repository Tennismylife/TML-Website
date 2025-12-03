"use client";

import { useState, useEffect } from "react";
import { getFlagFromIOC } from "@/lib/utils";
import * as tf from '@tensorflow/tfjs';

interface Player {
  id: string;
  atpname: string;
  ioc?: string;
}

interface PlayerStats {
  winsAll: number;
  winsGrandSlam: number;
  winsMasters1000: number;
  winsHard: number;
  winsGrass: number;
  winsClay: number;
  winsCarpet: number;
  totalAll: number;
  totalGrandSlam: number;
  totalMasters1000: number;
  totalHard: number;
  totalGrass: number;
  totalClay: number;
  totalCarpet: number;
  percAll: number;
  percGrandSlam: number;
  percMasters1000: number;
  percHard: number;
  percGrass: number;
  percClay: number;
  percCarpet: number;
  titlesAll: number;
  titlesGrandSlam: number;
  titlesMasters1000: number;
  titlesHard: number;
  titlesGrass: number;
  titlesClay: number;
  titlesCarpet: number;
}

export default function ForecastsPage() {
  const [query1, setQuery1] = useState("");
  const [results1, setResults1] = useState<Player[]>([]);
  const [loading1, setLoading1] = useState(false);
  const [player1, setPlayer1] = useState<Player | null>(null);

  const [query2, setQuery2] = useState("");
  const [results2, setResults2] = useState<Player[]>([]);
  const [loading2, setLoading2] = useState(false);
  const [player2, setPlayer2] = useState<Player | null>(null);

  const [stats1, setStats1] = useState<PlayerStats | null>(null);
  const [stats2, setStats2] = useState<PlayerStats | null>(null);

  const [prediction, setPrediction] = useState<string>("");
  const [model, setModel] = useState<tf.Sequential | null>(null);
  const [training, setTraining] = useState(false);

  useEffect(() => {
    if (!query1) {
      setResults1([]);
      return;
    }

    const controller = new AbortController();
    setLoading1(true);

    fetch(`/api/players/search?q=${encodeURIComponent(query1)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: Player[]) => setResults1(data))
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Search error:", err);
      })
      .finally(() => setLoading1(false));

    return () => controller.abort();
  }, [query1]);

  useEffect(() => {
    if (!query2) {
      setResults2([]);
      return;
    }

    const controller = new AbortController();
    setLoading2(true);

    fetch(`/api/players/search?q=${encodeURIComponent(query2)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: Player[]) => setResults2(data))
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Search error:", err);
      })
      .finally(() => setLoading2(false));

    return () => controller.abort();
  }, [query2]);

  useEffect(() => {
    if (player1) {
      fetch(`/api/players/stats?id=${player1.id}`)
        .then((res) => res.json())
        .then((data: PlayerStats) => setStats1(data))
        .catch((err) => console.error("Error fetching stats1:", err));
    } else {
      setStats1(null);
    }
  }, [player1]);

  useEffect(() => {
    if (player2) {
      fetch(`/api/players/stats?id=${player2.id}`)
        .then((res) => res.json())
        .then((data: PlayerStats) => setStats2(data))
        .catch((err) => console.error("Error fetching stats2:", err));
    } else {
      setStats2(null);
    }
  }, [player2]);

  const handleSelect1 = (playerId: string) => {
    const selected = results1.find(p => p.id === playerId);
    if (selected) setPlayer1(selected);
    setQuery1("");
    setResults1([]);
  };

  const handleSelect2 = (playerId: string) => {
    const selected = results2.find(p => p.id === playerId);
    if (selected) setPlayer2(selected);
    setQuery2("");
    setResults2([]);
  };

  const trainModel = async () => {
    setTraining(true);
    try {
      // Fetch training data
      const response = await fetch('/api/forecasts');
      const trainingData = await response.json();

      // Limita a 50 per velocità
      const data = trainingData.slice(0, 50);

      const features: number[][] = [];
      const labels: number[] = [];

      for (const match of data) {
        // Fetch stats per entrambi i giocatori
        const [stats1, stats2] = await Promise.all([
          fetch(`/api/players/stats?id=${match.player1}`).then(r => r.json()),
          fetch(`/api/players/stats?id=${match.player2}`).then(r => r.json())
        ]);

        const feat1 = [
          stats1.percAll,
          stats1.titlesAll,
          stats1.winsAll / Math.max(stats1.totalAll, 1),
          stats1.percHard,
          stats1.percClay,
          stats1.percGrass,
        ];

        const feat2 = [
          stats2.percAll,
          stats2.titlesAll,
          stats2.winsAll / Math.max(stats2.totalAll, 1),
          stats2.percHard,
          stats2.percClay,
          stats2.percGrass,
        ];

        // Usa la differenza delle features
        const diff = feat1.map((f, i) => f - feat2[i]);
        features.push(diff);
        labels.push(match.winner === match.player1 ? 1 : 0);
      }

      // Crea il modello
      const model = tf.sequential();
      model.add(tf.layers.dense({ inputShape: [6], units: 10, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

      model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });

      // Addestra
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);

      await model.fit(xs, ys, { epochs: 50, batchSize: 10 });

      setModel(model);
      alert('Modello addestrato!');
    } catch (error) {
      console.error('Error training model:', error);
    } finally {
      setTraining(false);
    }
  };

  const predictMatch = async () => {
    if (!stats1 || !stats2) return;

    const features1 = [
      stats1.percAll,
      stats1.titlesAll,
      stats1.winsAll / Math.max(stats1.totalAll, 1),
      stats1.percHard,
      stats1.percClay,
      stats1.percGrass,
    ];

    const features2 = [
      stats2.percAll,
      stats2.titlesAll,
      stats2.winsAll / Math.max(stats2.totalAll, 1),
      stats2.percHard,
      stats2.percClay,
      stats2.percGrass,
    ];

    const diff = features1.map((f, i) => f - features2[i]);

    if (model) {
      // Usa il modello ML
      const input = tf.tensor2d([diff]);
      const pred = model.predict(input) as tf.Tensor;
      const prob = pred.dataSync()[0];

      if (prob > 0.5) {
        setPrediction(`${player1?.atpname} ha più probabilità di vincere (Probabilità: ${(prob * 100).toFixed(1)}%)`);
      } else {
        setPrediction(`${player2?.atpname} ha più probabilità di vincere (Probabilità: ${((1 - prob) * 100).toFixed(1)}%)`);
      }
    } else {
      // Fallback al metodo lineare
      const weights = [0.4, 2.0, 0.3, 0.2, 0.2, 0.2];
      const tfFeatures = tf.tensor(diff);
      const tfWeights = tf.tensor(weights);
      const score = tf.sum(tf.mul(tfFeatures, tfWeights)).dataSync()[0];

      if (score > 0) {
        setPrediction(`${player1?.atpname} ha più probabilità di vincere (Score: ${score.toFixed(2)})`);
      } else {
        setPrediction(`${player2?.atpname} ha più probabilità di vincere (Score: ${Math.abs(score).toFixed(2)})`);
      }
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-bold mb-4">Forecasts</h1>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={query1}
            onChange={(e) => setQuery1(e.target.value)}
            placeholder="Cerca il primo giocatore..."
            className="w-full border rounded px-3 py-2"
          />

          {player1 && (
            <div className="mt-2 p-2 bg-gray-100 rounded flex items-center gap-2">
              {getFlagFromIOC(player1.ioc)} {player1.atpname}
            </div>
          )}

          {loading1 && <p className="text-sm text-gray-500 mt-1">Caricamento...</p>}

          {results1.length > 0 && (
            <ul className="border mt-1 rounded max-h-60 overflow-y-auto">
              {results1.map((p) => (
                <li
                  key={p.id}
                  onClick={() => handleSelect1(p.id)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                >
                  {getFlagFromIOC(p.ioc)} {p.atpname}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex-1">
          <input
            type="text"
            value={query2}
            onChange={(e) => setQuery2(e.target.value)}
            placeholder="Cerca il secondo giocatore..."
            className="w-full border rounded px-3 py-2"
          />

          {player2 && (
            <div className="mt-2 p-2 bg-gray-100 rounded flex items-center gap-2">
              {getFlagFromIOC(player2.ioc)} {player2.atpname}
            </div>
          )}

          {loading2 && <p className="text-sm text-gray-500 mt-1">Caricamento...</p>}

          {results2.length > 0 && (
            <ul className="border mt-1 rounded max-h-60 overflow-y-auto">
              {results2.map((p) => (
                <li
                  key={p.id}
                  onClick={() => handleSelect2(p.id)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                >
                  {getFlagFromIOC(p.ioc)} {p.atpname}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {player1 && player2 && (
        <div className="mt-8">
          <button
            onClick={trainModel}
            disabled={training}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-4 disabled:opacity-50"
          >
            {training ? 'Addestramento...' : 'Addestra Modello'}
          </button>

          <button
            onClick={predictMatch}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Predici il vincitore
          </button>

          {prediction && (
            <div className="mt-4 p-4 bg-green-50 rounded">
              <p className="text-lg">{prediction}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}