import React from 'react';

interface StubPageProps {
  title: string;
  description: string;
  phase: string;
  expectedContent: string[];
}

export const StubPage: React.FC<StubPageProps> = ({
  title,
  description,
  phase,
  expectedContent,
}) => {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {phase}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
          Specification Scope
        </h3>
        <ul className="space-y-2">
          {expectedContent.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-emerald-400 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Backend endpoint verified &amp; ready</span>
          <span className="font-mono text-emerald-400">Status: Waiting on Phase 7b</span>
        </div>
      </div>
    </div>
  );
};
