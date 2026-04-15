// =============================================================================
// Document Control page — ISO 9001 §7.5 SOP / Format register
// =============================================================================
// Every controlled document (SOP, Work Instruction, Format) is created as a
// DRAFT, moves through IN_REVIEW, and is finally APPROVED — at which point the
// system stamps an `effectiveDate`. Superseded docs are transitioned to
// OBSOLETE so they remain auditable without misleading readers.
//
// Data flow (post-GraphQL migration):
//   useDocuments(status?)       — list docs, filter by status for the tabs
//   useCreateDocument()         — create a new DRAFT document
//   useTransitionDocument()     — change status, assign reviewer/approver
//
// The previous mock used fields (`purpose`, `scope`, `rev`, `author`, `approver`)
// as strings. Our schema stores those as relations (User) on the server; the
// author is automatically the session user, and reviewer/approver are set when
// the doc is transitioned. `purpose`/`scope` collapse into `content` until we
// expand the backend model.
// =============================================================================

"use client";

import React, { useMemo, useState } from 'react';
import {
  FileText,
  FileCheck,
  History,
  Upload,
  Clock,
  Eye,
  Save,
  X,
  Loader2,
  CheckCircle2,
  Send,
  Archive,
} from 'lucide-react';
import {
  useDocuments,
  useCreateDocument,
  useTransitionDocument,
  type DocumentRecord,
  type DocStatus,
} from '@/lib/graphql/hooks';

type Tab = 'active' | 'review' | 'archive';

const TAB_FILTER: Record<Tab, (d: DocumentRecord) => boolean> = {
  active: (d) => d.status === 'APPROVED',
  review: (d) => d.status === 'DRAFT' || d.status === 'IN_REVIEW',
  archive: (d) => d.status === 'OBSOLETE',
};

export default function DocumentControlPage() {
  const { data, loading, error, refetch } = useDocuments();
  const createDoc = useCreateDocument();
  const transitionDoc = useTransitionDocument();

  const documents: DocumentRecord[] = data?.documents ?? [];

  // ---- Local UI state ------------------------------------------------------
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', version: 'Rev A', content: '' });
  const [createError, setCreateError] = useState<string | null>(null);

  // ---- Filtered rows -------------------------------------------------------
  const filtered = useMemo(() => documents.filter(TAB_FILTER[activeTab]), [documents, activeTab]);

  // ---- Handlers ------------------------------------------------------------
  async function handleCreate() {
    setCreateError(null);
    if (!createForm.title.trim() || !createForm.version.trim() || !createForm.content.trim()) {
      setCreateError('Title, version and content are all required.');
      return;
    }
    try {
      await createDoc.execute({
        input: {
          title: createForm.title.trim(),
          version: createForm.version.trim(),
          content: createForm.content.trim(),
        },
      });
      await refetch();
      setShowCreate(false);
      setCreateForm({ title: '', version: 'Rev A', content: '' });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create document');
    }
  }

  /** Move a document to the next status in its lifecycle. */
  async function transition(doc: DocumentRecord, newStatus: DocStatus) {
    try {
      await transitionDoc.execute({ input: { id: doc.id, status: newStatus } });
      await refetch();
      setSelected((prev) => (prev && prev.id === doc.id ? { ...prev, status: newStatus } : prev));
    } catch {
      /* transitionDoc.error shows below */
    }
  }

  // -------------------------------------------------------------------------
  return (
    <div className="animate-fade-in stagger-1">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

      <div className="page-header">
        <div>
          <h1 className="text-gradient">Document Control System</h1>
          <p className="text-secondary">ISO 9001 Clause 7.5 — SOPs, Formats & Versioning</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Upload size={16} />
          Upload New Revision
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <TabButton label="Active" icon={<FileCheck size={16} />} active={activeTab === 'active'} onClick={() => setActiveTab('active')} />
        <TabButton label="Pending Approvals" icon={<Clock size={16} />} active={activeTab === 'review'} onClick={() => setActiveTab('review')} />
        <TabButton label="Obsolete Archive" icon={<History size={16} />} active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} />
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Version</th>
                <th>Status</th>
                <th>Author</th>
                <th>Approver</th>
                <th>Effective Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && documents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                    Loading documents…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No documents found in this view.
                  </td>
                </tr>
              )}
              {filtered.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      <FileText size={16} />
                      {doc.title}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-tertiary)' }}>{doc.version}</span>
                  </td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{doc.author.name ?? doc.author.email}</td>
                  <td style={{ fontSize: '0.85rem', color: doc.approver ? 'var(--success)' : 'var(--text-muted)' }}>
                    {doc.approver ? doc.approver.name ?? doc.approver.email : '—'}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
                      onClick={() => setSelected(doc)}
                    >
                      <Eye size={16} color="var(--accent-primary)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Overlay onClose={() => setShowCreate(false)}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '640px', maxWidth: '100%', border: '1px solid var(--accent-primary)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>
              New Controlled Document
            </h2>
            <div className="input-group">
              <label className="input-label">Title *</label>
              <input
                className="input-field"
                placeholder="e.g. Quality Management System"
                value={createForm.title}
                onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Version *</label>
              <input
                className="input-field"
                placeholder="e.g. Rev A"
                value={createForm.version}
                onChange={(e) => setCreateForm((p) => ({ ...p, version: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Content *</label>
              <textarea
                className="input-field"
                rows={10}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                placeholder="Paste the full document body here…"
                value={createForm.content}
                onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value }))}
              />
            </div>
            {createError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{createError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
                disabled={createDoc.loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={createDoc.loading}
              >
                {createDoc.loading ? <><Loader2 size={14} className="spin" /> Saving…</> : <><Save size={14} /> Create Draft</>}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Viewer modal */}
      {selected && (
        <Overlay onClose={() => setSelected(null)}>
          <div
            className="glass-panel animate-fade-in"
            style={{
              padding: '2.5rem',
              width: '900px',
              maxWidth: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--accent-primary)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={24} color="var(--accent-primary)" />
                  {selected.title}
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span>Version {selected.version}</span>
                  <StatusBadge status={selected.status} />
                  <span>Author: {selected.author.name ?? selected.author.email}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Status transition buttons — the allowed next states depend
                    on the current state. Only QUALITY/ADMIN can actually
                    perform these server-side; we surface them optimistically
                    and let the server reject unauthorised calls. */}
                {selected.status === 'DRAFT' && (
                  <button className="btn btn-secondary" onClick={() => transition(selected, 'IN_REVIEW')} disabled={transitionDoc.loading}>
                    <Send size={14} /> Submit for Review
                  </button>
                )}
                {selected.status === 'IN_REVIEW' && (
                  <button className="btn btn-primary" onClick={() => transition(selected, 'APPROVED')} disabled={transitionDoc.loading}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                )}
                {selected.status === 'APPROVED' && (
                  <button className="btn btn-secondary" onClick={() => transition(selected, 'OBSOLETE')} disabled={transitionDoc.loading}>
                    <Archive size={14} /> Obsolete
                  </button>
                )}
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setSelected(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {transitionDoc.error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{transitionDoc.error.message}</div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-sm)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  minHeight: '300px',
                }}
              >
                {selected.content}
              </div>

              {selected.effectiveDate && (
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Effective: {new Date(selected.effectiveDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function TabButton({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      className="btn"
      onClick={onClick}
      style={{
        background: active ? 'var(--bg-tertiary)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
  const cls =
    status === 'APPROVED'
      ? 'badge-success'
      : status === 'IN_REVIEW'
      ? 'badge-warning'
      : status === 'OBSOLETE'
      ? 'badge-info'
      : 'badge-info';
  return <span className={`badge ${cls}`}>{status.replace('_', ' ')}</span>;
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
