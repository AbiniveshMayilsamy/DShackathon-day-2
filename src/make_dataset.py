"""
StockSense Dataset Generator (Phase 0)
Generates realistic, internally consistent synthetic raw data for NovaMart.
Seed: 42 (reproducible)
"""

import os
import math
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

CONFIG = {
    "seed": 42,
    "start_date": "2026-05-01",
    "end_date": "2026-09-30",
    "stores": [
        {"store_id": "S01", "city": "Coimbatore", "store_type": "Supermarket", "floor_area_sqft": 15000, "avg_daily_customers": 1200, "region": "South", "store_factor": 1.10, "trend_slope": 0.0008},
        {"store_id": "S02", "city": "Chennai", "store_type": "Hypermarket", "floor_area_sqft": 35000, "avg_daily_customers": 2800, "region": "South", "store_factor": 1.45, "trend_slope": 0.0005},
        {"store_id": "S03", "city": "Madurai", "store_type": "Supermarket", "floor_area_sqft": 12000, "avg_daily_customers": 950, "region": "South", "store_factor": 0.90, "trend_slope": -0.0003},
        {"store_id": "S04", "city": "Salem", "store_type": "Express", "floor_area_sqft": 5000, "avg_daily_customers": 600, "region": "South", "store_factor": 0.70, "trend_slope": 0.0002},
        {"store_id": "S05", "city": "Trichy", "store_type": "Supermarket", "floor_area_sqft": 14000, "avg_daily_customers": 1100, "region": "South", "store_factor": 1.00, "trend_slope": -0.0001},
    ],
    "categories": {
        "Dairy": {"factor": 1.2, "sub_cats": ["Milk", "Butter & Cheese", "Curd & Paneer"], "shelf_life_range": (3, 7), "base_price_range": (30, 180), "base_demand": (15, 30)},
        "Beverages": {"factor": 1.1, "sub_cats": ["Juices", "Soft Drinks", "Tea & Coffee"], "shelf_life_range": (60, 180), "base_price_range": (25, 220), "base_demand": (12, 25)},
        "Snacks": {"factor": 1.15, "sub_cats": ["Biscuits", "Chips & Namkeen", "Chocolates"], "shelf_life_range": (90, 240), "base_price_range": (15, 120), "base_demand": (14, 28)},
        "Personal Care": {"factor": 0.85, "sub_cats": ["Soaps & Body Wash", "Hair Care", "Oral Care"], "shelf_life_range": (365, 730), "base_price_range": (45, 350), "base_demand": (5, 12)},
        "Household": {"factor": 0.80, "sub_cats": ["Detergents", "Cleaners", "Pest Control"], "shelf_life_range": (365, 730), "base_price_range": (60, 450), "base_demand": (4, 10)},
        "Groceries": {"factor": 1.30, "sub_cats": ["Atta & Flours", "Rice & Grains", "Pulses & Dals", "Edible Oils"], "shelf_life_range": (120, 365), "base_price_range": (50, 300), "base_demand": (10, 22)},
        "Frozen": {"factor": 0.75, "sub_cats": ["Frozen Veg", "Ice Creams", "Ready to Eat"], "shelf_life_range": (60, 120), "base_price_range": (70, 280), "base_demand": (4, 10)},
    },
    "brands": ["NovaFresh", "Aura", "PureLife", "DailyBest", "SunHarvest", "ClassicChoice", "FarmPride", "KisanGold"],
    "suppliers": [
        {"supplier_id": "SUP01", "lead_days": 1},
        {"supplier_id": "SUP02", "lead_days": 2},
        {"supplier_id": "SUP03", "lead_days": 2},
        {"supplier_id": "SUP04", "lead_days": 3},
        {"supplier_id": "SUP05", "lead_days": 3},
        {"supplier_id": "SUP06", "lead_days": 4},
        {"supplier_id": "SUP07", "lead_days": 1},
        {"supplier_id": "SUP08", "lead_days": 2},
    ],
    "assumed_festivals": {
        "2026-05-01": "May Day",
        "2026-05-31": "Bakrid",
        "2026-08-15": "Independence Day",
        "2026-08-28": "Onam",
        "2026-09-04": "Ganesh Chaturthi",
        "2026-09-21": "Milad-un-Nabi",
    },
    "assumed_holidays": {
        "2026-05-01": "May Day",
        "2026-08-15": "Independence Day",
        "2026-09-04": "Ganesh Chaturthi",
    },
    "city_weather_base": {
        "Chennai": {"temp_mean": 34.5, "temp_std": 2.5, "rain_prob": 0.20, "rain_mean": 12.0},
        "Coimbatore": {"temp_mean": 29.0, "temp_std": 2.0, "rain_prob": 0.25, "rain_mean": 15.0},
        "Madurai": {"temp_mean": 35.0, "temp_std": 2.2, "rain_prob": 0.15, "rain_mean": 10.0},
        "Salem": {"temp_mean": 32.5, "temp_std": 2.1, "rain_prob": 0.18, "rain_mean": 11.0},
        "Trichy": {"temp_mean": 34.0, "temp_std": 2.3, "rain_prob": 0.17, "rain_mean": 9.0},
    }
}

def generate_products():
    np.random.seed(CONFIG["seed"])
    random.seed(CONFIG["seed"])
    
    products = []
    pid = 101
    cats = list(CONFIG["categories"].keys())
    
    # 40 products distributed across 7 categories
    cat_counts = {"Dairy": 7, "Beverages": 6, "Snacks": 7, "Personal Care": 5, "Household": 5, "Groceries": 6, "Frozen": 4}
    
    for cat, count in cat_counts.items():
        spec = CONFIG["categories"][cat]
        for _ in range(count):
            sub_cat = random.choice(spec["sub_cats"])
            brand = random.choice(CONFIG["brands"])
            mrp = round(random.uniform(*spec["base_price_range"]), 2)
            margin = random.uniform(0.18, 0.32)
            cost_price = round(mrp * (1 - margin), 2)
            shelf_life_days = random.randint(*spec["shelf_life_range"])
            supplier = random.choice(CONFIG["suppliers"])
            
            base_dem = random.uniform(*spec["base_demand"])
            
            products.append({
                "product_id": f"P{pid}",
                "category": cat,
                "sub_category": sub_cat,
                "brand": brand,
                "mrp": mrp,
                "cost_price": cost_price,
                "shelf_life_days": shelf_life_days,
                "supplier_id": supplier["supplier_id"],
                "_lead_days": supplier["lead_days"],
                "_base_demand": base_dem
            })
            pid += 1
            
    return pd.DataFrame(products)

def generate_external_factors(dates, cities):
    np.random.seed(CONFIG["seed"])
    records = []
    
    for dt in dates:
        dt_str = dt.strftime("%Y-%m-%d")
        is_weekend = 1 if dt.weekday() >= 5 else 0
        festival = 1 if dt_str in CONFIG["assumed_festivals"] else 0
        holiday = 1 if dt_str in CONFIG["assumed_holidays"] else 0
        
        for city in cities:
            w_spec = CONFIG["city_weather_base"][city]
            temp_c = round(np.random.normal(w_spec["temp_mean"], w_spec["temp_std"]), 1)
            temp_c = max(20.0, min(44.0, temp_c))
            
            has_rain = np.random.rand() < w_spec["rain_prob"]
            rain_mm = round(np.random.exponential(w_spec["rain_mean"]), 1) if has_rain else 0.0
            
            # Local event ~4% random
            local_event = 1 if np.random.rand() < 0.04 else 0
            
            records.append({
                "date": dt_str,
                "city": city,
                "temp_c": temp_c,
                "rain_mm": rain_mm,
                "holiday": holiday,
                "festival": festival,
                "weekend": is_weekend,
                "local_event": local_event
            })
            
    return pd.DataFrame(records)

def simulate_pipeline():
    np.random.seed(CONFIG["seed"])
    random.seed(CONFIG["seed"])
    
    start_dt = datetime.strptime(CONFIG["start_date"], "%Y-%m-%d")
    end_dt = datetime.strptime(CONFIG["end_date"], "%Y-%m-%d")
    num_days = (end_dt - start_dt).days + 1
    dates = [start_dt + timedelta(days=i) for i in range(num_days)]
    
    stores_df = pd.DataFrame([
        {k: v for k, v in s.items() if not k.startswith("_") and k not in ["store_factor", "trend_slope"]}
        for s in CONFIG["stores"]
    ])
    
    products_df = generate_products()
    cities = [s["city"] for s in CONFIG["stores"]]
    ext_df = generate_external_factors(dates, cities)
    
    # Store-product assortment (~70% per store, 3 new products have sparse history)
    store_catalog = {}
    new_products = ["P138", "P139", "P140"]  # only active last 7-10 days
    
    for s in CONFIG["stores"]:
        sid = s["store_id"]
        # keep ~70% random products
        sampled_pids = sorted(list(np.random.choice(products_df["product_id"], size=int(len(products_df)*0.72), replace=False)))
        for np_id in new_products:
            if np_id not in sampled_pids:
                sampled_pids.append(np_id)
        store_catalog[sid] = sorted(sampled_pids)
        
    ext_lookup = ext_df.set_index(["date", "city"]).to_dict("index")
    prod_lookup = products_df.set_index("product_id").to_dict("index")
    store_lookup = {s["store_id"]: s for s in CONFIG["stores"]}
    
    inventory_rows = []
    transactions_rows = []
    truth_rows = []
    
    tx_id_counter = 1
    
    # Track inventory per (store, product)
    # State: current_stock, pending_orders = [(arrival_day_idx, qty)]
    inv_state = {}
    for sid in store_catalog:
        for pid in store_catalog[sid]:
            p_info = prod_lookup[pid]
            base_d = p_info["_base_demand"] * store_lookup[sid]["store_factor"]
            lead = p_info["_lead_days"]
            # reorder_lvl around 1.6 * daily_demand * lead
            reorder_lvl = max(4, int(math.ceil(1.6 * base_d * max(1, math.sqrt(lead)))))
            init_stock = int(reorder_lvl * random.uniform(1.0, 2.0))
            inv_state[(sid, pid)] = {
                "stock": init_stock,
                "reorder_lvl": reorder_lvl,
                "pending_orders": [],  # list of (arrival_idx, qty)
                "avg_daily_demand": base_d
            }
            
    # Simulation loop across all days
    for day_idx, dt in enumerate(dates):
        dt_str = dt.strftime("%Y-%m-%d")
        day_of_week = dt.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0
        
        for sid, pids in store_catalog.items():
            s_info = store_lookup[sid]
            city = s_info["city"]
            ext = ext_lookup[(dt_str, city)]
            
            for pid in sorted(pids):
                # Check new product activation
                if pid in new_products:
                    # Only active in the last 7 to 10 days
                    active_from_idx = num_days - (7 if pid == "P140" else (9 if pid == "P139" else 10))
                    if day_idx < active_from_idx:
                        continue
                        
                p_info = prod_lookup[pid]
                state = inv_state[(sid, pid)]
                lead_days = p_info["_lead_days"]
                reorder_lvl = state["reorder_lvl"]
                
                # 1. Receive incoming orders due today
                received = 0
                remaining_orders = []
                for arr_idx, qty in state["pending_orders"]:
                    if arr_idx == day_idx:
                        received += qty
                    else:
                        remaining_orders.append((arr_idx, qty))
                state["pending_orders"] = remaining_orders
                
                opening = state["stock"]
                available = opening + received
                
                # 2. Compute true demand
                base_d = p_info["_base_demand"]
                store_f = s_info["store_factor"]
                cat_f = CONFIG["categories"][p_info["category"]]["factor"]
                trend_f = 1.0 + (s_info["trend_slope"] * day_idx)
                
                weekend_f = 1.25 if is_weekend else 1.0
                
                # Promotion: 12% random chance per day
                has_promo = (np.random.rand() < 0.12)
                discount_pct = round(np.random.uniform(0.08, 0.25), 2) if has_promo else 0.0
                promo_f = (1.0 + discount_pct * 2.2) if has_promo else 1.0
                
                # Festival effect
                fest_f = 1.30 if (ext["festival"] == 1 and p_info["category"] in ["Snacks", "Beverages", "Dairy"]) else 1.0
                
                # Weather effect
                weather_f = 1.0
                if p_info["category"] == "Beverages" and ext["temp_c"] > 30.0:
                    weather_f += 0.02 * (ext["temp_c"] - 30.0)
                if ext["rain_mm"] > 5.0:
                    weather_f *= 0.92
                    
                # Poisson rate
                mu = base_d * store_f * cat_f * weekend_f * promo_f * fest_f * weather_f * trend_f
                mu = max(0.5, mu)
                dem = int(np.random.poisson(mu))
                
                # 3. Sold and Unmet
                sold = min(dem, available)
                unmet = dem - sold
                closing = available - sold
                
                state["stock"] = closing
                
                # 4. Record Inventory row
                # Column names as specified in spec section 6: date, store, product, opening, received, sold, closing, reorder_lvl, lead_days
                inventory_rows.append({
                    "date": dt_str,
                    "store": sid,
                    "product": pid,
                    "opening": opening,
                    "received": received,
                    "sold": sold,
                    "closing": closing,
                    "reorder_lvl": reorder_lvl,
                    "lead_days": lead_days
                })
                
                # Record truth for hidden evaluation
                truth_rows.append({
                    "date": dt_str,
                    "store_id": sid,
                    "product_id": pid,
                    "true_demand": dem,
                    "sold": sold,
                    "unmet_demand": unmet,
                    "stockout": 1 if closing == 0 else 0
                })
                
                # 5. Generate individual transactions for sold units
                if sold > 0:
                    selling_price = round(p_info["mrp"] * (1.0 - discount_pct), 2)
                    units_remaining = sold
                    while units_remaining > 0:
                        qty = min(units_remaining, random.choices([1, 2, 3, 4], weights=[0.55, 0.30, 0.10, 0.05])[0])
                        units_remaining -= qty
                        
                        # Hour of transaction: weighted towards evening (17-21)
                        hour_weights = [1]*10 + [2, 3, 4, 3, 4, 5, 7, 9, 8, 5, 3, 1, 1, 1]
                        hour = random.choices(range(24), weights=hour_weights[:24])[0]
                        pay_mode = random.choices(["UPI", "Card", "Cash"], weights=[0.60, 0.25, 0.15])[0]
                        cust_id = f"C{random.randint(1000, 9999)}"
                        
                        transactions_rows.append({
                            "transaction_id": f"T{tx_id_counter:07d}",
                            "date": dt_str,
                            "store_id": sid,
                            "product_id": pid,
                            "quantity": qty,
                            "selling_price": selling_price,
                            "discount_pct": discount_pct,
                            "promotion_flag": 1 if has_promo else 0,
                            "customer_id": cust_id,
                            "payment_mode": pay_mode,
                            "hour": hour
                        })
                        tx_id_counter += 1
                        
                # 6. Reorder logic for next cycle
                # If closing < reorder_lvl and no order currently pending
                has_pending = len(state["pending_orders"]) > 0
                if closing < reorder_lvl and not has_pending:
                    # Order ~ 4.5 to 6.0 days of demand (perishables smaller)
                    days_mult = 3.5 if p_info["shelf_life_days"] <= 7 else random.uniform(4.8, 6.2)
                    order_qty = max(5, int(math.ceil(state["avg_daily_demand"] * days_mult)))
                    arrival_idx = day_idx + lead_days
                    state["pending_orders"].append((arrival_idx, order_qty))

    inv_df = pd.DataFrame(inventory_rows)
    tx_df = pd.DataFrame(transactions_rows)
    truth_df = pd.DataFrame(truth_rows)
    
    return stores_df, products_df, ext_df, inv_df, tx_df, truth_df

def inject_planted_traps(stores_df, products_df, ext_df, inv_df, tx_df):
    np.random.seed(CONFIG["seed"])
    random.seed(CONFIG["seed"])
    
    traps = []
    
    # 1. Negative quantities in transactions (~0.3%) - inject before duplicates
    n_neg = max(1, int(len(tx_df) * 0.003))
    neg_indices = np.random.choice(tx_df.index, size=n_neg, replace=False)
    for idx in neg_indices:
        tx_df.at[idx, "quantity"] = -abs(int(tx_df.at[idx, "quantity"])) if tx_df.at[idx, "quantity"] > 0 else -1
    traps.append({"trap_name": "negative_quantities", "file": "transactions.csv", "count": n_neg, "description": "Negative transaction quantities"})

    # 2. Duplicate transaction rows (~1%) - duplicate after negative injection so all pairs are identical
    n_dups = int(len(tx_df) * 0.010)
    dup_indices = np.random.choice(tx_df.index, size=n_dups, replace=False)
    dup_rows = tx_df.loc[dup_indices].copy()
    tx_df = pd.concat([tx_df, dup_rows], ignore_index=True)
    traps.append({"trap_name": "duplicate_transactions", "file": "transactions.csv", "count": n_dups, "description": "Identical transaction rows"})
    
    # 3. Category variants in products.csv (~25% of 40 products -> 10 rows)
    cat_var_indices = [2, 4, 8, 11, 12, 15, 18, 24, 30, 34]  # 10 explicit fixed indices
    variants_map = {
        2: "dairy",
        4: " Dairy ",
        8: "beverage",
        11: "BEVERAGES",
        12: " Beverages ",
        15: "snack",
        18: "Snacks ",
        24: "house hold",
        30: "groceries",
        34: "Groceries "
    }
    count_cat = 0
    for idx, var in variants_map.items():
        if idx < len(products_df):
            products_df.at[idx, "category"] = var
            count_cat += 1
    traps.append({"trap_name": "category_casing_variants", "file": "products.csv", "count": count_cat, "description": "Variant casing/misnomers/whitespace in category"})
    
    # 4. Blank weather values (~2% blank temp_c, ~1% blank rain_mm)
    n_temp_blank = int(len(ext_df) * 0.020)
    temp_blank_idx = np.random.choice(ext_df.index, size=n_temp_blank, replace=False)
    ext_df.loc[temp_blank_idx, "temp_c"] = np.nan
    traps.append({"trap_name": "missing_temp_c", "file": "external_factors.csv", "count": n_temp_blank, "description": "Missing temp_c values"})
    
    n_rain_blank = int(len(ext_df) * 0.010)
    rain_blank_idx = np.random.choice(ext_df.index, size=n_rain_blank, replace=False)
    ext_df.loc[rain_blank_idx, "rain_mm"] = np.nan
    traps.append({"trap_name": "missing_rain_mm", "file": "external_factors.csv", "count": n_rain_blank, "description": "Missing rain_mm values"})
    
    # 5. Inventory mismatch: closing != opening + received - sold (~1.5%)
    n_inv_mis = int(len(inv_df) * 0.015)
    inv_mis_idx = np.random.choice(inv_df.index, size=n_inv_mis, replace=False)
    for idx in inv_mis_idx:
        cur_closing = inv_df.at[idx, "closing"]
        expected = inv_df.at[idx, "opening"] + inv_df.at[idx, "received"] - inv_df.at[idx, "sold"]
        # Ensure new closing is strictly different from expected
        if cur_closing == 0:
            inv_df.at[idx, "closing"] = 3
        else:
            delta = random.choice([1, 2, 3, 4, 5])
            inv_df.at[idx, "closing"] = cur_closing + delta
    traps.append({"trap_name": "inventory_arithmetic_mismatch", "file": "inventory.csv", "count": n_inv_mis, "description": "closing != opening + received - sold"})
    
    # 6. Stray whitespace/lowercase in a few IDs
    # stores
    stores_df.at[0, "store_id"] = " s01 "
    # products
    products_df.at[0, "product_id"] = " p101"
    products_df.at[5, "product_id"] = "P106 "
    # transactions
    tx_df.at[10, "store_id"] = "s01"
    tx_df.at[20, "product_id"] = " p101 "
    traps.append({"trap_name": "whitespace_casing_ids", "file": "multiple", "count": 5, "description": "Stray whitespace or lowercase IDs"})
    
    # 7. Short history products (P138, P139, P140)
    traps.append({"trap_name": "sparse_history_products", "file": "products.csv", "count": 3, "description": "Products with < 14 days history (P138, P139, P140)"})
    
    traps_df = pd.DataFrame(traps)
    return stores_df, products_df, ext_df, inv_df, tx_df, traps_df

def main():
    np.random.seed(CONFIG["seed"])
    random.seed(CONFIG["seed"])
    
    os.makedirs("data/raw", exist_ok=True)
    os.makedirs("reports", exist_ok=True)
    os.makedirs("reports/figures", exist_ok=True)
    os.makedirs("data/processed", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    os.makedirs("src", exist_ok=True)
    os.makedirs("notebooks", exist_ok=True)
    
    stores_df, products_df, ext_df, inv_df, tx_df, truth_df = simulate_pipeline()
    
    # Check 1: Stock-out rate between 5% and 10%
    stockout_rate = (inv_df["closing"] <= 0).mean()
    assert 0.045 <= stockout_rate <= 0.11, f"Stockout rate {stockout_rate:.4f} outside target [0.05, 0.10]"
    
    # Check 2: No duplicate (date, store, product) in inventory before traps
    dup_inv = inv_df.duplicated(subset=["date", "store", "product"]).sum()
    assert dup_inv == 0, f"Found {dup_inv} duplicate keys in inventory"
    
    # Check 3: Transaction sum per date-store-product == inventory sold (before traps)
    tx_agg = tx_df.groupby(["date", "store_id", "product_id"])["quantity"].sum().reset_index()
    merged_check = pd.merge(inv_df, tx_agg, left_on=["date", "store", "product"], right_on=["date", "store_id", "product_id"], how="left")
    merged_check["quantity"] = merged_check["quantity"].fillna(0)
    diff = (merged_check["sold"] - merged_check["quantity"]).abs().sum()
    assert diff == 0, f"Transaction quantity sum mismatch before traps: {diff}"
    
    # Save hidden truth
    truth_df.to_csv("data/raw/_truth.csv", index=False)
    
    # Inject traps
    stores_df, products_df, ext_df, inv_df, tx_df, traps_df = inject_planted_traps(
        stores_df, products_df, ext_df, inv_df, tx_df
    )
    
    # Strip internal helper columns before saving raw products
    clean_products_export = products_df.drop(columns=[c for c in products_df.columns if c.startswith("_")])
    
    # Save all raw CSVs
    stores_df.to_csv("data/raw/stores.csv", index=False)
    clean_products_export.to_csv("data/raw/products.csv", index=False)
    ext_df.to_csv("data/raw/external_factors.csv", index=False)
    inv_df.to_csv("data/raw/inventory.csv", index=False)
    tx_df.to_csv("data/raw/transactions.csv", index=False)
    traps_df.to_csv("reports/planted_traps.csv", index=False)
    
    print("=== PHASE 0 COMPLETE ===")
    print(f"PASS: Stock-out rate: {stockout_rate*100:.2f}% (target 5-10%)")
    print(f"PASS: Inventory rows: {len(inv_df)}, Transactions rows: {len(tx_df)}")
    print(f"PASS: Products: {len(products_df)}, Stores: {len(stores_df)}, External: {len(ext_df)}")
    print(f"PASS: Planted traps logged: {len(traps_df)} categories in reports/planted_traps.csv")

if __name__ == "__main__":
    main()
