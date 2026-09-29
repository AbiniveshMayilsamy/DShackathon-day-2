import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/client';

const portalItem = { path: '/landing', label: 'Overview Portal', tag: 'Home' };

const navItems = [
  { path: '/actions', label: 'Action Centre', tag: 'Live' },
  { path: '/summary', label: 'Executive Summary', tag: 'Live' },
  { path: '/demand', label: 'Demand Forecast', tag: 'Live' },
  { path: '/risk', label: 'Risk Matrix', tag: 'Live' },
  { path: '/performance', label: 'Model Telemetry', tag: 'Live' },
  { path: '/explain', label: 'Root Cause Explain', tag: 'Live' },
];

const adminItem = { path: '/admin', label: 'Admin Console', tag: 'Ops' };

export const Sidebar: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      <div className="p-6 border-b border-slate-800">
        <NavLink to="/landing" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center font-bold text-emerald-400 text-lg">
              S
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 tracking-tight text-lg leading-tight font-heading group-hover:text-emerald-300 transition">
              StockSense
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">Retail Intelligence</p>
          </div>
        </NavLink>
      </div>

      <nav className="flex-1 p-4 space-y-4">
        {/* Portal Overview Link */}
        <div>
          <NavLink
            to={portalItem.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">✦</span>
              <span>{portalItem.label}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {portalItem.tag}
            </span>
          </NavLink>
        </div>

        {/* Core Operations */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 font-mono">
            Operational Views
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800/90 text-emerald-400 border border-slate-700 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                }`
              }
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  item.tag === 'Live'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {item.tag}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Admin Link */}
        <div className="space-y-1 pt-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 font-mono">
            Governance
          </div>
          <NavLink
            to={adminItem.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-xs">⚙️</span>
              <span>{adminItem.label}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-500/15 text-purple-300 border border-purple-500/25">
              {adminItem.tag}
            </span>
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs text-slate-300 font-medium">FastAPI Engine</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {health?.status === 'ok' ? '8000 OK' : 'Connecting'}
          </span>
        </div>
      </div>
    </aside>
  );
};
