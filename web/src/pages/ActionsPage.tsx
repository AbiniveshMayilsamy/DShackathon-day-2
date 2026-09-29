import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchPredictions,
  simulateWhatIf,
  getExportOrdersUrl,
} from '../api/client';
import type { PredictionItem, WhatIfResponse } from '../api/client';


/* ── shared token objects ── */
const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const badge = (bg: string, color: string, border: string): React.CSSProperties => ({
  ...mono, fontSize: 10, fontWeight: 600,
  padding: '1px 7px', borderRadius: 2,
  background: bg, color, border: `1px solid ${border}`,
  display: 'inline-block',
});

export const ActionsPage: React.FC = () => {
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<{ store_id: string; product_id: string }>({
    store_id: 'S01',
    product_id: 'P101',
  });
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [delayDays, setDelayDays] = useState<number>(0);
  const [festivalToggle, setFestivalToggle] = useState<boolean>(false);

  const { data: predictions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['predictions', storeFilter, categoryFilter],
    queryFn: () => fetchPredictions({ store: storeFilter || undefined, category: categoryFilter || undefined }),
  });

  const whatIfMutation = useMutation({
    mutationFn: () => simulateWhatIf({
      store_id: selectedItem.store_id,
      product_id: selectedItem.product_id,
      discount_pct: discountPct / 100,
      supplier_delay_days: delayDays,
      festival: festivalToggle ? 1 : 0,
    }),
  });

  React.useEffect(() => { whatIfMutation.mutate(); }, [selectedItem, discountPct, delayDays, festivalToggle]);

  const highRiskCards = React.useMemo(() => {
    if (!predictions) return [];
    return predictions.filter((p) => p.risk === 'HIGH').sort((a, b) => b.priority_score - a.priority_score).slice(0, 10);
  }, [predictions]);

  const availableStores = React.useMemo(() => {
    if (!predictions) return ['S01', 'S02', 'S03', 'S04', 'S05'];
    return Array.from(new Set(predictions.map((p) => p.store_id))).sort();
  }, [predictions]);

  const availableCategories = React.useMemo(() => {
    if (!predictions) return [];
    return Array.from(new Set(predictions.map((p) => p.category))).sort();
  }, [predictions]);

  React.useEffect(() => {
    if (highRiskCards.length > 0 && selectedItem.store_id === 'S01' && selectedItem.product_id === 'P101') {
      setSelectedItem({ store_id: highRiskCards[0].store_id, product_id: highRiskCards[0].product_id });
    }
  }, [highRiskCards]);

  const whatIfData: WhatIfResponse | undefined = whatIfMutation.data;

  /* ── select style ── */
  const selectStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #CBD5E1', borderRadius: 3,
    padding: '4px 8px', fontSize: 12, color: '#1E293B',
    fontFamily: "'IBM Plex Sans', sans-serif", outline: 'none',
  };

  return (
    <div style={{ padding: '20px 28px', maxWidth: 1280, margin: '0 auto', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #E2E8F0', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
            <span style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#991B1B' }}>
              Prescriptive Operations
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#0F172A', margin: '0 0 3px' }}>Action Centre</h1>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
            Urgent replenishment interventions ranked by stockout risk and revenue impact
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>

          <a
            href={getExportOrdersUrl()}
            download="orders.csv"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 500,
              background: '#ffffff', color: '#1E293B',
              border: '1px solid #CBD5E1', borderRadius: 3, textDecoration: 'none',
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Order List
          </a>
        </div>
      </div>

      {/* ── Filters Toolbar ── */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 3, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <span style={{ ...mono, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8' }}>
          Filter:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#64748B' }}>Store</label>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} style={selectStyle}>
            <option value="">All Stores</option>
            {availableStores.map((s) => <option key={s} value={s}>Store {s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#64748B' }}>Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
            <option value="">All Categories</option>
            {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(storeFilter || categoryFilter) && (
          <button
            onClick={() => { setStoreFilter(''); setCategoryFilter(''); }}
            style={{ marginLeft: 'auto', fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Main Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: High-Risk Cards ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Top 10 High-Risk Replenishment Orders
              <span style={badge('#FEF2F2', '#991B1B', '#FECACA')}>
                {highRiskCards.length} Alert{highRiskCards.length === 1 ? '' : 's'}
              </span>
            </h2>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Ranked by Priority Score</span>
          </div>

          {isLoading && (
            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 3, padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              Loading priority inventory risks...
            </div>
          )}

          {isError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 3, padding: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#991B1B', margin: '0 0 4px' }}>Failed to connect to API engine</p>
              <p style={{ fontSize: 12, color: '#B91C1C', margin: '0 0 12px' }}>{(error as Error)?.message}</p>
              <button onClick={() => refetch()} style={{ padding: '5px 12px', fontSize: 11, background: '#991B1B', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}>
                Retry Connection
              </button>
            </div>
          )}

          {!isLoading && !isError && highRiskCards.length === 0 && (
            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 3, padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              No high-risk items found for the selected filter criteria.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!isLoading && !isError && highRiskCards.map((item: PredictionItem, idx: number) => {
              const isSelectedForSim = selectedItem.store_id === item.store_id && selectedItem.product_id === item.product_id;
              return (
                <div
                  key={`${item.store_id}-${item.product_id}`}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${isSelectedForSim ? '#2563EB' : '#E2E8F0'}`,
                    borderLeft: `3px solid ${isSelectedForSim ? '#2563EB' : '#DC2626'}`,
                    borderRadius: 3,
                    padding: '12px 14px',
                  }}
                >
                  {/* Top row: rank + badges + risk */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                      <span style={{ ...badge('#F1F5F9', '#475569', '#E2E8F0') }}>#{idx + 1}</span>
                      <span style={{ ...badge('#F1F5F9', '#475569', '#E2E8F0') }}>Store {item.store_id}</span>
                      <span style={{ ...badge('#EFF6FF', '#1D4ED8', '#BFDBFE') }}>{item.category}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                        {item.product_name || item.product_id}
                      </span>
                      {item.confidence === 'low' && (
                        <span style={{ ...badge('#FFFBEB', '#B45309', '#FDE68A') }}>Low History Confidence</span>
                      )}
                    </div>
                    <span style={{ ...badge('#FEF2F2', '#991B1B', '#FECACA'), whiteSpace: 'nowrap', flexShrink: 0 }}>
                      HIGH · {(item.stockout_prob * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
                    background: '#E2E8F0', border: '1px solid #E2E8F0', borderRadius: 2, marginBottom: 10,
                  }}>
                    {[
                      { label: 'Current Stock', value: `${item.current_stock} units`, highlight: false },
                      { label: 'Incoming Pipeline', value: `${item.incoming_stock} units`, highlight: false },
                      { label: '7-Day Forecast', value: `${item.forecast_7d.toFixed(0)} units`, highlight: false },
                      { label: 'Reorder Qty', value: `+${item.reorder_qty}`, highlight: true },
                    ].map((m) => (
                      <div key={m.label} style={{ background: m.highlight ? '#ECFDF5' : '#ffffff', padding: '8px 10px' }}>
                        <span style={{ ...mono, fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }}>
                          {m.label}
                        </span>
                        <span style={{ ...mono, fontSize: 14, fontWeight: 600, color: m.highlight ? '#065F46' : '#0F172A' }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Driver reasons */}
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                      Verified Stockout Drivers
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {item.reasons && item.reasons.length > 0 ? (
                        item.reasons.slice(0, 3).map((r, rIdx) => (
                          <span key={rIdx} style={{ fontSize: 11, padding: '2px 8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, color: '#475569' }}>
                            {r}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>No single dominant driver</span>
                      )}
                    </div>
                  </div>

                  {/* Action bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #F1F5F9', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#DC2626', display: 'inline-block', flexShrink: 0 }} />
                      <span>{item.action}</span>
                    </div>
                    <button
                      onClick={() => setSelectedItem({ store_id: item.store_id, product_id: item.product_id })}
                      style={{
                        padding: '4px 12px', fontSize: 11, fontWeight: 500, borderRadius: 2, cursor: 'pointer',
                        background: isSelectedForSim ? '#2563EB' : '#ffffff',
                        color: isSelectedForSim ? '#ffffff' : '#475569',
                        border: `1px solid ${isSelectedForSim ? '#2563EB' : '#CBD5E1'}`,
                        flexShrink: 0,
                      }}
                    >
                      {isSelectedForSim ? 'Simulating →' : 'Simulate in What-If'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: What-If Panel ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 3 }}>
            {/* Panel header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ ...mono, fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 3 }}>
                  Real-Time Scenario Simulator
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>What-If Intervention Engine</h3>
              </div>
              <span style={{ ...badge('#EFF6FF', '#1D4ED8', '#BFDBFE') }}>
                {selectedItem.store_id} · {selectedItem.product_id}
              </span>
            </div>

            {/* Sliders */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Discount slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <label style={{ color: '#475569', fontWeight: 500 }}>Promotional Discount</label>
                  <span style={{ ...mono, fontWeight: 600, color: '#2563EB' }}>{discountPct}%</span>
                </div>
                <input type="range" min="0" max="50" step="5" value={discountPct}
                  onChange={(e) => setDiscountPct(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB', height: 3, cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, color: '#94A3B8', marginTop: 3 }}>
                  <span>0% (Standard)</span><span>25%</span><span>50% (Flash Sale)</span>
                </div>
              </div>

              {/* Delay slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <label style={{ color: '#475569', fontWeight: 500 }}>Supplier Lead Time Delay</label>
                  <span style={{ ...mono, fontWeight: 600, color: '#B45309' }}>+{delayDays} days</span>
                </div>
                <input type="range" min="0" max="7" step="1" value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#D97706', height: 3, cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, color: '#94A3B8', marginTop: 3 }}>
                  <span>+0d (On Time)</span><span>+3d</span><span>+7d (Disruption)</span>
                </div>
              </div>

              {/* Festival toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#475569', display: 'block' }}>Upcoming Festival Surge</span>
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>Simulate calendar festival in next 7 days</span>
                </div>
                <button
                  onClick={() => setFestivalToggle(!festivalToggle)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: festivalToggle ? '#2563EB' : '#CBD5E1',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: festivalToggle ? 20 : 2,
                    width: 18, height: 18, borderRadius: '50%', background: '#ffffff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            </div>

            {/* Simulation results */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...mono, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
                  Scenario Impact Analysis
                </span>
                {whatIfMutation.isPending && (
                  <span style={{ ...mono, fontSize: 10, color: '#2563EB' }}>Calculating...</span>
                )}
              </div>

              {whatIfData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Metric rows */}
                  {[
                    {
                      label: 'Stockout Risk',
                      baseline: `${(whatIfData.baseline.stockout_prob * 100).toFixed(1)}%`,
                      simulated: `${(whatIfData.simulated.stockout_prob * 100).toFixed(1)}%`,
                      delta: `${whatIfData.deltas.stockout_prob_diff >= 0 ? '+' : ''}${(whatIfData.deltas.stockout_prob_diff * 100).toFixed(1)} pp`,
                      deltaUp: whatIfData.deltas.stockout_prob_diff > 0.0001,
                      deltaDown: whatIfData.deltas.stockout_prob_diff < -0.0001,
                    },
                    {
                      label: '7-Day Forecast Demand',
                      baseline: `${whatIfData.baseline.forecast_7d}`,
                      simulated: `${whatIfData.simulated.forecast_7d}`,
                      delta: `${whatIfData.deltas.forecast_diff >= 0 ? '+' : ''}${whatIfData.deltas.forecast_diff.toFixed(1)} units`,
                      deltaUp: whatIfData.deltas.forecast_diff > 0,
                      deltaDown: false,
                    },
                    {
                      label: 'Recommended Reorder Qty',
                      baseline: `${whatIfData.baseline.reorder_qty}`,
                      simulated: `+${whatIfData.simulated.reorder_qty}`,
                      delta: `${whatIfData.deltas.reorder_qty_diff >= 0 ? '+' : ''}${whatIfData.deltas.reorder_qty_diff} units`,
                      deltaUp: whatIfData.deltas.reorder_qty_diff > 0,
                      deltaDown: false,
                    },
                  ].map((m) => (
                    <div key={m.label} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 10, color: '#94A3B8', display: 'block', marginBottom: 2 }}>{m.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 12 }}>
                          <span style={{ color: '#94A3B8' }}>{m.baseline}</span>
                          <span style={{ color: '#CBD5E1' }}>→</span>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{m.simulated}</span>
                        </div>
                      </div>
                      <span style={{
                        ...mono, fontSize: 10, fontWeight: 700,
                        padding: '1px 7px', borderRadius: 2,
                        background: m.deltaUp ? '#FEF2F2' : m.deltaDown ? '#ECFDF5' : '#F1F5F9',
                        color: m.deltaUp ? '#991B1B' : m.deltaDown ? '#065F46' : '#475569',
                        border: `1px solid ${m.deltaUp ? '#FECACA' : m.deltaDown ? '#A7F3D0' : '#E2E8F0'}`,
                      }}>
                        {m.delta}
                      </span>
                    </div>
                  ))}

                  {/* Summary notes */}
                  <div style={{ padding: '8px 0', fontSize: 11, color: '#64748B', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span>
                      Buffer Required:{' '}
                      <span style={{ ...mono, fontWeight: 600, color: '#0F172A' }}>
                        {whatIfData.simulated.safety_stock.toFixed(1)} units
                      </span>
                    </span>
                    <span>
                      Intervention:{' '}
                      <span style={{ fontWeight: 500, color: '#065F46' }}>{whatIfData.simulated.action}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Reset */}
              <button
                onClick={() => { setDiscountPct(0); setDelayDays(0); setFestivalToggle(false); }}
                style={{
                  width: '100%', marginTop: 12, padding: '7px 0', fontSize: 11, fontWeight: 500,
                  background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2,
                  color: '#475569', cursor: 'pointer',
                }}
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
