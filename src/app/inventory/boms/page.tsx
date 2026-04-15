// =============================================================================
// Inventory → Master BOMs list
// =============================================================================
// Bill of Materials register — every finished product (PCBA, assembly) is
// defined by a MasterBom with a list of BomItems (component + quantity +
// reference designators). Production uses this to explode a work order into
// kit picks.
//
// Data flow (post-GraphQL migration):
//   useMasterBoms()       — list every BOM on the server
//   useComponents()       — populate the component picker in the Create modal
//   useCreateMasterBom()  — persist a new BOM with at least one item
//
// Deferred from the previous localStorage version:
//   - CSV bulk import (requires matching imported part numbers to real
//     Component ids — doable, just scope).
//   - Per-BOM Revision / status transitions (schema doesn't model the
//     Active/Draft/Obsolete lifecycle yet).
// =============================================================================

"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  useMasterBoms,
  useCreateMasterBom,
  useComponents,
  type MasterBomRecord,
} from '@/lib/graphql/hooks';

// A single row in the "add items" table of the create modal.
interface DraftItem {
  componentId: string;
  quantity: number;
  reference: string;
}

export default function MasterBomsPage() {
  const { data, loading, error, refetch } = useMasterBoms();
  const { data: compsData } = useComponents({ take: 500 });
  const createBom = useCreateMasterBom();

  const boms: MasterBomRecord[] = data?.masterBoms ?? [];
  const components = compsData?.components.nodes ?? [];

  // ---- Local UI state ------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{
    productCode: string;
    productName: string;
    version: string;
    details: string;
    items: DraftItem[];
  }>({
    productCode: '',
    productName: '',
    version: 'Rev A',
    details: '',
    items: [],
  });
  const [formError, setFormError] = useState<string | null>(null);

  // ---- Filtered rows -------------------------------------------------------
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return q
      ? boms.filter(
          (b) =>
            b.productName.toLowerCase().includes(q) ||
            b.productCode.toLowerCase().includes(q)
        )
      : boms;
  }, [boms, searchTerm]);

  // ---- Handlers ------------------------------------------------------------
  function openCreate() {
    setForm({ productCode: '', productName: '', version: 'Rev A', details: '', items: [] });
    setFormError(null);
    setShowCreate(true);
  }

  function addItem() {
    if (!components.length) return;
    setForm((p) => ({
      ...p,
      items: [...p.items, { componentId: components[0].id, quantity: 1, reference: '' }],
    }));
  }
  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }
  function removeItem(idx: number) {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  }

  async function handleCreate() {
    setFormError(null);
    if (!form.productCode.trim() || !form.productName.trim()) {
      setFormError('Product code and name are required.');
      return;
    }
    if (form.items.length === 0) {
      setFormError('At least one BOM item is required.');
      return;
    }
    try {
      await createBom.execute({
        input: {
          productCode: form.productCode.trim(),
          productName: form.productName.trim(),
          version: form.version.trim() || 'Rev A',
          details: form.details.trim() || undefined,
          items: form.items.map((it) => ({
            componentId: it.componentId,
            quantity: Number(it.quantity) || 1,
            reference: it.reference.trim() || undefined,
          })),
        },
      });
      await refetch();
      setShowCreate(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create BOM');
    }
  }

  // -------------------------------------------------------------------------
  return (
    <div className="animate-fade-in stagger-1">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

      <div className="page-header">
        <div>
          <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={28} />
            Master BOMs
          </h1>
          <p className="text-secondary">Manage Bills of Materials, revisions, and alternates.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Create BOM
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--danger)' }}>{error.message}</span>
            <button className="btn btn-secondary" onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by BOM code or name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="btn btn-secondary" disabled>
            <Filter size={16} />
            Filter Status
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>BOM Code</th>
                <th>Product Name</th>
                <th>Revision</th>
                <th>Status</th>
                <th>Components</th>
                <th>Last Updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && boms.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                    Loading BOMs…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    {searchTerm ? 'No BOMs match your search.' : 'No BOMs yet — click "Create BOM" to add one.'}
                  </td>
                </tr>
              )}
              {filtered.map((bom) => (
                <tr key={bom.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Link href={`/inventory/boms/${bom.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {bom.productCode}
                    </Link>
                  </td>
                  <td>{bom.productName}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {bom.version}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={14} className="text-success" />
                      <span className="badge badge-success">{bom.status}</span>
                    </div>
                  </td>
                  <td>{bom.items.length} items</td>
                  <td className="text-secondary">{new Date(bom.updatedAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/inventory/boms/${bom.id}`}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem' }}>
                        <MoreVertical size={16} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create BOM modal */}
      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in"
            style={{ width: '760px', maxWidth: '95vw', maxHeight: '90vh', padding: '2rem', display: 'flex', flexDirection: 'column' }}
          >
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>New Master BOM</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Product Code *</label>
                <input
                  className="input-field"
                  placeholder="e.g. PCBA-V3-MAIN"
                  value={form.productCode}
                  onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Product Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Gateway Controller"
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Revision</label>
                <input
                  className="input-field"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Notes</label>
              <input
                className="input-field"
                placeholder="Optional description"
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </div>

            {/* Items */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="input-label" style={{ margin: 0 }}>BOM Items ({form.items.length})</label>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }} onClick={addItem} disabled={!components.length}>
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', marginBottom: '1rem' }}>
              {form.items.length === 0 && (
                <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No items yet. Click &quot;Add Item&quot; to pick components from the Item Master.
                </p>
              )}
              {form.items.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 1fr 32px', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select
                    className="input-field"
                    style={{ marginBottom: 0 }}
                    value={it.componentId}
                    onChange={(e) => updateItem(idx, { componentId: e.target.value })}
                  >
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.partNumber} — {c.description.slice(0, 40)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input-field"
                    style={{ marginBottom: 0 }}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <input
                    className="input-field"
                    style={{ marginBottom: 0 }}
                    placeholder="Ref (e.g. R1, R2)"
                    value={it.reference}
                    onChange={(e) => updateItem(idx, { reference: e.target.value })}
                  />
                  <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => removeItem(idx)}>
                    <Trash2 size={14} color="var(--danger)" />
                  </button>
                </div>
              ))}
            </div>

            {formError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{formError}</div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={createBom.loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={createBom.loading}>
                {createBom.loading ? (
                  <><Loader2 size={14} className="spin" /> Creating…</>
                ) : (
                  <><CheckCircle2 size={16} /> Create BOM</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
