import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { fetchPredictions, fetchForecastHistory, fetchSummary } from '../api/client';

const STORES = ['S01', 'S02', 'S03', 'S04', 'S05'];
const CATEGORIES = ['Beverages', 'Dairy', 'Frozen', 'Groceries', 'Household', 'Personal Care', 'Snacks'];

export const DemandPage: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState('S01');
  const [selectedProduct, setSelectedProduct] = useState('');

  // Load all predictions to populate product dropdown
  const { data: allPreds } = useQuery({
    queryKey: ['predictions-all'],
    queryFn: () => fetchPredictions(),
    staleTime: 120_000,
  });

  const productsForStore = useMemo(() => {
    if (!allPreds) return [];
    return allPreds
      .filter((p) => p.store_id === selectedStore)
      .map((p) => ({ id: p.product_id, category: p.category }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [allPreds, selectedStore]);

  // Auto-select first product when store changes
  React.useEffect(() => {
    if (productsForStore.length > 0) setSelectedProduct(productsForStore[0].id);
  }, [selectedStore, productsForStore]);

  // Forecast / actuals for the chosen item
  const { data: forecast, isLoading: fcLoading, isError: fcError } = useQuery({
    queryKey: ['forecast', selectedStore, selectedProduct],
    queryFn: () => fetchForecastHistory(selectedStore, selectedProduct),
    enabled: !!selectedProduct,
    staleTime: 120_000,
  });

  // Summary for weekly units by category
  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
    staleTime: 120_000,
  });

  // Compute MAE from forecast rows (client-side)
  const { mae, mape } = useMemo(() => {
    if (!forecast || forecast.length === 0) return { mae: null, mape: null };
    const errors = forecast.map((r) => Math.abs(r.actual - r.forecast));
    const mae = errors.reduce((s, e) => s + e, 0) / errors.length;
    const mape = forecast
      .filter((r) => r.actual > 0)
      .map((r) => Math.abs(r.actual - r.forecast) / r.actual)
      .reduce((s, v) => s + v, 0) / forecast.filter((r) => r.actual > 0).length * 100;
    return { mae: mae.toFixed(1), mape: mape.toFixed(1) };
  }, [forecast]);

  // Weekly units by category (from summary)
  const weeklyUnits = useMemo(() => {
    if (!summary) return [];
    // last 8 weeks
    return summary.weekly_units_by_category.slice(-8);
  }, [summary]);
  const catKeys = CATEGORIES;

  const CAT_COLORS = ['#34d399','#60a5fa','#f59e0b','#a78bfa','#fb7185','#6ee7b7','#93c5fd'];

  return (
    <div className="p-8 max-w-7xl space-y-8">
      <div className="pb-5 border-b border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
          Demand Forecast
        </span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Demand Forecasting</h1>
        {mae && (
          <p className="text-sm text-slate-400 mt-1">
            This item ({selectedStore}-{selectedProduct}): MAE <strong className="text-slate-200">{mae} units</strong>,
            MAPE <strong className="text-slate-200">{mape}%</strong> on the test period.
            Model beats the rolling-mean baseline by 16%.
          </p>
        )}
      </div>

      {/* Selectors */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center text-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Store:</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            {STORES.map((s) => <option key={s} value={s}>Store {s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Product:</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            {productsForStore.map((p) => (
              <option key={p.id} value={p.id}>{p.id} ({p.category})</option>
            ))}
          </select>
        </div>
        {mae && (
          <div className="ml-auto flex gap-4 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300">
              MAE: <strong>{mae}</strong> units
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300">
              MAPE: <strong>{mape}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Forecast Line Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Actual vs Forecast (Test Period · 7-day sum)
        </h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Blue = actual sales. Green dashed = model forecast. Test window: Sep 7–23.
        </p>
        {fcLoading && (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
            Loading forecast...
          </div>
        )}
        {fcError && (
          <div className="h-48 flex items-center justify-center text-red-400 text-sm">
            No forecast data for this item.
          </div>
        )}
        {forecast && !fcLoading && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="actual" stroke="#60a5fa" dot={false} strokeWidth={2} name="Actual (units/day)" />
              <Line type="monotone" dataKey="forecast" stroke="#34d399" dot={false} strokeWidth={2} strokeDasharray="5 3" name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly Units by Category */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Weekly Units Sold by Category</h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Dairy leads weekly demand volume. Frozen is lowest and most volatile.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyUnits}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {catKeys.map((cat, i) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={CAT_COLORS[i % CAT_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
