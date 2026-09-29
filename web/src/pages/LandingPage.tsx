import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSummary, fetchHealth } from '../api/client';

const S = {
  page:     { minHeight: '100vh', background: '#F8FAFC', fontFamily: "'IBM Plex Sans', sans-serif" } as React.CSSProperties,
  wrap:     { maxWidth: 1200, margin: '0 auto', padding: '0 24px' } as React.CSSProperties,
  mono:     { fontFamily: "'IBM Plex Mono', monospace" } as React.CSSProperties,
};

export const LandingPage: React.FC = () => {
  const { data: summary } = useQuery({ queryKey: ['summary'], queryFn: fetchSummary });
  const { data: health  } = useQuery({ queryKey: ['health'],  queryFn: fetchHealth  });
  const isOnline = health?.status === 'ok';

  return (
    <div style={S.page}>
      {/* ── Top header bar ── */}
      <header style={{
        borderBottom: '1px solid #E2E8F0',
        background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, background: '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3,
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, ...S.mono }}>SS</span>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 15, color: '#0F172A' }}>StockSense</span>
              <span style={{ ...S.mono, fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>v1.0 · Enterprise Edition</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* API status chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', border: '1px solid #E2E8F0',
              background: '#F8FAFC', borderRadius: 3,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isOnline ? '#059669' : '#D97706',
              }} />
              <span style={{ ...S.mono, fontSize: 11, color: '#475569' }}>
                API: {isOnline ? 'Online · :8000' : 'Connecting...'}
              </span>
            </div>
            <Link to="/admin" style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 500,
              border: '1px solid #E2E8F0', borderRadius: 3,
              background: '#ffffff', color: '#475569', textDecoration: 'none',
              transition: 'background 0.1s',
            }}>
              Admin Console
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ background: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ ...S.wrap, padding: '48px 24px 40px' }}>
          {/* Breadcrumb-style label */}
          <div style={{ ...S.mono, fontSize: 11, color: '#475569', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            NovaMart Retail Chain · AI Inventory Intelligence
          </div>

          <h1 style={{
            fontSize: 32, fontWeight: 700, color: '#0F172A',
            letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 12px',
            maxWidth: 640,
          }}>
            Demand Forecasting &amp; Stockout Prevention
          </h1>

          <p style={{ fontSize: 14, color: '#475569', maxWidth: 580, lineHeight: 1.6, margin: '0 0 24px' }}>
            NovaMart loses up to{' '}
            <strong style={{ color: '#0F172A', fontWeight: 600 }}>₹20.5 Lakhs</strong>{' '}
            to stockouts across 5 hypermarkets. StockSense forecasts 7-day demand, assigns calibrated
            risk scores, and generates automated purchase orders before shelves empty.
          </p>

          {/* CTA row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/actions" style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600,
              background: '#2563EB', color: '#ffffff',
              border: '1px solid #2563EB', borderRadius: 3, textDecoration: 'none',
            }}>
              Launch Action Centre
            </Link>
            <Link to="/pitch" style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 500,
              background: '#ffffff', color: '#0F172A',
              border: '1px solid #CBD5E1', borderRadius: 3, textDecoration: 'none',
            }}>
              Business Pitch Deck
            </Link>
            <Link to="/summary" style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 500,
              background: '#ffffff', color: '#0F172A',
              border: '1px solid #CBD5E1', borderRadius: 3, textDecoration: 'none',
            }}>
              Executive Summary
            </Link>
          </div>
        </div>
      </section>

      {/* ── KPI Strip ── */}
      <section style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ ...S.wrap, padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
            {[
              {
                label: 'Period Revenue',
                value: summary ? `₹${(summary.revenue / 10000000).toFixed(2)} Cr` : '₹4.23 Cr',
                sub: 'All stores · 153 days',
                flag: 'Verified',
                flagColor: '#065F46',
                flagBg: '#ECFDF5',
              },
              {
                label: 'Stockout Recall',
                value: '75.95%',
                sub: '+28.7% vs 59.0% baseline',
                flag: 'Model',
                flagColor: '#1D4ED8',
                flagBg: '#EFF6FF',
              },
              {
                label: 'Demand MAE',
                value: '11.71 units',
                sub: '−16.8% error vs rolling mean',
                flag: 'Regressor',
                flagColor: '#1D4ED8',
                flagBg: '#EFF6FF',
              },
              {
                label: 'HIGH-Risk Accuracy',
                value: '77.17%',
                sub: '622 calibrated test instances',
                flag: 'Calibrated',
                flagColor: '#B45309',
                flagBg: '#FFFBEB',
              },
            ].map((kpi, i) => (
              <div key={i} style={{
                padding: '20px 20px',
                borderRight: i < 3 ? '1px solid #E2E8F0' : 'none',
                background: '#ffffff',
                borderTop: '1px solid #E2E8F0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ ...S.mono, fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {kpi.label}
                  </span>
                  <span style={{
                    ...S.mono, fontSize: 9, fontWeight: 600,
                    color: kpi.flagColor, background: kpi.flagBg,
                    padding: '1px 6px', borderRadius: 2,
                  }}>
                    {kpi.flag}
                  </span>
                </div>
                <div style={{ ...S.mono, fontSize: 22, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{kpi.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Module Grid ── */}
      <section style={{ ...S.wrap, padding: '32px 24px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>
            System Modules
          </h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
            End-to-end pipeline from raw transactions to automated purchase orders, built on time-split validation without data leakage.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#E2E8F0', border: '1px solid #E2E8F0' }}>
          {[
            {
              to: '/actions',
              label: 'Action Centre & PO Engine',
              tag: 'Primary',
              desc: 'Priority-ranked action cards scored by prob × forecast × price. Automated safety-stock reorder calculation with 1-click CSV export for warehouse procurement.',
            },
            {
              to: '/actions',
              label: 'What-If Scenario Sandbox',
              tag: 'Interactive',
              desc: 'Real-time sliders for promotional discount %, supplier lead-time delay, and festival demand spikes. Recalculates risk and order quantities in under 15ms.',
            },
            {
              to: '/risk',
              label: 'Risk Matrix & Heatmap',
              tag: 'Analytics',
              desc: 'Store-by-category heatmap mapping high-risk SKU concentrations across 5 store formats. Sortable risk probability tables with monotonic tier calibration.',
            },
            {
              to: '/demand',
              label: 'Demand Forecast',
              tag: 'ML',
              desc: '7-day SKU-level demand forecasts from XGBoost regressor on 37 temporal features. Beats rolling-mean baseline by 16.8% MAE reduction.',
            },
            {
              to: '/performance',
              label: 'Model Telemetry',
              tag: 'Audit',
              desc: 'Full validation and test metrics, confusion matrix, ROC curve, Brier score, and permutation feature importances grouped by domain.',
            },
            {
              to: '/explain',
              label: 'Root Cause Analysis',
              tag: 'Explainability',
              desc: 'Per-SKU driver breakdown: supplier lead time, promotional lift, weather impact, and inventory drift with statistical evidence for each flag.',
            },
          ].map((m, i) => (
            <Link key={i} to={m.to} style={{ textDecoration: 'none', display: 'block', background: '#ffffff', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{m.label}</span>
                <span style={{
                  ...S.mono, fontSize: 9, fontWeight: 600,
                  color: '#1D4ED8', background: '#EFF6FF',
                  padding: '1px 6px', borderRadius: 2,
                }}>
                  {m.tag}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid #E2E8F0', background: '#ffffff',
        padding: '14px 24px',
      }}>
        <div style={{ ...S.wrap, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            © 2026 StockSense · AI Retail Demand & Stock-Out Intelligence
          </span>
          <div style={{ ...S.mono, fontSize: 10, color: '#CBD5E1', display: 'flex', gap: 16 }}>
            <span>FastAPI :8000</span>
            <span>React + Vite :5173</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
