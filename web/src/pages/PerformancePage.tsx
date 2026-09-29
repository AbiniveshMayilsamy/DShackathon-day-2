import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { fetchModelMetrics } from '../api/client';

function fmt2(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toFixed(3);
}

export const PerformancePage: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['model-metrics'],
    queryFn: fetchModelMetrics,
    staleTime: 300_000,
  });

  if (isLoading) return (
    <div className="p-8 flex items-center gap-2 text-slate-400 text-sm">
      <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      Loading model telemetry...
    </div>
  );
  if (isError || !data) return (
    <div className="p-8 text-red-400 text-sm">Failed to load model metrics.</div>
  );

  const dm = data.metrics.demand_model;
  const sm = data.metrics.stockout_model;
  const cm = sm.confusion_matrix;
  const tier = data.tier_calibration;

  // Separate comparison rows by task
  const demandRows = data.comparison.filter((r) => r.task === 'Demand Regression');
  const stockoutRows = data.comparison.filter((r) => r.task === 'Stockout Classification');

  // Residuals: convert flat array to {x, y} with index
  const residuals = (data.metrics as Record<string, unknown>)['residual_sample_500'] as number[] | undefined;
  const residualPoints = (residuals ?? []).slice(0, 200).map((v, i) => ({ i, v }));

  // ROC points
  const rocPoints = ((data.metrics as Record<string, unknown>)['roc_curve'] as { fpr: number; tpr: number }[] | undefined) ?? [];
  const diagPoints = [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }];

  return (
    <div className="p-8 max-w-7xl space-y-8">
      <div className="pb-5 border-b border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">
          Model Telemetry
        </span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Model Performance & Validation</h1>
        <p className="text-sm text-slate-400 mt-1">
          Demand MAE <strong className="text-slate-200">{dm.test_mae}</strong> vs rolling baseline <strong className="text-slate-200">{dm.baseline_mae}</strong> (16% lower error).
          Stockout Recall <strong className="text-slate-200">{(sm.test_recall * 100).toFixed(0)}%</strong> vs rule baseline <strong className="text-slate-200">{(sm.baseline_recall * 100).toFixed(0)}%</strong>.
        </p>
      </div>

      {/* Demand Model Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">Demand Model Candidates — Test Set</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Lower MAE / RMSE = better. Baseline = rolling mean × 7.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                {['Model', 'MAE', 'RMSE', 'MAPE %', 'R²'].map(h => (
                  <th key={h} className="text-left p-3 text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demandRows.map((r, i) => (
                <tr key={i} className={`border-t border-slate-800/60 ${r.model === dm.name ? 'bg-emerald-950/30' : ''}`}>
                  <td className="p-3 font-medium text-slate-200 flex items-center gap-1">
                    {r.model === dm.name && <span className="text-emerald-400 text-[10px]">★ </span>}
                    {r.model}
                  </td>
                  <td className="p-3 font-mono text-slate-300">{r.MAE?.toFixed(2) ?? '—'}</td>
                  <td className="p-3 font-mono text-slate-300">{r.RMSE?.toFixed(2) ?? '—'}</td>
                  <td className="p-3 font-mono text-slate-300">{r.MAPE?.toFixed(1) ?? '—'}</td>
                  <td className="p-3 font-mono text-slate-300">{r.R2?.toFixed(3) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stockout Model Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">Stockout Model Candidates — Test Set</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Selected by Recall + ROC-AUC. Baseline = closing &lt; reorder_lvl rule.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                {['Model', 'Recall', 'AUC', 'F1', 'Precision', 'Accuracy', 'Brier'].map(h => (
                  <th key={h} className="text-left p-3 text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stockoutRows.map((r, i) => (
                <tr key={i} className={`border-t border-slate-800/60 ${r.model === sm.name ? 'bg-emerald-950/30' : ''}`}>
                  <td className="p-3 font-medium text-slate-200">
                    {r.model === sm.name && <span className="text-emerald-400 text-[10px]">★ </span>}
                    {r.model}
                  </td>
                  <td className="p-3 font-mono text-slate-300">{fmt2(r.Recall)}</td>
                  <td className="p-3 font-mono text-slate-300">{fmt2(r.ROC_AUC)}</td>
                  <td className="p-3 font-mono text-slate-300">{fmt2(r.F1)}</td>
                  <td className="p-3 font-mono text-slate-300">{fmt2(r.Precision)}</td>
                  <td className="p-3 font-mono text-slate-300">{fmt2(r.Accuracy)}</td>
                  <td className="p-3 font-mono text-slate-300">{fmt2(r.Brier)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Confusion Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Confusion Matrix (Test Set)</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Recall: {(sm.test_recall * 100).toFixed(0)}% of actual stockouts caught.
          </p>
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-4">
              <div className="text-2xl font-bold text-emerald-400">{cm[0][0]}</div>
              <div className="text-[10px] text-slate-400 mt-1">True Negative</div>
              <div className="text-[10px] text-slate-500">No stockout, correctly</div>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-400">{cm[0][1]}</div>
              <div className="text-[10px] text-slate-400 mt-1">False Positive</div>
              <div className="text-[10px] text-slate-500">False alarm</div>
            </div>
            <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{cm[1][0]}</div>
              <div className="text-[10px] text-slate-400 mt-1">False Negative</div>
              <div className="text-[10px] text-slate-500">Missed stockout</div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-4">
              <div className="text-2xl font-bold text-emerald-400">{cm[1][1]}</div>
              <div className="text-[10px] text-slate-400 mt-1">True Positive</div>
              <div className="text-[10px] text-slate-500">Stockout caught</div>
            </div>
          </div>
        </div>

        {/* ROC Curve */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibond text-slate-200 mb-1">ROC Curve</h3>
          <p className="text-[11px] text-slate-400 mb-3">
            AUC = <strong className="text-slate-200">{sm.test_roc_auc.toFixed(3)}</strong> vs baseline 0.601
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: 'FPR', position: 'insideBottom', fill: '#64748b', fontSize: 10, offset: -2 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: 'TPR', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 10 }} />
              <Line data={rocPoints} type="monotone" dataKey="tpr" stroke="#a78bfa" dot={false} strokeWidth={2} name="XGBoost" />
              <Line data={diagPoints} type="linear" dataKey="tpr" stroke="#475569" dot={false} strokeDasharray="4 2" name="Random" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Residual Scatter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Demand Residuals (200 rows)</h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Most errors within ±{Math.round(dm.test_mae)} units. MAPE = {dm.test_mape}%
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="i" tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: 'Row', position: 'insideBottom', fill: '#64748b', fontSize: 10, offset: -2 }} />
              <YAxis dataKey="v" tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: 'Error', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
              <Scatter data={residualPoints} fill="#60a5fa" opacity={0.5} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trust Slide: Tier Calibration Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">Risk Tier Calibration — The Trust Slide</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Actual stockout rate rises monotonically LOW → HIGH. This is why the risk label can be trusted.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-950 border-b border-slate-800">
            <tr>
              {['Tier', 'Items', '% of Total', 'Actual Stockout Rate'].map(h => (
                <th key={h} className="text-left p-4 text-slate-400 font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tier.map((t) => (
              <tr key={t.risk_tier} className="border-t border-slate-800/60">
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    t.risk_tier === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : t.risk_tier === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {t.risk_tier}
                  </span>
                </td>
                <td className="p-4 font-mono text-slate-300">{t.row_count.toLocaleString()}</td>
                <td className="p-4 font-mono text-slate-300">{t.pct_share.toFixed(1)}%</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-800 rounded-full h-2 max-w-28">
                      <div
                        className={`h-2 rounded-full ${t.risk_tier === 'HIGH' ? 'bg-red-500' : t.risk_tier === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${t.actual_stockout_rate * 100}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      {(t.actual_stockout_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
