"use client";

import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight,
  TrendingDown,
  Truck,
  ShieldAlert,
  PackageCheck,
  Cpu,
  Package,
  ChevronRight
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Operations Dashboard</h1>
          <p className="text-secondary">Live pipeline from material arrival to customer dispatch</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/inventory" style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary">
              <Package size={16} />
              Receive New GRN
            </button>
          </a>
          <a href="/quality/iqc" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary">
              Launch IQC
              <ArrowUpRight size={16} />
            </button>
          </a>
        </div>
      </div>

      {/* Pipeline Flow */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Live Production Pipeline</h2>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto' }}>
          {[
            { step: 'Store Count & GRN', count: 5, unit: 'Pending items', color: '#6366f1', href: '/inventory', icon: Package },
            { step: 'Pending IQC', count: 3, unit: 'Items', color: '#f59e0b', href: '/quality/iqc', icon: Package },
            { step: 'In Store', count: 47, unit: 'Reel Types', color: '#10b981', href: '/inventory', icon: Package },
            { step: 'Kitting / EMS', count: 2, unit: 'Active Kits', color: '#3b82f6', href: '/kitting', icon: PackageCheck },
            { step: 'Programming & Testing', count: 50, unit: 'Boards', color: '#8b5cf6', href: '/testing', icon: Cpu },
            { step: 'Dispatch / FG Store', count: 40, unit: 'Ready', color: '#10b981', href: '/dispatch', icon: Truck },
          ].map((stage, i) => (
            <React.Fragment key={i}>
              <a href={stage.href} style={{ textDecoration: 'none', flex: 1, minWidth: '120px' }}>
                <div style={{
                  background: `${stage.color}12`,
                  border: `1px solid ${stage.color}30`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${stage.color}22`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${stage.color}12`)}
                >
                  <stage.icon size={22} color={stage.color} style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stage.color, lineHeight: 1 }}>{stage.count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stage.unit}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontWeight: 500 }}>{stage.step}</div>
                </div>
              </a>
              {i < 5 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.25rem', color: 'var(--text-muted)' }}>
                  <ChevronRight size={18} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <MetricCard title="Open NCRs" value="2" trend="+1 this week" trendType="negative" icon={AlertCircle} color="var(--danger)" />
        <MetricCard title="IQC Pass Rate" value="94%" trend="+2% vs last month" trendType="positive" icon={TrendingUp} color="var(--success)" />
        <MetricCard title="Avg Supplier Score" value="92%" trend="4 approved suppliers" trendType="positive" icon={CheckCircle2} color="var(--success)" />
        <MetricCard title="FG Store Stock" value="71" trend="boards ready" trendType="neutral" icon={Package} color="var(--accent-primary)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Recent Audit Trail */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Activity Log</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { time: '15 min ago', action: 'Material Counted & GRN Created', user: 'Store_Team', entity: 'GRN-1095 • Supplier: Avnet', color: '#6366f1' },
                { time: '1 hr ago', action: 'IQC Approved', user: 'QualityInspector1', entity: 'GRN-1092 • RES-0603-10K → Moved to Store', color: 'var(--success)' },
                { time: '2 hrs ago', action: 'NCR Raised — IQC Rejection', user: 'QualityInspector1', entity: 'NCR-2026-042 • Purchase Team Notified', color: 'var(--danger)' },
                { time: '3 hrs ago', action: 'Kit Dispatched to EMS', user: 'Store_Manager', entity: 'KIT-2026-012 • Precision PCB Assemblies', color: 'var(--accent-primary)' },
                { time: '5 hrs ago', action: 'Boards Dispatched to Customer', user: 'Dispatch_Team', entity: '100 × SmartMeter V2 → TechCorp Pvt Ltd', color: 'var(--success)' },
                { time: 'Yesterday', action: 'NCR Closed with CAPA', user: 'Quality_Head', entity: 'NCR-2026-022 • Debit Note DN-2026-017', color: 'var(--text-muted)' },
              ].map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${log.color}` }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.action}</span>
                    <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{log.entity}</span>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '110px' }}>
                    <div style={{ fontSize: '0.8rem' }}>{log.user}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Supplier Performance */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Supplier Performance</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {[
                { name: 'Mouser Electronics', score: '98%', color: 'var(--success)' },
                { name: 'DigiKey', score: '96%', color: 'var(--success)' },
                { name: 'Avnet', score: '88%', color: 'var(--warning)' },
                { name: 'Local Supplier A', score: '74%', color: 'var(--danger)' },
              ].map((sup, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'grid', placeItems: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: '0.875rem' }}>{sup.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: sup.color, fontSize: '0.875rem' }}>{sup.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NCR Actions Pending */}
          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.3)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--danger)' }}>⚠ Action Required</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Avnet', action: 'Debit Note pending for NCR-2026-042', urgent: true },
                { label: 'Local Supplier A', action: 'Score dropped below 80% — review required', urgent: false },
              ].map((item, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${item.urgent ? 'var(--danger)' : 'var(--warning)'}` }}>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.label}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Readiness */}
          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(16,185,129,0.3)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--success)' }}>Audit Readiness</h2>
            <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
              <div style={{ width: '96%', height: '100%', background: 'var(--success)' }} />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Store Check→IQC→Inventory→EMS→Test→Dispatch trail active. 2 open NCRs require closure before audit.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, trendType, icon: Icon, color }: any) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</h3>
        <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ 
          fontSize: '0.825rem', 
          marginTop: '0.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.25rem',
          color: trendType === 'positive' ? 'var(--success)' : trendType === 'negative' ? 'var(--danger)' : 'var(--text-muted)'
        }}>
          {trendType === 'positive' ? <TrendingUp size={14} /> : trendType === 'negative' ? <TrendingDown size={14} /> : null}
          {trend}
        </div>
      </div>
    </div>
  );
}
