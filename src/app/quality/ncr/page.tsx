// =============================================================================
// Quality → NCR & CAPA page
// =============================================================================
// Non-Conformance Reports with Root-Cause + Corrective/Preventive Action fields
// (ISO 9001 §8.7 Nonconforming Outputs & §10.2 Corrective Action).
//
// Data flow (post-GraphQL migration):
//   useNcrs()          — paginated list of NCRs with reel/component/supplier join
//   useCreateNcr()     — raise a new NCR against a reel
//   useUpdateNcr()     — edit rootCause/capa, transition OPEN → INVESTIGATION → CLOSED
//
// The old mock array (MOCK_NCRS) and its supplierAction / debitNoteNo fields
// that were never persisted anywhere are gone. If we need a debit-note flow
// later, it belongs in its own Prisma model + schema field, not this page's
// local state.
// =============================================================================

"use client";

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Search,
  Plus,
  FileEdit,
  CheckCircle,
  Archive,
  Loader2,
} from 'lucide-react';
import {
  useNcrs,
  useCreateNcr,
  useUpdateNcr,
  type NcrRecord,
  type NcrStatus,
} from '@/lib/graphql/hooks';

// Human-friendly labels + badge classes for each status.
const STATUS_META: Record<NcrStatus, { label: string; badge: string; color: string }> = {
  OPEN:                { label: 'Open',                badge: 'badge-danger',  color: 'var(--danger)' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', badge: 'badge-warning', color: 'var(--warning)' },
  CLOSED:              { label: 'Closed',              badge: 'badge-success', color: 'var(--success)' },
};

export default function NcrCapaPage() {
  // -------------------------------------------------------------------------
  // Remote data
  // -------------------------------------------------------------------------
  const { data, loading, error, refetch } = useNcrs({ take: 100 });
  const createNcr = useCreateNcr();
  const updateNcr = useUpdateNcr();

  const ncrs: NcrRecord[] = data?.ncrs.nodes ?? [];

  // -------------------------------------------------------------------------
  // Local UI state
  // -------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<NcrRecord | null>(null);
  const [editData, setEditData] = useState<{ rootCause: string; capa: string }>({
    rootCause: '',
    capa: '',
  });
  const [showRaise, setShowRaise] = useState(false);
  const [raiseForm, setRaiseForm] = useState({ ncrNumber: '', reelId: '', description: '' });
  const [raiseError, setRaiseError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Derived stats + filtered rows
  // -------------------------------------------------------------------------
  const stats = useMemo(() => {
    const open = ncrs.filter((n) => n.status === 'OPEN').length;
    const review = ncrs.filter((n) => n.status === 'UNDER_INVESTIGATION').length;
    const closed = ncrs.filter((n) => n.status === 'CLOSED').length;
    // "Closed this month" — compares ISO createdAt against the current month/year.
    const now = new Date();
    const closedThisMonth = ncrs.filter((n) => {
      if (n.status !== 'CLOSED') return false;
      const d = new Date(n.updatedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { open, review, closed, closedThisMonth };
  }, [ncrs]);

  const filtered = useMemo(() => {
    const base = ncrs.filter((n) =>
      activeTab === 'open' ? n.status !== 'CLOSED' : n.status === 'CLOSED'
    );
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (n) =>
        n.ncrNumber.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.reel.component.partNumber.toLowerCase().includes(q) ||
        n.reel.grn.supplier.name.toLowerCase().includes(q)
    );
  }, [ncrs, activeTab, search]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  function openManage(ncr: NcrRecord) {
    setSelected(ncr);
    setEditData({ rootCause: ncr.rootCause ?? '', capa: ncr.capa ?? '' });
  }

  /** Persist rootCause/capa without changing status. */
  async function saveDraft() {
    if (!selected) return;
    try {
      await updateNcr.execute({
        input: {
          id: selected.id,
          rootCause: editData.rootCause || null,
          capa: editData.capa || null,
          // First edit implicitly moves OPEN → UNDER_INVESTIGATION so reviewers
          // can see someone has picked this up.
          status: selected.status === 'OPEN' ? 'UNDER_INVESTIGATION' : undefined,
        },
      });
      await refetch();
      setSelected(null);
    } catch {
      /* error state surfaces via updateNcr.error below */
    }
  }

  /** Finalise the NCR — rootCause & CAPA must be populated first. */
  async function closeNcr() {
    if (!selected) return;
    if (!editData.rootCause.trim() || !editData.capa.trim()) {
      alert('Root Cause and CAPA are required before closing an NCR.');
      return;
    }
    try {
      await updateNcr.execute({
        input: {
          id: selected.id,
          rootCause: editData.rootCause,
          capa: editData.capa,
          status: 'CLOSED',
        },
      });
      await refetch();
      setSelected(null);
    } catch {
      /* surfaced below */
    }
  }

  /** Create a new NCR from the "Raise NCR" modal. */
  async function raiseNcr() {
    setRaiseError(null);
    if (!raiseForm.ncrNumber.trim() || !raiseForm.reelId.trim() || !raiseForm.description.trim()) {
      setRaiseError('All fields are required.');
      return;
    }
    try {
      await createNcr.execute({
        input: {
          ncrNumber: raiseForm.ncrNumber.trim(),
          reelId: raiseForm.reelId.trim(),
          description: raiseForm.description.trim(),
        },
      });
      await refetch();
      setShowRaise(false);
      setRaiseForm({ ncrNumber: '', reelId: '', description: '' });
    } catch (e) {
      setRaiseError(e instanceof Error ? e.message : 'Failed to raise NCR');
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="animate-fade-in stagger-1">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

      <div className="page-header">
        <div>
          <h1 className="text-gradient">NCR & Rejections</h1>
          <p className="text-secondary">
            Non-Conformance Reports & Corrective Actions (ISO 9001 §8.7, §10.2)
          </p>
        </div>
        <button className="btn btn-danger" onClick={() => setShowRaise(true)}>
          <Plus size={16} />
          Raise NCR
        </button>
      </div>

      {/* Error banner — stays mounted so the user can retry without losing state. */}
      {error && (
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--danger)' }}>{error.message}</span>
            <button className="btn btn-secondary" onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      )}

      {/* Stats — all derived from live GraphQL data, no hard-coded numbers. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard label="Open NCRs"          value={stats.open}            color="var(--danger)" />
        <StatCard label="Under Investigation" value={stats.review}          color="var(--warning)" />
        <StatCard label="Closed (Total)"     value={stats.closed}          color="var(--accent-primary)" />
        <StatCard label="Closed This Month"  value={stats.closedThisMonth} color="var(--success)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1.2fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* NCR Table Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{
                  background: activeTab === 'open' ? 'var(--danger)' : 'transparent',
                  color: activeTab === 'open' ? 'white' : 'var(--text-secondary)',
                  padding: '0.5rem 1rem',
                }}
                onClick={() => setActiveTab('open')}
              >
                <AlertTriangle size={15} /> Open & Review
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  background: activeTab === 'closed' ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeTab === 'closed' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '0.5rem 1rem',
                }}
                onClick={() => setActiveTab('closed')}
              >
                <Archive size={15} /> Closed
              </button>
            </div>
            <div className="input-group" style={{ marginBottom: 0, width: '260px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search NCRs…"
                style={{ paddingLeft: '2.25rem' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>NCR No.</th>
                  <th>Part / Issue</th>
                  <th>Supplier</th>
                  <th>Raised By</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {loading && ncrs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      <Loader2 size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                      Loading NCRs…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No {activeTab} NCRs found.
                    </td>
                  </tr>
                )}
                {filtered.map((ncr) => {
                  const meta = STATUS_META[ncr.status];
                  const isSelected = selected?.id === ncr.id;
                  return (
                    <tr
                      key={ncr.id}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(59,130,246,0.05)' : '',
                      }}
                    >
                      <td style={{ fontWeight: 600, color: meta.color }}>{ncr.ncrNumber}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ncr.reel.component.partNumber}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {ncr.description.length > 40 ? ncr.description.slice(0, 40) + '…' : ncr.description}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{ncr.reel.grn.supplier.name}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {ncr.raisedBy.name ?? ncr.raisedBy.email}
                      </td>
                      <td>
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {new Date(ncr.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                          onClick={() => openManage(ncr)}
                        >
                          <FileEdit size={13} /> Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* NCR Detail Panel */}
        {selected && (
          <div className="glass-panel animate-fade-in" style={{ padding: '1.75rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.1rem', color: STATUS_META[selected.status].color, marginBottom: '0.2rem' }}>
                  {selected.ncrNumber}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {selected.reel.component.partNumber} • GRN: {selected.reel.grn.grnNumber} • Lot: {selected.reel.supplierLot}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Defect Description</p>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-secondary)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selected.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <InfoTile label="Supplier"    value={selected.reel.grn.supplier.name} />
              <InfoTile label="Raised By"   value={selected.raisedBy.name ?? selected.raisedBy.email} />
            </div>

            <div className="input-group">
              <label className="input-label">Root Cause</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="What caused this non-conformance?"
                value={editData.rootCause}
                onChange={(e) => setEditData((p) => ({ ...p, rootCause: e.target.value }))}
                disabled={selected.status === 'CLOSED'}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Corrective & Preventive Action (CAPA)</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Actions taken to prevent recurrence…"
                value={editData.capa}
                onChange={(e) => setEditData((p) => ({ ...p, capa: e.target.value }))}
                disabled={selected.status === 'CLOSED'}
              />
            </div>

            {updateNcr.error && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {updateNcr.error.message}
              </div>
            )}

            {selected.status !== 'CLOSED' && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={saveDraft} disabled={updateNcr.loading}>
                  {updateNcr.loading ? <Loader2 size={14} className="spin" /> : 'Save Draft'}
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: 'var(--success)' }}
                  onClick={closeNcr}
                  disabled={updateNcr.loading}
                >
                  <CheckCircle size={15} /> Close NCR
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raise NCR modal */}
      {showRaise && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowRaise(false)}
        >
          <div
            className="glass-panel"
            style={{ padding: '1.75rem', width: '480px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '1rem' }}>Raise New NCR</h2>
            <div className="input-group">
              <label className="input-label">NCR Number *</label>
              <input
                className="input-field"
                placeholder="e.g. NCR-2026-043"
                value={raiseForm.ncrNumber}
                onChange={(e) => setRaiseForm((p) => ({ ...p, ncrNumber: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Reel ID * (24-hex ObjectId)</label>
              <input
                className="input-field"
                placeholder="Copy from inventory page"
                value={raiseForm.reelId}
                onChange={(e) => setRaiseForm((p) => ({ ...p, reelId: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Defect Description *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Describe what was found…"
                value={raiseForm.description}
                onChange={(e) => setRaiseForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            {raiseError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{raiseError}</div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRaise(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={raiseNcr}
                disabled={createNcr.loading}
              >
                {createNcr.loading ? <Loader2 size={14} className="spin" /> : 'Raise NCR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Small presentational helpers
// =============================================================================

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card" style={{ padding: '1.25rem', border: `1px solid ${color}` }}>
      <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{label}</h3>
      <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</p>
      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{value}</p>
    </div>
  );
}
