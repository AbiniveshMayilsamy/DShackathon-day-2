import os
import sys
sys.path.insert(0, os.path.abspath("."))
import joblib
import numpy as np
import pandas as pd
from src.features import build_features
from src.rules import compute_inventory_rules
from src.explain import get_row_reasons

def generate_predictions():
    os.makedirs("data/processed", exist_ok=True)
    
    # 1. Load Master Table
    master = pd.read_csv("data/processed/master.csv")
    master["date"] = pd.to_datetime(master["date"])
    
    # 2. Build Features with with_target=False on master
    # This prevents the 7-day drop and computes day-t features up to the true latest date (2026-09-30)
    feat_all = build_features(master, with_target=False)
    
    # Filter to true latest date per store x product
    latest_dates = feat_all.groupby(["store_id", "product_id"])["date"].transform("max")
    latest_df = feat_all[feat_all["date"] == latest_dates].copy().reset_index(drop=True)
    
    # 3. Load Trained Model Artifacts
    dem_model = joblib.load("models/demand_model.joblib")
    so_model = joblib.load("models/stockout_model.joblib")
    
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
    
    # 4. Model 1 Inference (Demand Forecast)
    X_dem = latest_df[cat_cols + num_cols]
    dem_preds = dem_model.predict(X_dem)
    latest_df["forecast_7d_model"] = np.maximum(0, dem_preds)
    
    # Low history fallback (category-store mean demand)
    cat_store_means = master.groupby(["store_id", "category"])["units_sold"].mean().reset_index()
    cat_store_means["fallback_7d"] = cat_store_means["units_sold"] * 7
    latest_df = pd.merge(latest_df, cat_store_means[["store_id", "category", "fallback_7d"]], on=["store_id", "category"], how="left")
    latest_df["forecast_7d"] = np.where(
        latest_df["low_history"] == 1,
        latest_df["fallback_7d"],
        latest_df["forecast_7d_model"]
    )
    latest_df["forecast_7d"] = np.round(latest_df["forecast_7d"], 1)
    latest_df["confidence"] = np.where(latest_df["low_history"] == 1, "low", "high")
    
    # 5. Model 2 Inference (Stockout Probability)
    m2_num_cols = num_cols + ["forecast_7d"]
    X_so = latest_df[cat_cols + m2_num_cols]
    so_probs = so_model.predict_proba(X_so)[:, 1]
    latest_df["stockout_prob"] = np.round(so_probs, 4)
    
    # 6. Apply Rules & Prescriptions
    results = []
    for _, row in latest_df.iterrows():
        # Spec rule: incoming_stock = 0 (pipeline inventory not in data; received is in closing)
        incoming_stock = 0.0
        current_stock = float(row["closing"])
        lead_days = int(row["lead_days"])
        rolling_std_7 = float(row.get("rolling_std_7", 0.0))
        
        rules_res = compute_inventory_rules(
            forecast_7d=row["forecast_7d"],
            rolling_std_7=rolling_std_7,
            lead_days=lead_days,
            current_stock=current_stock,
            incoming_stock=incoming_stock,
            stockout_prob=row["stockout_prob"]
        )
        
        # Explainability top 3 verified reasons
        reasons = get_row_reasons(row, row["stockout_prob"], so_model, {})
        
        # Priority score for ranking action cards: stockout_prob * forecast_7d * avg_price
        priority_score = round(float(row["stockout_prob"]) * float(row["forecast_7d"]) * float(row["avg_price"]), 2)
        
        results.append({
            "store_id": row["store_id"],
            "product_id": row["product_id"],
            "product_name": row.get("product_name", row["product_id"]),
            "category": row["category"],
            "current_stock": int(current_stock),
            "incoming_stock": int(incoming_stock),
            "forecast_7d": float(row["forecast_7d"]),
            "stockout_prob": float(row["stockout_prob"]),
            "risk": rules_res["risk"],
            "reorder_qty": rules_res["reorder_qty"],
            "reasons": reasons,
            "action": rules_res["action"],
            "priority_score": priority_score,
            "confidence": row["confidence"],
            "low_history": int(row["low_history"]),
            "avg_price": round(float(row["avg_price"]), 2),
            "date": row["date"].strftime("%Y-%m-%d")
        })
        
    pred_df = pd.DataFrame(results)
    pred_df.to_parquet("data/processed/predictions.parquet", index=False)
    
    print(f"Predictions saved: {len(pred_df)} rows to data/processed/predictions.parquet")
    print(f"Risk Counts:\n{pred_df['risk'].value_counts()}")
    return pred_df

if __name__ == "__main__":
    generate_predictions()
