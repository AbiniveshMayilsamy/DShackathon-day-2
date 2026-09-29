import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { fetchSummary } from '../api/client';

const STORE_COLORS: Record<string, string> = {
  S01: '#34d399', S02: '#60a5fa', S03: '#f59e0b', S04: '#a78bfa', S05: '#fb7185',
};

const PIE_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#fb7185', '#6ee7b7', '#93c5fd'];

function fmt(n: number, decimals = 0) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: decimals })}`;
}

export const SummaryPage: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
    staleTime: 60_000,
  });

  if (isLoading) return (
    <div className="p-8 flex items-center gap-3 text-slate-400 text-sm">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      Loading executive summary...
    </div>
  );

  if (isError || !data) return (
    <div className="p-8 text-red-400 text-sm">Failed to load summary. Ensure the API is running on port 8000.</div>
  );

  const kpis = [
    { label: 'Total Revenue', value: fmt(data.revenue), sub: 'All stores · entire period', color: 'emerald' },
    { label: 'MoM Growth', value: `${data.growth_pct > 0 ? '+' : ''}${data.growth_pct}%`, sub: 'Last 28 days vs prior 28', color: data.growth_pct >= 0 ? 'emerald' : 'red' },
    { label: 'Stock-out Rate', value: `${(data.stockout_rate * 100).toFixed(2)}%`, sub: 'Daily closing stock ≤ 0', color: 'amber' },
    { label: 'Inventory Value', value: fmt(data.inventory_value), sub: 'Cost basis · latest date', color: 'blue' },
    { label: 'Items at HIGH Risk', value: String(data.products_at_risk), sub: `of ${data.total_active_items} active items`, color: 'red' },
  ];

  // Which stores appear in the weekly data
  const storeKeys = Object.keys(STORE_COLORS).filter(
    (s) => data.weekly_revenue_by_store.some((e) => s in e)
  );

  // Top category for "so what" line
  const topCat = [...data.category_revenue_share].sort((a, b) => b.pct - a.pct)[0];

  return (
    <div className="p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          Executive Overview
        </span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Executive Summary</h1>
        <p className="text-sm text-slate-400 mt-1">
          {topCat.category} drives <strong className="text-slate-200">{topCat.pct}%</strong> of total revenue.
          {' '}Stockout rate is <strong className="text-slate-200">{(data.stockout_rate * 100).toFixed(2)}%</strong> across all store-days.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color === 'emerald' ? 'text-emerald-400' : kpi.color === 'red' ? 'text-red-400' : kpi.color === 'amber' ? 'text-amber-400' : 'text-blue-400'}`}>
              {kpi.value}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue by Store — 2/3 width */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Weekly Revenue by Store</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            S02 ({fmt(data.weekly_revenue_by_store.at(-1)?.['S02'] as number ?? 0)}) leads latest week.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.weekly_revenue_by_store}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => fmt(v as number)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {storeKeys.map((s) => (
                <Line key={s} type="monotone" dataKey={s} stroke={STORE_COLORS[s]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Revenue Share Donut — 1/3 width */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Category Revenue Share</h3>
          <p className="text-[11px] text-slate-400 mb-2">All-time mix</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data.category_revenue_share}
                dataKey="pct"
                nameKey="category"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.category_revenue_share.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => `${(v as number).toFixed(1)}%`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {data.category_revenue_share.map((c, i) => (
              <div key={c.category} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-slate-300">{c.category}</span>
                </div>
                <span className="text-slate-400 font-mono">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
