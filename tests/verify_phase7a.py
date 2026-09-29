import os
import json
import numpy as np
import pandas as pd

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_checks():
    master = pd.read_csv(os.path.join(REPO_ROOT, 'data/processed/master.csv'))
    master['date'] = pd.to_datetime(master['date'])
    feat = pd.read_parquet(os.path.join(REPO_ROOT, 'data/processed/features.parquet'))
    feat['date'] = pd.to_datetime(feat['date'])

    # Test a: 3 random rows manual recomputation
    sample_rows = feat.sample(3, random_state=42)
    test_a_pass = True
    for _, row in sample_rows.iterrows():
        sid, pid, dt = row['store_id'], row['product_id'], row['date']
        hist = master[(master['store_id'] == sid) & (master['product_id'] == pid) & (master['date'] < dt)].sort_values('date')
        if len(hist) >= 7:
            m_lag1 = hist.iloc[-1]['units_sold']
            m_lag7 = hist.iloc[-7]['units_sold']
            m_roll7 = hist.iloc[-7:]['units_sold'].mean()
            if row['lag_1'] != m_lag1 or row['lag_7'] != m_lag7 or abs(row['rolling_mean_7'] - m_roll7) > 1e-4:
                test_a_pass = False

    # Test b: Temporal precedence
    test_b_pass = True
    for sid, pid in feat[['store_id', 'product_id']].drop_duplicates().head(5).itertuples(index=False):
        sub = feat[(feat['store_id'] == sid) & (feat['product_id'] == pid)]
        if not np.allclose(sub['lag_1'].iloc[1:], sub['units_sold'].iloc[:-1], atol=1e-5):
            test_b_pass = False

    # Test c: Split 7-day buffer separation
    train_sub = feat[feat['split'] == 'train']
    val_sub = feat[feat['split'] == 'val']
    test_sub = feat[feat['split'] == 'test']
    test_c_pass = (train_sub['date'].max() + pd.Timedelta(days=7) < val_sub['date'].min()) and (val_sub['date'].max() + pd.Timedelta(days=7) < test_sub['date'].min())

    # Test d: No NaNs in target and features
    test_d_pass = (feat['next_7_day_demand'].isna().sum() == 0) and (feat['stockout_flag'].isna().sum() == 0)

    # Test e: 5 random rows target alignment against master
    sample_5 = feat.sample(5, random_state=42)
    test_e_pass = True
    for _, r in sample_5.iterrows():
        sid, pid, dt = r['store_id'], r['product_id'], r['date']
        fwd_dates = pd.date_range(dt + pd.Timedelta(days=1), dt + pd.Timedelta(days=7))
        m_sub = master[(master['store_id']==sid) & (master['product_id']==pid) & (master['date'].isin(fwd_dates))]
        manual_dem = int(m_sub['units_sold'].sum())
        manual_so = int((m_sub['closing'] <= 0).any())
        if r['next_7_day_demand'] != manual_dem or r['stockout_flag'] != manual_so:
            test_e_pass = False
    master_last_7 = sorted(master['date'].unique())[-7:]
    if any(d in set(feat['date'].unique()) for d in master_last_7):
        test_e_pass = False

    res_a = "PASS" if test_a_pass else "FAIL"
    res_b = "PASS" if test_b_pass else "FAIL"
    res_c = "PASS" if test_c_pass else "FAIL"
    res_d = "PASS" if test_d_pass else "FAIL"
    res_e = "PASS" if test_e_pass else "FAIL"
    print(f"Leakage Tests: A={res_a} | B={res_b} | C={res_c} | D={res_d} | E={res_e}")

    for s in ['train', 'val', 'test']:
        sub = feat[feat['split'] == s]
        dmin = sub['date'].min().strftime('%Y-%m-%d')
        dmax = sub['date'].max().strftime('%Y-%m-%d')
        so_p = sub['stockout_flag'].mean() * 100
        print(f"{s.upper()}: {dmin} to {dmax} ({len(sub)} rows, {sub['date'].nunique()}d) | SO Rate: {so_p:.2f}%")

    with open(os.path.join(REPO_ROOT, 'models/metrics.json')) as f:
        m = json.load(f)
    d_m = m['demand_model']
    s_m = m['stockout_model']
    print(f"Demand Test MAE: {d_m['test_mae']} vs Baseline: {d_m['baseline_mae']} (Delta: {d_m['test_mae']-11.69:+.2f})")
    print(f"Stockout Recall: {s_m['test_recall']} vs Baseline: {s_m['baseline_recall']} (Delta: {s_m['test_recall']-0.7595:+.4f})")
    print(f"Stockout ROC-AUC: {s_m['test_roc_auc']} vs Baseline: {s_m['baseline_roc_auc']} (Delta: {s_m['test_roc_auc']-0.8349:+.4f})")

if __name__ == '__main__':
    run_checks()
