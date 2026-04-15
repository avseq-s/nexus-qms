// =============================================================================
// Inventory → Item Master Catalog page
// =============================================================================
// Store-controlled list of official internal components (parts). This is the
// single source of truth that every other module — GRN lines, reels, BOMs —
// references by `componentId`.
//
// Data flow (post-GraphQL migration):
//   useComponents()       — paginated list of existing parts
//   useCreateComponent()  — mint a new internal part number
//
// Dropped from the old localStorage version:
//   - QMS_PART_REQUESTS inbox (was a UI-only mock queue).
//   - In-house / vendor stock counts (needed EMS tracking that the Reel schema
//     doesn't expose yet — reintroduce when we add emsName + status='AT_EMS').
//   - HSN and UoM fields (not on the backend Component model; re-add with a
//     migration when finance/export needs them).
// =============================================================================

"use client";

import React, { useMemo, useState } from 'react';
import {
  Database,
  Plus,
  Search,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  useComponents,
  useCreateComponent,
  type Component as ComponentRow,
} from '@/lib/graphql/hooks';

const CATEGORIES = [
  'Passive',
  'Microcontroller',
  'IC',
  'Connector',
  'PCB/Bare Board',
  'Hardware/Mech',
];

export default function ItemMasterPage() {
  const { data, loading, error, refetch } = useComponents({ take: 200 });
  const createComponent = useCreateComponent();

  const catalog: ComponentRow[] = data?.components.nodes ?? [];

  // ---- Local UI state ------------------------------------------------------
  const [search, setSearch] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formData, setFormData] = useState({
    partNumber: '',
    category: 'Passive',
    description: '',
    mslLevel: 1,
    shelfLifeDays: '' as string | number,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // ---- Filtered rows -------------------------------------------------------
  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(
      (p) =>
        p.partNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  // ---- Handlers ------------------------------------------------------------
  function openGenerateForm() {
    setFormData({ partNumber: '', category: 'Passive', description: '', mslLevel: 1, shelfLifeDays: '' });
    setFormError(null);
    setShowGenerateModal(true);
  }

  async function handleGenerate() {
    setFormError(null);
    if (!formData.partNumber.trim() || !formData.description.trim()) {
      setFormError('Part Number and Description are required.');
      return;
    }
    try {
      const shelfLifeDays =
        formData.shelfLifeDays === '' || formData.shelfLifeDays === null
          ? null
          : Number(formData.shelfLifeDays);
      await createComponent.execute({
        input: {
          partNumber: formData.partNumber.trim(),
          description: formData.description.trim(),
          category: formData.category,
          mslLevel: Number(formData.mslLevel) || 1,
          shelfLifeDays,
        },
      });
      await refetch();
      setShowGenerateModal(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create part');
    }
  }

  return (
    <div className="animate-fade-in stagger-1">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

      <div className="page-header">
        <div>
          <h1 className="text-gradient">Item Master Catalog</h1>
          <p className="text-secondary">Store-controlled database defining official internal components</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={openGenerateForm}>
            <Plus size={16} />
            Create New Part
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

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Database size={20} color="var(--accent-primary)" /> Official Catalog ({catalog.length})
          </h2>
          <div className="input-group" style={{ marginBottom: 0, width: '300px', flexDirection: 'row', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search catalog…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', padding: '0.5rem 1rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Part Number</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>MSL</th>
                <th style={{ textAlign: 'right' }}>Shelf Life (days)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && catalog.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                    Loading catalog…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    {search ? 'No parts match your search.' : 'Catalog is empty — click "Create New Part" to add one.'}
                  </td>
                </tr>
              )}
              {filtered.map((part) => (
                <tr key={part.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{part.partNumber}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {part.category}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '300px' }}>{part.description}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{part.mslLevel}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {part.shelfLifeDays ?? '—'}
                  </td>
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Part modal */}
      {showGenerateModal && (
        <div
          onClick={() => setShowGenerateModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in"
            style={{ width: '550px', maxWidth: '100%', padding: '2rem', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Generate Internal Part Number
            </h2>

            <div className="input-group">
              <label className="input-label">Internal Part Number *</label>
              <input
                className="input-field"
                value={formData.partNumber}
                onChange={(e) => setFormData((p) => ({ ...p, partNumber: e.target.value }))}
                placeholder="e.g. IC-STM-001"
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label">Component Category</label>
              <select
                className="input-field"
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Standard Description *</label>
              <input
                className="input-field"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. 10K Ohm 1% 0603 SMD Resistor"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">MSL Level (1–6)</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  className="input-field"
                  value={formData.mslLevel}
                  onChange={(e) => setFormData((p) => ({ ...p, mslLevel: Number(e.target.value) }))}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Shelf Life (days, optional)</label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={formData.shelfLifeDays}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, shelfLifeDays: e.target.value === '' ? '' : Number(e.target.value) }))
                  }
                  placeholder="blank for none"
                />
              </div>
            </div>

            {formError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{formError}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowGenerateModal(false)}
                disabled={createComponent.loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={createComponent.loading || !formData.partNumber || !formData.description}
                onClick={handleGenerate}
              >
                {createComponent.loading ? (
                  <><Loader2 size={14} className="spin" /> Minting…</>
                ) : (
                  <><CheckCircle size={16} /> Mint Part Number</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
