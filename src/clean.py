"""
StockSense Data Cleaning & Master Table Pipeline (Phase 1)
Builds unified master table (date x store_id x product_id grain) and reconciles data quality issues.
"""

import os
import pandas as pd
import numpy as np

def run_cleaning_pipeline():
    os.makedirs("data/processed", exist_ok=True)
    os.makedirs("reports", exist_ok=True)
    
    # 1. Load ONLY the 5 named CSVs (Never glob, never read _truth.csv)
    tx = pd.read_csv("data/raw/transactions.csv")
    prod = pd.read_csv("data/raw/products.csv")
    stores = pd.read_csv("data/raw/stores.csv")
    inv = pd.read_csv("data/raw/inventory.csv")
    ext = pd.read_csv("data/raw/external_factors.csv")
    
    issues_log = []
    
    # Count whitespace & casing ID issues before cleaning
    ws_count = 0
    for df in [tx, prod, stores, inv]:
        for col in ["store_id", "product_id", "supplier_id", "transaction_id", "customer_id", "store", "product"]:
            if col in df.columns:
                raw_s = df[col].astype(str)
                cleaned_s = raw_s.str.strip().str.upper()
                ws_count += int((raw_s != cleaned_s).sum())
                df[col] = cleaned_s
                
    issues_log.append({
        "issue": "whitespace_casing_ids",
        "count": ws_count,
        "action": "Stripped whitespace and converted to uppercase",
        "justification": "Inconsistent ID casing and whitespace cause false join misses"
    })
    
    # Standardize Column Names & Types
    inv = inv.rename(columns={"store": "store_id", "product": "product_id"})
                
    stores["city"] = stores["city"].astype(str).str.strip()
    ext["city"] = ext["city"].astype(str).str.strip()
    
    # Parse dates
    tx["date"] = pd.to_datetime(tx["date"])
    inv["date"] = pd.to_datetime(inv["date"])
    ext["date"] = pd.to_datetime(ext["date"])
    
    # 2. Duplicate Transactions (exact identical rows)
    dup_tx_mask = tx.duplicated(keep="first")
    dup_tx_count = int(dup_tx_mask.sum())
    tx = tx[~dup_tx_mask].copy()
    issues_log.append({
        "issue": "duplicate_transactions",
        "count": dup_tx_count,
        "action": "Deduplicated rows",
        "justification": "Exact duplicate point-of-sale logs inflate sales volume"
    })
    
    # 3. Category Standardization
    prod["category_raw"] = prod["category"].copy()
    prod["category"] = prod["category"].astype(str).str.strip().str.lower().str.title()
    category_mapping = {
        "Dairy": "Dairy",
        "Beverages": "Beverages",
        "Beverage": "Beverages",
        "Snacks": "Snacks",
        "Snack": "Snacks",
        "Personal Care": "Personal Care",
        "Household": "Household",
        "House Hold": "Household",
        "Groceries": "Groceries",
        "Frozen": "Frozen"
    }
    prod["category"] = prod["category"].map(lambda x: category_mapping.get(x, x))
    cat_variant_count = int((prod["category_raw"] != prod["category"]).sum())
    prod = prod.drop(columns=["category_raw"])
    issues_log.append({
        "issue": "category_casing_variants",
        "count": cat_variant_count,
        "action": "Mapped to standardized title case",
        "justification": "Inconsistent casing/spelling fragments category-level aggregations"
    })
    
    # 4. Quantity: Filter negative / invalid quantities
    invalid_qty_mask = tx["quantity"] <= 0
    invalid_qty_count = int(invalid_qty_mask.sum())
    tx["invalid_qty"] = invalid_qty_mask.astype(int)
    valid_tx = tx[tx["invalid_qty"] == 0].copy()
    issues_log.append({
        "issue": "negative_quantities",
        "count": invalid_qty_count,
        "action": "Flagged invalid_qty=1 and excluded from demand sums",
        "justification": "Negative/zero quantities represent returns/errors, not true sales demand"
    })
    
    # 5. Missing Values in External Factors (temp_c and rain_mm)
    missing_temp = int(ext["temp_c"].isna().sum())
    missing_rain = int(ext["rain_mm"].isna().sum())
    
    # Impute city-wise median, fallback global median
    city_temp_median = ext.groupby("city")["temp_c"].transform("median")
    ext["temp_c"] = ext["temp_c"].fillna(city_temp_median).fillna(ext["temp_c"].median())
    
    city_rain_median = ext.groupby("city")["rain_mm"].transform("median")
    ext["rain_mm"] = ext["rain_mm"].fillna(city_rain_median).fillna(ext["rain_mm"].median())
    
    issues_log.append({
        "issue": "missing_temp_c",
        "count": missing_temp,
        "action": "Imputed city-wise median",
        "justification": "Missing sensor data filled with localized central tendency"
    })
    issues_log.append({
        "issue": "missing_rain_mm",
        "count": missing_rain,
        "action": "Imputed city-wise median",
        "justification": "Missing rainfall readings filled with localized central tendency"
    })
    
    # 6. Inventory Arithmetic Check
    inv["expected_closing"] = inv["opening"] + inv["received"] - inv["sold"]
    inv_mismatch_mask = inv["closing"] != inv["expected_closing"]
    inv_mismatch_count = int(inv_mismatch_mask.sum())
    inv["inv_mismatch"] = inv_mismatch_mask.astype(int)
    
    # Spec rule: keep flag; for modeling use closing as given unless tiny mismatch (<=2 units), then use expected
    inv["mismatch_diff"] = (inv["closing"] - inv["expected_closing"]).abs()
    inv["closing_modeled"] = np.where(
        inv["inv_mismatch"] == 1,
        np.where(inv["mismatch_diff"] <= 2, inv["expected_closing"], inv["closing"]),
        inv["closing"]
    )
    inv = inv.drop(columns=["mismatch_diff", "expected_closing"])
    
    issues_log.append({
        "issue": "inventory_arithmetic_mismatch",
        "count": inv_mismatch_count,
        "action": "Flagged inv_mismatch=1; adjusted closing if diff <= 2",
        "justification": "Preserves audit trail while smoothing minor counting errors for modeling"
    })
    
    # 7. Sparse History Check (< 14 days per store-product)
    history_days = inv.groupby(["store_id", "product_id"])["date"].nunique().reset_index()
    history_days.rename(columns={"date": "history_days_count"}, inplace=True)
    sparse_sp = history_days[history_days["history_days_count"] < 14]
    sparse_count = len(sparse_sp["product_id"].unique())
    
    issues_log.append({
        "issue": "sparse_history_products",
        "count": sparse_count,
        "action": "Flagged low_history=1 without dropping",
        "justification": "New product introductions require fallback category baseline forecasts"
    })
    
    # 8. Aggregate Transactions to (date x store_id x product_id)
    tx_agg = valid_tx.groupby(["date", "store_id", "product_id"]).agg(
        units_sold=("quantity", "sum"),
        avg_price=("selling_price", "mean"),
        discount_pct=("discount_pct", "mean"),
        promotion_flag=("promotion_flag", "max"),
        revenue=("selling_price", lambda s: (valid_tx.loc[s.index, "quantity"] * s).sum())
    ).reset_index()
    
    # 9. Merge Left onto Inventory (Date x Store x Product Grain)
    # Master grain is defined by inventory (all active store-product combinations on each date)
    master = pd.merge(inv, tx_agg, on=["date", "store_id", "product_id"], how="left")
    
    # Fill sales to 0 on days with inventory presence but no sales transactions
    master["units_sold"] = master["units_sold"].fillna(0).astype(int)
    master["revenue"] = master["revenue"].fillna(0.0)
    master["promotion_flag"] = master["promotion_flag"].fillna(0).astype(int)
    master["discount_pct"] = master["discount_pct"].fillna(0.0)
    
    # Merge Products
    master = pd.merge(master, prod, on="product_id", how="left")
    
    # Merge Stores
    master = pd.merge(master, stores, on="store_id", how="left")
    
    # Merge External Factors on (date, city)
    master = pd.merge(master, ext, on=["date", "city"], how="left")
    
    # Impute avg_price when no transactions occurred (fallback to mrp * (1 - discount_pct))
    master["avg_price"] = master["avg_price"].fillna(master["mrp"] * (1.0 - master["discount_pct"]))
    
    # Merge sparse history flag
    master = pd.merge(master, history_days, on=["store_id", "product_id"], how="left")
    master["low_history"] = (master["history_days_count"] < 14).astype(int)
    master = master.drop(columns=["history_days_count"])
    
    # 10. Verification & Quality Checks
    dup_keys = master.duplicated(subset=["date", "store_id", "product_id"]).sum()
    assert dup_keys == 0, f"Duplicate master keys: {dup_keys}"
    assert master["units_sold"].isna().sum() == 0, "NaN in units_sold"
    assert master["closing"].isna().sum() == 0, "NaN in closing"
    assert master["temp_c"].isna().sum() == 0, "NaN in temp_c"
    
    # Save outputs
    master.to_csv("data/processed/master.csv", index=False)
    
    quality_df = pd.DataFrame(issues_log)
    quality_df.to_csv("reports/data_quality.csv", index=False)
    
    # Reconcile with planted traps
    if os.path.exists("reports/planted_traps.csv"):
        planted = pd.read_csv("reports/planted_traps.csv")
        reconciled = pd.merge(quality_df, planted, left_on="issue", right_on="trap_name", how="left")
        print("Trap reconciliation:")
        for _, r in reconciled.iterrows():
            if pd.notna(r["trap_name"]):
                print(f"  {r['issue']}: detected {r['count_x']} vs planted {r['count_y']}")
                
    print(f"Master shape: {master.shape}, Data quality issues logged: {len(quality_df)}")
    return master, quality_df

if __name__ == "__main__":
    run_cleaning_pipeline()
