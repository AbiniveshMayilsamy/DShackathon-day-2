# StockSense: AI-Powered Retail Demand & Stock-Out Decision System

## Problem & Objectives
NovaMart loses at least ~₹14.47L (estimated) up to ~₹20.47L (simulated truth) to stock-outs (8.56% stock-out rate). StockSense predicts 7-day SKU demand and stock-out risk across 5 stores and 40 products to generate automated, actionable purchase orders.

## Architecture (5 Lines)
- Data: 5 raw CSVs cleaned into a unified master grain (date x store x product, 19,714 rows).
- Features: 37 model input features (34 numeric + 3 categorical; 38 for stockout) with 7-day anti-leakage buffers.
- Models: Dual XGBoost (demand regression MAE 11.71; stockout classifier Recall 0.7595, AUC 0.8358).
- Decision Engine: Safety stock calculations, priority scoring, and root-cause explanations.
- Delivery: FastAPI backend (9 endpoints) powering a responsive React+Vite dashboard with What-If simulations.

## Setup & Run Order
```bash
pip install -r requirements.txt
python src/run_all.py                   # Executes clean, stats, features, train, explain, predict
uvicorn src.api:app --port 8000 &       # Start FastAPI server
cd web && npm ci && npm run dev        # Start Vite frontend (http://localhost:5173)
```

## Folder Structure
```
data/ (raw, processed) | models/ (.joblib, metrics.json) | reports/ (KPIs, tables, figures)
notebooks/ (01_cleaning_eda, 02_features_models, 03_explain_results) | src/ (pipeline scripts)
tests/ (verify_phase7a.py, test_api.py) | web/ (React+Vite TypeScript frontend)
```

## Model Results (Test Set Evaluation)
| Task | Model | Primary Metric | Baseline | Lift / Gain | Source |
|---|---|---|---|---|---|
| Demand (7-day units) | XGBoost Regressor | MAE: 11.71 (R²: 0.9686) | MAE: 14.08 | +16.8% MAE reduction | `models/metrics.json` |
| Stock-Out Risk | XGBoost Classifier | Recall: 75.95% (AUC: 0.8358) | Recall: 59.02% | +28.7% risk capture | `models/metrics.json` |
| Risk Tier Calibration | Actual Stockout | LOW: 13.6% (1,019 rows) | MED: 49.8% (560) | HIGH: 77.2% (622 rows) | `models/metrics.json` |

## Key Business Metrics
- Period Revenue: ₹4.23 Cr (`reports/kpis.json`) | Stockout Rate: 8.56% (`reports/kpis.json`)
- Inventory Turnover: 73.25x (`reports/kpis.json`) — for the 153-day period, not annualized (~2.09 days of stock)
- Promotion Lift: 1.35x (`reports/kpis.json`) | Estimated Lost Sales: ₹14.47 Lakhs (`reports/kpis.json`)

## Disclosures & Limitations
- Synthetic data: Generated via `src/make_dataset.py` (seed 42).
- In-transit inventory: `incoming_stock` assumed 0 (unobserved in dataset).
- Sparse history: New products (<14d: P138, P139, P140) use store-category fallback (`confidence='low'`).
- Inventory turnover caveat: 73.25x is for the 153-day simulation period, not annualized.
- Demand clipping & gap: Actual sales were stock-capped; estimated lost sales (₹14.47L in `reports/kpis.json`) is ~29.3% below simulated truth (₹20.47L in `data/raw/_truth.csv`).
- Weekend feature: Constant across 7-day rolling window; excluded from per-item explanations.
