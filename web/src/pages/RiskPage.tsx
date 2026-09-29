import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPredictions } from '../api/client';
import type { PredictionItem } from '../api/client';

const STORES = ['S01', 'S02', 'S03', 'S04', 'S05'];
const CATEGORIES = ['Beverages', 'Dairy', 'Frozen', 'Groceries', 'Household', 'Personal Care', 'Snacks'];

function riskColor(risk: string) {
  if (risk === 'HIGH') return 'bg-red-500/80 text-white';
  if (risk === 'MEDIUM') return 'bg-amber-500/80 text-white';
  return 'bg-emerald-600/80 text-white';
}

function cellBg(highPct: number) {
  if (highPct >= 0.5) return '#450a0a'; // deep red
  if (highPct >= 0.25) return '#451a03'; // deep amber
  return '#052e16'; // deep green
}

function cellText(highPct: number) {
  if (highPct >= 0.5) return '#fca5a5';
  if (highPct >= 0.25) return '#fcd34d';
  return '#6ee7b7';
}

type SortKey = 'stockout_prob' | 'forecast_7d' | 'reorder_qty' | 'risk';
type SortDir = 'asc' | 'desc';

export const RiskPage: React.FC = () => {
  const [storeFilter, setStoreFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('stockout_prob');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: predictions, isLoading, isError } = useQuery({
    queryKey: ['predictions-risk', storeFilter],
    queryFn: () => fetchPredictions({ store: storeFilter || undefined }),
    staleTime: 60_000,
  });

  // Build heatmap: [store][category] → share of HIGH items
  const heatmap = useMemo(() => {
    if (!predictions) return {};
    const map: Record<string, Record<string, { high: number; total: number }>> = {};
    for (const p of predictions) {
      if (!map[p.store_id]) map[p.store_id] = {};
      if (!map[p.store_id][p.category]) map[p.store_id][p.category] = { high: 0, total: 0 };
      map[p.store_id][p.category].total++;
      if (p.risk === 'HIGH') map[p.store_id][p.category].high++;
    }
    return map;
  }, [predictions]);

  // Sorted table
  const sorted = useMemo(() => {
    if (!predictions) return [];
    return [...predictions].sort((a, b) => {
      const riskRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      let va: number, vb: number;
      if (sortKey === 'risk') {
        va = riskRank[a.risk as keyof typeof riskRank];
        vb = riskRank[b.risk as keyof typeof riskRank];
      } else {
        va = a[sortKey] as number;
        vb = b[sortKey] as number;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [predictions, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const highCount = predictions?.filter(p => p.risk === 'HIGH').length ?? 0;
  const total = predictions?.length ?? 0;

  const storeList = storeFilter ? [storeFilter] : STORES;

  return (
    <div className="p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
          Risk Intelligence
        </span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Stockout Risk Matrix</h1>
        {predictions && (
          <p className="text-sm text-slate-400 mt-1">
            <strong className="text-red-400">{highCount}</strong> of {total} items at HIGH stockout risk.
            Model identifies them with 77% precision in the HIGH tier.
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 text-sm">
        <span className="text-xs text-slate-400">Filter by Store:</span>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
        >
          <option value="">All Stores</option>
          {STORES.map(s => <option key={s} value={s}>Store {s}</option>)}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm p-4">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          Loading risk data...
        </div>
      )}
      {isError && <div className="text-red-400 text-sm p-4">Failed to load predictions.</div>}

      {predictions && (
        <>
          {/* Heatmap Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Store × Category HIGH Risk Share</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Cell colour = share of HIGH-risk items. Red ≥ 50%, Amber 25–50%, Green &lt; 25%.
            </p>
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr>
                  <th className="text-left p-2 text-slate-400 font-medium"></th>
                  {CATEGORIES.map(cat => (
                    <th key={cat} className="p-2 text-slate-400 font-medium text-center min-w-20">
                      {cat.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storeList.filter(s => heatmap[s]).map(store => (
                  <tr key={store}>
                    <td className="p-2 font-mono font-bold text-slate-300">{store}</td>
                    {CATEGORIES.map(cat => {
                      const cell = heatmap[store]?.[cat];
                      const pct = cell ? cell.high / cell.total : 0;
                      return (
                        <td
                          key={cat}
                          className="p-2 text-center rounded font-mono font-bold"
                          style={{ background: cell ? cellBg(pct) : '#1e293b', color: cell ? cellText(pct) : '#475569' }}
                        >
                          {cell ? `${Math.round(pct * 100)}%` : '–'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sortable Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">All Items — Ranked by Stockout Probability</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Click column headers to sort</p>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="text-xs w-full">
                <thead className="sticky top-0 bg-slate-950 border-b border-slate-800">
                  <tr>
                    {[
                      { key: 'store_id', label: 'Store' },
                      { key: 'product_id', label: 'Product' },
                      { key: null, label: 'Category' },
                      { key: 'stockout_prob', label: 'Risk %' },
                      { key: 'risk', label: 'Tier' },
                      { key: 'forecast_7d', label: '7d Forecast' },
                      { key: 'reorder_qty', label: 'Order Qty' },
                    ].map(col => (
                      <th
                        key={col.label}
                        onClick={col.key ? () => toggleSort(col.key as SortKey) : undefined}
                        className={`text-left p-3 text-slate-400 font-medium ${col.key ? 'cursor-pointer hover:text-slate-200' : ''}`}
                      >
                        {col.label}
                        {sortKey === col.key && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item: PredictionItem) => (
                    <tr key={`${item.store_id}-${item.product_id}`} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-slate-300">{item.store_id}</td>
                      <td className="p-3 font-mono text-slate-300">{item.product_id}</td>
                      <td className="p-3 text-slate-400">{item.category}</td>
                      <td className="p-3 font-bold text-slate-200">
                        {(item.stockout_prob * 100).toFixed(1)}%
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${riskColor(item.risk)}`}>
                          {item.risk}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{item.forecast_7d}</td>
                      <td className="p-3 text-slate-300">
                        {item.risk === 'LOW' ? (
                          <span className="text-slate-400 italic text-[11px]">Routine cycle</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">+{item.reorder_qty}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
