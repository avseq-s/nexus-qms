// =============================================================================
// Audit Logs page — complete traceability trail (ISO 9001 §7.5)
// =============================================================================
// Every write operation in the GraphQL layer calls `writeAudit(ctx, {...})`,
// which inserts an immutable row into the AuditLog collection. This page is
// the UI for that collection — ADMIN-only on the server side.
//
// Data flow:
//   useAuditLogs({ entityType?, entityId? }) — read the global trail, optionally
//   narrowed to one entity type or a single entity id (drill-down).
//
// CSV export runs client-side over the currently filtered rows so what you see
// is what you download.
// =============================================================================

"use client";

import { useMemo, useState } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  User,
  Package,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAuditLogs, type AuditLogRecord } from '@/lib/graphql/hooks';

// Map entity types to lucide icons. Unknown types fall back to ClipboardList.
const ENTITY_ICONS: Record<string, any> = {
  Grn: Package,
  Reel: Package,
  NcrRecord: AlertTriangle,
  Document: FileText,
  Supplier: Package,
  Component: Package,
  MasterBom: Package,
  User: User,
  IqcInspection: Package,
};

// Colour-code action badges. DELETE is red, CREATE green, UPDATE blue, etc.
const ACTION_COLORS: Record<string, string> = {
  CREATE: '#10b981',
  UPDATE: '#3b82f6',
  DELETE: '#ef4444',
  MOVE: '#f59e0b',
  TRANSITION: '#8b5cf6',
};

export default function AuditLogsPage() {
  const { data, loading, error, refetch } = useAuditLogs();
  const logs: AuditLogRecord[] = data?.auditLogs ?? [];

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');

  // ---- Derived ------------------------------------------------------------
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const name = log.user.name ?? log.user.email;
      const matchSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        log.entityId.toLowerCase().includes(search.toLowerCase()) ||
        log.entityType.toLowerCase().includes(search.toLowerCase());
      const matchAction = filterAction === 'ALL' || log.action === filterAction;
      const matchEntity = filterEntity === 'ALL' || log.entityType === filterEntity;
      return matchSearch && matchAction && matchEntity;
    });
  }, [logs, search, filterAction, filterEntity]);

  // Dynamic filter option lists — build from the actual data we received so
  // the dropdowns stay accurate as new entity types get audited.
  const entityTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityType))).sort(),
    [logs]
  );
  const actionTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  // Summary counts — creates/updates/deletes over the visible set.
  const stats = useMemo(() => {
    const creates = logs.filter((l) => l.action === 'CREATE').length;
    const updates = logs.filter((l) => l.action === 'UPDATE').length;
    const deletes = logs.filter((l) => l.action === 'DELETE').length;
    return { total: logs.length, creates, updates, deletes };
  }, [logs]);

  /** Export currently-filtered rows to CSV. */
  function handleExport() {
    const header = ['Timestamp', 'User', 'Role', 'Action', 'EntityType', 'EntityId'];
    const rows = filtered.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.user.name ?? l.user.email,
      l.user.role,
      l.action,
      l.entityType,
      l.entityId,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Build a short, human-readable description of a change. */
  function describeChange(log: AuditLogRecord): string {
    if (log.action === 'CREATE' && log.newValue && typeof log.newValue === 'object') {
      const fields = Object.keys(log.newValue as Record<string, unknown>).slice(0, 3).join(', ');
      return `Created with fields: ${fields}`;
    }
    if (log.action === 'UPDATE' && log.newValue && typeof log.newValue === 'object') {
      const fields = Object.keys(log.newValue as Record<string, unknown>).join(', ');
      return `Updated: ${fields}`;
    }
    if (log.action === 'DELETE') return 'Record deleted';
    return `${log.action} ${log.entityType}`;
  }

  // -------------------------------------------------------------------------
  return (
    <div className="animate-fade-in stagger-1">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

      <div className="page-header">
        <div>
          <h1 className="text-gradient">Audit Logs</h1>
          <p className="text-secondary">Complete traceability trail — ISO 9001 Clause 7.5 compliant</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport} disabled={!filtered.length}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--danger)' }}>{error.message}</span>
            <button className="btn btn-secondary" onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      )}

      {/* Summary cards — derived from the full unfiltered log set. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Events',    value: stats.total,   color: 'var(--accent-primary)' },
          { label: 'Creates',         value: stats.creates, color: 'var(--success)' },
          { label: 'Updates',         value: stats.updates, color: 'var(--warning)' },
          { label: 'Deletes',         value: stats.deletes, color: 'var(--danger)' },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              {s.label}
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem', marginBottom: 0 }}
            placeholder="Search by user, entity id or type…"
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
            {actionTypes.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            className="input-field"
            style={{ width: 'auto', marginBottom: 0, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
          >
            <option value="ALL">All Entities</option>
            {entityTypes.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
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
            {loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                  Loading audit trail…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No audit records match your filters.
                </td>
              </tr>
            )}
            {filtered.map((log) => {
              const EntityIcon = ENTITY_ICONS[log.entityType] ?? ClipboardList;
              const color = ACTION_COLORS[log.action] ?? 'var(--text-secondary)';
              const displayName = log.user.name ?? log.user.email;
              return (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <User size={13} color="white" />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{displayName}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.user.role}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: `${color}15`,
                        color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <EntityIcon size={14} color={color} />
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          fontFamily: 'monospace',
                        }}
                        title={log.entityId}
                      >
                        {log.entityId.length > 12 ? '…' + log.entityId.slice(-10) : log.entityId}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({log.entityType})</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                    {describeChange(log)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
