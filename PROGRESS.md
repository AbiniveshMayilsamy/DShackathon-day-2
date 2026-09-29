# PROGRESS
Current phase: 8 (Complete)
Model/agent last used: Antigravity (Gemini 3.8 Flash)

## Done
- (Phase 0: Synthetic dataset generated with seed 42, files: `src/make_dataset.py`, `data/raw/*.csv`, `reports/planted_traps.csv`)
- (Phase 1: Cleaned data, resolved ID whitespace/casing, filtered 750 negative-quantity transaction rows [744 unique planted + 6 duplicated], imputed weather medians, flagged inventory mismatches, aggregated sales, joined onto inventory grain, exported `data/processed/master.csv` [19714, 35] and `reports/data_quality.csv`)
- (Phase 2: EDA, 3 statistical tests in `reports/stats_tests.csv`, 7 business KPIs in `reports/kpis.json`, 7 figures in `reports/figures/`, lost sales gap: -29.32% underestimated)
- (Phase 3: Engineered strict temporal features via `build_features(df, with_target=True)` in `src/features.py`, 70/15/15 time split with 7-day anti-leakage buffers, exported `data/processed/features.parquet` [16921, 59], passed 5/5 leakage & target alignment tests)
- (Phase 4: Trained Model 1 [Demand: XGBoost, Test MAE=11.71 vs Baseline=14.08] and Model 2 [Stockout: XGBoost, Test Recall=0.7595 vs Baseline=0.5902, ROC-AUC=0.8358 vs Baseline=0.6017], verified tier calibration, saved `models/*.joblib`, `models/metrics.json`, `reports/model_comparison.csv`)
- (Phase 5: Computed group & feature permutation importances in `models/importance.json`, implemented prescriptive inventory rules in `src/rules.py`, built inference pipeline in `src/predict.py` on true latest date, exported `data/processed/predictions.parquet` [143 rows, 61 LOW / 44 MEDIUM / 38 HIGH])
- (Phase 6: Built FastAPI REST API with lifespan caching, CORS support, all 9 verified endpoints, `/whatif` simulation scenario engine, order CSV exporter, and 9 passing unit tests in `tests/test_api.py`)
- (Phase 7a: Scaffolded React + Vite + TypeScript frontend in `web/` with Tailwind CSS, React Router, TanStack Query; built fully typed client from real JSON; built Sidebar layout with 6 routes and stub pages; built Action Centre with store/category filters, top 10 HIGH-risk cards ranked by priority_score, order export link, and real-time What-If scenario engine; verified production build passes in 537ms)
- (Phase 7b: Built all 5 remaining pages — Summary, Demand, Risk, Performance, Explain; extended /summary with 3 chart-data arrays; added test_10 for /forecast spec addition; all 10 tests pass; verified clean revenue in master)
- (Phase 8: Packaging complete — pinned `requirements.txt`, 3 thin executed notebooks in `notebooks/` with 0 errors and concise outputs, `src/run_all.py` pipeline runner passing all 7 steps in 48.4s, `README.md` under 50 lines with verified numbers, `.gitignore`, 10/10 pytest passing, frontend production build 0 errors in 573ms)

## Decisions (with numbers)
- master table grain: date x store_id x product_id (19,714 rows, 0 duplicate keys)
- prediction convention: prediction time = end of day t; target window = t+1..t+7
- incoming stock: assumed 0.0 (in-transit stock unobserved in dataset; latest received is in closing inventory)
- priority score: `stockout_prob * forecast_7d * avg_price` used for Action Centre card prioritization
- inference scope: 143 active store x product combinations on true latest date (2026-09-30)
- risk tier breakdown: 61 LOW (42.7%), 44 MEDIUM (30.8%), 38 HIGH (26.6%)
- low_history products (P138, P139, P140): preserved in predictions with `confidence="low"` and category-store mean demand fallback
- API validation: 9/9 REST endpoints returning 200 OK (covered by 10 unit tests); `/whatif` scales reorder quantity (+24 units) and probability (+23.9%) under 2-day supplier disruption
- Phase 7a/7b frontend: `npm run build` succeeds (0 errors in 573ms), dev server loads live data on port 5173
- Real page values verified: Summary revenue=₹4.23Cr, Dairy=29.48%; Risk 38 HIGH items; Demand MAE=11.71; Performance tier LOW=13.6%, MED=49.8%, HIGH=77.2%; Explain top group=Inventory Coverage (0.2255)
- Packaging: 3 executed notebooks (`01_cleaning_eda.ipynb`, `02_features_models.ipynb`, `03_explain_results.ipynb`) loading saved artifacts only, `src/run_all.py` pipeline runtime: 48.4s

## Real column names found
- transactions: `transaction_id`, `date`, `store_id`, `product_id`, `quantity`, `selling_price`, `discount_pct`, `promotion_flag`, `customer_id`, `payment_mode`, `hour`
- products: `product_id`, `category`, `sub_category`, `brand`, `mrp`, `cost_price`, `shelf_life_days`, `supplier_id`
- stores: `store_id`, `city`, `store_type`, `floor_area_sqft`, `avg_daily_customers`, `region`
- inventory: `date`, `store_id`, `product_id`, `opening`, `received`, `sold`, `closing`, `reorder_lvl`, `lead_days`
- external_factors: `date`, `city`, `temp_c`, `rain_mm`, `holiday`, `festival`, `weekend`, `local_event`

## Open issues / questions for user
- None. Entire StockSense project from Phase 0 to Phase 8 is complete, verified, and packaged.

## Next step
- Ready for demo / presentation. All tests passing (10/10), pipeline end-to-end verified (48.4s), frontend builds cleanly.

