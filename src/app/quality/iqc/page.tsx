"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  XOctagon, 
  Eye, 
  Bell,
  MessageCircle,
  QrCode,
  Check,
  ChevronRight,
  Package,
  Scan,
  X
} from 'lucide-react';

export default function IqcPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  
  // Verification State
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [currentScan, setCurrentScan] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [rejectData, setRejectData] = useState({ reason: '', action: 'DEBIT_NOTE', notes: '' });
  const [purchaseAlerted, setPurchaseAlerted] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('QMS_REELS');
    if (saved) {
      setReels(JSON.parse(saved));
    }
  }, []);

  // Group Quarantined items by GRN (Lot)
  const quarantinedByLot = reels.filter(r => r.status === 'QUARANTINE').reduce((acc: any, reel) => {
    if (!acc[reel.grn]) {
      acc[reel.grn] = {
        grn: reel.grn,
        partNumber: reel.partNumber,
        supplier: reel.supplier,
        items: [],
        totalQty: 0
      };
    }
    acc[reel.grn].items.push(reel);
    acc[reel.grn].totalQty += reel.qty;
    return acc;
  }, {});

  const pendingLots = Object.values(quarantinedByLot);
  const activeLotData = selectedLot ? (quarantinedByLot as any)[selectedLot] : null;

  const handleScanIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScan.trim() || !activeLotData) return;

    const matchedItem = activeLotData.items.find((it: any) => it.id.toUpperCase() === currentScan.toUpperCase());
    
    if (!matchedItem) {
      alert(`Invalid QR: ID '${currentScan}' does not belong to this shipment lot.`);
    } else if (scannedIds.includes(matchedItem.id)) {
      alert(`Already Scanned: This packet has already been verified.`);
    } else {
      setScannedIds(prev => [...prev, matchedItem.id]);
    }
    setCurrentScan('');
  };

  const handleApproveLot = () => {
    if (!activeLotData || scannedIds.length !== activeLotData.items.length) return;

    const newAllReels = reels.map(r => {
      if (r.grn === selectedLot && r.status === 'QUARANTINE') {
        return {
          ...r,
          status: 'ACCEPTED',
          history: [
            ...r.history,
            { 
              date: new Date().toISOString().split('T')[0], 
              stage: 'IQC Verification', 
              action: `Strict Verify: Passed physical scan and quality check.`, 
              user: 'Quality.Inspector' 
            }
          ]
        };
      }
      return r;
    });

    setReels(newAllReels);
    localStorage.setItem('QMS_REELS', JSON.stringify(newAllReels));
    
    setApprovedCount(prev => prev + 1);
    setShowVerifyModal(false);
    setSelectedLot(null);
    setScannedIds([]);
    alert(`Success! Lot ${selectedLot} fully verified and released to Store.`);
  };

  const handleRejectLot = () => {
    if (!selectedLot) return;

    const newAllReels = reels.map(r => {
      if (r.grn === selectedLot && r.status === 'QUARANTINE') {
        return {
          ...r,
          status: 'REJECTED',
          history: [...r.history, { date: new Date().toISOString().split('T')[0], stage: 'IQC Rejection', action: `REJECTED: ${rejectData.reason}`, user: 'Quality.Inspector' }]
        };
      }
      return r;
    });

    setReels(newAllReels);
    localStorage.setItem('QMS_REELS', JSON.stringify(newAllReels));

    setPurchaseAlerted(true);
    setShowRejectModal(false);
    setSelectedLot(null);
  };

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Zero-Error IQC Verification</h1>
          <p className="text-secondary">Strict Scan-To-Verify protocol for incoming material (ISO 9001:2015)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {approvedCount > 0 && <span className="badge badge-success">✓ {approvedCount} Lots Verified Today</span>}
        </div>
      </div>

      {purchaseAlerted && (
        <div className="glass-panel" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Bell size={20} color="var(--danger)" />
            <p style={{ color: 'var(--danger)', fontWeight: 600 }}>Material Rejected — Purchase Team Alerted</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setPurchaseAlerted(false)}>Dismiss</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '1.5rem' }}>
        {/* Left Column: Pending Lots */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} color="var(--warning)" />
            Quarantined Lots ({pendingLots.length})
          </h2>
          
          {pendingLots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} color="var(--success)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>Dock is clear.</p>
            </div>
          ) : (
            pendingLots.map((lot: any) => (
              <div 
                key={lot.grn} 
                className="glass-card" 
                style={{ 
                  padding: '1rem', 
                  cursor: 'pointer', 
                  borderLeft: selectedLot === lot.grn ? '4px solid var(--accent-primary)' : '4px solid var(--warning)',
                  background: selectedLot === lot.grn ? 'rgba(59,130,246,0.05)' : 'transparent'
                }}
                onClick={() => {
                  setSelectedLot(lot.grn);
                  setScannedIds([]);
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600 }}>{lot.partNumber}</span>
                  <span className="badge badge-warning">{lot.items.length} Boxes</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lot: {lot.grn} • Qty: {lot.totalQty.toLocaleString()} pcs</div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Inspection Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {activeLotData ? (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>{activeLotData.partNumber}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Verification required for Lot: {activeLotData.grn} • {activeLotData.supplier}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{activeLotData.items.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Boxes to scan</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {[ 'Visual Inspection', 'Quantity Verification', 'Packaging Quality', 'MPN Label Matching'].map(check => (
                   <div key={check} className="input-group">
                     <label className="input-label">{check}</label>
                     <select className="input-field">
                        <option>PENDING</option>
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                     </select>
                   </div>
                ))}
              </div>

              <div style={{ background: 'rgba(59,130,246,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--accent-primary)', marginBottom: '2rem', textAlign: 'center' }}>
                <ShieldCheck size={32} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: 600 }}>Strict Zero-Error Protocol Active</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Approval is blocked until all {activeLotData.items.length} boxes are physically scanned.</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger" onClick={() => setShowRejectModal(true)}>
                  <XOctagon size={16} /> REJECT Entire Lot
                </button>
                <button className="btn btn-primary" style={{ background: 'var(--accent-primary)' }} onClick={() => setShowVerifyModal(true)}>
                  <Scan size={16} /> START SCAN VERIFICATION
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <QrCode size={64} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>Select a quarantined lot to begin Scan-To-Verify</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification / Scanning Modal */}
      {showVerifyModal && activeLotData && (
        <div className="modal-overlay">
          <div className="glass-panel animate-scale-in" style={{ width: '600px', padding: '2rem', border: '1px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                 <Scan size={24} /> Scan Verification Check
               </h2>
               <div style={{ background: 'var(--bg-primary)', padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                 {scannedIds.length} / {activeLotData.items.length}
               </div>
            </div>

            <form onSubmit={handleScanIn} style={{ marginBottom: '2rem' }}>
              <label className="input-label" style={{ color: 'var(--accent-primary)' }}>Scan Box Label QR Code</label>
              <div style={{ position: 'relative' }}>
                <input 
                  autoFocus
                  ref={scanInputRef}
                  className="input-field" 
                  style={{ fontSize: '1.25rem', padding: '1rem 1rem 1rem 3rem', border: '2px solid var(--accent-primary)' }} 
                  placeholder="Focus here to scan..."
                  value={currentScan}
                  onChange={e => setCurrentScan(e.target.value)}
                />
                <QrCode size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>
            </form>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
               {activeLotData.items.map((item: any) => (
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
                     opacity: scannedIds.includes(item.id) ? 1 : 0.6
                   }}
                 >
                   <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.id}</span>
                   {scannedIds.includes(item.id) && <Check size={16} color="var(--success)" />}
                 </div>
               ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowVerifyModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2, background: scannedIds.length === activeLotData.items.length ? 'var(--success)' : 'var(--text-muted)' }} 
                disabled={scannedIds.length !== activeLotData.items.length}
                onClick={handleApproveLot}
              >
                {scannedIds.length === activeLotData.items.length ? 'VERIFIED — Approve & Release' : `Verify All Boxes First (${scannedIds.length}/${activeLotData.items.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="glass-panel animate-scale-in" style={{ width: '450px', padding: '2rem', border: '1px solid var(--danger)' }}>
            <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Bulk Lot Rejection</h2>
            <div className="input-group">
              <label className="input-label">Reason for failure</label>
              <textarea className="input-field" value={rejectData.reason} onChange={e => setRejectData(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Provide NC report details..." />
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 2 }} onClick={handleRejectLot} disabled={!rejectData.reason}>
                Confirm Rejection 
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
