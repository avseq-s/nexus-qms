"use client";

import React, { useState } from 'react';
import { 
  Factory, 
  Calculator, 
  ShoppingCart, 
  ChevronRight,
  TrendingDown,
  Layers
} from 'lucide-react';

const MOCK_PRD_ORDERS = [
  { id: 'WO-2026-90', product: 'SmartMeter V2', reqQty: 500, status: 'Draft', date: '2026-04-10' },
  { id: 'WO-2026-88', product: 'IoT Gateway', reqQty: 200, status: 'Shortage', date: '2026-04-05' },
  { id: 'WO-2026-85', product: 'PowerSupply 12V', reqQty: 1000, status: 'Ready to Kit', date: '2026-04-01' },
];

const MOCK_SHORTAGE = [
  { part: 'IC-STM32F4', desc: 'MCU 32-bit ARM Cortex-M4', required: 700, available: 250, shortage: 450, leadTime: '8 Weeks', prRaised: false },
  { part: 'CAP-0402-104K', desc: '100nF 10V X7R 0402', required: 4500, available: 500, shortage: 4000, leadTime: '2 Weeks', prRaised: true },
];

export default function ProductionPlanningPage() {
  const [activeWo, setActiveWo] = useState<string | null>(null);

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Production & Materials Planning</h1>
          <p className="text-secondary">BOM-driven requirement and Shortage Management</p>
        </div>
        <button className="btn btn-primary">
          <Factory size={16} />
          Create Work Order
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '1.5rem' }}>
        
        {/* Left Column - Work Orders */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Layers size={20} color="var(--accent-primary)" />
            Active Work Orders
          </h2>
          
          {MOCK_PRD_ORDERS.map((wo, i) => (
            <div 
              key={i} 
              className="glass-card" 
              style={{ 
                padding: '1rem', 
                cursor: 'pointer', 
                borderLeft: activeWo === wo.id ? '3px solid var(--accent-primary)' : '3px solid var(--border-subtle)',
                background: activeWo === wo.id ? 'var(--bg-tertiary)' : 'transparent'
              }}
              onClick={() => setActiveWo(wo.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{wo.id}</span>
                <span className={`badge ${
                  wo.status === 'Ready to Kit' ? 'badge-success' : 
                  wo.status === 'Shortage' ? 'badge-danger' : 
                  'badge-warning'
                }`}>
                  {wo.status}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{wo.product}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Req: {wo.reqQty} units</span>
                <span>Date: {wo.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - BOM Calculation */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                Shortage Calculation
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Consolidating Demand vs Available Inventory</p>
            </div>
            <button className="btn btn-secondary">
              <Calculator size={16} />
              Run Full MRP
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>
            <TrendingDown size={18} />
            Critical Shortages Detected
          </div>

          <div className="table-container" style={{ marginBottom: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Required</th>
                  <th>Available</th>
                  <th>Shortage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SHORTAGE.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{item.part}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </td>
                    <td>{item.required}</td>
                    <td>{item.available}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{item.shortage}</td>
                    <td>
                      {item.prRaised ? (
                        <span className="badge badge-info" style={{ background: 'var(--bg-tertiary)' }}>PR Raised</span>
                      ) : (
                        <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'var(--warning)', color: '#000' }}>
                          <ShoppingCart size={14} /> Raise PR
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Purchase Requisition Approval Workflow</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              PR generation automatically initiates the Purchase approval workflow up to Dept Heads based on value limit, as per ISO 9001 Procurement controls.
            </p>
            <button className="btn btn-secondary">
              View Pending PRs <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
