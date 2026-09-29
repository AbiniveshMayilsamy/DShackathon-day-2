"""
StockSense FastAPI Endpoint Unit Tests (Phase 6)
Validates all 9 REST endpoints with TestClient assertions.
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))
import pytest
from fastapi.testclient import TestClient
from src.api import app

client = TestClient(app)

def test_01_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

def test_02_summary():
    res = client.get("/summary")
    assert res.status_code == 200
    data = res.json()
    assert "revenue" in data and "products_at_risk" in data
    assert data["revenue"] > 0
    assert data["products_at_risk"] >= 0
    # 7b chart data keys
    assert "weekly_revenue_by_store" in data, "Missing weekly_revenue_by_store"
    assert "category_revenue_share" in data, "Missing category_revenue_share"
    assert "weekly_units_by_category" in data, "Missing weekly_units_by_category"
    assert len(data["weekly_revenue_by_store"]) > 0
    assert len(data["category_revenue_share"]) > 0

def test_10_forecast_spec_addition():
    """
    /forecast/{store_id}/{product_id} is a spec addition (Phase 7b).
    Returns test-period actuals vs model forecast for the Demand page chart.
    """
    res = client.get("/forecast/S01/P101")
    assert res.status_code == 200
    records = res.json()
    assert len(records) > 0
    assert "date" in records[0] and "actual" in records[0] and "forecast" in records[0]
    # Verify date ordering
    dates = [r["date"] for r in records]
    assert dates == sorted(dates), "Forecast records should be in ascending date order"


def test_03_predictions_list():
    res = client.get("/predictions?limit=10")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) == 10
    assert "stockout_prob" in rows[0]
    assert "reorder_qty" in rows[0]

def test_04_single_prediction():
    res = client.get("/predictions/S01/P101")
    assert res.status_code == 200
    data = res.json()
    assert data["store_id"] == "S01"
    assert data["product_id"] == "P101"
    assert data["risk"] in ["HIGH", "MEDIUM", "LOW"]

def test_05_forecast_history():
    res = client.get("/forecast/S01/P101")
    assert res.status_code == 200
    records = res.json()
    assert len(records) > 0
    assert "actual" in records[0] and "forecast" in records[0]

def test_06_model_metrics():
    res = client.get("/model/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data and "comparison" in data
    assert "demand_model" in data["metrics"]

def test_07_feature_importance():
    res = client.get("/model/importance")
    assert res.status_code == 200
    groups = res.json()
    assert len(groups) == 6
    assert groups[0]["importance"] > 0

def test_08_whatif_scenario():
    # Baseline test (delay=0, discount=0)
    res_base = client.post("/whatif", json={"store_id": "S01", "product_id": "P101", "supplier_delay_days": 0, "discount_pct": 0.0})
    assert res_base.status_code == 200
    base_data = res_base.json()
    
    # Delay test (delay=2 days)
    res_delay = client.post("/whatif", json={"store_id": "S01", "product_id": "P101", "supplier_delay_days": 2})
    assert res_delay.status_code == 200
    delay_data = res_delay.json()
    
    # Supplier delay increases safety stock or reorder quantity
    assert delay_data["simulated"]["reorder_qty"] >= base_data["simulated"]["reorder_qty"]

def test_09_export_orders():
    res = client.get("/export/orders.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "store_id,product_id" in content
    assert len(content.splitlines()) > 1
