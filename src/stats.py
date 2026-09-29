"""
StockSense EDA & Statistical Analysis Pipeline (Phase 2)
Generates 3 statistical tests, 7 business KPIs, and 7 EDA figures.
"""

import os
import json
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

def run_stats_pipeline():
    os.makedirs("reports", exist_ok=True)
    os.makedirs("reports/figures", exist_ok=True)
    
    # 1. Load ONLY master.csv
    df = pd.read_csv("data/processed/master.csv")
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["store_id", "product_id", "date"]).reset_index(drop=True)
    
    # 2. Compute 7-day rolling mean of sales strictly per store-product for KPI estimation
    df["rolling_mean_7"] = df.groupby(["store_id", "product_id"])["units_sold"].transform(
        lambda s: s.shift(1).rolling(7, min_periods=1).mean()
    ).fillna(df["units_sold"])
    
    # Stock-out definition for EDA: closing <= 0
    df["is_stockout"] = (df["closing"] <= 0).astype(int)
    
    # 3. Compute 7 Business KPIs
    total_revenue = float(df["revenue"].sum())
    total_units_sold = int(df["units_sold"].sum())
    stockout_rate = float(df["is_stockout"].mean())
    
    # Average inventory value & COGS
    df["inventory_value"] = df["closing"] * df["cost_price"]
    avg_inventory_value = float(df["inventory_value"].mean() * len(df[["store_id", "product_id"]].drop_duplicates()))
    total_cogs = float((df["units_sold"] * df["cost_price"]).sum())
    inventory_turnover = float(total_cogs / (avg_inventory_value + 1e-6))
    
    avg_daily_cogs = total_cogs / df["date"].nunique()
    days_of_inventory = float(avg_inventory_value / (avg_daily_cogs + 1e-6))
    
    # Promo lift: compare promo mean units vs non-promo mean units
    promo_units = df[df["promotion_flag"] == 1]["units_sold"].mean()
    nonpromo_units = df[df["promotion_flag"] == 0]["units_sold"].mean()
    promotion_lift = float(promo_units / (nonpromo_units + 1e-6))
    
    # Estimated lost sales: on stockout days, max(0, rolling_mean_7 - sold) * avg_price
    df["lost_units_est"] = np.where(
        df["is_stockout"] == 1,
        np.maximum(0, df["rolling_mean_7"] - df["units_sold"]),
        0.0
    )
    df["lost_sales_val_est"] = df["lost_units_est"] * df["avg_price"]
    estimated_lost_sales = float(df["lost_sales_val_est"].sum())
    
    kpis = {
        "revenue": round(total_revenue, 2),
        "units_sold": total_units_sold,
        "stockout_rate": round(stockout_rate, 4),
        "inventory_turnover": round(inventory_turnover, 2),
        "days_of_inventory": round(days_of_inventory, 2),
        "promotion_lift": round(promotion_lift, 4),
        "estimated_lost_sales": round(estimated_lost_sales, 2)
    }
    
    with open("reports/kpis.json", "w") as f:
        json.dump(kpis, f, indent=2)
        
    # Validation against _truth.csv (allowed ONLY for lost sales % gap check)
    lost_sales_gap_pct = None
    if os.path.exists("data/raw/_truth.csv"):
        truth_df = pd.read_csv("data/raw/_truth.csv")
        truth_df["date"] = pd.to_datetime(truth_df["date"])
        # merge price from master to compute true lost sales value
        truth_merged = pd.merge(truth_df, df[["date", "store_id", "product_id", "avg_price"]].copy(), on=["date", "store_id", "product_id"], how="left")
        true_lost_val = float((truth_merged["unmet_demand"] * truth_merged["avg_price"]).sum())
        lost_sales_gap_pct = round(abs(estimated_lost_sales - true_lost_val) / (true_lost_val + 1e-6) * 100, 2)
        print(f"Validation: Estimated Lost Sales=INR {estimated_lost_sales:,.2f} vs Truth=INR {true_lost_val:,.2f} (Gap: {lost_sales_gap_pct}%)")

    # 4. Statistical Hypothesis Tests (Exactly 3)
    stats_results = []
    
    # Test 1: Promotions increase units sold? Mann-Whitney U (one-sided)
    # Normalized by store-product mean so assortment mix doesn't confound
    sp_means = df.groupby(["store_id", "product_id"])["units_sold"].transform("mean")
    df["units_norm"] = df["units_sold"] / (sp_means + 1e-6)
    
    promo_norm = df[df["promotion_flag"] == 1]["units_norm"]
    nonpromo_norm = df[df["promotion_flag"] == 0]["units_norm"]
    
    mw_stat, mw_pval = stats.mannwhitneyu(promo_norm, nonpromo_norm, alternative="greater")
    stats_results.append({
        "question": "Do promotions increase units sold?",
        "H0": "Normalized units sold during promotions are equal to or lower than non-promotional periods",
        "H1": "Normalized units sold during promotions are significantly higher",
        "test": "Mann-Whitney U (one-sided)",
        "statistic": round(float(mw_stat), 2),
        "p_value": float(f"{mw_pval:.4e}"),
        "interpretation": f"Promotions generate a statistically significant increase in sales volume (p={mw_pval:.4e} < 0.05)." if mw_pval < 0.05 else "No significant promotional volume increase detected."
    })
    
    # Test 2: Demand differs across store types? Kruskal-Wallis
    store_type_groups = [group["units_sold"].values for _, group in df.groupby("store_type")]
    kw_stat, kw_pval = stats.kruskal(*store_type_groups)
    stats_results.append({
        "question": "Does mean demand differ significantly across store types?",
        "H0": "Sales demand distributions are identical across Hypermarket, Supermarket, and Express stores",
        "H1": "At least one store type exhibits significantly different demand distribution",
        "test": "Kruskal-Wallis H-test",
        "statistic": round(float(kw_stat), 2),
        "p_value": float(f"{kw_pval:.4e}"),
        "interpretation": f"Customer demand volume differs significantly across store formats (p={kw_pval:.4e} < 0.05)." if kw_pval < 0.05 else "Demand distribution does not significantly differ across store formats."
    })
    
    # Test 3: Stock-out associated with promotion? Chi-Square Test of Independence
    contingency = pd.crosstab(df["is_stockout"], df["promotion_flag"])
    chi2_stat, chi2_pval, _, _ = stats.chi2_contingency(contingency)
    stats_results.append({
        "question": "Is stock-out occurrence associated with active promotions?",
        "H0": "Stock-out frequency is independent of whether a promotion is running",
        "H1": "Stock-out frequency is significantly dependent on promotional activity",
        "test": "Chi-Square Test of Independence",
        "statistic": round(float(chi2_stat), 2),
        "p_value": float(f"{chi2_pval:.4e}"),
        "interpretation": f"Promotions significantly increase stock-out probability due to demand spikes (p={chi2_pval:.4e} < 0.05)." if chi2_pval < 0.05 else "Stock-out occurrences show no significant correlation with promotional events."
    })
    
    stats_df = pd.DataFrame(stats_results)
    stats_df.to_csv("reports/stats_tests.csv", index=False)
    
    # 5. Generate 7 EDA Figures
    sns.set_theme(style="whitegrid")
    palette = sns.color_palette("muted")
    
    # Fig 1: Revenue share by category + Pareto (80/20)
    plt.figure(figsize=(9, 5))
    cat_rev = df.groupby("category")["revenue"].sum().sort_values(ascending=False).reset_index()
    cat_rev["cum_pct"] = cat_rev["revenue"].cumsum() / cat_rev["revenue"].sum() * 100
    
    ax1 = sns.barplot(data=cat_rev, x="category", y="revenue", color="#2563EB")
    ax1.set_ylabel("Total Revenue (INR)")
    ax1.set_title("1. Revenue Share by Category & Pareto Cumulative Curve")
    plt.xticks(rotation=25)
    
    ax2 = ax1.twinx()
    ax2.plot(cat_rev["category"], cat_rev["cum_pct"], color="#DC2626", marker="o", linewidth=2)
    ax2.axhline(80, color="#DC2626", linestyle="--", alpha=0.6, label="80% Threshold")
    ax2.set_ylabel("Cumulative %")
    ax2.set_ylim(0, 110)
    plt.tight_layout()
    plt.savefig("reports/figures/01_category_pareto.png", dpi=150)
    plt.close()
    
    # Fig 2: Weekly revenue trend by store
    plt.figure(figsize=(9, 5))
    df["week"] = df["date"].dt.to_period("W").dt.start_time
    weekly_store = df.groupby(["week", "store_id"])["revenue"].sum().reset_index()
    sns.lineplot(data=weekly_store, x="week", y="revenue", hue="store_id", marker="o", palette="tab10")
    plt.title("2. Weekly Revenue Trend by Store")
    plt.ylabel("Weekly Revenue (INR)")
    plt.xlabel("Date")
    plt.tight_layout()
    plt.savefig("reports/figures/02_weekly_store_revenue.png", dpi=150)
    plt.close()
    
    # Fig 3: Promo vs non-promo average units
    plt.figure(figsize=(6, 5))
    promo_agg = df.groupby("promotion_flag")["units_sold"].mean().reset_index()
    promo_agg["Label"] = promo_agg["promotion_flag"].map({0: "Non-Promo", 1: "Promo Active"})
    ax = sns.barplot(data=promo_agg, x="Label", y="units_sold", palette=["#94A3B8", "#10B981"])
    plt.title("3. Promotional Lift on Average Units Sold")
    plt.ylabel("Mean Daily Units per Store-Product")
    for p in ax.patches:
        ax.annotate(f"{p.get_height():.1f}", (p.get_x() + p.get_width() / 2., p.get_height()),
                    ha='center', va='center', xytext=(0, 5), textcoords='offset points')
    plt.tight_layout()
    plt.savefig("reports/figures/03_promo_vs_nonpromo.png", dpi=150)
    plt.close()
    
    # Fig 4: Weekday vs weekend average units
    plt.figure(figsize=(6, 5))
    df["is_weekend_cal"] = df["date"].dt.dayofweek.isin([5, 6]).map({True: "Weekend", False: "Weekday"})
    wk_agg = df.groupby("is_weekend_cal")["units_sold"].mean().reset_index()
    ax = sns.barplot(data=wk_agg, x="is_weekend_cal", y="units_sold", palette=["#3B82F6", "#F59E0B"])
    plt.title("4. Weekday vs Weekend Sales Volume")
    plt.ylabel("Mean Daily Units")
    for p in ax.patches:
        ax.annotate(f"{p.get_height():.1f}", (p.get_x() + p.get_width() / 2., p.get_height()),
                    ha='center', va='center', xytext=(0, 5), textcoords='offset points')
    plt.tight_layout()
    plt.savefig("reports/figures/04_weekday_vs_weekend.png", dpi=150)
    plt.close()
    
    # Fig 5: Top 10 most volatile products (CV = std / mean)
    plt.figure(figsize=(9, 5))
    p_vol = df.groupby(["product_id", "category"]).agg(
        mean_u=("units_sold", "mean"),
        std_u=("units_sold", "std")
    ).reset_index()
    p_vol["cv"] = p_vol["std_u"] / (p_vol["mean_u"] + 1e-6)
    top10_vol = p_vol.sort_values("cv", ascending=False).head(10)
    sns.barplot(data=top10_vol, x="product_id", y="cv", hue="category", dodge=False)
    plt.title("5. Top 10 Most Volatile Products (Coefficient of Variation)")
    plt.ylabel("CV (Std / Mean)")
    plt.xticks(rotation=30)
    plt.tight_layout()
    plt.savefig("reports/figures/05_top10_volatile_products.png", dpi=150)
    plt.close()
    
    # Fig 6: Stock-out heatmap: store x category
    plt.figure(figsize=(8, 5))
    so_matrix = df.groupby(["store_id", "category"])["is_stockout"].mean().unstack() * 100
    sns.heatmap(so_matrix, annot=True, fmt=".1f", cmap="Reds", cbar_kws={'label': 'Stock-out Rate (%)'})
    plt.title("6. Stock-Out Incidence Rate (%): Store vs Category")
    plt.tight_layout()
    plt.savefig("reports/figures/06_stockout_heatmap.png", dpi=150)
    plt.close()
    
    # Fig 7: Category revenue trend
    plt.figure(figsize=(10, 5))
    cat_monthly = df.groupby([df["date"].dt.to_period("M").dt.start_time, "category"])["revenue"].sum().reset_index()
    cat_monthly.rename(columns={"date": "month"}, inplace=True)
    sns.lineplot(data=cat_monthly, x="month", y="revenue", hue="category", marker="s")
    plt.title("7. Monthly Category Revenue Trends")
    plt.ylabel("Revenue (INR)")
    plt.xlabel("Month")
    plt.tight_layout()
    plt.savefig("reports/figures/07_category_revenue_trend.png", dpi=150)
    plt.close()
    
    print("=== PHASE 2 STATS & FIGURES COMPLETE ===")
    return kpis, stats_results, lost_sales_gap_pct

if __name__ == "__main__":
    run_stats_pipeline()
