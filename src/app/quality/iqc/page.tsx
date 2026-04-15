// =============================================================================
// Quality → IQC (Incoming Quality Control) page
// =============================================================================
// Strict "Scan-To-Verify" flow for quarantined reels. Inspectors must scan the
// QR code on every reel belonging to a GRN before the lot can be released to
// the store (status flips QUARANTINE → ACCEPTED). Any reel they can't verify
// gets the whole lot REJECTED, which triggers an NCR downstream.
//
// Data flow (post-GraphQL migration):
//   useReels({ status: 'QUARANTINE' })  — fetch all reels awaiting inspection
//   useUpdateReelStatus()               — flip each reel's status individually
//
// Bulk status changes are done by calling the mutation once per reel in the
// lot. We do that sequentially to keep the code readable — a real high-volume
// deployment should grow a dedicated `updateReelsStatusBulk` mutation.
// =============================================================================

"use client";

import React, { useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XOctagon,
  Bell,
  QrCode,
  Check,
  Scan,
  Loader2,
} from 'lucide-react';
import { useReels, useUpdateReelStatus, type Reel } from '@/lib/graphql/hooks';

// Lot = a GRN's worth of quarantined reels, built client-side from the flat
// reel list we get from GraphQL.
interface Lot {
  grnId: string;
  grnNumber: string;
  supplier: string;
  partNumber: string;   // representative part (first reel's component)
  items: Reel[];
  totalQty: number;
}

export default function IqcPage() {
  // -------------------------------------------------------------------------
  // Remote data
  // -------------------------------------------------------------------------
  const { data, loading, error, refetch } = useReels({ status: 'QUARANTINE' }, { take: 100 });
  const updateReelStatus = useUpdateReelStatus();

  const quarantined: Reel[] = data?.reels.nodes ?? [];

  // -------------------------------------------------------------------------
  // Local UI state
  // -------------------------------------------------------------------------
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Scan-verify state — which reel IDs the inspector has successfully scanned.
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [currentScan, setCurrentScan] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [rejectData, setRejectData] = useState({ reason: '', action: 'DEBIT_NOTE', notes: '' });
  const [purchaseAlerted, setPurchaseAlerted] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Group the flat reel list by GRN to form Lots.
  // -------------------------------------------------------------------------
  const lotsByGrn: Record<string, Lot> = useMemo(() => {
    return quarantined.reduce((acc: Record<string, Lot>, reel) => {
      const id = reel.grn.id;
      if (!acc[id]) {
        acc[id] = {
          grnId: id,
          grnNumber: reel.grn.grnNumber,
          supplier: reel.grn.supplier.name,
          partNumber: reel.component.partNumber,
          items: [],
          totalQty: 0,
        };
      }
      acc[id].items.push(reel);
      acc[id].totalQty += reel.quantity;
      return acc;
    }, {});
  }, [quarantined]);

  const pendingLots = Object.values(lotsByGrn);
  const activeLot = selectedLot ? lotsByGrn[selectedLot] : null;

  // -------------------------------------------------------------------------
  // Scan-to-verify handlers
  // -------------------------------------------------------------------------
  function handleScanIn(e: React.FormEvent) {
    e.preventDefault();
    if (!currentScan.trim() || !activeLot) return;
    const raw = currentScan.trim();
    // Match against reel ID (ObjectId) — case-insensitive for forgiving scanners.
    const match = activeLot.items.find((it) => it.id.toLowerCase() === raw.toLowerCase());
    if (!match) {
      alert(`Invalid QR: ID '${raw}' does not belong to this shipment lot.`);
    } else if (scannedIds.includes(match.id)) {
      alert('Already Scanned: This reel has already been verified.');
    } else {
      setScannedIds((prev) => [...prev, match.id]);
    }
    setCurrentScan('');
  }

  /** Bulk-approve every reel in the active lot by calling the mutation per reel. */
  async function handleApproveLot() {
    if (!activeLot || scannedIds.length !== activeLot.items.length) return;
    setBulkWorking(true);
    setBulkError(null);
    try {
      for (const reel of activeLot.items) {
        await updateReelStatus.execute({ id: reel.id, status: 'ACCEPTED' });
      }
      await refetch();
      setApprovedCount((c) => c + 1);
      setShowVerifyModal(false);
      setSelectedLot(null);
      setScannedIds([]);
      alert(`Success — lot ${activeLot.grnNumber} verified and released to Store.`);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Failed to approve lot');
    } finally {
      setBulkWorking(false);
    }
  }

  /** Bulk-reject every reel in the active lot. */
  async function handleRejectLot() {
    if (!activeLot) return;
    setBulkWorking(true);
    setBulkError(null);
    try {
      for (const reel of activeLot.items) {
        await updateReelStatus.execute({ id: reel.id, status: 'REJECTED' });
      }
      await refetch();
      setPurchaseAlerted(true);
      setShowRejectModal(false);
      setSelectedLot(null);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Failed to reject lot');
    } finally {
      setBulkWorking(false);
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
          <h1 className="text-gradient">Zero-Error IQC Verification</h1>
          <p className="text-secondary">Strict Scan-To-Verify protocol for incoming material (ISO 9001:2015)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {approvedCount > 0 && (
            <span className="badge badge-success">✓ {approvedCount} Lots Verified Today</span>
          )}
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

      {purchaseAlerted && (
        <div
          className="glass-panel"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Bell size={20} color="var(--danger)" />
            <p style={{ color: 'var(--danger)', fontWeight: 600 }}>
              Material Rejected — Purchase Team Alerted
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => setPurchaseAlerted(false)}>Dismiss</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '1.5rem' }}>
        {/* Left: pending lots */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} color="var(--warning)" />
            Quarantined Lots ({pendingLots.length})
          </h2>

          {loading && pendingLots.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Loader2 size={28} className="spin" style={{ opacity: 0.6, marginBottom: '1rem' }} />
              <p>Loading quarantined reels…</p>
            </div>
          )}

          {!loading && pendingLots.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} color="var(--success)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>Dock is clear.</p>
            </div>
          )}

          {pendingLots.map((lot) => (
            <div
              key={lot.grnId}
              className="glass-card"
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: selectedLot === lot.grnId ? '4px solid var(--accent-primary)' : '4px solid var(--warning)',
                background: selectedLot === lot.grnId ? 'rgba(59,130,246,0.05)' : 'transparent',
              }}
              onClick={() => {
                setSelectedLot(lot.grnId);
                setScannedIds([]);
                setBulkError(null);
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600 }}>{lot.partNumber}</span>
                <span className="badge badge-warning">{lot.items.length} Reels</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                GRN: {lot.grnNumber} • Qty: {lot.totalQty.toLocaleString()} pcs • {lot.supplier}
              </div>
            </div>
          ))}
        </div>

        {/* Right: inspection panel */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {activeLot ? (
            <div className="animate-fade-in">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '2rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '1rem',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                    {activeLot.partNumber}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Verification required for GRN: {activeLot.grnNumber} • {activeLot.supplier}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                    {activeLot.items.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Reels to scan
                  </div>
                </div>
              </div>

              {/* Inspection checklist — UI-only today; wire to createIqcInspection
                  when per-parameter PASS/FAIL capture is added. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {['Visual Inspection', 'Quantity Verification', 'Packaging Quality', 'MPN Label Matching'].map(
                  (check) => (
                    <div key={check} className="input-group">
                      <label className="input-label">{check}</label>
                      <select className="input-field" defaultValue="PENDING">
                        <option value="PENDING">PENDING</option>
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                      </select>
                    </div>
                  )
                )}
              </div>

              <div
                style={{
                  background: 'rgba(59,130,246,0.05)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--accent-primary)',
                  marginBottom: '2rem',
                  textAlign: 'center',
                }}
              >
                <ShieldCheck size={32} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: 600 }}>Strict Zero-Error Protocol Active</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Approval is blocked until all {activeLot.items.length} reels are physically scanned.
                </p>
              </div>

              {bulkError && (
                <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{bulkError}</div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowRejectModal(true)}
                  disabled={bulkWorking}
                >
                  <XOctagon size={16} /> REJECT Entire Lot
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={() => setShowVerifyModal(true)}
                  disabled={bulkWorking}
                >
                  <Scan size={16} /> START SCAN VERIFICATION
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <QrCode size={64} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>Select a quarantined lot to begin Scan-To-Verify</p>
            </div>
          )}
        </div>
      </div>

      {/* Verify modal */}
      {showVerifyModal && activeLot && (
        <div className="modal-overlay">
          <div
            className="glass-panel animate-scale-in"
            style={{ width: '600px', padding: '2rem', border: '1px solid var(--accent-primary)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                <Scan size={24} /> Scan Verification Check
              </h2>
              <div
                style={{
                  background: 'var(--bg-primary)',
                  padding: '0.4rem 1rem',
                  borderRadius: '100px',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 700,
                }}
              >
                {scannedIds.length} / {activeLot.items.length}
              </div>
            </div>

            <form onSubmit={handleScanIn} style={{ marginBottom: '2rem' }}>
              <label className="input-label" style={{ color: 'var(--accent-primary)' }}>
                Scan Reel QR Code (reel ID)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  autoFocus
                  ref={scanInputRef}
                  className="input-field"
                  style={{ fontSize: '1.25rem', padding: '1rem 1rem 1rem 3rem', border: '2px solid var(--accent-primary)' }}
                  placeholder="Focus here to scan…"
                  value={currentScan}
                  onChange={(e) => setCurrentScan(e.target.value)}
                />
                <QrCode size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>
            </form>

            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '2rem',
                padding: '0.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {activeLot.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: scannedIds.includes(item.id) ? 'rgba(34,197,94,0.1)' : 'var(--bg-primary)',
                    border: scannedIds.includes(item.id) ? '1px solid var(--success)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: scannedIds.includes(item.id) ? 1 : 0.6,
                  }}
                  title={`Lot: ${item.supplierLot} • Qty: ${item.quantity}`}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>
                    {item.id.slice(-8).toUpperCase()}
                  </span>
                  {scannedIds.includes(item.id) && <Check size={16} color="var(--success)" />}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowVerifyModal(false)}
                disabled={bulkWorking}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 2,
                  background:
                    scannedIds.length === activeLot.items.length ? 'var(--success)' : 'var(--text-muted)',
                }}
                disabled={scannedIds.length !== activeLot.items.length || bulkWorking}
                onClick={handleApproveLot}
              >
                {bulkWorking ? (
                  <><Loader2 size={14} className="spin" /> Approving…</>
                ) : scannedIds.length === activeLot.items.length ? (
                  'VERIFIED — Approve & Release'
                ) : (
                  `Verify All Reels First (${scannedIds.length}/${activeLot.items.length})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div
            className="glass-panel animate-scale-in"
            style={{ width: '450px', padding: '2rem', border: '1px solid var(--danger)' }}
          >
            <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Bulk Lot Rejection</h2>
            <div className="input-group">
              <label className="input-label">Reason for failure</label>
              <textarea
                className="input-field"
                value={rejectData.reason}
                onChange={(e) => setRejectData((p) => ({ ...p, reason: e.target.value }))}
                rows={3}
                placeholder="Provide NC report details…"
              />
            </div>
            {bulkError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{bulkError}</div>}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowRejectModal(false)}
                disabled={bulkWorking}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 2 }}
                onClick={handleRejectLot}
                disabled={!rejectData.reason || bulkWorking}
              >
                {bulkWorking ? <><Loader2 size={14} className="spin" /> Rejecting…</> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
}
