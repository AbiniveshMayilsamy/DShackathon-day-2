const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface WeeklyRevenueEntry {
  week: string;
  [store: string]: number | string;
}

export interface CategoryRevenueShare {
  category: string;
  revenue: number;
  pct: number;
}

export interface WeeklyUnitsEntry {
  week: string;
  [category: string]: number | string;
}

export interface ExecutiveSummary {
  revenue: number;
  growth_pct: number;
  stockout_rate: number;
  inventory_value: number;
  products_at_risk: number;
  total_active_items: number;
  weekly_revenue_by_store: WeeklyRevenueEntry[];
  category_revenue_share: CategoryRevenueShare[];
  weekly_units_by_category: WeeklyUnitsEntry[];
}

export interface PredictionItem {
  store_id: string;
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  incoming_stock: number;
  forecast_7d: number;
  stockout_prob: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  reorder_qty: number;
  reasons: string[];
  action: string;
  priority_score: number;
  confidence: 'high' | 'low';
  low_history: number;
  avg_price: number;
  date: string;
}

export interface WhatIfBaseline {
  store_id: string;
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  incoming_stock: number;
  forecast_7d: number;
  stockout_prob: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  reorder_qty: number;
  reasons: string[];
  action: string;
  priority_score: number;
  confidence: 'high' | 'low';
  low_history: number;
  avg_price: number;
  date: string;
}

export interface WhatIfSimulated {
  forecast_7d: number;
  stockout_prob: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  reorder_qty: number;
  safety_stock: number;
  action: string;
  reasons: string[];
}

export interface WhatIfDeltas {
  forecast_diff: number;
  stockout_prob_diff: number;
  reorder_qty_diff: number;
  risk_changed: number;
}

export interface WhatIfResponse {
  store_id: string;
  product_id: string;
  baseline: WhatIfBaseline;
  simulated: WhatIfSimulated;
  deltas: WhatIfDeltas;
}

export interface WhatIfRequest {
  store_id: string;
  product_id: string;
  discount_pct?: number;
  supplier_delay_days?: number;
  festival?: number;
}

export interface ForecastHistoryItem {
  date: string;
  actual: number;
  forecast: number;
}

export interface FeatureImportanceItem {
  group: string;
  label: string;
  importance: number;
}

export interface TierCalibrationItem {
  risk_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  row_count: number;
  actual_stockout_rate: number;
  pct_share: number;
}

export interface ModelMetricsResponse {
  metrics: {
    demand_model: {
      name: string;
      test_mae: number;
      test_rmse: number;
      test_mape: number;
      test_r2: number;
      baseline_mae: number;
    };
    stockout_model: {
      name: string;
      test_accuracy: number;
      test_precision: number;
      test_recall: number;
      test_f1: number;
      test_roc_auc: number;
      test_brier: number;
      baseline_recall: number;
      baseline_roc_auc: number;
      confusion_matrix: number[][];
      tier_calibration: TierCalibrationItem[];
    };
  };
  comparison: Array<{
    task: string;
    model: string;
    MAE?: number;
    RMSE?: number;
    MAPE?: number;
    R2?: number;
    Accuracy?: number;
    Precision?: number;
    Recall?: number;
    F1?: number;
    ROC_AUC?: number;
    Brier?: number;
    split: string;
  }>;
  tier_calibration: TierCalibrationItem[];
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSummary(): Promise<ExecutiveSummary> {
  const res = await fetch(`${BASE_URL}/summary`);
  if (!res.ok) throw new Error(`Failed to fetch summary: ${res.statusText}`);
  return res.json();
}

export async function fetchPredictions(params?: {
  store?: string;
  risk?: string;
  category?: string;
  limit?: number;
}): Promise<PredictionItem[]> {
  const url = new URL(`${BASE_URL}/predictions`);
  if (params?.store) url.searchParams.set('store', params.store);
  if (params?.risk) url.searchParams.set('risk', params.risk);
  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch predictions: ${res.statusText}`);
  return res.json();
}

export async function fetchPredictionDetail(
  storeId: string,
  productId: string
): Promise<PredictionItem> {
  const res = await fetch(`${BASE_URL}/predictions/${storeId}/${productId}`);
  if (!res.ok) throw new Error(`Failed to fetch prediction detail: ${res.statusText}`);
  return res.json();
}

export async function fetchForecastHistory(
  storeId: string,
  productId: string
): Promise<ForecastHistoryItem[]> {
  const res = await fetch(`${BASE_URL}/forecast/${storeId}/${productId}`);
  if (!res.ok) throw new Error(`Failed to fetch forecast history: ${res.statusText}`);
  return res.json();
}

export async function fetchModelMetrics(): Promise<ModelMetricsResponse> {
  const res = await fetch(`${BASE_URL}/model/metrics`);
  if (!res.ok) throw new Error(`Failed to fetch model metrics: ${res.statusText}`);
  return res.json();
}

export async function fetchFeatureImportance(): Promise<FeatureImportanceItem[]> {
  const res = await fetch(`${BASE_URL}/model/importance`);
  if (!res.ok) throw new Error(`Failed to fetch feature importance: ${res.statusText}`);
  return res.json();
}

export async function simulateWhatIf(req: WhatIfRequest): Promise<WhatIfResponse> {
  const res = await fetch(`${BASE_URL}/whatif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Failed to run what-if simulation: ${res.statusText}`);
  return res.json();
}

export function getExportOrdersUrl(): string {
  return `${BASE_URL}/export/orders.csv`;
}
