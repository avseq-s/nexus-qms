"use client";

import React, { useState } from 'react';
import { 
  Truck, 
  Package,
  CheckCircle,
  Warehouse,
  Plus,
  FileText,
  User,
  Calendar,
  Search
} from 'lucide-react';

const MOCK_READY_BOARDS = [
  { id: 'DISP-2026-009', product: 'IoT Gateway', qty: 40, passedFrom: 'TEST-2026-008', readyDate: '2026-03-27', status: 'READY', customer: '' },
  { id: 'DISP-2026-008', product: 'SmartMeter V2', qty: 100, passedFrom: 'TEST-2026-006', readyDate: '2026-03-25', status: 'DISPATCHED', customer: 'TechCorp Pvt Ltd', doNo: 'DO-2026-0441', dispDate: '2026-03-26' },
  { id: 'DISP-2026-007', product: 'PowerSupply 12V', qty: 198, passedFrom: 'TEST-2026-007', readyDate: '2026-03-24', status: 'SPLIT', customer: '', doNo: '' },
];

const FG_STORE = [
  { product: 'IoT Gateway', qty: 8, lastUpdated: '2026-03-22', location: 'FG Rack B2' },
  { product: 'SmartMeter V2', qty: 15, lastUpdated: '2026-03-18', location: 'FG Rack B1' },
  { product: 'PowerSupply 12V', qty: 48, lastUpdated: '2026-03-24', location: 'FG Rack A3' },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  READY:      { label: 'Ready to Dispatch', badge: 'badge-success' },
  DISPATCHED: { label: 'Dispatched',        badge: 'badge-info'    },
  SPLIT:      { label: 'Split — Some Stored', badge: 'badge-warning' },
  IN_STORE:   { label: 'In FG Store',       badge: 'badge-warning' },
};

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'fg'>('dispatch');
  const [selected, setSelected] = useState<any>(MOCK_READY_BOARDS[0]);
  const [dispatchForm, setDispatchForm] = useState({ customer: '', doNo: '', qty: '' });
  const [storeQty, setStoreQty] = useState('');

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Dispatch / FG Store</h1>
          <p className="text-secondary">Dispatch boards to customers or move extras to Finished Goods Store</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            style={{ background: activeTab === 'fg' ? 'rgba(59,130,246,0.1)' : '', borderColor: activeTab === 'fg' ? 'var(--accent-primary)' : '' }}
            onClick={() => setActiveTab('fg')}
          >
            <Warehouse size={16} />
            FG Store
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setActiveTab('dispatch')}
          >
            <Truck size={16} />
            Dispatch Queue
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Ready to Dispatch', value: '40', color: 'var(--success)', icon: CheckCircle },
          { label: 'Dispatched Today', value: '100', color: 'var(--accent-primary)', icon: Truck },
          { label: 'In FG Store', value: '71', color: 'var(--warning)', icon: Warehouse },
          { label: 'DOs This Month', value: '12', color: 'var(--text-secondary)', icon: FileText },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem', border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <s.icon size={26} color={s.color} />
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'dispatch' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem' }}>
          {/* Left: Board Batches List */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={18} color="var(--accent-primary)" />
              Passed Boards Queue
            </h2>
            {MOCK_READY_BOARDS.map((b) => {
              const cfg = STATUS_CONFIG[b.status];
              return (
                <div
                  key={b.id}
                  className="glass-card"
                  style={{
                    padding: '1rem', cursor: 'pointer',
                    borderLeft: selected?.id === b.id ? '3px solid var(--accent-primary)' : '3px solid var(--border-subtle)',
                    background: selected?.id === b.id ? 'rgba(59,130,246,0.05)' : 'transparent'
                  }}
                  onClick={() => setSelected(b)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.id}</span>
                    <span className={`badge ${cfg?.badge}`} style={{ fontSize: '0.65rem' }}>{cfg?.label}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{b.product}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty: {b.qty} boards • {b.readyDate}</div>
                </div>
              );
            })}
          </div>

          {/* Right: Dispatch Detail */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            {selected && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>{selected.product}</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selected.id} • Passed from: {selected.passedFrom}</p>
                  </div>
                  <span className={`badge ${STATUS_CONFIG[selected.status]?.badge}`}>{STATUS_CONFIG[selected.status]?.label}</span>
                </div>

                {/* Info row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty Available</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>{selected.qty}</p>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready Since</p>
                    <p style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.25rem' }}>{selected.readyDate}</p>
                  </div>
                </div>

                {selected.status === 'READY' ? (
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Dispatch Action</h3>
                    
                    {/* Dispatch to Customer */}
                    <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem' }}>
                      <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                        <Truck size={16} /> Dispatch to Customer
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label" style={{ fontSize: '0.75rem' }}>Customer Name</label>
                          <input className="input-field" placeholder="e.g. TechCorp Pvt Ltd" value={dispatchForm.customer} onChange={e => setDispatchForm(p => ({ ...p, customer: e.target.value }))} style={{ padding: '0.6rem 0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label" style={{ fontSize: '0.75rem' }}>Delivery Order No.</label>
                          <input className="input-field" placeholder="e.g. DO-2026-0442" value={dispatchForm.doNo} onChange={e => setDispatchForm(p => ({ ...p, doNo: e.target.value }))} style={{ padding: '0.6rem 0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label" style={{ fontSize: '0.75rem' }}>Dispatch Qty</label>
                          <input className="input-field" type="number" placeholder={String(selected.qty)} value={dispatchForm.qty} onChange={e => setDispatchForm(p => ({ ...p, qty: e.target.value }))} style={{ padding: '0.6rem 0.8rem' }} />
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ background: 'var(--success)', boxShadow: '0 4px 12px var(--success-glow)' }}>
                        <Truck size={16} /> Confirm Dispatch to Customer
                      </button>
                    </div>

                    {/* Move to FG Store */}
                    <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                      <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
                        <Warehouse size={16} /> Move Extra Boards to FG Store
                      </h4>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                          <label className="input-label" style={{ fontSize: '0.75rem' }}>Qty to Store</label>
                          <input className="input-field" type="number" placeholder="Enter qty" value={storeQty} onChange={e => setStoreQty(e.target.value)} style={{ padding: '0.6rem 0.8rem' }} />
                        </div>
                        <button className="btn btn-secondary" style={{ borderColor: 'var(--warning)', color: 'var(--warning)', marginBottom: 0 }}>
                          <Warehouse size={16} /> Move to FG Store
                        </button>
                      </div>
                    </div>
                  </div>
                ) : selected.status === 'DISPATCHED' ? (
                  <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Dispatched to</p>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{selected.customer}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>DO No: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selected.doNo}</span></p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selected.dispDate}</span></p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* FG Store Tab */
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Warehouse size={20} color="var(--accent-primary)" />
            Finished Goods Store
          </h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty in Store</th>
                  <th>Location</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {FG_STORE.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product}</td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>{item.qty}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>boards</span>
                    </td>
                    <td>{item.location}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.lastUpdated}</td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                        <Truck size={14} /> Dispatch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
