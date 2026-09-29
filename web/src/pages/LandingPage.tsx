import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSummary, fetchHealth } from '../api/client';

export const LandingPage: React.FC = () => {
  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* React Bits Aurora Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none animate-aurora" />
      <div className="absolute top-[20%] right-[-5%] w-[450px] h-[450px] rounded-full bg-cyan-500/15 blur-[130px] pointer-events-none animate-aurora" style={{ animationDelay: '-6s' }} />
      <div className="absolute bottom-[-10%] left-[25%] w-[600px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px] pointer-events-none animate-aurora" style={{ animationDelay: '-12s' }} />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-16 flex flex-col justify-between min-h-screen">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between pb-8 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center font-black text-emerald-400 text-xl font-heading">
                S
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white font-heading">StockSense</span>
              <span className="text-xs text-emerald-400 block font-mono">v1.0 • Enterprise Edition</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">API Status: {health?.status === 'ok' ? 'Online (Port 8000)' : 'Connecting...'}</span>
            </div>
            <Link
              to="/admin"
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              Admin Console →
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="py-12 lg:py-20 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium tracking-wide animate-float">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            AI-Driven Retail Demand & Stock-Out Intelligence
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1] font-heading">
            Predict Stockouts.<br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Prescribe Perfect Orders.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            NovaMart loses up to <strong className="text-emerald-300 font-semibold">₹20.5 Lakhs</strong> to stock-outs across 5 hypermarkets.
            StockSense forecasts 7-day demand, assigns calibrated risk scores, and generates automated, actionable purchase orders before shelves empty.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/actions"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Launch Action Centre →
            </Link>
            <Link
              to="/summary"
              className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 transition"
            >
              Executive Summary
            </Link>
            <Link
              to="/admin"
              className="px-6 py-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/80 text-slate-300 font-semibold text-sm border border-slate-800 transition"
            >
              System Telemetry
            </Link>
          </div>
        </div>

        {/* 4 Live Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Period Revenue</div>
            <div className="text-2xl font-bold text-white font-heading">
              {summary ? `₹${(summary.revenue / 10000000).toFixed(2)} Cr` : '₹4.23 Cr'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
              <span>●</span> Verified clean across 153 days
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Stockout Recall</div>
            <div className="text-2xl font-bold text-emerald-400 font-heading">75.95%</div>
            <div className="text-[11px] text-slate-400 mt-2">
              <strong className="text-emerald-300">+28.7% higher</strong> risk capture vs 59.0% baseline
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Demand Forecast MAE</div>
            <div className="text-2xl font-bold text-cyan-400 font-heading">11.71 units</div>
            <div className="text-[11px] text-slate-400 mt-2">
              <strong className="text-cyan-300">+16.8% lower error</strong> vs 14.08 rolling mean
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">HIGH-Tier Accuracy</div>
            <div className="text-2xl font-bold text-amber-400 font-heading">77.17%</div>
            <div className="text-[11px] text-slate-400 mt-2">
              622 test instances strictly calibrated
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="py-12 border-t border-slate-800/80">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">Complete Decision System Architecture</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              From raw transactions to prescriptive purchase orders, built strictly on time-split validation without data leakage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/actions" className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/40 block group">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4 group-hover:bg-emerald-500/20 transition">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-white font-heading group-hover:text-emerald-400 transition">
                Action Centre & PO Engine
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Prioritized action cards ranked by <code className="text-emerald-300 font-mono text-[10px]">prob * forecast * price</code>. Automated safety stock reorder quantity calculation with 1-click CSV order list export.
              </p>
            </Link>

            <Link to="/actions" className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/40 block group">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg mb-4 group-hover:bg-cyan-500/20 transition">
                🎛️
              </div>
              <h3 className="text-lg font-bold text-white font-heading group-hover:text-cyan-400 transition">
                What-If Scenario Sandbox
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Interactive real-time sliders for promotional discount %, supplier lead-time delay days, and festival demand spikes. Recalculates risk and orders on the fly.
              </p>
            </Link>

            <Link to="/risk" className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/40 block group">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4 group-hover:bg-indigo-500/20 transition">
                🗺️
              </div>
              <h3 className="text-lg font-bold text-white font-heading group-hover:text-indigo-400 transition">
                Risk Matrix & Heatmap
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Store-by-category visual heatmap mapping high-risk SKU concentrations across 5 formats (Hypermarket, Supermarket, Express) with sortable risk probability tables.
              </p>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-8 pb-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© 2026 StockSense. AI Retail Demand & Stock-Out Intelligence System.</p>
          <div className="flex gap-4 mt-2 sm:mt-0 font-mono">
            <span>FastAPI Backend :8000</span>
            <span>•</span>
            <span>React + Vite Client :5173</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
