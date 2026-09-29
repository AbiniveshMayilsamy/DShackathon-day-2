import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { fetchFeatureImportance, fetchPredictions } from '../api/client';

// Plain-language labels matching the spec
const GROUP_LABELS: Record<string, string> = {
  inventory_cover: 'Inventory Cover & Stock Buffer',
  recent_sales: 'Sales Momentum & Rolling Trends',
  promotion_price: 'Promotion / Price Discount',
  calendar: 'Calendar & Holiday Signals',
  weather: 'Local Weather Variations',
  store_product_static: 'Store & Product Characteristics',
};

const GROUP_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#fb7185', '#6ee7b7'];

export const ExplainPage: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  const { data: importance, isLoading: impLoading } = useQuery({
    queryKey: ['importance'],
    queryFn: fetchFeatureImportance,
    staleTime: 300_000,
  });

  const { data: predictions } = useQuery({
    queryKey: ['predictions-explain'],
    queryFn: () => fetchPredictions(),
    staleTime: 120_000,
  });

  // High-risk items for selector — most useful to explain
  const highItems = useMemo(() => {
    if (!predictions) return [];
    return predictions
      .filter((p) => p.risk === 'HIGH')
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 30);
  }, [predictions]);

  // Auto-select first HIGH item
  React.useEffect(() => {
    if (highItems.length > 0 && !selectedProduct) {
      setSelectedStore(highItems[0].store_id);
      setSelectedProduct(highItems[0].product_id);
    }
  }, [highItems]);

  const selectedItem = useMemo(() =>
    predictions?.find(p => p.store_id === selectedStore && p.product_id === selectedProduct),
    [predictions, selectedStore, selectedProduct]
  );

  // Normalize importance scores
  const impData = useMemo(() => {
    if (!importance) return [];
    const total = importance.reduce((s, g) => s + g.importance, 0);
    return importance.map((g, i) => ({
      label: GROUP_LABELS[g.group] ?? g.label,
      importance: g.importance,
      pct: total > 0 ? (g.importance / total * 100) : 0,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
    })).sort((a, b) => b.importance - a.importance);
  }, [importance]);

  const topGroup = impData[0];
  const leadTimeNote = 'A 4-day supplier lead time stocks out 66% of the time vs 10% at 1 day (from simulation).';

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div className="pb-5 border-b border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
          Explainability
        </span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Root Cause & Feature Importance</h1>
        {topGroup && (
          <p className="text-sm text-slate-400 mt-1">
            <strong className="text-slate-200">{topGroup.label}</strong> is the strongest group driver
            ({topGroup.pct.toFixed(0)}% of permutation importance). {leadTimeNote}
          </p>
        )}
      </div>

      {/* Lead-time highlight — pinned insight */}
      <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 text-sm">
        <span className="text-amber-300 font-semibold block text-xs uppercase tracking-wider mb-1">
          📌 Key Lead-Time Finding
        </span>
        <p className="text-slate-300">{leadTimeNote}</p>
        <p className="text-slate-400 text-xs mt-1">
          Removing <code className="text-amber-300">lead_days</code> from the model drops Recall from 76% → 64%. It is the single highest-impact feature.
        </p>
      </div>

      {/* Feature Group Importance Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Feature Group Importance — Permutation on Validation Set
        </h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Drop in ROC-AUC when group is randomly shuffled. Larger bar = group matters more.
        </p>
        {impLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm h-32">
            <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            Loading importance...
          </div>
        )}
        {!impLoading && impData.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={impData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis type="category" dataKey="label" width={200} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [`${((v as number) * 100).toFixed(2)}% AUC drop`, 'Importance']}
              />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {impData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-Item Root Cause Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">
          Why Is This Item at Risk?
        </h3>

        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">HIGH-Risk Item:</label>
            <select
              value={`${selectedStore}|${selectedProduct}`}
              onChange={(e) => {
                const [s, p] = e.target.value.split('|');
                setSelectedStore(s);
                setSelectedProduct(p);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
            >
              {highItems.map((item) => (
                <option key={`${item.store_id}|${item.product_id}`} value={`${item.store_id}|${item.product_id}`}>
                  {item.store_id} – {item.product_id} ({item.category}) · {(item.stockout_prob * 100).toFixed(0)}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedItem && (
          <div className="space-y-4">
            {/* Item summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Stockout Risk</span>
                <span className="text-red-400 font-bold text-lg">{(selectedItem.stockout_prob * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Stock</span>
                <span className="text-slate-200 font-semibold">{selectedItem.current_stock} units</span>
              </div>
              <div>
                <span className="text-slate-400 block">7d Forecast</span>
                <span className="text-slate-200 font-semibold">{selectedItem.forecast_7d} units</span>
              </div>
              <div>
                <span className="text-slate-400 block">Category</span>
                <span className="text-slate-200 font-semibold">{selectedItem.category}</span>
              </div>
            </div>

            {/* Root-cause reasons */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
                Verified Root-Cause Drivers
              </span>
              {selectedItem.reasons && selectedItem.reasons.length > 0 ? (
                <div className="space-y-2">
                  {selectedItem.reasons.slice(0, 3).map((reason, i) => {
                    // Parse impact % from reason string "(X%)" pattern
                    const match = reason.match(/\((\d+)%\)$/);
                    const pct = match ? parseInt(match[1]) : 33;
                    const label = reason.replace(/\s*\(\d+%\)$/, '');
                    return (
                      <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-200 font-medium">{label}</span>
                          <span className="text-teal-400 font-bold font-mono">{pct}%</span>
                        </div>
                        <div className="bg-slate-800 rounded-full h-1.5">
                          <div
                            className="bg-teal-400 h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-400 bg-slate-950 rounded-lg p-3 border border-slate-800">
                  No single dominant driver for this item.
                </div>
              )}
            </div>

            {/* Action */}
            <div className="pt-2 text-sm">
              <span className="text-slate-400">Recommended Action: </span>
              <span className="text-emerald-400 font-medium">{selectedItem.action}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
