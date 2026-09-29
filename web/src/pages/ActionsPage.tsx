import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchPredictions,
  simulateWhatIf,
  getExportOrdersUrl,
} from '../api/client';
import type { PredictionItem, WhatIfResponse } from '../api/client';
import { openExplainer } from '../components/ExplainerModal';


export const ActionsPage: React.FC = () => {
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // What-If State
  const [selectedItem, setSelectedItem] = useState<{ store_id: string; product_id: string }>({
    store_id: 'S01',
    product_id: 'P101',
  });
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [delayDays, setDelayDays] = useState<number>(0);
  const [festivalToggle, setFestivalToggle] = useState<boolean>(false);

  // Load predictions
  const {
    data: predictions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['predictions', storeFilter, categoryFilter],
    queryFn: () =>
      fetchPredictions({
        store: storeFilter || undefined,
        category: categoryFilter || undefined,
      }),
  });

  // What-if mutation
  const whatIfMutation = useMutation({
    mutationFn: () =>
      simulateWhatIf({
        store_id: selectedItem.store_id,
        product_id: selectedItem.product_id,
        discount_pct: discountPct / 100,
        supplier_delay_days: delayDays,
        festival: festivalToggle ? 1 : 0,
      }),
  });

  // Run simulation on mount or param changes
  React.useEffect(() => {
    whatIfMutation.mutate();
  }, [selectedItem, discountPct, delayDays, festivalToggle]);

  // Filter and sort top 10 HIGH risk
  const highRiskCards = React.useMemo(() => {
    if (!predictions) return [];
    return predictions
      .filter((p) => p.risk === 'HIGH')
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 10);
  }, [predictions]);

  // Unique filter values
  const availableStores = React.useMemo(() => {
    if (!predictions) return ['S01', 'S02', 'S03', 'S04', 'S05'];
    return Array.from(new Set(predictions.map((p) => p.store_id))).sort();
  }, [predictions]);

  const availableCategories = React.useMemo(() => {
    if (!predictions) return [];
    return Array.from(new Set(predictions.map((p) => p.category))).sort();
  }, [predictions]);

  // Set default selected item once predictions load
  React.useEffect(() => {
    if (highRiskCards.length > 0 && selectedItem.store_id === 'S01' && selectedItem.product_id === 'P101') {
      setSelectedItem({
        store_id: highRiskCards[0].store_id,
        product_id: highRiskCards[0].product_id,
      });
    }
  }, [highRiskCards]);

  const whatIfData: WhatIfResponse | undefined = whatIfMutation.data;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-semibold tracking-wider uppercase text-red-400">
              Prescriptive Operations
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Action Centre</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Top urgent replenishment interventions ranked by stockout risk and revenue impact
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openExplainer}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md transition cursor-pointer"
          >
            <span>💡</span>
            <span>EXPLAIN: WHAT • WHY • HOW</span>
          </button>
          <a
            href={getExportOrdersUrl()}
            download="orders.csv"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors shadow-sm border border-slate-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export Order List
          </a>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Filter Actions:
        </span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Store:</label>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Stores</option>
            {availableStores.map((s) => (
              <option key={s} value={s}>
                Store {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {(storeFilter || categoryFilter) && (
          <button
            onClick={() => {
              setStoreFilter('');
              setCategoryFilter('');
            }}
            className="text-xs text-slate-400 hover:text-slate-200 underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Grid: Left = Top 10 High-Risk Cards, Right = What-If Simulation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Top 10 High Risk Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <span>Top 10 High-Risk Replenishment Orders</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                {highRiskCards.length} Alert{highRiskCards.length === 1 ? '' : 's'}
              </span>
            </h2>
            <span className="text-xs text-slate-400">Ranked by Priority Score</span>
          </div>

          {isLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-400">Loading priority inventory risks...</p>
            </div>
          )}

          {isError && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-6 text-red-200">
              <p className="font-semibold text-sm">Failed to connect to API engine</p>
              <p className="text-xs text-red-300 mt-1">{(error as Error)?.message}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-xs font-medium text-white transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!isLoading && !isError && highRiskCards.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm">
              No high risk items found for selected filter criteria.
            </div>
          )}

          {!isLoading &&
            !isError &&
            highRiskCards.map((item: PredictionItem, idx: number) => {
              const isSelectedForSim =
                selectedItem.store_id === item.store_id &&
                selectedItem.product_id === item.product_id;

              return (
                <div
                  key={`${item.store_id}-${item.product_id}`}
                  className={`bg-slate-900 border rounded-xl p-5 transition-all shadow-sm ${
                    isSelectedForSim
                      ? 'border-emerald-500/80 ring-1 ring-emerald-500/50'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Badges & Rank */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        Store {item.store_id}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-slate-100">
                        {item.product_name || item.product_id}
                      </span>
                      {item.confidence === 'low' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Low History Confidence
                        </span>
                      )}
                    </div>

                    {/* Risk Badge (Red HIGH, Amber MEDIUM, Green LOW only) */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                        HIGH RISK ({(item.stockout_prob * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Operational Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 rounded-lg p-3 border border-slate-800/80 mb-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Current Stock</span>
                      <span className="text-slate-200 font-semibold text-sm">
                        {item.current_stock} units
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Incoming Pipeline</span>
                      <span className="text-slate-400 font-semibold text-sm">
                        {item.incoming_stock} units
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">7-Day Forecast</span>
                      <span className="text-slate-200 font-semibold text-sm">
                        {item.forecast_7d.toFixed(0)} units
                      </span>
                    </div>
                    <div className="bg-emerald-950/30 rounded p-1.5 border border-emerald-900/50">
                      <span className="text-emerald-400 font-medium block text-[11px]">
                        Reorder Qty
                      </span>
                      <span className="text-emerald-300 font-bold text-base leading-tight">
                        +{item.reorder_qty}
                      </span>
                    </div>
                  </div>

                  {/* Driver Reasons (Up to 3 reasons with impact %) */}
                  <div className="mb-3">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Verified Stockout Drivers:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.reasons && item.reasons.length > 0 ? (
                        item.reasons.slice(0, 3).map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">No single dominant driver</span>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="text-slate-300 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span>{item.action}</span>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedItem({
                          store_id: item.store_id,
                          product_id: item.product_id,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isSelectedForSim
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isSelectedForSim ? 'Simulating Item' : 'Simulate in What-If'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Right Column: Interactive What-If Scenario Panel */}
        <div className="lg:col-span-5 sticky top-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400">
                  Real-Time Scenario Simulator
                </span>
                <h3 className="text-base font-bold text-slate-100">What-If Intervention Engine</h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {selectedItem.store_id} - {selectedItem.product_id}
              </span>
            </div>

            {/* Sliders & Toggles */}
            <div className="py-4 space-y-5 border-b border-slate-800">
              {/* Slider 1: Discount % (0 to 50%) */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <label className="text-slate-300 font-medium">Promotional Discount</label>
                  <span className="font-mono text-emerald-400 font-bold">{discountPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0% (Standard)</span>
                  <span>25%</span>
                  <span>50% (Flash Sale)</span>
                </div>
              </div>

              {/* Slider 2: Supplier Delay (0 to 7 days) */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <label className="text-slate-300 font-medium">Supplier Lead Time Delay</label>
                  <span className="font-mono text-amber-400 font-bold">+{delayDays} days</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="1"
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>+0 d (On Time)</span>
                  <span>+3 d</span>
                  <span>+7 d (Disruption)</span>
                </div>
              </div>

              {/* Toggle 3: Festival Ahead */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-medium text-slate-300 block">
                    Upcoming Festival Surge
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Simulate calendar festival in next 7 days
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFestivalToggle(!festivalToggle)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    festivalToggle ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      festivalToggle ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Simulation Results: Baseline vs Simulated with Deltas */}
            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Scenario Impact Analysis
                </span>
                {whatIfMutation.isPending && (
                  <span className="text-[10px] text-emerald-400 animate-pulse font-mono">
                    Calculating...
                  </span>
                )}
              </div>

              {whatIfData && (
                <div className="space-y-3">
                  {/* Metric 1: Stockout Probability */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Stockout Risk</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400">
                          {(whatIfData.baseline.stockout_prob * 100).toFixed(1)}%
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-slate-100">
                          {(whatIfData.simulated.stockout_prob * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Delta in percentage points pp */}
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          whatIfData.deltas.stockout_prob_diff > 0.0001
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : whatIfData.deltas.stockout_prob_diff < -0.0001
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {whatIfData.deltas.stockout_prob_diff >= 0 ? '+' : ''}
                        {(whatIfData.deltas.stockout_prob_diff * 100).toFixed(1)} pp
                      </span>
                    </div>
                  </div>

                  {/* Metric 2: Forecast Demand */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">7-Day Forecast Demand</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400">{whatIfData.baseline.forecast_7d}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-slate-100">
                          {whatIfData.simulated.forecast_7d}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          whatIfData.deltas.forecast_diff > 0
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {whatIfData.deltas.forecast_diff >= 0 ? '+' : ''}
                        {whatIfData.deltas.forecast_diff.toFixed(1)} units
                      </span>
                    </div>
                  </div>

                  {/* Metric 3: Prescribed Reorder Quantity */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Recommended Reorder Qty
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400">{whatIfData.baseline.reorder_qty}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          +{whatIfData.simulated.reorder_qty}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          whatIfData.deltas.reorder_qty_diff > 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {whatIfData.deltas.reorder_qty_diff >= 0 ? '+' : ''}
                        {whatIfData.deltas.reorder_qty_diff} units
                      </span>
                    </div>
                  </div>

                  {/* Safety Stock & Action */}
                  <div className="pt-2 text-xs text-slate-300 space-y-1">
                    <p className="text-[11px] text-slate-400">
                      Buffer Required:{' '}
                      <span className="text-slate-200 font-mono">
                        {whatIfData.simulated.safety_stock.toFixed(1)} units
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Intervention:{' '}
                      <span className="text-emerald-400 font-medium">
                        {whatIfData.simulated.action}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Reset to Baseline Button */}
              <button
                onClick={() => {
                  setDiscountPct(0);
                  setDelayDays(0);
                  setFestivalToggle(false);
                }}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                Reset Simulation to Baseline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
