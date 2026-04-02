"use client";

import React, { useState } from 'react';
import { 
  FileText, 
  FileCheck, 
  History, 
  Upload, 
  Clock, 
  Eye, 
  CheckCircle2 
} from 'lucide-react';

const MOCK_DOCS = [
  { id: 'SOP-INV-001', title: 'Inventory Management Procedure', rev: 'C', status: 'APPROVED', lastUpdated: '2026-01-15', author: 'S. Smith', approver: 'J. Doe' },
  { id: 'SOP-QA-022', title: 'IQC Inspection Standards', rev: 'B', status: 'IN_REVIEW', lastUpdated: '2026-03-24', author: 'K. Lee', approver: 'Pending' },
  { id: 'FMT-QA-001', title: 'Incoming Quality Inspection Form', rev: 'A', status: 'APPROVED', lastUpdated: '2025-11-02', author: 'K. Lee', approver: 'J. Doe' },
  { id: 'SOP-PRD-004', title: 'SMT Line Setup', rev: 'D', status: 'DRAFT', lastUpdated: '2026-03-26', author: 'M. Chen', approver: '-' },
];

export default function DocumentControlPage() {
  const [activeTab, setActiveTab] = useState('active');

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Document Control System</h1>
          <p className="text-secondary">ISO 9001 Clause 7.5 - SOPs, Formats & Versioning</p>
        </div>
        <button className="btn btn-primary">
          <Upload size={16} />
          Upload New Revision
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('active')} 
          className="btn" 
          style={{ 
            background: activeTab === 'active' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
          <FileCheck size={16} />
          Active Documents
        </button>
        <button 
          onClick={() => setActiveTab('review')} 
          className="btn" 
          style={{ 
            background: activeTab === 'review' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'review' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
          <Clock size={16} />
          Pending Approvals
        </button>
        <button 
          onClick={() => setActiveTab('archive')} 
          className="btn" 
          style={{ 
            background: activeTab === 'archive' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'archive' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
          <History size={16} />
          Obsolete Archive
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document ID</th>
                <th>Title & Description</th>
                <th>Rev</th>
                <th>Status</th>
                <th>Author / Approver</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DOCS.filter(d => activeTab === 'active' ? d.status === 'APPROVED' : activeTab === 'review' ? (d.status === 'IN_REVIEW' || d.status === 'DRAFT') : d.status === 'OBSOLETE').map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} />
                      {doc.id}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{doc.title}</td>
                  <td><span className="badge badge-info" style={{ background: 'var(--bg-tertiary)' }}>{doc.rev}</span></td>
                  <td>
                    <span className={`badge ${
                      doc.status === 'APPROVED' ? 'badge-success' : 
                      doc.status === 'IN_REVIEW' ? 'badge-warning' : 
                      'badge-info'
                    }`}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>Created: {doc.author}</div>
                    <div style={{ fontSize: '0.75rem', color: doc.status === 'APPROVED' ? 'var(--success)' : 'var(--text-muted)' }}>
                      Approved: {doc.approver}
                    </div>
                  </td>
                  <td>{doc.lastUpdated}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}>
                        <Eye size={16} />
                      </button>
                      {doc.status === 'IN_REVIEW' && (
                        <button className="btn btn-primary" style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--success)', boxShadow: 'none' }}>
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {MOCK_DOCS.filter(d => activeTab === 'active' ? d.status === 'APPROVED' : activeTab === 'review' ? (d.status === 'IN_REVIEW' || d.status === 'DRAFT') : d.status === 'OBSOLETE').length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No documents found in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
