import React, { useState } from 'react';

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function onSearch(e) {
    e && e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const r = await fetch(`/api/aggregate?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw new Error(await r.text());
      const json = await r.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">TI2025 — Dota2 Aggregator</h1>

        <form onSubmit={onSearch} className="flex gap-2 mb-6">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Имя игрока или ник" className="flex-1 p-3 rounded bg-purple-800 placeholder-purple-300" />
          <button type="submit" disabled={loading} className="px-4 py-3 rounded bg-green-600">{loading ? 'Идёт поиск...' : 'Найти'}</button>
        </form>

        {error && <div className="mb-4 p-3 bg-red-700 rounded">{error}</div>}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-800 p-4 rounded shadow-lg">
              <h2 className="text-xl font-semibold mb-2">Основное</h2>
              <p><strong>Запрос:</strong> {data.query}</p>
              <p><strong>Имя (combined):</strong> {data.combined.name}</p>
              {data.combined.avatar && <img src={data.combined.avatar} alt="avatar" className="w-24 h-24 rounded mt-2" />}
              {data.combined.role && <p><strong>Роль:</strong> {data.combined.role}</p>}
            </div>

            <div className="bg-purple-800 p-4 rounded shadow-lg">
              <h2 className="text-xl font-semibold mb-2">Источники</h2>
              {data.sources.stratz && <div className="p-2 bg-black bg-opacity-20 rounded mb-2"><h3 className="font-bold">Stratz</h3><pre className="text-sm">{JSON.stringify(data.sources.stratz, null, 2)}</pre></div>}
              {data.sources.liquipedia && <div className="p-2 bg-black bg-opacity-20 rounded"><h3 className="font-bold">Liquipedia</h3><pre className="text-sm">{JSON.stringify(data.sources.liquipedia, null, 2)}</pre></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
