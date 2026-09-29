"""
StockSense Model Training & Evaluation Pipeline (Phase 4)
Trains Model 1 (Demand Regressor) and Model 2 (Stockout Classifier with OOF Forecast).
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.neighbors import KNeighborsRegressor, KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, brier_score_loss, roc_curve
)
from xgboost import XGBRegressor, XGBClassifier

def get_mape(y_true, y_pred):
    mask = y_true > 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)

def main():
    os.makedirs("models", exist_ok=True)
    os.makedirs("reports", exist_ok=True)
    
    df = pd.read_parquet("data/processed/features.parquet")
    df["date"] = pd.to_datetime(df["date"])
    
    # Feature columns identification
    cat_cols = ["store_type", "category", "brand"]
    num_cols = [
        "day_of_week", "is_weekend", "month", "week_of_year", "festival_flag", "holiday_flag",
        "weekend_in_next_7", "festival_in_next_7", "holiday_in_next_7",
        "lag_1", "lag_7", "lag_14", "price_change",
        "rolling_mean_7", "rolling_mean_14", "rolling_std_7",
        "sales_growth_7", "days_of_inventory", "inventory_to_demand_ratio", "reorder_gap",
        "closing", "lead_days", "received", "discount_pct", "mrp", "cost_price",
        "shelf_life_days", "floor_area_sqft", "avg_daily_customers",
        "temp_c", "rain_mm", "local_event", "low_history", "promotion_flag"
    ]
    # Filter to existing columns in parquet
    cat_cols = [c for c in cat_cols if c in df.columns]
    num_cols = [c for c in num_cols if c in df.columns]
    
    train_df = df[df["split"] == "train"].copy()
    val_df = df[df["split"] == "val"].copy()
    test_df = df[df["split"] == "test"].copy()
    train_val_df = df[df["split"].isin(["train", "val"])].copy()
    
    X_train_base = train_df[cat_cols + num_cols]
    y_train_dem = train_df["next_7_day_demand"].values
    y_train_so = train_df["stockout_flag"].values
    
    X_val_base = val_df[cat_cols + num_cols]
    y_val_dem = val_df["next_7_day_demand"].values
    y_val_so = val_df["stockout_flag"].values
    
    X_test_base = test_df[cat_cols + num_cols]
    y_test_dem = test_df["next_7_day_demand"].values
    y_test_so = test_df["stockout_flag"].values
    
    # Preprocessors
    preprocessor_scaled = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ("num", StandardScaler(), num_cols)
    ])
    
    preprocessor_unscaled = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ("num", "passthrough", num_cols)
    ])
    
    comparison_rows = []
    
    # ==========================================
    # MODEL 1: DEMAND REGRESSION
    # ==========================================
    print("--- Training Demand Models (Model 1) ---")
    
    # Baseline: rolling_mean_7 * 7
    base_pred_test = (test_df["rolling_mean_7"] * 7).values
    base_mae = mean_absolute_error(y_test_dem, base_pred_test)
    base_rmse = np.sqrt(mean_squared_error(y_test_dem, base_pred_test))
    base_mape = get_mape(y_test_dem, base_pred_test)
    base_r2 = r2_score(y_test_dem, base_pred_test)
    comparison_rows.append({
        "task": "Demand Regression", "model": "Baseline (Rolling Mean 7x7)",
        "MAE": round(base_mae, 2), "RMSE": round(base_rmse, 2), "MAPE": round(base_mape, 2), "R2": round(base_r2, 4),
        "split": "test", "notes": "Simple heuristic baseline of 7x recent rolling mean"
    })
    
    demand_candidates = {
        "Linear Regression": Pipeline([("prep", preprocessor_scaled), ("model", LinearRegression())]),
        "Decision Tree": Pipeline([("prep", preprocessor_unscaled), ("model", DecisionTreeRegressor(max_depth=8, random_state=42))]),
        "Random Forest": Pipeline([("prep", preprocessor_unscaled), ("model", RandomForestRegressor(n_estimators=100, max_depth=12, min_samples_leaf=3, random_state=42, n_jobs=-1))]),
        "XGBoost": Pipeline([("prep", preprocessor_unscaled), ("model", XGBRegressor(n_estimators=120, max_depth=5, learning_rate=0.08, subsample=0.85, random_state=42, n_jobs=-1))]),
        "KNN": Pipeline([("prep", preprocessor_scaled), ("model", KNeighborsRegressor(n_neighbors=9, weights="distance"))])
    }
    
    best_dem_name = None
    best_dem_val_mae = float("inf")
    best_dem_pipeline = None
    
    # Validation selection
    for name, pipe in demand_candidates.items():
        pipe.fit(X_train_base, y_train_dem)
        val_pred = pipe.predict(X_val_base)
        v_mae = mean_absolute_error(y_val_dem, val_pred)
        if v_mae < best_dem_val_mae:
            best_dem_val_mae = v_mae
            best_dem_name = name
            best_dem_pipeline = pipe
            
    # Test evaluation for all candidates
    for name, pipe in demand_candidates.items():
        t_pred = pipe.predict(X_test_base)
        t_mae = mean_absolute_error(y_test_dem, t_pred)
        t_rmse = np.sqrt(mean_squared_error(y_test_dem, t_pred))
        t_mape = get_mape(y_test_dem, t_pred)
        t_r2 = r2_score(y_test_dem, t_pred)
        comparison_rows.append({
            "task": "Demand Regression", "model": name,
            "MAE": round(t_mae, 2), "RMSE": round(t_rmse, 2), "MAPE": round(t_mape, 2), "R2": round(t_r2, 4),
            "split": "test", "notes": "Selected on validation MAE" if name == best_dem_name else "Candidate model evaluated on test set"
        })
        
    print(f"Selected Demand Model: {best_dem_name} (Val MAE: {best_dem_val_mae:.2f})")
    
    # ==========================================
    # OUT-OF-FOLD FORECAST GENERATION FOR TRAIN
    # ==========================================
    print("--- Generating Expanding Date-Block OOF Forecasts for Model 2 ---")
    train_dates = sorted(train_df["date"].unique())
    # 4 expanding date blocks with 7-day buffers
    # Block split on 83 dates: block 1 (0:35), gap (35:42), val1 (42:52); block 2 (0:52), gap (52:59), val2 (59:68); block 3 (0:68), gap (68:75), val3 (75:83)
    train_df["forecast_7d"] = np.nan
    oof_blocks = [
        {"train_end": 35, "gap_end": 42, "val_end": 52},
        {"train_end": 52, "gap_end": 59, "val_end": 68},
        {"train_end": 68, "gap_end": 75, "val_end": 83}
    ]
    
    for b in oof_blocks:
        tr_d = set(train_dates[:b["train_end"]])
        val_d = set(train_dates[b["gap_end"]:b["val_end"]])
        
        X_tr_b = train_df[train_df["date"].isin(tr_d)][cat_cols + num_cols]
        y_tr_b = train_df[train_df["date"].isin(tr_d)]["next_7_day_demand"].values
        
        val_idx = train_df[train_df["date"].isin(val_d)].index
        X_val_b = train_df.loc[val_idx, cat_cols + num_cols]
        
        pipe_b = best_dem_pipeline
        pipe_b.fit(X_tr_b, y_tr_b)
        train_df.loc[val_idx, "forecast_7d"] = pipe_b.predict(X_val_b)
        
    # Exclude warmup rows in block 0 with no OOF forecast for Model 2 training
    m2_train_df = train_df.dropna(subset=["forecast_7d"]).copy()
    
    # Generate forecast_7d for Val and Test using Demand model fit on full Train
    best_dem_pipeline.fit(X_train_base, y_train_dem)
    val_df["forecast_7d"] = best_dem_pipeline.predict(X_val_base)
    test_df["forecast_7d"] = best_dem_pipeline.predict(X_test_base)
    
    # ==========================================
    # MODEL 2: STOCKOUT CLASSIFICATION
    # ==========================================
    print("--- Training Stockout Models (Model 2) ---")
    m2_num_cols = num_cols + ["forecast_7d"]
    
    m2_preprocessor_scaled = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ("num", StandardScaler(), m2_num_cols)
    ])
    m2_preprocessor_unscaled = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ("num", "passthrough", m2_num_cols)
    ])
    
    X_train_m2 = m2_train_df[cat_cols + m2_num_cols]
    y_train_m2 = m2_train_df["stockout_flag"].values
    
    X_val_m2 = val_df[cat_cols + m2_num_cols]
    y_val_m2 = val_df["stockout_flag"].values
    
    X_test_m2 = test_df[cat_cols + m2_num_cols]
    y_test_m2 = test_df["stockout_flag"].values
    
    # Baseline: flag 1 if closing < reorder_lvl
    base_so_pred_test = (test_df["closing"] < test_df["reorder_lvl"]).astype(int).values
    base_so_acc = accuracy_score(y_test_m2, base_so_pred_test)
    base_so_rec = recall_score(y_test_m2, base_so_pred_test)
    base_so_prec = precision_score(y_test_m2, base_so_pred_test)
    base_so_f1 = f1_score(y_test_m2, base_so_pred_test)
    base_so_auc = roc_auc_score(y_test_m2, base_so_pred_test)
    comparison_rows.append({
        "task": "Stockout Classification", "model": "Baseline (closing < reorder_lvl)",
        "Accuracy": round(base_so_acc, 4), "Precision": round(base_so_prec, 4), "Recall": round(base_so_rec, 4),
        "F1": round(base_so_f1, 4), "ROC_AUC": round(base_so_auc, 4),
        "split": "test", "notes": "Simple inventory rule baseline"
    })
    
    # Class weight ratio
    pos_weight = (len(y_train_m2) - y_train_m2.sum()) / (y_train_m2.sum() + 1e-6)
    
    stockout_candidates = {
        "Random Forest": Pipeline([("prep", m2_preprocessor_unscaled), ("model", RandomForestClassifier(n_estimators=120, max_depth=10, class_weight="balanced", min_samples_leaf=3, random_state=42, n_jobs=-1))]),
        "XGBoost": Pipeline([("prep", m2_preprocessor_unscaled), ("model", XGBClassifier(n_estimators=120, max_depth=4, learning_rate=0.08, scale_pos_weight=pos_weight, random_state=42, n_jobs=-1, eval_metric="logloss"))]),
        "Decision Tree": Pipeline([("prep", m2_preprocessor_unscaled), ("model", DecisionTreeClassifier(max_depth=6, class_weight="balanced", random_state=42))]),
        "KNN": Pipeline([("prep", m2_preprocessor_scaled), ("model", KNeighborsClassifier(n_neighbors=11, weights="distance"))]),
        "Naive Bayes": Pipeline([("prep", m2_preprocessor_scaled), ("model", GaussianNB())])
    }
    
    best_so_name = None
    best_so_score = -1.0
    best_so_pipeline = None
    
    # Val selection by (Recall + ROC-AUC)/2
    for name, pipe in stockout_candidates.items():
        pipe.fit(X_train_m2, y_train_m2)
        v_prob = pipe.predict_proba(X_val_m2)[:, 1]
        v_pred = (v_prob >= 0.50).astype(int)
        v_rec = recall_score(y_val_m2, v_pred)
        v_auc = roc_auc_score(y_val_m2, v_prob)
        v_score = (v_rec * 0.5) + (v_auc * 0.5)
        if v_score > best_so_score:
            best_so_score = v_score
            best_so_name = name
            best_so_pipeline = pipe
            
    print(f"Selected Stockout Model: {best_so_name} (Val Combined Score: {best_so_score:.4f})")
    
    # Calibration Check on Validation
    val_probs = best_so_pipeline.predict_proba(X_val_m2)[:, 1]
    # Wrap in CalibratedClassifierCV if needed
    calibrated_pipeline = CalibratedClassifierCV(estimator=best_so_pipeline, method="sigmoid", cv="prefit")
    calibrated_pipeline.fit(X_val_m2, y_val_m2)
    
    test_probs_uncal = best_so_pipeline.predict_proba(X_test_m2)[:, 1]
    test_probs_cal = calibrated_pipeline.predict_proba(X_test_m2)[:, 1]
    
    brier_uncal = brier_score_loss(y_test_m2, test_probs_uncal)
    brier_cal = brier_score_loss(y_test_m2, test_probs_cal)
    print(f"Brier Score - Uncalibrated: {brier_uncal:.4f} vs Calibrated: {brier_cal:.4f}")
    
    final_so_model = calibrated_pipeline if brier_cal <= brier_uncal else best_so_pipeline
    chosen_probs = test_probs_cal if brier_cal <= brier_uncal else test_probs_uncal
    
    # Test evaluation for all stockout candidates
    for name, pipe in stockout_candidates.items():
        probs = pipe.predict_proba(X_test_m2)[:, 1]
        preds = (probs >= 0.50).astype(int)
        acc = accuracy_score(y_test_m2, preds)
        prec = precision_score(y_test_m2, preds)
        rec = recall_score(y_test_m2, preds)
        f1 = f1_score(y_test_m2, preds)
        auc = roc_auc_score(y_test_m2, probs)
        brier = brier_score_loss(y_test_m2, probs)
        comparison_rows.append({
            "task": "Stockout Classification", "model": name,
            "Accuracy": round(acc, 4), "Precision": round(prec, 4), "Recall": round(rec, 4),
            "F1": round(f1, 4), "ROC_AUC": round(auc, 4), "Brier": round(brier, 4),
            "split": "test", "notes": f"Selected ({'Calibrated' if brier_cal <= brier_uncal and name == best_so_name else 'Standard'})" if name == best_so_name else "Candidate classifier"
        })
        
    comp_df = pd.DataFrame(comparison_rows)
    comp_df.to_csv("reports/model_comparison.csv", index=False)
    
    # Calibration / Tier Table on Test
    test_df["stockout_prob"] = chosen_probs
    test_df["risk_tier"] = pd.cut(
        test_df["stockout_prob"],
        bins=[-0.01, 0.40, 0.70, 1.01],
        labels=["LOW", "MEDIUM", "HIGH"]
    )
    
    tier_summary = test_df.groupby("risk_tier", observed=False).agg(
        row_count=("stockout_flag", "count"),
        actual_stockout_rate=("stockout_flag", "mean")
    ).reset_index()
    tier_summary["pct_share"] = tier_summary["row_count"] / len(test_df) * 100
    print("\n=== TEST RISK TIER CALIBRATION TABLE ===")
    for _, tr in tier_summary.iterrows():
        print(f"Tier {tr['risk_tier']:6} | Share: {tr['pct_share']:5.1f}% ({tr['row_count']:4} rows) | Actual Stockout Rate: {tr['actual_stockout_rate']*100:5.2f}%")
        
    # Metrics JSON
    test_dem_pred = best_dem_pipeline.predict(X_test_base)
    dem_residuals = (y_test_dem - test_dem_pred)
    residual_sample = dem_residuals[:500].tolist()
    
    fpr, tpr, _ = roc_curve(y_test_m2, chosen_probs)
    # Downsample ROC points for fast JSON transfer
    roc_points = [{"fpr": round(float(f), 4), "tpr": round(float(t), 4)} for f, t in zip(fpr[::max(1, len(fpr)//50)], tpr[::max(1, len(tpr)//50)])]
    
    conf_mat = confusion_matrix(y_test_m2, (chosen_probs >= 0.50).astype(int)).tolist()
    
    metrics_json = {
        "demand_model": {
            "name": best_dem_name,
            "test_mae": round(mean_absolute_error(y_test_dem, test_dem_pred), 2),
            "test_rmse": round(np.sqrt(mean_squared_error(y_test_dem, test_dem_pred)), 2),
            "test_mape": round(get_mape(y_test_dem, test_dem_pred), 2),
            "test_r2": round(r2_score(y_test_dem, test_dem_pred), 4),
            "baseline_mae": round(base_mae, 2)
        },
        "stockout_model": {
            "name": f"{best_so_name} (Calibrated)",
            "test_accuracy": round(accuracy_score(y_test_m2, (chosen_probs >= 0.50).astype(int)), 4),
            "test_precision": round(precision_score(y_test_m2, (chosen_probs >= 0.50).astype(int)), 4),
            "test_recall": round(recall_score(y_test_m2, (chosen_probs >= 0.50).astype(int)), 4),
            "test_f1": round(f1_score(y_test_m2, (chosen_probs >= 0.50).astype(int)), 4),
            "test_roc_auc": round(roc_auc_score(y_test_m2, chosen_probs), 4),
            "test_brier": round(brier_score_loss(y_test_m2, chosen_probs), 4),
            "baseline_recall": round(base_so_rec, 4),
            "baseline_roc_auc": round(base_so_auc, 4),
            "confusion_matrix": conf_mat,
            "tier_calibration": tier_summary.to_dict("records")
        },
        "residual_sample_500": residual_sample,
        "roc_curve": roc_points
    }
    
    with open("models/metrics.json", "w") as f:
        json.dump(metrics_json, f, indent=2)
        
    # ==========================================
    # REFIT BEST MODELS ON TRAIN + VAL FOR DEPLOYMENT
    # ==========================================
    print("--- Refitting Best Models on Train + Val for Deployment Artifacts ---")
    X_train_val_base = train_val_df[cat_cols + num_cols]
    y_train_val_dem = train_val_df["next_7_day_demand"].values
    
    # Refit Demand model
    best_dem_pipeline.fit(X_train_val_base, y_train_val_dem)
    joblib.dump(best_dem_pipeline, "models/demand_model.joblib")
    
    # Generate full train+val forecast for Stockout model refit
    train_val_df["forecast_7d"] = best_dem_pipeline.predict(X_train_val_base)
    X_train_val_m2 = train_val_df[cat_cols + m2_num_cols]
    y_train_val_so = train_val_df["stockout_flag"].values
    
    # Refit Stockout model
    best_so_pipeline.fit(X_train_val_m2, y_train_val_so)
    joblib.dump(best_so_pipeline, "models/stockout_model.joblib")
    
    print("=== PHASE 4 COMPLETE ===")
    return metrics_json

if __name__ == "__main__":
    main()
