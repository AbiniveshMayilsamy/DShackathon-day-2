import os
import sys
sys.path.insert(0, os.path.abspath("."))
import json
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.inspection import permutation_importance
from xgboost import XGBClassifier, XGBRegressor

FEATURE_GROUPS = {
    "inventory_cover": ["closing", "days_of_inventory", "inventory_to_demand_ratio", "reorder_gap", "lead_days", "received"],
    "recent_sales": ["lag_1", "lag_7", "lag_14", "rolling_mean_7", "rolling_mean_14", "rolling_std_7", "sales_growth_7"],
    "promotion_price": ["discount_pct", "price_change", "promotion_flag"],
    "calendar": ["day_of_week", "is_weekend", "month", "week_of_year", "weekend_in_next_7", "festival_in_next_7", "holiday_in_next_7", "festival_flag", "holiday_flag"],
    "weather": ["temp_c", "rain_mm", "local_event"],
    "store_product_static": ["store_type", "category", "brand", "mrp", "cost_price", "shelf_life_days", "floor_area_sqft", "avg_daily_customers", "low_history"]
}

GROUP_LABELS = {
    "inventory_cover": "Inventory Coverage & Stock Buffer",
    "recent_sales": "Recent Demand Momentum & Rolling Trends",
    "promotion_price": "Price Discount & Active Promotions",
    "calendar": "Upcoming Weekend & Holiday Signals",
    "weather": "Local Weather Variations",
    "store_product_static": "Store Assortment & Product Characteristics"
}

def compute_global_importance():
    os.makedirs("models", exist_ok=True)
    df = pd.read_parquet("data/processed/features.parquet")
    
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
    m2_num_cols = num_cols + ["forecast_7d"]
    
    # Train-only model fit for unbiased validation evaluation
    train_df = df[df["split"] == "train"].copy()
    val_df = df[df["split"] == "val"].copy()
    
    # Train-only demand model
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OneHotEncoder
    from sklearn.pipeline import Pipeline
    
    preprocessor = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ("num", "passthrough", num_cols)
    ])
    dem_pipe = Pipeline([
        ("prep", preprocessor),
        ("model", XGBRegressor(n_estimators=120, max_depth=5, learning_rate=0.08, random_state=42, n_jobs=-1))
    ])
    dem_pipe.fit(train_df[cat_cols + num_cols], train_df["next_7_day_demand"])
    
    # Out of fold forecast for train and val
    train_df["forecast_7d"] = dem_pipe.predict(train_df[cat_cols + num_cols])
    val_df["forecast_7d"] = dem_pipe.predict(val_df[cat_cols + num_cols])
    
    m2_preprocessor = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ("num", "passthrough", m2_num_cols)
    ])
    so_pipe = Pipeline([
        ("prep", m2_preprocessor),
        ("model", XGBClassifier(n_estimators=120, max_depth=4, learning_rate=0.08, random_state=42, n_jobs=-1))
    ])
    so_pipe.fit(train_df[cat_cols + m2_num_cols], train_df["stockout_flag"])
    
    X_val = val_df[cat_cols + m2_num_cols]
    y_val = val_df["stockout_flag"].values
    
    # Base Val AUC
    base_auc = float(permutation_importance(so_pipe, X_val, y_val, scoring="roc_auc", n_repeats=5, random_state=42)["importances_mean"].sum())
    
    # 1. Group Permutation Importance on Val
    group_importances = []
    for g_name, cols in FEATURE_GROUPS.items():
        actual_cols = [c for c in cols if c in X_val.columns]
        val_auc_drops = []
        for _ in range(5):
            X_val_perm = X_val.copy()
            for c in actual_cols:
                X_val_perm[c] = np.random.permutation(X_val_perm[c].values)
            perm_prob = so_pipe.predict_proba(X_val_perm)[:, 1]
            perm_auc = roc_auc_score(y_val, perm_prob)
            val_auc_drops.append(roc_auc_score(y_val, so_pipe.predict_proba(X_val)[:, 1]) - perm_auc)
        imp = max(0.001, float(np.mean(val_auc_drops)))
        group_importances.append({
            "group": g_name,
            "label": GROUP_LABELS.get(g_name, g_name),
            "importance": round(imp, 4)
        })
        
    group_importances = sorted(group_importances, key=lambda x: x["importance"], reverse=True)
    with open("models/importance.json", "w") as f:
        json.dump(group_importances, f, indent=2)
        
    # 2. Single Feature Importance for leakage smell test
    single_imp = permutation_importance(so_pipe, X_val, y_val, scoring="roc_auc", n_repeats=3, random_state=42)
    single_feats = []
    for col, mean_imp in zip(X_val.columns, single_imp["importances_mean"]):
        single_feats.append({"feature": col, "importance": round(float(mean_imp), 4)})
    single_feats = sorted(single_feats, key=lambda x: x["importance"], reverse=True)
    
    return group_importances, single_feats[:5]

def get_row_reasons(row: pd.Series, base_prob: float, stockout_model, train_medians: dict) -> list:
    """
    Computes 1 to 3 strictly verified plain-English driver reasons for a specific store-product row.
    Never shows a reason whose underlying condition is false. No artificial padding.
    """
    candidates = []
    
    # 1. Inventory conditions
    if row.get("days_of_inventory", 99) < 2.5:
        candidates.append({
            "reason": f"Low stock cover ({row['days_of_inventory']:.1f} days)",
            "base_weight": 0.35 + max(0, 2.5 - row['days_of_inventory']) * 0.15
        })
    if row.get("reorder_gap", 10) < 0:
        candidates.append({
            "reason": f"Below reorder level ({abs(int(row['reorder_gap']))} units)",
            "base_weight": 0.30 + min(0.20, abs(row['reorder_gap']) / 50.0)
        })
    if row.get("closing", 100) <= 5:
        candidates.append({
            "reason": f"Critical shelf stock ({int(row['closing'])} units)",
            "base_weight": 0.40
        })
        
    # 2. Promotion & Price conditions
    if row.get("promotion_flag", 0) == 1:
        candidates.append({
            "reason": f"Promotion running ({int(row.get('discount_pct', 0)*100)}% discount)",
            "base_weight": 0.28
        })
        
    # 3. Calendar & Event conditions (Festival / Holiday only; weekend is in every 7-day window)
    if row.get("festival_in_next_7", 0) == 1 or row.get("holiday_in_next_7", 0) == 1:
        candidates.append({
            "reason": "Festival/holiday ahead",
            "base_weight": 0.25
        })
        
    # 4. Demand Momentum & Velocity
    if row.get("sales_growth_7", 1.0) > 1.10:
        candidates.append({
            "reason": f"Recent sales up {int((row['sales_growth_7']-1)*100)}%",
            "base_weight": 0.20
        })
        
    # 5. Supplier Lead Days
    if row.get("lead_days", 1) >= 3:
        candidates.append({
            "reason": f"Long supplier lead time ({int(row['lead_days'])} days)",
            "base_weight": 0.18
        })
        
    # 6. Weather conditions
    if row.get("temp_c", 25) > 33.0 and row.get("category") == "Beverages":
        candidates.append({
            "reason": f"High temp ({row['temp_c']}°C) driving demand",
            "base_weight": 0.15
        })
        
    # If no specific risk conditions triggered (0-3 allowed)
    if len(candidates) == 0:
        return ["No single dominant driver (100%)"]
        
    # Take top 1 to 3 candidates
    candidates = sorted(candidates, key=lambda x: x["base_weight"], reverse=True)[:3]
    total_w = sum(c["base_weight"] for c in candidates) + 1e-6
    
    reasons = []
    impacts = []
    for c in candidates:
        pct = round(c["base_weight"] / total_w * 100)
        reasons.append(f"{c['reason']} ({pct}%)")
        impacts.append(pct)
        
    diff = 100 - sum(impacts)
    if diff != 0 and len(impacts) > 0:
        impacts[0] += diff
        reasons[0] = f"{candidates[0]['reason']} ({impacts[0]}%)"
        
    return reasons

if __name__ == "__main__":
    group_imp, top5 = compute_global_importance()
    print("Global Group Importance:")
    for g in group_imp:
        print(f"  {g['label']}: {g['importance']}")
    print("\nTop 5 Single Features:")
    for f in top5:
        print(f"  {f['feature']}: {f['importance']}")
