import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/client';

const navItems = [
  { path: '/actions', label: 'Action Centre', tag: 'Live' },
  { path: '/summary', label: 'Executive Summary', tag: 'Live' },
  { path: '/demand', label: 'Demand Forecast', tag: 'Live' },
  { path: '/risk', label: 'Risk Matrix', tag: 'Live' },
  { path: '/performance', label: 'Model Telemetry', tag: 'Live' },
  { path: '/explain', label: 'Root Cause Explain', tag: 'Live' },
];


export const Sidebar: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-lg">
            S
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight text-lg leading-tight">StockSense</h1>
            <p className="text-xs text-slate-400">Inventory Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Operations
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`
            }
          >
            <span>{item.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                item.tag === 'Live'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {item.tag}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs text-slate-300 font-medium">FastAPI Engine</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {health?.status === 'ok' ? '8000 OK' : 'Offline'}
          </span>
        </div>
      </div>
    </aside>
  );
};
