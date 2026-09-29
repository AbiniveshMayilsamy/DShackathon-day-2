"""
StockSense Inventory Decision Rules (Phase 5)
Computes safety stock, recommended replenishment, reorder quantity, and risk tier action text.
"""

import math

def compute_inventory_rules(forecast_7d: float, rolling_std_7: float, lead_days: int, current_stock: float, incoming_stock: float, stockout_prob: float):
    """
    Computes exact prescriptive inventory metrics as specified in Section 5 & 10.
    """
    # Safety stock = 1.65 * std_daily_demand * sqrt(lead_days)
    std_safe = max(0.0, float(rolling_std_7))
    safety_stock = 1.65 * std_safe * math.sqrt(max(1, lead_days))
    
    # Recommended stock = forecast_7d + safety_stock
    recommended_stock = float(forecast_7d) + safety_stock
    
    # Reorder qty = max(0, ceil(recommended_stock - current_stock - incoming_stock))
    # Note: incoming_stock is 0 as documented
    reorder_raw = recommended_stock - float(current_stock) - float(incoming_stock)
    reorder_qty = max(0, int(math.ceil(reorder_raw)))
    
    # Risk tiering
    if stockout_prob >= 0.70:
        risk = "HIGH"
        action = "Raise replenishment order today."
    elif stockout_prob >= 0.40:
        risk = "MEDIUM"
        action = "Review stock; order within 2 days."
    else:
        risk = "LOW"
        action = "No urgent action; covered by regular order cycle."
        
    return {
        "safety_stock": round(safety_stock, 1),
        "recommended_stock": round(recommended_stock, 1),
        "reorder_qty": reorder_qty,
        "risk": risk,
        "action": action
    }
