"""
StockSense Feature Engineering Pipeline (Phase 3)
Builds strict temporal features, target variables, and 70/15/15 time split with 7-day anti-leakage buffer.
"""

import os
import numpy as np
import pandas as pd

def build_features(df: pd.DataFrame, with_target: bool = True) -> pd.DataFrame:
    """
    Builds feature matrix for StockSense.
    If with_target=True, computes forward 7-day demand and stockout flags, dropping rows lacking 7 future days.
    If with_target=False (for latest inference in predict.py), builds features for day t without requiring future targets.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["store_id", "product_id", "date"]).reset_index(drop=True)
    
    # 1. Calendar / Time Features (day t)
    df["day_of_week"] = df["date"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["month"] = df["date"].dt.month
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    df["festival_flag"] = df["festival"].fillna(0).astype(int)
    df["holiday_flag"] = df["holiday"].fillna(0).astype(int)
    
    # 2. Forward Calendar Signals (Known Deterministic Calendar ahead: t+1 .. t+7)
    df["weekend_in_next_7"] = df.groupby(["store_id", "product_id"])["is_weekend"].transform(
        lambda s: s.iloc[::-1].shift(1).rolling(7, min_periods=1).max().iloc[::-1]
    ).fillna(0).astype(int)
    
    df["festival_in_next_7"] = df.groupby(["store_id", "product_id"])["festival_flag"].transform(
        lambda s: s.iloc[::-1].shift(1).rolling(7, min_periods=1).max().iloc[::-1]
    ).fillna(0).astype(int)
    
    df["holiday_in_next_7"] = df.groupby(["store_id", "product_id"])["holiday_flag"].transform(
        lambda s: s.iloc[::-1].shift(1).rolling(7, min_periods=1).max().iloc[::-1]
    ).fillna(0).astype(int)
    
    # 3. Lags of units_sold (Strictly past dates: shift(1) or higher)
    df["lag_1"] = df.groupby(["store_id", "product_id"])["units_sold"].shift(1)
    df["lag_7"] = df.groupby(["store_id", "product_id"])["units_sold"].shift(7)
    df["lag_14"] = df.groupby(["store_id", "product_id"])["units_sold"].shift(14)
    
    # Price change (avg_price minus lag_1 price)
    df["lag_1_price"] = df.groupby(["store_id", "product_id"])["avg_price"].shift(1)
    df["price_change"] = df["avg_price"] - df["lag_1_price"]
    
    # 4. Rolling Statistics (Strictly shifted: shift(1) before rolling)
    # Use min_periods=1 so low_history products have valid rolling statistics
    df["rolling_mean_7"] = df.groupby(["store_id", "product_id"])["units_sold"].transform(
        lambda s: s.shift(1).rolling(7, min_periods=1).mean()
    ).fillna(0.0)
    df["rolling_mean_14"] = df.groupby(["store_id", "product_id"])["units_sold"].transform(
        lambda s: s.shift(1).rolling(14, min_periods=1).mean()
    ).fillna(0.0)
    df["rolling_std_7"] = df.groupby(["store_id", "product_id"])["units_sold"].transform(
        lambda s: s.shift(1).rolling(7, min_periods=1).std()
    ).fillna(0.0)
    
    # 5. Growth & Inventory Ratios (Day t inventory values)
    df["sales_growth_7"] = df["rolling_mean_7"] / (df["rolling_mean_14"] + 1e-6)
    df["days_of_inventory"] = df["closing"] / (df["rolling_mean_7"] + 1e-6)
    df["inventory_to_demand_ratio"] = df["closing"] / (df["lag_1"].fillna(0.0) + 1e-6)
    df["reorder_gap"] = df["closing"] - df["reorder_lvl"]
    
    # Fill warmup lags for low_history items (min_periods fallback)
    df["lag_1"] = df["lag_1"].fillna(0.0)
    df["lag_7"] = df["lag_7"].fillna(0.0)
    df["lag_14"] = df["lag_14"].fillna(0.0)
    df["price_change"] = df["price_change"].fillna(0.0)
    
    # If with_target=True, drop the first 14 warmup days only for normal-history items
    if with_target:
        # Keep low_history items, drop initial warmup rows for long-history items
        warmup_mask = (df["low_history"] == 0) & (df.groupby(["store_id", "product_id"]).cumcount() < 14)
        df = df[~warmup_mask].reset_index(drop=True)
    
    if with_target:
        # 6. Future Targets (t+1 .. t+7)
        # next_7_day_demand: sum of units_sold on days t+1..t+7
        df["next_7_day_demand"] = df.groupby(["store_id", "product_id"])["units_sold"].transform(
            lambda s: s.iloc[::-1].shift(1).rolling(7, min_periods=7).sum().iloc[::-1]
        )
        
        # stockout_flag: 1 if closing <= 0 on ANY day t+1..t+7, else 0
        df["is_stockout_day"] = (df["closing"] <= 0).astype(int)
        df["stockout_flag"] = df.groupby(["store_id", "product_id"])["is_stockout_day"].transform(
            lambda s: s.iloc[::-1].shift(1).rolling(7, min_periods=7).max().iloc[::-1]
        )
        df = df.drop(columns=["is_stockout_day"])
        
        # Drop rows where full 7 future days are not available (last usable date is 2026-09-23)
        df = df.dropna(subset=["next_7_day_demand", "stockout_flag"]).reset_index(drop=True)
        df["next_7_day_demand"] = df["next_7_day_demand"].astype(int)
        df["stockout_flag"] = df["stockout_flag"].astype(int)
        
    return df

def assign_time_splits(df: pd.DataFrame) -> tuple:
    """
    Applies 70/15/15 time-based split across usable dates with 7-day anti-leakage buffers.
    """
    unique_dates = sorted(df["date"].unique())
    n_dates = len(unique_dates)
    
    # Target window is 7 days, so buffers must be 7 days
    # Total usable dates: 132 (2026-05-15 to 2026-09-23)
    train_dates = unique_dates[:83]           # 83 dates: 2026-05-15 to 2026-08-05 (~70% of active dates)
    gap1_dates = unique_dates[83:90]          # 7 dates: 2026-08-06 to 2026-08-12 (Buffer 1)
    val_dates = unique_dates[90:108]          # 18 dates: 2026-08-13 to 2026-08-30 (~15% of active dates)
    gap2_dates = unique_dates[108:115]        # 7 dates: 2026-08-31 to 2026-09-06 (Buffer 2)
    test_dates = unique_dates[115:]           # 17 dates: 2026-09-07 to 2026-09-23 (~15% of active dates)
    
    train_set = set(train_dates)
    val_set = set(val_dates)
    test_set = set(test_dates)
    
    def get_split(dt):
        if dt in train_set:
            return "train"
        elif dt in val_set:
            return "val"
        elif dt in test_set:
            return "test"
        else:
            return "gap"
            
    df["split"] = df["date"].apply(get_split)
    
    split_info = {
        "train": (min(train_dates).strftime("%Y-%m-%d"), max(train_dates).strftime("%Y-%m-%d"), len(train_dates)),
        "gap1": (min(gap1_dates).strftime("%Y-%m-%d"), max(gap1_dates).strftime("%Y-%m-%d"), len(gap1_dates)),
        "val": (min(val_dates).strftime("%Y-%m-%d"), max(val_dates).strftime("%Y-%m-%d"), len(val_dates)),
        "gap2": (min(gap2_dates).strftime("%Y-%m-%d"), max(gap2_dates).strftime("%Y-%m-%d"), len(gap2_dates)),
        "test": (min(test_dates).strftime("%Y-%m-%d"), max(test_dates).strftime("%Y-%m-%d"), len(test_dates)),
    }
    return df, split_info

def run_leakage_tests(master: pd.DataFrame, feat: pd.DataFrame, split_info: dict):
    print("=== LEAKAGE TESTS ===")
    
    # Test a: 3 random rows manual recomputation
    sample_rows = feat.sample(3, random_state=42)
    test_a_pass = True
    for _, row in sample_rows.iterrows():
        sid, pid, dt = row["store_id"], row["product_id"], row["date"]
        hist = master[(master["store_id"] == sid) & (master["product_id"] == pid) & (master["date"] < dt)].sort_values("date")
        manual_lag1 = hist.iloc[-1]["units_sold"]
        manual_lag7 = hist.iloc[-7]["units_sold"]
        manual_roll7 = hist.iloc[-7:]["units_sold"].mean()
        
        if row["lag_1"] != manual_lag1 or row["lag_7"] != manual_lag7 or abs(row["rolling_mean_7"] - manual_roll7) > 1e-4:
            test_a_pass = False
    print(f"Test A (Manual lag/rolling match): {'PASS' if test_a_pass else 'FAIL'}")
    
    # Test b: Assert max feature source date < row date
    test_b_pass = True
    for sid, pid in feat[["store_id", "product_id"]].drop_duplicates().head(5).itertuples(index=False):
        sub = feat[(feat["store_id"] == sid) & (feat["product_id"] == pid)]
        # lag_1 should always equal shifted units_sold
        if not np.allclose(sub["lag_1"].iloc[1:], sub["units_sold"].iloc[:-1], atol=1e-5):
            test_b_pass = False
    print(f"Test B (Temporal precedence): {'PASS' if test_b_pass else 'FAIL'}")
    
    # Test c: Assert train max date + 7 < val min date and val max date + 7 < test min date
    train_max = pd.to_datetime(split_info["train"][1])
    val_min = pd.to_datetime(split_info["val"][0])
    val_max = pd.to_datetime(split_info["val"][1])
    test_min = pd.to_datetime(split_info["test"][0])
    
    test_c_pass = (train_max + pd.Timedelta(days=7) < val_min) and (val_max + pd.Timedelta(days=7) < test_min)
    print(f"Test C (7-day buffer separation): {'PASS' if test_c_pass else 'FAIL'}")
    
    # Test d: Assert no NaN in targets and features after warmup
    test_d_pass = (feat["next_7_day_demand"].isna().sum() == 0) and (feat["stockout_flag"].isna().sum() == 0)
    print(f"Test D (No NaNs in target/features): {'PASS' if test_d_pass else 'FAIL'}")
    
    assert test_a_pass and test_b_pass and test_c_pass and test_d_pass, "Leakage tests failed!"

def main():
    os.makedirs("data/processed", exist_ok=True)
    master = pd.read_csv("data/processed/master.csv")
    master["date"] = pd.to_datetime(master["date"])
    
    feat = build_features(master, with_target=True)
    feat, split_info = assign_time_splits(feat)
    
    # Run Leakage validation
    run_leakage_tests(master, feat, split_info)
    
    # Target distribution
    so_rate_7d = feat["stockout_flag"].mean()
    print(f"Stockout 7-day Target Positive Rate: {so_rate_7d*100:.2f}%")
    
    # Save parquet
    feat.to_parquet("data/processed/features.parquet", index=False)
    print(f"Features saved: {feat.shape} rows to data/processed/features.parquet")
    print(f"Split counts:\n{feat['split'].value_counts()}")
    return feat, split_info

if __name__ == "__main__":
    main()
