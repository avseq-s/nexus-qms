"use client";

import { useState } from 'react';
import { ClipboardList, Search, Filter, Download, User, Package, FileText, ShieldCheck, AlertTriangle } from 'lucide-react';

const MOCK_LOGS = [
  { id: '1', timestamp: '2026-04-03 14:32', user: 'Store Manager', role: 'STORE', action: 'CREATE', entityType: 'GRN', entityId: 'GRN-1095', detail: 'Created GRN for Avnet • 5 line items', color: '#6366f1' },
  { id: '2', timestamp: '2026-04-03 13:10', user: 'Quality Inspector', role: 'QUALITY', action: 'UPDATE', entityType: 'GRN', entityId: 'GRN-1092', detail: 'IQC result: PASS • RES-0603-10K moved to store', color: '#10b981' },
  { id: '3', timestamp: '2026-04-03 12:05', user: 'Quality Inspector', role: 'QUALITY', action: 'CREATE', entityType: 'NCR', entityId: 'NCR-2026-042', detail: 'NCR raised for Avnet batch • IC-STM32F103 dimensional fail', color: '#ef4444' },
  { id: '4', timestamp: '2026-04-03 10:45', user: 'Store Manager', role: 'STORE', action: 'MOVE', entityType: 'REEL', entityId: 'REEL-00312', detail: 'Reel moved from QUARANTINE → SHELF-A1', color: '#f59e0b' },
  { id: '5', timestamp: '2026-04-03 09:30', user: 'Store Manager', role: 'STORE', action: 'CREATE', entityType: 'GRN', entityId: 'GRN-1094', detail: 'Created GRN for DigiKey • 3 line items', color: '#6366f1' },
  { id: '6', timestamp: '2026-04-02 17:15', user: 'Admin User', role: 'ADMIN', action: 'UPDATE', entityType: 'DOCUMENT', entityId: 'SOP-IQC-001', detail: 'SOP-IQC-001 Rev B approved and published', color: '#3b82f6' },
  { id: '7', timestamp: '2026-04-02 15:50', user: 'Quality Head', role: 'QUALITY', action: 'UPDATE', entityType: 'NCR', entityId: 'NCR-2026-022', detail: 'NCR closed with CAPA • DN-2026-017 raised', color: '#10b981' },
  { id: '8', timestamp: '2026-04-02 14:20', user: 'Store Manager', role: 'STORE', action: 'MOVE', entityType: 'REEL', entityId: 'REEL-00298', detail: 'Kit dispatched to EMS • KIT-2026-012', color: '#8b5cf6' },
  { id: '9', timestamp: '2026-04-02 11:05', user: 'Dispatch Team', role: 'PRODUCTION', action: 'CREATE', entityType: 'DISPATCH', entityId: 'DSP-2026-031', detail: '100 × SmartMeter V2 dispatched to TechCorp Pvt Ltd', color: '#10b981' },
  { id: '10', timestamp: '2026-04-01 16:40', user: 'Admin User', role: 'ADMIN', action: 'CREATE', entityType: 'USER', entityId: 'USER-005', detail: 'New user created: Production Team (PRODUCTION role)', color: '#3b82f6' },
];

const ENTITY_ICONS: Record<string, any> = {
  GRN: Package,
  REEL: Package,
  NCR: AlertTriangle,
  DOCUMENT: FileText,
  DISPATCH: Package,
  USER: User,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#10b981',
  UPDATE: '#3b82f6',
  DELETE: '#ef4444',
  MOVE: '#f59e0b',
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');

  const filtered = MOCK_LOGS.filter((log) => {
    const matchSearch =
      search === '' ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase()) ||
      log.detail.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    const matchEntity = filterEntity === 'ALL' || log.entityType === filterEntity;
    return matchSearch && matchAction && matchEntity;
  });

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Audit Logs</h1>
          <p className="text-secondary">Complete traceability trail — ISO 9001 Clause 7.5 compliant</p>
        </div>
        <button className="btn btn-secondary">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Events Today', value: '9', color: 'var(--accent-primary)' },
          { label: 'Creates', value: '5', color: 'var(--success)' },
          { label: 'Updates', value: '3', color: 'var(--warning)' },
          { label: 'Deletes', value: '0', color: 'var(--danger)' },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem', marginBottom: 0 }}
            placeholder="Search by user, entity, or detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="input-field"
            style={{ width: 'auto', marginBottom: 0, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="MOVE">Move</option>
          </select>
          <select
            className="input-field"
            style={{ width: 'auto', marginBottom: 0, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
          >
            <option value="ALL">All Entities</option>
            <option value="GRN">GRN</option>
            <option value="REEL">Reel</option>
            <option value="NCR">NCR</option>
            <option value="DOCUMENT">Document</option>
            <option value="DISPATCH">Dispatch</option>
            <option value="USER">User</option>
          </select>
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Log Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const EntityIcon = ENTITY_ICONS[log.entityType] ?? ClipboardList;
              return (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {log.timestamp}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <User size={13} color="white" />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{log.user}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.role}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: `${ACTION_COLORS[log.action]}15`,
                      color: ACTION_COLORS[log.action],
                      border: `1px solid ${ACTION_COLORS[log.action]}30`,
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <EntityIcon size={14} color={log.color} />
                      <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>{log.entityId}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({log.entityType})</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                    {log.detail}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No audit records match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
