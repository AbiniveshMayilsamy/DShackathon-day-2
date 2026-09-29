# StockSense: AI-Powered Retail Demand & Stock-Out Decision System

## Problem & Objectives
NovaMart loses ~₹14.47L to stock-outs (8.56% rate). StockSense predicts 7-day SKU demand and stock-out risk across 5 stores and 40 products to generate automated, actionable purchase orders.

## Architecture (5 Lines)
- Data: 5 raw CSVs cleaned into a unified master grain (date x store x product, 19,714 rows).
- Features: 59 strict temporal features with 7-day buffers preventing data leakage.
- Models: Dual XGBoost (demand regression MAE 11.71; stockout classifier Recall 0.7595, AUC 0.8358).
- Decision Engine: Safety stock calculations, priority scoring, and root-cause explanations.
- Delivery: FastAPI backend (10 endpoints) powering a responsive React+Vite dashboard with What-If simulations.

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
| Task | Model | Primary Metric | Baseline | Lift / Gain |
|---|---|---|---|---|
| Demand (7-day units) | XGBoost Regressor | MAE: 11.71 (R²: 0.9686) | MAE: 14.08 | +16.8% MAE reduction |
| Stock-Out Risk | XGBoost Classifier | Recall: 75.95% (AUC: 0.8358) | Recall: 59.02% | +28.7% risk capture |
| Risk Tier Calibration | Actual Stockout | LOW: 13.6% (1,019 rows) | MED: 49.8% (560) | HIGH: 77.2% (622 rows) |

## Key Business Metrics
- Annual Revenue: ₹4.23 Cr | Inventory Turnover: 73.25x | Promo Lift: 1.35x
- Stockout Rate: 8.56% | Estimated Lost Sales: ₹14.47 Lakhs

## Disclosures & Limitations
- Synthetic data: Generated via `src/make_dataset.py` (seed 42).
- In-transit inventory: `incoming_stock` assumed 0 (unobserved in dataset).
- Sparse history: New products (<14d: P138, P139, P140) use store-category fallback (`confidence='low'`).
- Demand clipping: Actual sales were stock-capped; lost sales gap underestimates true demand by ~29.3%.
- Weekend feature: Constant across 7-day rolling window; excluded from per-item explanations.
