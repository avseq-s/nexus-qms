"use client";

import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  QrCode, 
  Filter, 
  Plus,
  ArrowRightLeft,
  Truck,
  CheckCircle,
  XOctagon,
  DownloadCloud,
  Camera,
  Layers
} from 'lucide-react';

// Mock data matching the Prisma schema for Reel Traceability
const MOCK_REELS = [
  { 
    id: 'QR-IC-7731', partNumber: 'IC-STM32F4', lot: 'LOT-2025-IC9', qty: 500, status: 'ACCEPTED', supplier: 'Avnet', location: 'Rack B2',
    history: [{ date: '2026-03-10', stage: 'Store Receipt', action: 'GRN Logged', user: 'Amit.S' }]
  },
  { 
    id: 'QR-IC-7732', partNumber: 'IC-STM32F4', lot: 'LOT-2025-IC9', qty: 1000, status: 'AT_EMS', emsName: 'Precision PCB', location: 'EMS: Precision PCB',
    history: [{ date: '2026-03-30', stage: 'Outsource', action: 'Dispatched to Precision PCB', user: 'System' }]
  },
  { 
    id: 'QR-RES-8841', partNumber: 'RES-0603-10K', lot: 'LOT-2025-R44', qty: 5000, status: 'ACCEPTED', supplier: 'DigiKey', location: 'Rack A1',
    history: [{ date: '2026-03-24', stage: 'Store Receipt', action: 'GRN Logged', user: 'Amit.S' }]
  },
  { 
    id: 'QR-RES-8842', partNumber: 'RES-0603-10K', lot: 'LOT-2025-R44', qty: 2000, status: 'AT_EMS', emsName: 'Z-Tech Inc', location: 'EMS: Z-Tech Inc',
    history: [{ date: '2026-03-31', stage: 'Outsource', action: 'Dispatched to Z-Tech Inc', user: 'System' }]
  },
  { 
    id: 'QR-RES-8843', partNumber: 'RES-0603-10K', lot: 'LOT-2025-R44', qty: 3000, status: 'AT_EMS', emsName: 'Precision PCB', location: 'EMS: Precision PCB',
    history: [{ date: '2026-03-31', stage: 'Outsource', action: 'Dispatched to Precision PCB', user: 'System' }]
  },
  { 
    id: 'QR-CAP-9921', partNumber: 'CAP-0402-104K', lot: 'LOT-2025-V11', qty: 10000, status: 'QUARANTINE', supplier: 'Mouser', location: 'IQC Holding',
    grn: 'GRN-9988',
    history: [{ date: '2026-04-01', stage: 'Store Counting', action: 'Pre-IQC QR Born', user: 'Store.Staff' }]
  },
];

export default function InventoryPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [tempLocation, setTempLocation] = useState('');
  
  const [search, setSearch] = useState('');
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [selectedHistoryReel, setSelectedHistoryReel] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [grnData, setGrnData] = useState({ supplier: '', challan: '', items: [] as any[] });
  
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [osData, setOsData] = useState({
    id: '',
    partNumber: '',
    qty: '',
    supplier: '',
    location: ''
  });

  React.useEffect(() => {
    // For testing: Overwrite with fresh dummy data to show Multi-EMS and Zero-Error features
    setReels(MOCK_REELS);
    localStorage.setItem('QMS_REELS', JSON.stringify(MOCK_REELS));
    
    // Also clear pending IQC since it's now integrated into REELS as QUARANTINE
    localStorage.removeItem('QMS_PENDING_IQC');
  }, []);

  function saveReels(newReels: any[]) {
    setReels(newReels);
    localStorage.setItem('QMS_REELS', JSON.stringify(newReels));
  }

  function handleCreateGrn() {
    if (!grnData.supplier || grnData.items.length === 0 || grnData.items.some(i => i.countedQty === '')) return;

    // 1. Generate individual "Pre-IQC" Reels for each packet
    const incomingReels: any[] = [];
    
    grnData.items.forEach((it: any) => {
       const reelCount = parseInt(it.reelCount || '1', 10);
       const totalQty = Number(it.countedQty);
       const qtyPerReel = Math.floor(totalQty / reelCount);
       const remainder = totalQty % reelCount;

       for (let i = 0; i < reelCount; i++) {
          const finalQty = i === reelCount - 1 ? qtyPerReel + remainder : qtyPerReel;
          if (finalQty <= 0) continue;

          // QR IDs born at Inwarding
          const baseId = `QR-${it.component.split(' ')[0]}-${Math.floor(1000 + Math.random() * 9000)}`;
          const newId = reelCount > 1 ? `${baseId}-${i + 1}` : baseId;

          incomingReels.push({
            id: newId,
            partNumber: it.component.split(' (')[0],
            lot: `LOT-${new Date().getFullYear()}-NEW`,
            qty: finalQty,
            status: 'QUARANTINE', // Pre-IQC Locked
            grn: grnData.challan, // Linking to GRN for IQC grouping
            supplier: grnData.supplier,
            location: it.location || 'IQC Holding',
            history: [
              { 
                date: new Date().toISOString().split('T')[0], 
                stage: 'Store Counting', 
                action: `Material Counted & Pre-IQC QR Born (Packet ${i + 1}/${reelCount})`, 
                user: 'Store.Staff',
                imageRef: it.imageRef || null
              }
            ]
          });
       }
    });

    const newAllReels = [...incomingReels, ...reels];
    setReels(newAllReels);
    localStorage.setItem('QMS_REELS', JSON.stringify(newAllReels));

    alert(`${incomingReels.length} Pre-IQC Labels Generated. Please stick them on boxes and move to the Quality Lab.`);
    setShowGrnModal(false);
    setGrnData({ supplier: '', challan: '', items: [] });
  }

  function handleSaveOpeningStock() {
    if (!osData.id || !osData.partNumber || !osData.qty) {
      alert("ID, Part Number, and Qty are required fields.");
      return;
    }

    if (reels.some(r => r.id.toUpperCase() === osData.id.toUpperCase())) {
      alert(`ID Conflict: A reel/packet with ID '${osData.id}' already exists in the system.`);
      return;
    }

    const newReel = {
      id: osData.id.toUpperCase(),
      partNumber: osData.partNumber,
      qty: Number(osData.qty),
      supplier: osData.supplier || 'Legacy Opening Stock',
      location: osData.location || 'Store Main',
      status: 'ACCEPTED',
      lot: 'OPEN-STOCK',
      history: [{
        date: new Date().toISOString().split('T')[0],
        stage: 'Opening Stock',
        action: 'Manual Opening Stock Entry (System Migration)',
        user: 'System.Admin'
      }]
    };

    const newAllReels = [newReel, ...reels];
    setReels(newAllReels);
    localStorage.setItem('QMS_REELS', JSON.stringify(newAllReels));

    setShowOpeningStockModal(false);
    setOsData({ id: '', partNumber: '', qty: '', supplier: '', location: '' });
    alert('Opening Stock item successfully added to inventory.');
  }

  function handleUpdateLocation(id: string) {
    if (!tempLocation.trim()) return;
    const newAllReels = reels.map(r => r.id === id ? { 
      ...r, 
      location: tempLocation,
      history: [...(r.history || []), { date: new Date().toISOString().split('T')[0], stage: 'Store Putaway', action: `Assigned to location: ${tempLocation}`, user: 'Store.Admin' }]
    } : r);
    saveReels(newAllReels);
    setEditingLocation(null);
  }

  function handleFetchDetails() {
    if (!grnData.challan) return;
    setIsFetching(true);
    
    // Simulate API delay
    setTimeout(() => {
      let supplier = '';
      let items: any[] = [];
      let found = false;

      // Check localStorage for uploaded POs first
      const savedStr = localStorage.getItem('QMS_POS');
      if (savedStr) {
        const savedPos = JSON.parse(savedStr);
        const matchedPo = savedPos.find((p: any) => p.poNumber.toUpperCase() === grnData.challan.toUpperCase() || grnData.challan.toUpperCase().includes(p.poNumber.toUpperCase()));
        
        if (matchedPo) {
          supplier = matchedPo.supplier;
          // Extract specific parsed attributes if available
          items = matchedPo.mockItems && matchedPo.mockItems.length > 0 
                  ? matchedPo.mockItems.map((i: any) => ({
                      component: i.component,
                      declaredQty: i.declaredQty,
                      countedQty: '',
                      hsn: i.hsn || '',
                      rate: i.rate || '',
                      location: ''
                    }))
                  : [{ component: 'Generic Hardware Part', declaredQty: '100', countedQty: '', hsn: '', rate: '', location: '' }];
          found = true;
        }
      }

      // Fallback if not found in custom list (keep demo data active)
      if (!found) {
        if (grnData.challan.includes('89')) { // PO-2026-089
          supplier = 'Mouser Electronics';
          items = [
            { component: 'IC-STM32F4 (Microcontroller)', declaredQty: '500', countedQty: '', location: '', reelCount: 1 },
            { component: 'CAP-0402-104K (Ceramic Capacitor)', declaredQty: '10000', countedQty: '', location: '', reelCount: 1 },
            { component: 'DIO-1N4148 (Switching Diode)', declaredQty: '2000', countedQty: '', location: '', reelCount: 1 },
            { component: 'CON-USB-C (Connector)', declaredQty: '1000', countedQty: '', location: '', reelCount: 1 }
          ];
        } else if (grnData.challan.includes('88')) { // PO-2026-088
          supplier = 'DigiKey';
          items = [
            { component: 'RES-0603-10K (SMD Resistor)', declaredQty: '5000', countedQty: '', location: '', reelCount: 1 },
            { component: 'LED-0805-RED (SMD LED)', declaredQty: '10000', countedQty: '', location: '', reelCount: 1 }
          ];
        } else if (grnData.challan.includes('85')) { // PO-2026-085
          supplier = 'Avnet';
          items = [
            { component: 'PCB-MainBoard-V2 (Bare Board)', declaredQty: '150', countedQty: '', location: '', reelCount: 1 },
            { component: 'MOD-WiFi-ESP32 (Wireless Module)', declaredQty: '150', countedQty: '', location: '', reelCount: 1 },
            { component: 'BAT-18650-2500 (Li-ion Battery)', declaredQty: '300', countedQty: '', location: '', reelCount: 1 }
          ];
        } else {
          supplier = 'Local Supplier A';
          items = [
            { component: 'Miscellaneous Hardware Kit', declaredQty: '50', countedQty: '', location: '' }
          ];
        }
      }

      setGrnData(prev => ({
        ...prev,
        supplier,
        items,
      }));
      setIsFetching(false);
    }, 600);
  }

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Inward GRN & Inventory</h1>
          <p className="text-secondary">Store team material receiving, counting, and inventory tracking (ISO 9001)</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowOpeningStockModal(true)}>
            <Layers size={16} />
            Add Opening Stock
          </button>
          <button className="btn btn-primary" onClick={() => setShowGrnModal(true)}>
            <Plus size={16} />
            Receive Material (New GRN)
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div className="input-group" style={{ marginBottom: 0, width: '400px', flexDirection: 'row', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search by Part Number, Reel ID, or Lot..." 
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
                <th>Reel ID (QR)</th>
                <th>Part Number</th>
                <th>Supplier / Lot</th>
                <th>Meters / Qty</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reels.filter(r => r.id.includes(search) || r.partNumber.includes(search)).map((reel) => (
                <tr key={reel.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <QrCode size={16} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 600 }}>{reel.id}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{reel.partNumber}</td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>{reel.supplier}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reel.lot}</div>
                  </td>
                  <td>{reel.qty.toLocaleString()} pcs</td>
                  <td>
                    {editingLocation === reel.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input 
                          className="input-field" 
                          autoFocus
                          value={tempLocation} 
                          onChange={(e) => setTempLocation(e.target.value)} 
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateLocation(reel.id); }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '120px' }} 
                        />
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleUpdateLocation(reel.id)}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px', background: reel.location.includes('IQC') ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: reel.location.includes('IQC') ? 'var(--warning)' : 'var(--text-primary)', border: '1px dashed transparent', transition: 'border 0.2s' }}
                        onClick={() => { setEditingLocation(reel.id); setTempLocation(reel.location); }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                        title="Click to assign Store Putaway Location"
                      >
                        {reel.location}
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>✎</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      reel.status === 'ACCEPTED' ? 'badge-success' : 
                      reel.status === 'QUARANTINE' ? 'badge-warning' : 
                      reel.status === 'AT_EMS' ? 'badge-info' : 
                      reel.status === 'DISPATCHED' ? 'badge-primary' :
                      'badge-secondary'
                    }`}>
                      {reel.status === 'AT_EMS' ? 'AT VENDOR' : reel.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setSelectedHistoryReel(reel)}>
                      <ArrowRightLeft size={14} />
                      History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRN Generation Modal */}
      {showGrnModal && (
        <div 
          onClick={() => {
            setShowGrnModal(false);
            setGrnData({ supplier: '', challan: '', items: [] });
          }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ padding: '2rem', width: '600px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={20} /> Receive Material (Store Count)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Enter the Challan / Invoice No to auto-fetch the supplier and expected items, then record your physical count.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
              <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="input-label">Delivery Challan / PO No. *</label>
                <input 
                  className="input-field" 
                  placeholder="e.g. PO-2026-089 or INV-001" 
                  value={grnData.challan} 
                  onChange={e => setGrnData(p => ({ ...p, challan: e.target.value }))} 
                  onKeyDown={e => { if (e.key === 'Enter') handleFetchDetails(); }}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleFetchDetails} 
                disabled={!grnData.challan || isFetching}
                style={{ padding: '0.75rem 1rem' }}
              >
                {isFetching ? <div className="loader" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <DownloadCloud size={16} />}
                Fetch Details
              </button>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            
            <div style={{ opacity: grnData.supplier ? 1 : 0.5, pointerEvents: grnData.supplier ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Supplier Name</label>
                <input className="input-field" readOnly value={grnData.supplier} style={{ background: 'var(--bg-tertiary)' }} />
              </div>

              {grnData.items.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <label className="input-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Expected Items to Verify ({grnData.items.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {grnData.items.map((item, idx) => {
                      const hasMismatch = item.countedQty !== '' && item.countedQty !== item.declaredQty;
                      return (
                        <div key={idx} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: `1px solid ${hasMismatch ? 'var(--warning)' : 'var(--border-subtle)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{item.component}</div>
                              {(item.hsn || item.rate) && (
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {item.hsn && <span>HSN: <strong style={{ color: 'var(--text-secondary)' }}>{item.hsn}</strong></span>}
                                  {item.rate && <span>Unit Price: <strong style={{ color: 'var(--text-secondary)' }}>₹{item.rate}</strong></span>}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ERP Qty: <strong style={{color: 'var(--text-primary)', fontSize: '0.9rem'}}>{item.declaredQty}</strong> pcs</span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                onClick={() => {
                                  const newItems = [...grnData.items];
                                  newItems[idx].countedQty = item.declaredQty.toString();
                                  setGrnData(p => ({ ...p, items: newItems }));
                                }}
                              >
                                Match ERP
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Physically Counted *</label>
                              <input 
                                type="number" 
                                className="input-field" 
                                placeholder="0" 
                                value={item.countedQty} 
                                onChange={e => {
                                  const newItems = [...grnData.items];
                                  newItems[idx].countedQty = e.target.value;
                                  setGrnData(p => ({ ...p, items: newItems }));
                                }}
                                style={{ 
                                  padding: '0.5rem 0.75rem',
                                  borderColor: hasMismatch ? 'var(--warning)' : 'var(--border-subtle)',
                                  width: '100%'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Initial Location</label>
                              <input 
                                type="text" 
                                className="input-field" 
                                placeholder="IQC Holding..." 
                                value={item.location || ''} 
                                onChange={e => {
                                  const newItems = [...grnData.items];
                                  newItems[idx].location = e.target.value;
                                  setGrnData(p => ({ ...p, items: newItems }));
                                }}
                                style={{ padding: '0.5rem 0.75rem', width: '100%' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Packet Count *</label>
                              <input 
                                type="number" 
                                className="input-field" 
                                min="1"
                                placeholder="1" 
                                value={item.reelCount || 1} 
                                onChange={e => {
                                  const newItems = [...grnData.items];
                                  newItems[idx].reelCount = e.target.value;
                                  setGrnData(p => ({ ...p, items: newItems }));
                                }}
                                style={{ padding: '0.5rem 0.75rem', width: '100%' }}
                              />
                            </div>
                          </div>
                          
                          {item.reelCount > 1 && item.countedQty > 0 && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                              System will generate {item.reelCount} QR Codes (~{Math.floor(Number(item.countedQty) / Number(item.reelCount || 1))} pcs each)
                            </div>
                          )}
                          
                          <div style={{ marginTop: '0.75rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                              <Camera size={16} />
                              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Visual Reference (Optional)</span>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1 }}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                   const url = URL.createObjectURL(file);
                                   const newItems = [...grnData.items];
                                   newItems[idx].imageRef = url;
                                   setGrnData(p => ({ ...p, items: newItems }));
                                }
                              }}
                            />
                            {item.imageRef && <CheckCircle size={16} color="var(--success)" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {grnData.items.some(i => i.countedQty !== '' && i.countedQty !== i.declaredQty) && (
              <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚠ Count mismatch detected. This will be flagged to Purchase/IQC automatically.</span>
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowGrnModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateGrn} disabled={!grnData.supplier || grnData.items.length === 0 || grnData.items.some(i => i.countedQty === '')}>
                <CheckCircle size={16} />
                Generate GRN & Send to IQC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Timeline Modal */}
      {selectedHistoryReel && (
        <div 
          onClick={() => setSelectedHistoryReel(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ padding: '2.5rem', width: '700px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               Component Lifecycle Audit Trail
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
               ISO 9001 strict traceability log for Reel ID: <strong style={{ color: 'var(--text-primary)' }}>{selectedHistoryReel.id}</strong> ({selectedHistoryReel.partNumber})
            </p>

            <div style={{ position: 'relative', borderLeft: '2px solid var(--border-subtle)', marginLeft: '1rem', paddingLeft: '2rem' }}>
              {selectedHistoryReel.history?.map((event: any, idx: number) => {
                const isLast = idx === selectedHistoryReel.history.length - 1;
                return (
                  <div key={idx} style={{ position: 'relative', marginBottom: isLast ? 0 : '2rem' }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-2.45rem',
                      top: '0.2rem',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--bg-primary)',
                      border: `3px solid ${event.stage === 'Dispatch' ? 'var(--primary)' : event.stage.includes('IQC') ? 'var(--warning)' : event.stage.includes('Production') ? 'var(--info)' : 'var(--success)'}`,
                      zIndex: 2
                    }} />

                    <div>
                      <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.2rem 0.6rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        {event.date}
                      </span>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{event.stage}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{event.action}</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                        Logged by: {event.user}
                      </div>

                      {event.imageRef && (
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                           <img src={event.imageRef} alt="Verification" style={{ maxHeight: '120px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }} />
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'center' }}>GRN Visual Attachment</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedHistoryReel(null)}>Close Overview</button>
            </div>
          </div>
        </div>
      )}
      {/* Opening Stock Modal */}
      {showOpeningStockModal && (
        <div 
          onClick={() => setShowOpeningStockModal(false)}
          className="modal-overlay" 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ padding: '2.5rem', width: '500px', maxWidth: '100%', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Package size={24} /> Manual Opening Stock Entry
            </h2>
            
            <div className="input-group">
              <label className="input-label">Reel / Packet ID *</label>
              <input className="input-field" placeholder="e.g. SN-001" value={osData.id} onChange={e => setOsData(p => ({...p, id: e.target.value}))} />
            </div>

            <div className="input-group">
              <label className="input-label">Part Number *</label>
              <input className="input-field" placeholder="IC-STM32F4" value={osData.partNumber} onChange={e => setOsData(p => ({...p, partNumber: e.target.value}))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Quantity *</label>
                <input type="number" className="input-field" placeholder="0" value={osData.qty} onChange={e => setOsData(p => ({...p, qty: e.target.value}))} />
              </div>
              <div className="input-group">
                <label className="input-label">Location</label>
                <input className="input-field" placeholder="Store Main" value={osData.location} onChange={e => setOsData(p => ({...p, location: e.target.value}))} />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label className="input-label">Supplier (Optional)</label>
              <input className="input-field" placeholder="Mouser Electronics" value={osData.supplier} onChange={e => setOsData(p => ({...p, supplier: e.target.value}))} />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowOpeningStockModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveOpeningStock}>
                Save to Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
