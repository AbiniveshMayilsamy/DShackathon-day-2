import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/client';

const portalItem = { path: '/landing', label: 'Overview Portal', tag: 'Home' };

const navItems = [
  { path: '/actions',     label: 'Action Centre',       tag: 'LIVE' },
  { path: '/summary',     label: 'Executive Summary',   tag: 'LIVE' },
  { path: '/demand',      label: 'Demand Forecast',     tag: 'LIVE' },
  { path: '/risk',        label: 'Risk Matrix',         tag: 'LIVE' },
  { path: '/performance', label: 'Model Telemetry',     tag: 'LIVE' },
  { path: '/explain',     label: 'Root Cause Analysis', tag: 'LIVE' },
];

const govItems = [
  { path: '/admin', label: 'Admin Console',  tag: 'OPS'   },
  { path: '/pitch', label: 'Business Pitch', tag: 'DECK'  },
];

/* ── tiny SVG icons — no emojis ── */
const IconGrid = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/>
    <rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/>
  </svg>
);
const IconGear = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42"/>
  </svg>
);
const IconPresent = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="2" width="14" height="10"/><path d="M5 14h6M8 12v2"/>
  </svg>
);

export const Sidebar: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  const isOnline = health?.status === 'ok';

  return (
    <aside
      style={{
        width: 224,
        background: '#ffffff',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Wordmark */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E2E8F0' }}>
        <NavLink to="/landing" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3,
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>SS</span>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', lineHeight: 1.2 }}>StockSense</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
              Retail Intelligence · v1.0
            </div>
          </div>
        </NavLink>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {/* Portal */}
        <NavLink
          to={portalItem.path}
          style={({ isActive }) => navStyle(isActive)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconGrid />
            <span>{portalItem.label}</span>
          </div>
          <Tag label={portalItem.tag} variant="neutral" />
        </NavLink>

        {/* Section label */}
        <SectionLabel>Operational Views</SectionLabel>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => navStyle(isActive)}
          >
            <span>{item.label}</span>
            <Tag label={item.tag} variant="live" />
          </NavLink>
        ))}

        {/* Governance */}
        <SectionLabel>Governance</SectionLabel>

        <NavLink to={govItems[0].path} style={({ isActive }) => navStyle(isActive)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconGear />
            <span>{govItems[0].label}</span>
          </div>
          <Tag label={govItems[0].tag} variant="neutral" />
        </NavLink>

        <NavLink to={govItems[1].path} style={({ isActive }) => navStyle(isActive)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconPresent />
            <span>{govItems[1].label}</span>
          </div>
          <Tag label={govItems[1].tag} variant="neutral" />
        </NavLink>
      </nav>

      {/* API Health Footer */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #E2E8F0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 3,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isOnline ? '#059669' : '#D97706',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>FastAPI Engine</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#94A3B8' }}>
            {isOnline ? '8000 · OK' : 'Connecting'}
          </span>
        </div>
      </div>
    </aside>
  );
};

/* ── helpers ── */
function navStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    marginBottom: 1,
    borderRadius: 3,
    fontSize: 13,
    fontWeight: isActive ? 500 : 400,
    color: isActive ? '#0F172A' : '#475569',
    background: isActive ? '#F1F5F9' : 'transparent',
    borderLeft: isActive ? '2px solid #2563EB' : '2px solid transparent',
    textDecoration: 'none',
    transition: 'background 0.1s, color 0.1s',
    cursor: 'pointer',
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#94A3B8',
      padding: '14px 8px 5px',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {children}
    </div>
  );
}

function Tag({ label, variant }: { label: string; variant: 'live' | 'neutral' }) {
  const styles: React.CSSProperties =
    variant === 'live'
      ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
      : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
  return (
    <span style={{
      ...styles,
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9,
      fontWeight: 600,
      padding: '1px 5px',
      borderRadius: 2,
      letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  );
}

export default Sidebar;
