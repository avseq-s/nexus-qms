"use client";

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  FileEdit,
  CheckCircle,
  Archive,
  RotateCcw,
  Receipt,
  Truck
} from 'lucide-react';

const MOCK_NCRS = [
  { 
    ncr: 'NCR-2026-042', part: 'IC-STM32F4', defect: 'Wrong part number — IC-STM32F1 received instead', 
    source: 'IQC', status: 'OPEN', raisedBy: 'Quality Inspector', date: '2026-03-27',
    supplierAction: 'DEBIT_NOTE', debitNoteNo: '', replacementGrn: '', grn: 'GRN-1094', supplier: 'Avnet'
  },
  { 
    ncr: 'NCR-2026-041', part: 'IC-STM32F4', defect: 'Bent pins observed during IQC', 
    source: 'IQC', status: 'REVIEW', raisedBy: 'Quality Inspector', date: '2026-03-26',
    supplierAction: 'REPLACEMENT', debitNoteNo: '', replacementGrn: 'GRN-1091', grn: 'GRN-1090', supplier: 'Avnet'
  },
  { 
    ncr: 'NCR-2026-040', part: 'RES-0603-10K', defect: 'Incorrect value — 10K received as 100K', 
    source: 'IQC', status: 'REVIEW', raisedBy: 'Quality Inspector', date: '2026-03-24',
    supplierAction: 'DEBIT_NOTE', debitNoteNo: 'DN-2026-018', replacementGrn: '', grn: 'GRN-1089', supplier: 'DigiKey'
  },
  { 
    ncr: 'NCR-2026-022', part: 'PCB-MainBoard-V2', defect: 'Oxidation on pads', 
    source: 'Stores', status: 'CLOSED', raisedBy: 'Store Exec', date: '2026-02-10',
    supplierAction: 'CONCESSION', debitNoteNo: '', replacementGrn: '', grn: 'GRN-1060', supplier: 'Local Supplier A'
  },
];

const SUPPLIER_ACTION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  DEBIT_NOTE:  { label: 'Debit Note',  icon: Receipt,  color: 'var(--danger)'          },
  REPLACEMENT: { label: 'Replacement', icon: RotateCcw, color: 'var(--warning)'        },
  CONCESSION:  { label: 'Concession',  icon: CheckCircle, color: 'var(--text-secondary)' },
};

export default function NcrCapaPage() {
  const [activeTab, setActiveTab] = useState('open');
  const [selectedNcr, setSelectedNcr] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});

  function openManage(ncr: any) {
    setSelectedNcr(ncr);
    setEditData({ debitNoteNo: ncr.debitNoteNo, replacementGrn: ncr.replacementGrn, rootCause: '', capa: '' });
  }

  const filtered = MOCK_NCRS.filter(n => activeTab === 'open' ? n.status !== 'CLOSED' : n.status === 'CLOSED');

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">NCR & Rejections</h1>
          <p className="text-secondary">Non-Conformance Reports, Debit Notes & Supplier Actions (ISO 9001 §8.7, §10.2)</p>
        </div>
        <button className="btn btn-danger">
          <Plus size={16} />
          Raise NCR
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--danger)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Open NCRs</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>2</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--warning)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Pending Supplier Action</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>2</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--accent-primary)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Debit Notes Raised</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>1</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--success)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Closed This Month</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>1</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedNcr ? '1.2fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* NCR Table Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ background: activeTab === 'open' ? 'var(--danger)' : 'transparent', color: activeTab === 'open' ? 'white' : 'var(--text-secondary)', padding: '0.5rem 1rem' }}
                onClick={() => setActiveTab('open')}>
                <AlertTriangle size={15} /> Open & Review
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ background: activeTab === 'closed' ? 'var(--bg-tertiary)' : 'transparent', color: activeTab === 'closed' ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '0.5rem 1rem' }}
                onClick={() => setActiveTab('closed')}>
                <Archive size={15} /> Closed
              </button>
            </div>
            <div className="input-group" style={{ marginBottom: 0, width: '260px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="input-field" placeholder="Search NCRs..." style={{ paddingLeft: '2.25rem' }} />
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>NCR No.</th>
                  <th>Part / Issue</th>
                  <th>Supplier</th>
                  <th>Supplier Action</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ncr => {
                  const sa = SUPPLIER_ACTION_LABELS[ncr.supplierAction];
                  return (
                    <tr key={ncr.ncr} style={{ cursor: 'pointer', background: selectedNcr?.ncr === ncr.ncr ? 'rgba(59,130,246,0.05)' : '' }}>
                      <td style={{ fontWeight: 600, color: ncr.status === 'OPEN' ? 'var(--danger)' : 'var(--accent-primary)' }}>{ncr.ncr}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ncr.part}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ncr.defect.substring(0, 40)}{ncr.defect.length > 40 ? '…' : ''}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{ncr.supplier}</td>
                      <td>
                        {sa && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: sa.color, fontSize: '0.82rem', fontWeight: 600 }}>
                            <sa.icon size={13} />
                            {sa.label}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${ncr.status === 'OPEN' ? 'badge-danger' : ncr.status === 'REVIEW' ? 'badge-warning' : 'badge-success'}`}>
                          {ncr.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{ncr.date}</td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }} onClick={() => openManage(ncr)}>
                          <FileEdit size={13} /> Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No {activeTab} NCRs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NCR Detail Panel */}
        {selectedNcr && (
          <div className="glass-panel animate-fade-in" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', color: 'var(--danger)', marginBottom: '0.2rem' }}>{selectedNcr.ncr}</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedNcr.part} • GRN: {selectedNcr.grn}</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setSelectedNcr(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Defect Description</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>{selectedNcr.defect}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supplier</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedNcr.supplier}</p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Required Action</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: SUPPLIER_ACTION_LABELS[selectedNcr.supplierAction]?.color }}>
                  {SUPPLIER_ACTION_LABELS[selectedNcr.supplierAction]?.label}
                </p>
              </div>
            </div>

            {/* Action Fields based on type */}
            {selectedNcr.supplierAction === 'DEBIT_NOTE' && (
              <div className="input-group">
                <label className="input-label">Debit Note Number</label>
                <input className="input-field" placeholder="e.g. DN-2026-019" value={editData.debitNoteNo} onChange={e => setEditData((p: any) => ({ ...p, debitNoteNo: e.target.value }))} />
              </div>
            )}
            {selectedNcr.supplierAction === 'REPLACEMENT' && (
              <div className="input-group">
                <label className="input-label">Replacement GRN Reference</label>
                <input className="input-field" placeholder="e.g. GRN-1095 (when received)" value={editData.replacementGrn} onChange={e => setEditData((p: any) => ({ ...p, replacementGrn: e.target.value }))} />
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Root Cause</label>
              <textarea className="input-field" rows={2} placeholder="What caused this non-conformance?" value={editData.rootCause} onChange={e => setEditData((p: any) => ({ ...p, rootCause: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Corrective & Preventive Action (CAPA)</label>
              <textarea className="input-field" rows={2} placeholder="Actions taken to prevent recurrence..." value={editData.capa} onChange={e => setEditData((p: any) => ({ ...p, capa: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}>Save Draft</button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--success)' }}>
                <CheckCircle size={15} /> Close NCR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
