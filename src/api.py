"""
StockSense FastAPI Backend Service (Phase 6)
Serves predictions, real-time what-if scenario simulations, model performance telemetry, and order exports.
"""

import os
import io
import sys
sys.path.insert(0, os.path.abspath("."))
import json
import joblib
import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.features import build_features
from src.rules import compute_inventory_rules
from src.explain import get_row_reasons

from contextlib import asynccontextmanager

MODELS = {}
DATA = {}

def load_artifacts():
    if "demand" in MODELS:
        return
    print("Loading models and datasets into memory...")
    MODELS["demand"] = joblib.load("models/demand_model.joblib")
    MODELS["stockout"] = joblib.load("models/stockout_model.joblib")
    
    with open("models/metrics.json") as f:
        MODELS["metrics"] = json.load(f)
    with open("models/importance.json") as f:
        MODELS["importance"] = json.load(f)
    if os.path.exists("reports/tier_calibration.json"):
        with open("reports/tier_calibration.json") as f:
            MODELS["tier_calibration"] = json.load(f)
            
    DATA["master"] = pd.read_csv("data/processed/master.csv")
    DATA["master"]["date"] = pd.to_datetime(DATA["master"]["date"])
    DATA["predictions"] = pd.read_parquet("data/processed/predictions.parquet")
    if os.path.exists("reports/test_predictions.parquet"):
        DATA["test_predictions"] = pd.read_parquet("reports/test_predictions.parquet")
        DATA["test_predictions"]["date"] = pd.to_datetime(DATA["test_predictions"]["date"])
    if os.path.exists("reports/model_comparison.csv"):
        DATA["comparison"] = pd.read_csv("reports/model_comparison.csv").to_dict("records")
    print("Startup load complete.")

# Initialize on import for TestClient
load_artifacts()

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_artifacts()
    yield

app = FastAPI(
    title="StockSense API",
    version="1.0.0",
    description="Prescriptive Inventory & Demand Intelligence API",
    lifespan=lifespan
)

# CORS middleware for local Vite and alternative frontend ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Pydantic Request & Response Schemas
# -------------------------------------------------------------
class WhatIfRequest(BaseModel):
    store_id: str
    product_id: str
    discount_pct: Optional[float] = Field(None, ge=0.0, le=0.50, description="Promotional discount (0.0 to 0.50)")
    supplier_delay_days: Optional[int] = Field(None, ge=0, le=7, description="Supplier lead time delay days (0 to 7)")
    festival: Optional[int] = Field(None, ge=0, le=1, description="Toggle upcoming festival flag (0 or 1)")

class WhatIfResponse(BaseModel):
    store_id: str
    product_id: str
    baseline: Dict[str, Any]
    simulated: Dict[str, Any]
    deltas: Dict[str, Any]

# -------------------------------------------------------------
# REST Endpoints
# -------------------------------------------------------------

def sanitize_data(data):
    """Recursively converts numpy types and NaN values to JSON-safe Python primitives."""
    if isinstance(data, dict):
        return {k: sanitize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_data(v) for v in data]
    elif isinstance(data, np.ndarray):
        return [sanitize_data(v) for v in data.tolist()]
    elif isinstance(data, (np.floating, float)):
        return None if np.isnan(data) or np.isinf(data) else float(data)
    elif isinstance(data, (np.integer, int)):
        return int(data)
    elif isinstance(data, (np.bool_, bool)):
        return bool(data)
    elif pd.isna(data):
        return None
    return data

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/summary")
def get_executive_summary():
    master = DATA["master"]
    pred = DATA["predictions"]
    
    total_rev = float(master["revenue"].sum())
    
    # Growth pct: last 28 days vs prior 28 days
    max_dt = master["date"].max()
    last_28_start = max_dt - pd.Timedelta(days=27)
    prior_28_start = last_28_start - pd.Timedelta(days=28)
    
    rev_last_28 = master[master["date"] >= last_28_start]["revenue"].sum()
    rev_prior_28 = master[(master["date"] >= prior_28_start) & (master["date"] < last_28_start)]["revenue"].sum()
    
    growth_pct = round(float((rev_last_28 - rev_prior_28) / (rev_prior_28 + 1e-6) * 100), 2)
    
    # Stockout rate in master
    stockout_rate = round(float((master["closing"] <= 0).mean()), 4)
    
    # Inventory value on latest date
    latest_dt = master["date"].max()
    latest_inv = master[master["date"] == latest_dt]
    inv_val = round(float((latest_inv["closing"] * latest_inv["cost_price"]).sum()), 2)
    
    # Products at risk (HIGH risk count)
    products_at_risk = int((pred["risk"] == "HIGH").sum())
    
    # Chart data: weekly revenue by store (last 12 weeks)
    master["week"] = master["date"].dt.to_period("W").dt.start_time
    weekly_rev = master.groupby(["week", "store_id"])["revenue"].sum().reset_index()
    weekly_rev_list = []
    for week, grp in weekly_rev.groupby("week"):
        entry = {"week": week.strftime("%Y-%m-%d")}
        for _, row in grp.iterrows():
            entry[row["store_id"]] = round(float(row["revenue"]), 2)
        weekly_rev_list.append(entry)
    weekly_rev_list = sorted(weekly_rev_list, key=lambda x: x["week"])
    
    # Category revenue share (all time)
    cat_rev = master.groupby("category")["revenue"].sum()
    cat_total = cat_rev.sum()
    category_revenue_share = [
        {"category": c, "revenue": round(float(v), 2), "pct": round(float(v / cat_total * 100), 2)}
        for c, v in cat_rev.items()
    ]
    
    # Weekly units sold by category (last 12 weeks)
    weekly_units = master.groupby(["week", "category"])["units_sold"].sum().reset_index()
    weekly_units_list = []
    for week, grp in weekly_units.groupby("week"):
        entry = {"week": week.strftime("%Y-%m-%d")}
        for _, row in grp.iterrows():
            entry[row["category"]] = int(row["units_sold"])
        weekly_units_list.append(entry)
    weekly_units_list = sorted(weekly_units_list, key=lambda x: x["week"])
    
    return sanitize_data({
        "revenue": round(total_rev, 2),
        "growth_pct": growth_pct,
        "stockout_rate": stockout_rate,
        "inventory_value": inv_val,
        "products_at_risk": products_at_risk,
        "total_active_items": len(pred),
        "weekly_revenue_by_store": weekly_rev_list,
        "category_revenue_share": category_revenue_share,
        "weekly_units_by_category": weekly_units_list,
    })

@app.get("/predictions")
def list_predictions(
    store: Optional[str] = Query(None, description="Filter by store_id (e.g. S01)"),
    risk: Optional[str] = Query(None, description="Filter by risk tier (HIGH, MEDIUM, LOW)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: Optional[int] = Query(None, ge=1, description="Limit output records")
):
    df = DATA["predictions"].copy()
    if store:
        df = df[df["store_id"] == store.upper()]
    if risk:
        df = df[df["risk"] == risk.upper()]
    if category:
        df = df[df["category"].str.lower() == category.lower()]
        
    df = df.sort_values("priority_score", ascending=False)
    if limit:
        df = df.head(limit)
        
    records = df.to_dict("records")
    return sanitize_data(records)

@app.get("/predictions/{store_id}/{product_id}")
def get_single_prediction(store_id: str, product_id: str):
    sid = store_id.upper().strip()
    pid = product_id.upper().strip()
    df = DATA["predictions"]
    row = df[(df["store_id"] == sid) & (df["product_id"] == pid)]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Item {sid} - {pid} not found in active inventory.")
    return sanitize_data(row.iloc[0].to_dict())

@app.get("/forecast/{store_id}/{product_id}")
def get_test_forecast_history(store_id: str, product_id: str):
    sid = store_id.upper().strip()
    pid = product_id.upper().strip()
    test_p = DATA.get("test_predictions")
    if test_p is None:
        raise HTTPException(status_code=500, detail="Test predictions not initialized.")
        
    sub = test_p[(test_p["store_id"] == sid) & (test_p["product_id"] == pid)].sort_values("date")
    if sub.empty:
        raise HTTPException(status_code=404, detail=f"Historical test series not found for {sid} - {pid}")
        
    records = []
    for _, r in sub.iterrows():
        records.append({
            "date": r["date"].strftime("%Y-%m-%d"),
            "actual": int(r["actual"]),
            "forecast": round(float(r["forecast"]), 1)
        })
    return sanitize_data(records)

@app.get("/model/metrics")
def get_model_metrics():
    return sanitize_data({
        "metrics": MODELS.get("metrics", {}),
        "comparison": DATA.get("comparison", []),
        "tier_calibration": MODELS.get("tier_calibration", [])
    })

@app.get("/model/importance")
def get_feature_importance():
    return sanitize_data(MODELS.get("importance", []))

@app.post("/whatif", response_model=WhatIfResponse)
def simulate_whatif_scenario(req: WhatIfRequest):
    sid = req.store_id.upper().strip()
    pid = req.product_id.upper().strip()
    
    pred_df = DATA["predictions"]
    base_row = pred_df[(pred_df["store_id"] == sid) & (pred_df["product_id"] == pid)]
    if base_row.empty:
        raise HTTPException(status_code=404, detail=f"Item {sid} - {pid} not found in inventory.")
    base = base_row.iloc[0].to_dict()
    
    # Reconstruct feature row from latest master slice
    master = DATA["master"]
    sp_master = master[(master["store_id"] == sid) & (master["product_id"] == pid)].sort_values("date")
    if sp_master.empty:
        raise HTTPException(status_code=404, detail="Master records missing for item.")
        
    feat_df = build_features(sp_master, with_target=False)
    latest_feat = feat_df.iloc[-1:].copy()
    
    # Apply overrides
    if req.discount_pct is not None:
        latest_feat["discount_pct"] = req.discount_pct
        latest_feat["promotion_flag"] = 1 if req.discount_pct > 0 else 0
        latest_feat["avg_price"] = latest_feat["mrp"] * (1.0 - req.discount_pct)
        
    delay = req.supplier_delay_days if req.supplier_delay_days is not None else 0
    sim_lead_days = int(latest_feat["lead_days"].values[0]) + delay
    latest_feat["lead_days"] = sim_lead_days
    
    if req.festival is not None:
        latest_feat["festival_in_next_7"] = req.festival
        latest_feat["festival_flag"] = req.festival
        
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
    
    # Rerun Demand Model
    dem_model = MODELS["demand"]
    sim_dem = float(np.maximum(0, dem_model.predict(latest_feat[cat_cols + num_cols])[0]))
    latest_feat["forecast_7d"] = sim_dem
    
    # Rerun Stockout Model
    m2_num_cols = num_cols + ["forecast_7d"]
    so_model = MODELS["stockout"]
    sim_prob = float(so_model.predict_proba(latest_feat[cat_cols + m2_num_cols])[0, 1])
    
    # Compute new Prescriptions
    rules_res = compute_inventory_rules(
        forecast_7d=sim_dem,
        rolling_std_7=float(latest_feat["rolling_std_7"].values[0]),
        lead_days=sim_lead_days,
        current_stock=float(latest_feat["closing"].values[0]),
        incoming_stock=0.0,
        stockout_prob=sim_prob
    )
    
    reasons = get_row_reasons(latest_feat.iloc[0], sim_prob, so_model, {})
    
    simulated = {
        "forecast_7d": round(sim_dem, 1),
        "stockout_prob": round(sim_prob, 4),
        "risk": rules_res["risk"],
        "reorder_qty": rules_res["reorder_qty"],
        "safety_stock": rules_res["safety_stock"],
        "action": rules_res["action"],
        "reasons": reasons
    }
    
    deltas = {
        "forecast_diff": round(sim_dem - base["forecast_7d"], 1),
        "stockout_prob_diff": round(sim_prob - base["stockout_prob"], 4),
        "reorder_qty_diff": rules_res["reorder_qty"] - base["reorder_qty"],
        "risk_changed": rules_res["risk"] != base["risk"]
    }
    
    return sanitize_data({
        "store_id": sid,
        "product_id": pid,
        "baseline": base,
        "simulated": simulated,
        "deltas": deltas
    })

@app.get("/export/orders.csv")
def export_replenishment_orders():
    pred = DATA["predictions"].copy()
    # Export HIGH and MEDIUM risk orders with reorder_qty > 0
    orders = pred[(pred["risk"].isin(["HIGH", "MEDIUM"])) & (pred["reorder_qty"] > 0)].copy()
    orders = orders.sort_values("priority_score", ascending=False)
    
    export_cols = [
        "store_id", "product_id", "category", "current_stock", "incoming_stock",
        "forecast_7d", "stockout_prob", "risk", "reorder_qty", "priority_score", "action"
    ]
    export_df = orders[[c for c in export_cols if c in orders.columns]]
    
    stream = io.StringIO()
    export_df.to_csv(stream, index=False)
    
    return Response(
        content=stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=StockSense_Replenishment_Orders.csv"}
    )
