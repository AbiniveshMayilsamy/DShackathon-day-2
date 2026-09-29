# STOCKSENSE: AGENT SPEC (READ FIRST, EVERY SESSION)

You are the coding agent for a hackathon project. Follow this file exactly.
If this file and your own ideas disagree, THIS FILE WINS.

---

## 0. HOW TO WORK (TOKEN + ACCURACY RULES)

1. At session start: read `PROGRESS.md` (if missing, create it from section 12). Then read ONLY the section of this spec for the current phase. Do not re-read the whole spec.
2. Work on ONE phase at a time. Never start the next phase unless the user says "next phase".
3. Before coding: write a plan of MAX 5 lines. Then code.
4. Edit files in place. NEVER rewrite a whole file to change a few lines.
5. Write code as `.py` scripts in `src/`. Do not generate long notebooks (see Phase 6).
6. Print MAX 10 rows of any dataframe. Never print full tables or long logs.
7. Run the code you write. Fix errors. Do not report "done" without a passing run.
8. After each phase: run its CHECK. Report in MAX 5 lines: what was done, CHECK result, files changed, open issues.
9. Update `PROGRESS.md` at the end of every phase (this is how a different model continues your work).
10. Do NOT write long explanations, summaries, README text, or comments unless asked. Short docstrings only.
11. If unsure about anything (column name, rule, choice): STOP and ask ONE short question. Never guess.

## 1. ANTI-HALLUCINATION RULES (STRICT)

- NEVER invent column names, file names, product IDs, store IDs, or numbers. Inspect the real CSVs first (`df.columns`, `df.head(3)`, `df.dtypes`) and use what exists.
- NEVER invent metric values, p-values, or results. Only report numbers produced by code you ran.
- NEVER claim a library function exists without checking (`pip show`, or run it). Use only the libraries in section 3.
- NEVER fabricate data to fill gaps. Missing data is handled only by the rules in Phase 1.
- If a required column is absent, tell the user. Do not create a fake substitute.
- Do not "improve" the design. No extra features, pages, endpoints, or libraries.

## 2. HARD "DO NOT" LIST

- NO deep learning. NO PyTorch, TensorFlow, Keras, LSTM, transformers.
- NO Logistic Regression (not on the allowed list).
- ONLY these algorithms: Linear Regression, Decision Tree, SVM, XGBoost, KNN, Naive Bayes, Random Forest.
- NO random `train_test_split`. Time-based split only.
- NO data leakage: any feature must use only data from dates BEFORE the prediction date (always `.shift(1)` before rolling).
- NO SMOTE or resampling on validation/test data. Training data only (prefer class weights instead).
- NO Express, NO Node backend, NO Streamlit. Backend is Python FastAPI only. Frontend is React (Vite) only.
- NO database server. Use parquet/CSV files (SQLite only if the user asks).
- NO Docker, NO cloud deploy, NO auth, unless the user asks.
- NO new folders outside the structure in section 4.
- NO deleting raw data. `data/raw/` is read-only.
- NO installing packages not in section 3 without asking.

## 3. FIXED STACK

Python: pandas, numpy, scipy, statsmodels, scikit-learn, xgboost, matplotlib, seaborn, plotly, joblib, pyarrow, fastapi, uvicorn, pydantic
Frontend: React + Vite + TypeScript, Tailwind CSS, Recharts, React Router, TanStack Query
Nothing else.

## 4. FOLDER STRUCTURE (DO NOT CHANGE)

```
STOCKSENSE_TEAMNAME/
  data/raw/            # 5 original CSVs (never edit)
  data/processed/      # master.csv, features.parquet, predictions.parquet
  notebooks/           # thin notebooks, created last
  src/                 # clean.py features.py stats.py train.py explain.py rules.py predict.py api.py
  models/              # demand_model.joblib, stockout_model.joblib, metrics.json, importance.json
  web/                 # React app
  reports/             # data_quality.csv, model_comparison.csv, stats_tests.csv, figures/
  PROGRESS.md
  README.md
  requirements.txt
```

## 5. PROJECT IN ONE PARAGRAPH

Retail company NovaMart, many stores. Build a system that (1) forecasts next 7-day demand per Store x Product, (2) predicts stock-out probability and labels risk HIGH/MEDIUM/LOW, (3) recommends a reorder quantity with plain-English reasons, (4) shows it on a web dashboard. A prediction without an action is incomplete.

## 6. DATA FILES (verify real columns first)

Expected files in `data/raw/`: `transactions.csv`, `products.csv`, `stores.csv`, `inventory.csv`, `external_factors.csv`.

Expected columns (VERIFY, may differ):
- transactions: transaction_id, date, store_id, product_id, quantity, selling_price, discount_pct, promotion_flag, customer_id, payment_mode, hour
- products: product_id, category, sub_category, brand, mrp, cost_price, shelf_life_days, supplier_id
- stores: store_id, city, store_type, floor_area_sqft, avg_daily_customers, region
- inventory: date, store, product, opening, received, sold, closing, reorder_lvl, lead_days (names may differ; map to store_id / product_id)
- external_factors: date, city, temp_c, rain_mm, holiday, festival, weekend, local_event

Master table grain: **ONE ROW = ONE date x ONE store x ONE product.** Must have zero duplicate (date, store_id, product_id).

---

## PHASE 1: CLEAN + MASTER TABLE (`src/clean.py`)

Steps, in order. Log each issue's count.

1. Load all 5 CSVs. Parse dates to datetime. Strip whitespace on all IDs. Uppercase IDs.
2. Duplicates: drop rows where ALL columns are identical (true duplicates only). Count them.
3. Categories: `str.strip().str.lower().str.title()` on category/sub_category. Then check unique values; merge obvious variants (e.g. Beverage/Beverages) using a mapping dict. Print unique list once.
4. Quantity: rows with quantity <= 0 are FLAGGED (`invalid_qty=1`) and EXCLUDED from demand. Count them.
5. Missing values: temp_c and rain_mm filled with city-wise median (fallback: global median). Other missing: report count, fill only if justified, else drop the row and log it.
6. Inventory check: `expected = opening + received - sold`. Flag rows where `closing != expected` as `inv_mismatch=1`. Count them. Do NOT silently correct. Keep flag column; for modelling use `closing` as given unless the mismatch is tiny (<=2 units), then use `expected`.
7. Sparse history: for each store-product, count days of data. If < 14 days, set `low_history=1`. Do not drop.
8. Aggregate transactions to date x store x product: `units_sold = sum(quantity where valid)`, `avg_price = mean(selling_price)`, `discount_pct = mean`, `promotion_flag = max`, `revenue = sum(quantity*selling_price)`.
9. Merge (LEFT joins onto the aggregated/inventory grain): products on product_id, stores on store_id, inventory on (date, store_id, product_id), external_factors on (date, city via stores).
10. Days with no sales but inventory row present: `units_sold = 0`.
11. Save `data/processed/master.csv`. Save `reports/data_quality.csv` with columns: `issue, count, action, justification`.

CHECK: master has 0 duplicate keys; no NaN in units_sold, closing, temp_c; data_quality.csv has one row per issue above (6+ rows). Print shapes only.

## PHASE 2: EDA + STATISTICS (`src/stats.py`, figures to `reports/figures/`)

Every chart answers a business question. Save as PNG. Max 8 figures:
1. Revenue share by category + Pareto (80/20)
2. Weekly revenue trend by store
3. Promo vs non-promo average units
4. Weekday vs weekend average units
5. Top 10 most volatile products (coefficient of variation = std/mean)
6. Stock-out heatmap: store x category
7. Category revenue trend (optional)

Stock-out (for EDA only, same as Phase 3 definition): `closing <= 0`.

Statistical tests (exactly 3). Save `reports/stats_tests.csv` with: `question, H0, H1, test, statistic, p_value, interpretation`.
1. Promotions increase units sold? Mann-Whitney U (one-sided, promo > non-promo).
2. Mean demand differs across store types? Kruskal-Wallis.
3. Stock-out associated with promotion? Chi-square test of independence.

Interpretation column = one plain business sentence. Use alpha = 0.05.

KPIs (compute and save to `reports/kpis.json`): revenue, units_sold, stockout_rate, inventory_turnover, days_of_inventory, promotion_lift, estimated_lost_sales.

CHECK: 3 rows in stats_tests.csv with real p-values; kpis.json has 7 keys; figures exist.

## PHASE 3: FEATURES + TARGETS (`src/features.py`)

Sort by (store_id, product_id, date). ALL operations per (store_id, product_id) group.

**Targets (future looking):**
- `next_7_day_demand` = sum of units_sold on days t+1 .. t+7 (drop rows where the full 7 days are not available).
- `stockout_flag` = 1 if `closing <= 0` on ANY day t+1..t+7, else 0.
- If stockout_flag positive rate is < 3%: use fallback `closing < 0.5 * reorder_lvl` on any of t+1..t+7. Write the choice and the rate in PROGRESS.md and tell the user.

**Features (use only info up to day t):**
- Time: day_of_week, is_weekend, month, week_of_year, festival_flag, holiday_flag
- Lag: lag_1, lag_7, lag_14 of units_sold
- Rolling (after shift(1)): rolling_mean_7, rolling_mean_14, rolling_std_7
- Growth: sales_growth_7 = rolling_mean_7 / (rolling_mean_14 + 1e-6)
- Inventory (day t values): closing, days_of_inventory = closing / (rolling_mean_7 + 1e-6), inventory_to_demand_ratio, reorder_gap = closing - reorder_lvl, lead_days, received
- Price/promo: discount_pct, price_change (avg_price minus lag_1 price), promotion_flag
- Static (encode: label/one-hot): store_type, category, brand, shelf_life_days
- Weather: temp_c, rain_mm, local_event
- Upcoming-day flags known in advance (calendar is known): `weekend_in_next_7`, `festival_in_next_7`. Allowed because the calendar is known ahead.

Drop rows with NaN lags (start of history). Save `data/processed/features.parquet`.

**Time split** by date (NOT random): first 70% of dates = train, next 15% = validation, last 15% = test. Store split boundaries in PROGRESS.md.

CHECK: no feature uses day > t (verify by test: recompute lag_1 for one row manually). Print split date ranges and target positive rate only.

## PHASE 4: MODELS (`src/train.py`)

**Model 1: demand regression, target = next_7_day_demand**
- Baseline: `rolling_mean_7 * 7`.
- Candidates: Linear Regression, Decision Tree, Random Forest, XGBoost, KNN. (Skip SVM if training exceeds a few minutes; note it.)
- Tune lightly on validation only. Report on test.
- Metrics: MAE, RMSE, MAPE (computed only where actual > 0), R2.
- Selected model MUST beat baseline on MAE. If not, tell the user.
- Save `reports/model_comparison.csv` (model, MAE, RMSE, MAPE, R2, split=test) and `models/demand_model.joblib`.

**Model 2: stock-out classification, target = stockout_flag**
- Input features: same features + `forecast_7d` from Model 1 (use out-of-fold or validation-safe predictions on train; never in-sample predictions).
- Candidates: Decision Tree, Random Forest, XGBoost, Naive Bayes, KNN.
- Imbalance: `class_weight="balanced"` or XGBoost `scale_pos_weight`.
- Metrics: Accuracy, Precision, Recall, F1, ROC-AUC, confusion matrix.
- Pick the model by Recall and ROC-AUC (missing a stock-out is costlier than a false alarm).
- Save `models/stockout_model.joblib`, `models/metrics.json` (both models, confusion matrix, residuals sample of 500 rows, ROC points).

Business reasons to write in `reports/model_comparison.csv` notes column (one sentence each): MAE = average units we are off; RMSE = punishes big misses; Recall = share of real stock-outs caught.

CHECK: comparison table exists with baseline row; selected model beats baseline; metrics.json loads; test set never used for tuning.

## PHASE 5: EXPLAIN + RULES + PREDICT

**`src/explain.py`**
- Global: permutation importance on validation set for the stock-out model. Save `models/importance.json` as list of `{feature, label, importance}`.
- Per-item: top 3 features for that row = highest (importance x abs standardized feature value), skipping features with zero effect.
- Plain-English mapping (extend only for real feature names):
```python
REASONS = {
 "promotion_flag": "Promotion running",
 "weekend_in_next_7": "Weekend approaching",
 "sales_growth_7": "Recent sales growth",
 "festival_in_next_7": "Local festival",
 "days_of_inventory": "Low stock cover",
 "reorder_gap": "Stock below reorder level",
 "temp_c": "Temperature change",
 "lead_days": "Long supplier lead time",
}
```

**`src/rules.py`** (exact formulas)
```
safety_stock = 1.65 * std_daily_demand * sqrt(lead_days)     # std from rolling_std_7
recommended_stock = forecast_7d + safety_stock
reorder_qty = max(0, ceil(recommended_stock - current_stock - incoming_stock))
risk = HIGH if p >= 0.70; MEDIUM if 0.40 <= p < 0.70; LOW if p < 0.40
action = HIGH: "Raise replenishment order today." MEDIUM: "Review stock; order within 2 days." LOW: "No action needed."
```
current_stock = latest closing. incoming_stock = latest received (or 0 if unknown; note assumption).

**`src/predict.py`**
- Use the LATEST date per store x product. Build features, run both models, apply rules, add top 3 reasons.
- Output `data/processed/predictions.parquet` columns: store_id, product_id, product_name (if available, else product_id), category, current_stock, incoming_stock, forecast_7d, stockout_prob, risk, reorder_qty, reasons (list of 3 strings), action, low_history.
- If `low_history=1`: fallback forecast = category-store mean; mark `confidence="low"`.

CHECK: predictions.parquet has one row per store x product; risk counts are printed; reorder_qty >= 0; every HIGH row has 3 reasons.

## PHASE 6: API (`src/api.py`, FastAPI)

Load models and parquet ONCE at startup. Add CORS for `http://localhost:5173`. Validate input with Pydantic. Run: `uvicorn src.api:app --port 8000`.

| Method | Path | Returns |
|---|---|---|
| GET | /health | {"status":"ok"} |
| GET | /summary | revenue, growth_pct, stockout_rate, inventory_value, products_at_risk |
| GET | /predictions?store=&risk=&category=&limit= | list of prediction rows |
| GET | /predictions/{store_id}/{product_id} | one prediction row |
| GET | /forecast/{store_id}/{product_id} | list of {date, actual, forecast} (test period) |
| GET | /model/metrics | contents of metrics.json + comparison |
| GET | /model/importance | contents of importance.json |
| POST | /whatif | body: {store_id, product_id, discount_pct?, supplier_delay_days?, festival?}; rebuild feature row with overrides, rerun both models + rules, return new forecast_7d, stockout_prob, risk, reorder_qty |
| GET | /export/orders.csv | CSV of rows where reorder_qty > 0 |

Response row example:
```json
{"store_id":"S01","product_id":"P101","current_stock":250,"incoming_stock":80,
 "forecast_7d":485,"stockout_prob":0.89,"risk":"HIGH","reorder_qty":180,
 "reasons":["Weekend approaching","Promotion running","Recent sales growth"],
 "action":"Raise replenishment order today."}
```

CHECK: `curl` each endpoint once; all return 200; /whatif changes output when discount or delay changes.

## PHASE 7: FRONTEND (`web/`, React + Vite)

Sidebar layout with 6 pages. Global filters: store, category. Use `web/src/api/client.ts` for all fetches (base URL `http://localhost:8000`). Show loading and error states. Colors: red (HIGH), amber (MEDIUM), green (LOW) only.

1. **Summary**: 5 KPI cards (Revenue, Growth %, Stock-out rate, Inventory value, Products at risk) + revenue trend line + category donut.
2. **Demand**: store + product dropdowns; line chart actual vs forecast; error bar.
3. **Risk**: store x category heatmap (grid, colored by risk share) + sortable table by probability.
4. **Actions (main page)**: top 10 HIGH-risk cards (store, product, forecast, stock, incoming, probability, risk badge, order qty, 3 reasons, action text); "Export order list" button (calls /export/orders.csv); What-If panel with sliders: discount %, supplier delay days, festival toggle; result updates via POST /whatif.
5. **Performance**: comparison table, confusion matrix grid, residual scatter, ROC curve.
6. **Explain**: importance bar chart with plain-English labels; "Why is this item at risk?" selector showing the 3 reasons.

Every number on screen gets a short "so what" line where it fits. No jargon in labels.

CHECK: `npm run build` passes; each page loads real data from the API; Actions page shows cards and the What-If panel works.

## PHASE 8: PACKAGING

1. `requirements.txt` (pip freeze of only the libraries in section 3).
2. `notebooks/`: create 3 THIN notebooks (`01_cleaning_eda.ipynb`, `02_features_models.ipynb`, `03_explain_results.ipynb`) that import from `src/`, run the steps, and show only summary tables and saved figures. No long outputs.
3. `README.md` (max 60 lines): problem, architecture in 5 lines, setup, run order, folder map, results table (real numbers), limitations.
4. Run order to document:
```
python src/clean.py
python src/stats.py
python src/features.py
python src/train.py
python src/predict.py
uvicorn src.api:app --port 8000
cd web && npm install && npm run dev
```
5. Final CHECK: fresh run of the run order works end to end.

---

## 11. LIMITATIONS TO STATE (do not hide)

- New products with under 14 days of history use a category-store fallback (flagged low confidence).
- Stock-out label definition is an operational choice (see Phase 3).
- Inventory mismatches are flagged, not silently fixed.

## 12. PROGRESS.md TEMPLATE (create if missing; update after every phase)

```
# PROGRESS
Current phase: 1
Model/agent last used: <name>

## Done
- (phase: one-line result, files)

## Decisions (with numbers)
- stockout definition: <used>, positive rate: <x%>
- split dates: train <a-b>, val <c-d>, test <e-f>
- selected models: <names>, key metric: <value>

## Real column names found
- transactions: ...
- inventory: ...

## Open issues / questions for user
- ...

## Next step
- ...
```

## 13. SESSION START PROMPTS (user pastes one)

- New session: `Read STOCKSENSE_AGENT_SPEC.md sections 0, 1, 2 and PROGRESS.md. Continue with the current phase only.`
- Start a phase: `Do PHASE N only. Plan in 5 lines, code, run CHECK, report in 5 lines, update PROGRESS.md.`
- After an error: `Fix only this error. Do not change anything else. Show the diff only.`
- If the agent drifts: `Stop. Re-read section 2 (DO NOT list). Undo anything that violates it.`
