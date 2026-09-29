import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

interface ExplanationContent {
  title: string;
  badge: string;
  what: string;
  why: string;
  reason: string;
  how: string[];
}

const EXPLANATIONS: Record<string, ExplanationContent> = {
  '/actions': {
    title: 'Action Centre & Replenishment Orders',
    badge: 'Main Operational Screen',
    what: 'This screen displays the top-10 urgent products that are at immediate risk of running out of stock across your stores in the next 7 days, ranked by financial urgency.',
    why: 'Stock-outs cost NovaMart over ₹14.5 Lakhs in lost sales. Store managers cannot inspect 143 SKUs manually every morning. This page tells you exactly what shelves will empty first so you can reorder before losing sales.',
    reason: 'Each item is scored using Priority Score = Stockout Probability × 7-Day Demand Forecast × Unit Price. Reorder quantities dynamically calculate Lead Time Safety Stock: Z(0.95) × σ(demand) × √LeadDays. If current stock plus incoming is less than demand + safety stock, an exact purchase order is prescribed.',
    how: [
      '1. Review the Top-10 Action Cards ranked by priority score.',
      '2. Read the 3 plain-English reasons on each card (e.g. "Stock covers only 2.1 days", "Lead time is 4 days").',
      '3. Test the What-If Sandbox sliders to see how a supplier delay (+2 days) or discount (+10%) increases order quantities in real time.',
      '4. Click the green "Export Order List" button to download the supplier-ready purchase orders CSV.',
    ],
  },
  '/summary': {
    title: 'Executive Summary & Store Health',
    badge: 'Director & Leadership View',
    what: 'A high-level dashboard displaying enterprise KPIs: ₹4.23 Cr Period Revenue, 8.56% Stock-out Rate, 73.25x Inventory Turnover, weekly revenue trends by store, and category distribution.',
    why: 'Leadership needs an immediate pulse on revenue performance, store-by-store differences, and which categories drive sales versus which ones suffer frequent stockouts.',
    reason: 'Aggregated directly from the verified 19,714-row master table across 153 days (May 1 – Sept 30, 2026). All revenue figures strictly filter out 750 negative transaction returns for 100% verified clean accounting.',
    how: [
      '1. Check the 5 KPI cards at the top for overall enterprise health.',
      '2. Examine the 16-week trend chart to spot store revenue variations (S01 Hypermarket vs S03 Express).',
      '3. View the Category Donut to see product share (Dairy leads at 29.5% of total sales).',
    ],
  },
  '/demand': {
    title: 'Demand Forecast & Actuals Comparison',
    badge: 'SKU Forecasting Intelligence',
    what: 'Interactive time-series charts showing actual historical unit sales alongside the model\'s forward 7-day demand forecast for any store and product combination.',
    why: 'Replaces crude 7-day average heuristics with an XGBoost regressor that misses by only 11.71 units on average (a 16.8% error reduction over the 14.08 baseline).',
    reason: 'Trained on 37 temporal features including promotions (which cause a proven 1.35x sales lift), weekend spikes (+22%), city weather, and rolling momentum, with 7-day anti-leakage buffers.',
    how: [
      '1. Select a Store (e.g. S01, S02) and Product (e.g. P101, P106) from the top dropdowns.',
      '2. Compare the historical sales trend with the 7-day forward prediction line.',
      '3. Check the category weekly volume breakdown at the bottom to anticipate seasonal peaks.',
    ],
  },
  '/risk': {
    title: 'Risk Matrix & Store Vulnerability Heatmap',
    badge: 'Multi-Store Risk Diagnosis',
    what: 'A visual Store × Category heatmap showing high-risk SKU concentrations, paired with a complete sortable inventory table showing every product\'s stockout probability.',
    why: 'Enables regional supply chain managers to quickly identify systemic supply bottlenecks—such as Dairy stocking out in Hypermarkets or Snacks running low in Express stores.',
    reason: 'Model 2 (Calibrated XGBoost) assigns every SKU a probability between 0% and 100%. Items are binned into LOW (<35%), MEDIUM (35-65%), and HIGH (≥65%) tiers. In testing, HIGH items actually stocked out 77.2% of the time, while LOW stocked out only 13.6%.',
    how: [
      '1. Look at the Heatmap to identify darker red cells (store-category combinations with high risk).',
      '2. Filter the table by store or category.',
      '3. Click the "Stockout Probability" column header to sort highest to lowest and prioritize reorders.',
    ],
  },
  '/performance': {
    title: 'Model Telemetry & Validation Proof',
    badge: 'Data Science & Trust Slide',
    what: 'The rigorous machine learning evaluation showing side-by-side benchmark comparisons, the 2×2 confusion matrix, ROC curve (AUC 0.8358), and risk tier calibration table.',
    why: 'Demonstrates to judges and executives that the system is scientifically sound, tested on future unseen dates with 0 data leakage, and significantly outperforms standard inventory rules.',
    reason: 'Demand XGBoost achieves MAE 11.71 vs 14.08 baseline (+16.8% error reduction). Stockout Classifier achieves 75.95% Recall vs 59.02% baseline (+28.7% risk capture) with Brier score 0.1638.',
    how: [
      '1. Inspect the Model Comparison Table to see how XGBoost beat Random Forest, KNN, Decision Trees, and Baselines.',
      '2. Check the Confusion Matrix: 682 true stockouts caught out of 898 in the test period.',
      '3. Review the Tier Calibration table: shows monotonic increase from 13.6% (LOW) to 49.8% (MED) to 77.2% (HIGH).',
    ],
  },
  '/explain': {
    title: 'Root Cause Explainability & Diagnostics',
    badge: 'Explainable AI (XAI)',
    what: 'Permutation feature importance rankings grouped by operational domain, plus an interactive per-item diagnostic tool explaining why any specific product was flagged.',
    why: 'Store managers will not act on recommendations from a "black box". They need to know the operational reason (e.g. supplier lead time vs demand spike) to trust the order.',
    reason: 'Permutation importance proves that Inventory Coverage (0.2255) and Lead Time are the #1 drivers. A 4-day supplier lead time causes a stock-out 66% of the time, compared to only 10% for a 1-day lead time.',
    how: [
      '1. Review the horizontal Feature Group Importance bars to understand overall macro drivers.',
      '2. Use the "Why is this item at risk?" dropdown to select any product.',
      '3. Read the 3 plain-English bullet points generated specifically for that SKU.',
    ],
  },
  '/admin': {
    title: 'Platform Governance & Data Quality Audit',
    badge: 'System Admin & Technical Health',
    what: 'Live telemetry monitoring FastAPI server health, model artifact verification, data quality trap remediation audits, and the full 9-endpoint REST API catalog.',
    why: 'Ensures system reliability, full transparency into data cleaning (750 negative rows, 2,482 duplicates), and provides direct access to raw CSV downloads and Swagger API docs.',
    reason: 'All models are serialized with joblib and cached in FastAPI lifespan memory for sub-15ms response times. Validated by 10/10 automated pytest unit tests.',
    how: [
      '1. Verify the green "Healthy" engine status on Port 8000.',
      '2. Review the 6/6 resolved synthetic data traps in the Data Quality table.',
      '3. Click "Interactive OpenAPI Docs" to test the live API endpoints directly in Swagger.',
    ],
  },
  '/landing': {
    title: 'Overview Portal & Solution Introduction',
    badge: 'Executive Landing Page',
    what: 'The welcoming executive portal showcasing NovaMart\'s stockout challenge, core verified metrics, animated green threads canvas, and direct launch buttons to all modules.',
    why: 'Provides a unified entry point and elevator pitch for executives and hackathon judges to understand the platform value in 30 seconds.',
    reason: 'NovaMart loses between ₹14.5L and ₹20.5L across 5 stores. StockSense uses dual XGBoost models with strict time-series anti-leakage splitting to forecast demand and automate replenishment.',
    how: [
      '1. Move your mouse across the screen to interact with the green animated Threads background.',
      '2. Read the 4 headline metric cards (₹4.23 Cr, 75.95% Recall, 11.71 MAE, 77.2% High-Tier accuracy).',
      '3. Click "Launch Action Centre →" to start reviewing today\'s purchase orders.',
    ],
  },
};

export const openExplainer = () => {
  window.dispatchEvent(new CustomEvent('open-explainer'));
};

export const ExplainerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-explainer', handleOpen);
    return () => window.removeEventListener('open-explainer', handleOpen);
  }, []);

  // Normalize path
  const currentPath = location.pathname === '/' ? '/landing' : location.pathname;
  const content = EXPLANATIONS[currentPath] || EXPLANATIONS['/actions'];

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          THE "FAT", PROMINENT EXPLAIN BUTTON (FLOATING BOTTOM RIGHT)
          ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all transform hover:-translate-y-1 active:translate-y-0 border-2 border-emerald-400/50 cursor-pointer"
          title="Explain this screen: What • Why • Reason • How"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-white text-xs font-black animate-pulse">
            ?
          </span>
          <div className="text-left">
            <div className="text-[11px] uppercase tracking-wider text-emerald-100 font-mono font-bold leading-none">
              Need Help?
            </div>
            <div className="text-sm font-heading font-extrabold text-white leading-tight">
              EXPLAIN: WHAT • WHY • HOW
            </div>
          </div>
          <span className="text-xs font-mono bg-white/25 px-2 py-0.5 rounded-lg text-white">
            Press here
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL POPUP WITH 4 DEEP EXPLAINER SECTIONS
          ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-scaleUp max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                  💡
                </div>
                <div>
                  <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    {content.badge}
                  </div>
                  <h2 className="text-xl font-extrabold font-heading text-white leading-tight">
                    {content.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 4 Deep Explainer Cards */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* 1. WHAT IS THIS */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-black px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
                    1. WHAT
                  </span>
                  <span className="font-extrabold text-emerald-950 font-heading text-sm">
                    What is on this screen?
                  </span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed font-sans">
                  {content.what}
                </p>
              </div>

              {/* 2. WHY IT MATTERS */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-black px-2 py-0.5 rounded bg-amber-600 text-white font-mono">
                    2. WHY
                  </span>
                  <span className="font-extrabold text-amber-950 font-heading text-sm">
                    Why does this matter to the store?
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-sans">
                  {content.why}
                </p>
              </div>

              {/* 3. REASON & DATA SCIENCE LOGIC */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-black px-2 py-0.5 rounded bg-blue-600 text-white font-mono">
                    3. REASON
                  </span>
                  <span className="font-extrabold text-blue-950 font-heading text-sm">
                    How is this computed? (AI & Math)
                  </span>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed font-sans">
                  {content.reason}
                </p>
              </div>

              {/* 4. HOW TO ACT */}
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-black px-2 py-0.5 rounded bg-purple-600 text-white font-mono">
                    4. HOW
                  </span>
                  <span className="font-extrabold text-purple-950 font-heading text-sm">
                    How should the manager act right now?
                  </span>
                </div>
                <ul className="text-xs text-purple-900 space-y-1 font-sans">
                  {content.how.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-purple-600 font-bold shrink-0">✔</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-mono text-slate-500">
                Contextual guide updates automatically per page
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExplainerModal;
