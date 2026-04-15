// =============================================================================
// /purchase/suppliers — Approved Supplier List (ASL) page
// =============================================================================
// Migrated from localStorage to the GraphQL API (/api/graphql).
//
// Data flow:
//   useSuppliers()       — paginated query, auto-runs on mount, exposes refetch
//   useCreateSupplier()  — mutation hook; we call .execute() on form submit,
//                          then refetch() the list to keep UI in sync
//
// All shipment / GRN-history details are still mock data because that ties
// into Reels + GRNs which are migrated in a separate PR. When wired up the
// `getHistory()` helper will be replaced with a real `useReelsForSupplier()`.
// =============================================================================

"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Building2, Search, Plus, CheckCircle, AlertTriangle, XOctagon,
  Award, Filter, FileText, Calendar, Box, Upload, DownloadCloud, Loader2,
} from 'lucide-react';
import {
  useSuppliers,
  useCreateSupplier,
  type Supplier,
} from '@/lib/graphql/hooks';

// ---------------------------------------------------------------------------
// Helpers — derive UI-facing labels from the schema fields
// ---------------------------------------------------------------------------

/** "Approved" if either the approval flag or ISO cert is set, else "Probation". */
function statusLabel(s: Supplier): 'Approved' | 'Probation' {
  return s.isApproved || s.isIsoCertified ? 'Approved' : 'Probation';
}

/**
 * Generate a stable supplier code from the company name, e.g.
 *   "Mouser Electronics"  →  "SUP-MOUSE-371"
 * Uniqueness is enforced by the unique index on Supplier.code; if Prisma throws
 * a duplicate error we just retry with a fresh random suffix.
 */
function generateCode(name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'SUP';
  const tail = Math.floor(100 + Math.random() * 900);
  return `SUP-${slug}-${tail}`;
}

export default function SuppliersPage() {
  // -------------------------------------------------------------------------
  // GraphQL data — replaces the old localStorage-backed useState
  // -------------------------------------------------------------------------
  const { data, loading, error, refetch } = useSuppliers({ take: 100 });
  const createSupplier = useCreateSupplier();

  const suppliers: Supplier[] = useMemo(
    () => data?.suppliers.nodes ?? [],
    [data]
  );

  // UI state -----------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    gstin: '',
    iso: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // CSV bulk import — reads the file client-side, then calls createSupplier
  // for each row sequentially. Sequential keeps server load predictable and
  // guarantees stable insertion order.
  // -------------------------------------------------------------------------
  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const rows = text.split('\n').filter((r) => r.trim() !== '');
      if (rows.length < 2) {
        alert('Invalid CSV: need a header row and at least one data row.');
        return;
      }

      let okCount = 0;
      let failCount = 0;
      // Skip header row (i=0); columns: Name, Contact, Email, GSTIN, ISO
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (!cols[0]) continue;
        const isIso = cols[4]
          ? ['true', 'yes', '1'].includes(cols[4].toLowerCase())
          : false;
        try {
          await createSupplier.execute({
            input: {
              name: cols[0],
              code: generateCode(cols[0]),
              contact: cols[1] || null,
              email: cols[2] || null,
              gstin: cols[3] || null,
              isIsoCertified: isIso,
              isApproved: isIso, // ISO-certified suppliers are auto-approved
            },
          });
          okCount++;
        } catch (e) {
          console.error('[csv import] row failed', cols[0], e);
          failCount++;
        }
      }

      alert(`Import complete — ${okCount} added, ${failCount} failed.`);
      await refetch();
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadSupplierTemplate = () => {
    const csvContent =
      'Name,Contact,Email,GSTIN,ISO Certified (True/False)\n' +
      'Acme Corp,John Doe,john@acme.com,12ABCDE3456F7Z8,True\n' +
      'TechSupplies Inc,,info@techsupplies.com,,False';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'supplier_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock GRN history — to be replaced when the Reel/GRN UI is migrated. Uses
  // a deterministic seed so the same supplier always shows the same history,
  // which keeps the UI stable while we develop.
  const getHistory = (supId: string) => {
    const seed = supId.charCodeAt(supId.length - 1);
    const count = (seed % 3) + 1;
    const shipments = [
      { id: 'GRN-2026-081', invoice: 'INV-A1099', date: '2026-03-22', status: 'PASS',
        components: [
          { part: '10K Ohm 0603 Resistor', qty: 5000, lotId: 'LOT-26A-0012', inspector: 'K. Lee', status: 'PASS', defect: 'None', measurement: '9.98k ~ 10.02k Ohm' },
          { part: '0.1uF Ceramic Capacitor', qty: 2000, lotId: 'LOT-26A-0045', inspector: 'K. Lee', status: 'PASS', defect: 'None', measurement: '0.098uF ~ 0.101uF' },
        ],
      },
      { id: 'GRN-2026-075', invoice: 'INV-B4402', date: '2026-03-15', status: 'PASS',
        components: [
          { part: 'STM32F405 Microcontroller', qty: 500, lotId: 'LOT-26B-0089', inspector: 'M. Chen', status: 'PASS', defect: 'None', measurement: 'Visual Pass' },
        ],
      },
      { id: 'GRN-2026-060', invoice: 'INV-C119', date: '2026-02-28', status: 'FAIL',
        components: [
          { part: 'USB-C Connector', qty: 1000, lotId: 'LOT-26C-0112', inspector: 'S. Smith', status: 'FAIL', defect: 'Bent Pins', measurement: 'Visual Fail' },
          { part: '22uH Power Inductor', qty: 3000, lotId: 'LOT-25D-0992', inspector: 'S. Smith', status: 'PASS', defect: 'None', measurement: '21.5uH ~ 22.1uH' },
        ],
      },
    ];
    return shipments.slice(0, count);
  };

  // -------------------------------------------------------------------------
  // Submit handler — wraps createSupplier.execute() with form validation
  // and refetch on success.
  // -------------------------------------------------------------------------
  const handleRegister = async () => {
    setFormError(null);
    if (!formData.name || !formData.contact || !formData.email) {
      setFormError('Name, contact and email are required.');
      return;
    }

    try {
      await createSupplier.execute({
        input: {
          name: formData.name,
          code: generateCode(formData.name),
          contact: formData.contact,
          email: formData.email,
          phone: formData.phone || null,
          gstin: formData.gstin || null,
          isIsoCertified: formData.iso,
          isApproved: formData.iso, // ISO cert auto-approves the supplier
        },
      });
      await refetch();
      setShowModal(false);
      setFormData({ name: '', contact: '', email: '', phone: '', gstin: '', iso: false });
    } catch (e: any) {
      // GqlError includes a structured message — show it inline
      setFormError(e?.message ?? 'Failed to register supplier');
    }
  };

  // Filtered list — all in-memory because we already paginated server-side.
  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.gstin ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  // KPI tiles --------------------------------------------------------------
  const totalCount = suppliers.length;
  const isoCount = suppliers.filter((s) => s.isIsoCertified).length;
  const probationCount = suppliers.filter((s) => statusLabel(s) === 'Probation').length;

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Approved Supplier List (ASL)</h1>
          <p className="text-secondary">Official ISO 9001 Vendor Master & Compliance Directory</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleCsvImport} />
          <button className="btn btn-secondary" onClick={downloadSupplierTemplate}>
            <DownloadCloud size={16} />
            Template
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            {importing ? 'Importing…' : 'Bulk Import CSV'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Register New Vendor
          </button>
        </div>
      </div>

      {/* Banner: surface backend errors so the user isn't left with a silent empty list */}
      {error && (
        <div
          style={{
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            border: '1px solid var(--warning, #d97706)',
            borderRadius: '8px',
            background: 'rgba(217,119,6,0.08)',
            color: 'var(--warning, #d97706)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>
            Failed to load suppliers from the API: <strong>{error.message}</strong>
          </span>
          <button
            className="btn btn-secondary"
            style={{ marginLeft: 'auto', padding: '0.3rem 0.8rem' }}
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Total ASL Handlers</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--success)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>ISO 9001 Certified</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{isoCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--warning)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>On Probation</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{probationCount}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div className="input-group" style={{ marginBottom: 0, width: '400px', flexDirection: 'row', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search suppliers by name, email, or tax ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} />
            Filters
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Supplier Name</th>
                <th>Tax ID / GSTIN</th>
                <th>Primary Contact</th>
                <th>ISO 9001</th>
                <th>System Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading state */}
              {loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={20} className="spin" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Loading suppliers…
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {suppliers.length === 0
                      ? 'No suppliers yet — click "Register New Vendor" to add the first one.'
                      : 'No suppliers match your search.'}
                  </td>
                </tr>
              )}

              {filteredSuppliers.map((sup) => {
                const status = statusLabel(sup);
                return (
                  <tr key={sup.id} className="hover-row" onClick={() => setSelectedSupplier(sup)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--text-muted)' }}>{sup.code}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={16} />
                        {sup.name}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{sup.gstin ?? 'N/A'}</td>
                    <td>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{sup.contact ?? '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sup.email ?? ''}</div>
                    </td>
                    <td>
                      {sup.isIsoCertified ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 500 }}>
                          <Award size={14} /> Certified
                        </span>
                      ) : (
                        <span style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------ Supplier history modal ------------------ */}
      {selectedSupplier && (
        <div
          onClick={() => setSelectedSupplier(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in"
            style={{ padding: '2.5rem', width: '800px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-primary)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={24} color="var(--accent-primary)" /> {selectedSupplier.name}
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                  <span>Code: {selectedSupplier.code}</span>
                  <span>|</span>
                  <span>Contact: {selectedSupplier.contact ?? '—'} ({selectedSupplier.email ?? '—'})</span>
                </div>
              </div>
              <span className={`badge ${statusLabel(selectedSupplier) === 'Approved' ? 'badge-success' : 'badge-warning'}`}>
                {statusLabel(selectedSupplier)}
              </span>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} /> Supply & QC History
            </h3>

            <div className="table-container" style={{ marginBottom: '2rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date Received</th>
                    <th>GRN / Invoice No.</th>
                    <th>Total Components</th>
                    <th>Overall Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getHistory(selectedSupplier.id).map((shipment, i) => (
                    <tr key={i} className="hover-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedShipment(shipment)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          <Calendar size={14} /> {shipment.date}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                        <div>{shipment.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{shipment.invoice}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{shipment.components.length} Items</td>
                      <td>
                        {shipment.status === 'PASS' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                            <CheckCircle size={14} /> PASSED
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                            <XOctagon size={14} /> FAILED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedSupplier(null)}>Close History Viewer</button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------ Register modal ------------------ */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in"
            style={{ padding: '2.5rem', width: '550px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} /> Register New Vendor
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Enlist a new vendor into the active ASL database. Non-ISO certified suppliers will automatically be flagged as Probationary.
            </p>

            <div className="input-group">
              <label className="input-label">Registered Company Name *</label>
              <input required className="input-field" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Texas Instruments" autoFocus />
            </div>

            <div className="input-group">
              <label className="input-label">Tax ID / GSTIN (Optional)</label>
              <input className="input-field" value={formData.gstin} onChange={(e) => setFormData((p) => ({ ...p, gstin: e.target.value }))} placeholder="e.g. 29AABCU9603R1ZX" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Primary Contact Person *</label>
                <input required className="input-field" value={formData.contact} onChange={(e) => setFormData((p) => ({ ...p, contact: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="input-group">
                <label className="input-label">Contact Email *</label>
                <input required type="email" className="input-field" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="john@company.com" />
              </div>
            </div>

            {/* ISO toggle */}
            <div className="input-group" style={{
              background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem',
            }}>
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>ISO 9001 Certified?</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Does this supplier hold valid quality certifications?</div>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} checked={formData.iso} onChange={(e) => setFormData((p) => ({ ...p, iso: e.target.checked }))} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: formData.iso ? 'var(--success)' : 'var(--bg-secondary)',
                  transition: '.4s', borderRadius: '24px', border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '16px', width: '16px', left: '4px', bottom: '3px',
                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                    transform: formData.iso ? 'translateX(22px)' : 'translateX(0)',
                  }} />
                </span>
              </label>
            </div>

            {!formData.iso && (
              <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={14} /> Without ISO 9001 verification, this supplier will be placed on Probation.
              </div>
            )}

            {/* Inline error from server-side validation or auth */}
            {formError && (
              <div style={{
                marginTop: '1rem', padding: '0.6rem 0.8rem', borderRadius: '6px',
                border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.85rem',
              }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={createSupplier.loading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!formData.name || !formData.contact || !formData.email || createSupplier.loading}
                onClick={handleRegister}
              >
                {createSupplier.loading ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                {createSupplier.loading ? 'Registering…' : 'Register Vendor to ASL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------ Shipment details modal (mock data) ------------------ */}
      {selectedShipment && (
        <div
          onClick={() => setSelectedShipment(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in"
            style={{ padding: '2.5rem', width: '900px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-primary)', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Shipment Details: <span style={{ color: 'var(--accent-primary)' }}>{selectedShipment.id}</span>
                </h2>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Invoice:</strong> {selectedShipment.invoice}</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Date:</strong> {selectedShipment.date}</span>
                </div>
              </div>
              <span className={`badge ${selectedShipment.status === 'PASS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}>
                {selectedShipment.status === 'PASS' ? 'SHIPMENT PASSED' : 'HAS REJECTIONS'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Received Components</h3>
            <div className="table-container" style={{ marginBottom: '2rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lot Name</th>
                    <th>Component</th>
                    <th>Qty</th>
                    <th>Inspector</th>
                    <th>Measurements</th>
                    <th>QC Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShipment.components.map((comp: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{comp.lotId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Box size={14} color="var(--text-muted)" /> {comp.part}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{comp.qty.toLocaleString()}</td>
                      <td style={{ fontSize: '0.85rem' }}>{comp.inspector}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{comp.measurement}</div>
                        {comp.status === 'FAIL' && <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Defect: {comp.defect}</div>}
                      </td>
                      <td>
                        {comp.status === 'PASS' ? (
                          <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>PASS</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>REJECT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedShipment(null)}>Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Tiny inline keyframe for the spinner — keeps the page self-contained */}
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
