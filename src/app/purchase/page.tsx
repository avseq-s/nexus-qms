"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  UploadCloud, 
  CheckCircle, 
  FileSpreadsheet, 
  Building2,
  ListOrdered,
  Database,
  Send,
  AlertTriangle
} from 'lucide-react';
import { parsePoPdf } from '@/lib/pdfParser';

const INITIAL_MOCK_POS = [
  { poNumber: 'PO-2026-089', supplier: 'Mouser Electronics', date: '2026-03-20', eta: '2026-03-28', status: 'PENDING_DELIVERY', itemsCount: 4, value: '$4,200', hasExcel: true },
  { poNumber: 'PO-2026-088', supplier: 'DigiKey', date: '2026-03-18', eta: '2026-03-25', status: 'PARTIAL_RECEIPT', itemsCount: 2, value: '$1,850', hasExcel: true },
  { poNumber: 'PO-2026-085', supplier: 'Avnet', date: '2026-03-10', eta: '2026-03-22', status: 'CLOSED', itemsCount: 3, value: '$12,000', hasExcel: true },
];

export default function PurchasePage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [pos, setPos] = useState(INITIAL_MOCK_POS);
  const [uploadData, setUploadData] = useState({ poNumber: '', supplier: '', eta: '', pdfFile: null as File | null, isParsing: false, extractedItems: [] as any[] });

  const [activeSuppliers, setActiveSuppliers] = useState<any[]>([]);
  const [activeCatalog, setActiveCatalog] = useState<any[]>([]);
  const [newVendorFormData, setNewVendorFormData] = useState({ contact: '', email: '', iso: false });
  const [hasPushedQueue, setHasPushedQueue] = useState(false);
  const [requisitions, setRequisitions] = useState<any[]>([]);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({ mfgPart: '', description: '', supplier: '' });

  async function handlePdfSelect(file: File) {
    setUploadData(p => ({ ...p, pdfFile: file, isParsing: true }));
    
    try {
      const data = await parsePoPdf(file);
      
      setUploadData(p => ({
        ...p,
        isParsing: false,
        poNumber: data.poNumber,
        supplier: data.supplier,
        eta: data.eta,
        extractedItems: data.items,
      }));
    } catch (err) {
      console.error('Frontend error parsing PDF:', err);
      // Fallback
      setUploadData(p => ({
        ...p,
        isParsing: false,
        poNumber: `PO-PARSE-ERR-${Math.floor(100 + Math.random() * 900)}`,
        supplier: 'Fallback Supplier (Parse Error)',
        eta: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        extractedItems: []
      }));
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('QMS_POS');
    if (saved) setPos(JSON.parse(saved));
    else localStorage.setItem('QMS_POS', JSON.stringify(INITIAL_MOCK_POS));

    const savedSups = localStorage.getItem('QMS_SUPPLIERS');
    if (savedSups) setActiveSuppliers(JSON.parse(savedSups));

    const savedCat = localStorage.getItem('QMS_MASTER_CATALOG');
    if (savedCat) setActiveCatalog(JSON.parse(savedCat));

    const savedReqs = localStorage.getItem('QMS_PURCHASE_REQUISITIONS');
    if (savedReqs) setRequisitions(JSON.parse(savedReqs));
  }, []);

  const isSupplierUnregistered = uploadData.supplier !== '' && !uploadData.isParsing && 
    !activeSuppliers.some(s => s.name.toLowerCase() === uploadData.supplier.toLowerCase() || uploadData.supplier.toLowerCase().includes(s.name.toLowerCase()));

  const unknownComponents = uploadData.extractedItems.length > 0 && !uploadData.isParsing 
    ? uploadData.extractedItems.filter((item: any) => {
        const str = `${item.component || ''} ${item.partNumber || ''} ${item.description || ''}`.toLowerCase();
        // Skip purely generic/empty fallback items
        if (str.trim() === '' || str.includes('hardware part')) return false;

        return !activeCatalog.some(cat => 
           str.includes((cat.id || '').toLowerCase()) || 
           str.includes((cat.description || '').toLowerCase()) || 
           ((cat.description || '').toLowerCase() !== '' && (cat.description || '').toLowerCase().includes(str))
        );
      })
    : [];

  function handleSaveDraft() {
    if (!uploadData.poNumber) return;
    const newItemsCount = uploadData.extractedItems.length > 0 ? uploadData.extractedItems.length : Math.floor(Math.random() * 5) + 2; 
    
    const newPo = {
      poNumber: uploadData.poNumber,
      supplier: uploadData.supplier,
      date: new Date().toISOString().split('T')[0],
      eta: uploadData.eta,
      status: 'DRAFT',
      itemsCount: newItemsCount,
      value: 'TBD',
      hasExcel: false,
      mockItems: uploadData.extractedItems.length > 0 ? uploadData.extractedItems : Array(newItemsCount).fill(null).map((_, i) => ({ component: `Item-${i+1}`, declaredQty: '50' }))
    };
    const updatedPos = [newPo, ...pos];
    setPos(updatedPos);
    localStorage.setItem('QMS_POS', JSON.stringify(updatedPos));

    alert(`PO ${uploadData.poNumber} saved as DRAFT. Awaiting compliance clearances.`);
    setShowModal(false);
    setUploadData({ poNumber: '', supplier: '', eta: '', pdfFile: null, isParsing: false, extractedItems: [] });
  }

  function handleUpload() {
    if (!uploadData.poNumber || !uploadData.pdfFile) return;
    
    // Auto-generate items from the PDF OR use the actual extracted ones
    const newItemsCount = uploadData.extractedItems.length > 0 ? uploadData.extractedItems.length : Math.floor(Math.random() * 5) + 2; 
    
    const newItems = uploadData.extractedItems.length > 0 
       ? uploadData.extractedItems 
       : Array(newItemsCount).fill(null).map((_, i) => ({
          component: `Item-${i+1} (From PDF)`,
          declaredQty: String((i + 1) * 50),
          countedQty: ''
       }));

    const newPo = {
      poNumber: uploadData.poNumber,
      supplier: uploadData.supplier,
      date: new Date().toISOString().split('T')[0],
      eta: uploadData.eta,
      status: 'PENDING_DELIVERY',
      itemsCount: newItemsCount,
      value: 'TBD',
      hasExcel: false,
      mockItems: newItems
    };

    const updatedPos = [newPo, ...pos];
    setPos(updatedPos);
    localStorage.setItem('QMS_POS', JSON.stringify(updatedPos));

    // Automated Requisition Fulfillment Logic
    // If PO contains items that match pending shortages, remove them from requisitions
    const currentReqs = JSON.parse(localStorage.getItem('QMS_PURCHASE_REQUISITIONS') || '[]');
    const remainingReqs = currentReqs.filter((req: any) => {
        // Find if this requisition part is in the new PO
        const fulfilledByPo = newItems.some((pi: any) => 
            (pi.partNumber && pi.partNumber.toLowerCase() === req.partNumber.toLowerCase()) ||
            (pi.component && pi.component.toLowerCase().includes(req.partNumber.toLowerCase()))
        );
        return !fulfilledByPo; // Keep if NOT fulfilled
    });

    if (remainingReqs.length < currentReqs.length) {
        localStorage.setItem('QMS_PURCHASE_REQUISITIONS', JSON.stringify(remainingReqs));
        setRequisitions(remainingReqs);
        alert(`PO ${uploadData.poNumber} verified. ${currentReqs.length - remainingReqs.length} BOM shortages have been automatically fulfilled.`);
    } else {
        alert(`PO ${uploadData.poNumber} scanned successfully! The extracted details are now synced for Store GRN verification.`);
    }

    setShowModal(false);
    setHasPushedQueue(false);
    setUploadData({ poNumber: '', supplier: '', eta: '', pdfFile: null, isParsing: false, extractedItems: [] });
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadData(p => ({ ...p, file: e.dataTransfer.files[0] }));
    }
  };

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Purchase Orders</h1>
          <p className="text-secondary">Upload PO PDFs for automated AI data extraction</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowRequestModal(true)}>
            <Database size={16} />
            Request Part No.
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Smart Upload PO
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--accent-primary)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Active POs</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>12</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--warning)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Pending Delivery</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>8</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--success)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>With Excel Attached</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>10</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2.5fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Pending Shortages Column (Grouped by Project) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
            <AlertTriangle size={18} />
            BOM Shortages ({requisitions.length})
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Consolidated requirements from Engineering</p>

          {requisitions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={32} color="var(--success)" style={{ marginBottom: '0.5rem', opacity: 0.7 }} />
              <p style={{ fontSize: '0.9rem' }}>All BOMs Fully Stocked</p>
            </div>
          ) : (
            // Grouping logic inside the render
            Object.entries(
              requisitions.reduce((acc: any, curr: any) => {
                const group = curr.workOrderRef || 'Unassigned';
                if (!acc[group]) acc[group] = [];
                acc[group].push(curr);
                return acc;
              }, {})
            ).map(([project, items]: [string, any], groupIdx) => (
              <div key={project} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-primary)', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📦 {project}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{items.length} Items</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {items.map((req: any, i: number) => (
                    <div key={i} style={{ paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{req.partNumber}</span>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>{req.quantityNeeded}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.description}</div>
                    </div>
                  ))}
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginTop: '1rem', padding: '0.4rem', fontSize: '0.75rem', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                  onClick={() => alert(`Starting PO generation for project ${project}`)}
                >
                  <Plus size={14} /> Fulfill Project Requirements
                </button>
              </div>
            ))
          )}
        </div>

        {/* PO Table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Recent Purchase Orders</h2>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected ETA</th>
                  <th>Extracted Items</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po: any) => (
                  <tr key={po.poNumber} onClick={() => setSelectedPo(po)} style={{ cursor: 'pointer' }} className="hover-row">
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} />
                        {po.poNumber}
                      </div>
                    </td>
                    <td>{po.supplier}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{po.date}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{po.eta}</td>
                    <td>
                      {po.hasExcel ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 500, background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          <FileSpreadsheet size={14} /> {po.itemsCount} Items
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No Excel</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${po.status === 'PENDING_DELIVERY' ? 'badge-warning' : po.status === 'DRAFT' ? 'badge-danger' : po.status === 'CLOSED' ? 'badge-success' : 'badge-info'}`}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div 
          onClick={() => {
            setShowModal(false);
            setHasPushedQueue(false);
            setUploadData({ poNumber: '', supplier: '', eta: '', pdfFile: null, isParsing: false, extractedItems: [] });
          }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ padding: '2rem', width: '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UploadCloud size={20} /> Smart Upload PO
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Upload your supplier Purchase Order (PDF). The system will automatically use OCR to extract the PO Number, Supplier, and expected components for the Store team&apos;s GRN process.
            </p>

            {/* Single Large Upload Zone */}
            <div 
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '2.5rem 1rem',
                textAlign: 'center',
                backgroundColor: uploadData.pdfFile ? 'rgba(59,130,246,0.05)' : 'var(--bg-secondary)',
                borderColor: uploadData.pdfFile ? 'var(--accent-primary)' : 'var(--border-subtle)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                marginBottom: '1.5rem'
              }}
              onClick={() => document.getElementById('pdf-upload')?.click()}
            >
              <input type="file" id="pdf-upload" accept=".pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files && e.target.files[0]) handlePdfSelect(e.target.files[0]); }} />
              
              {uploadData.isParsing ? (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-primary)' }}>
                  <style>{`@keyframes pulse-ring { 0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); } 100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }`}</style>
                  <div style={{ padding: '1rem', borderRadius: '50%', animation: 'pulse-ring 2s infinite' }}>
                    <FileText size={32} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Extracting Data via AI...</span>
                </div>
              ) : uploadData.pdfFile ? (
                <div className="animate-fade-in" style={{ color: 'var(--accent-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={32} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}>{uploadData.pdfFile.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(uploadData.pdfFile.size / 1024).toFixed(1)} KB — Scanned</span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <UploadCloud size={36} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Upload Official PO (PDF)</span>
                  <span style={{ fontSize: '0.8rem' }}>AI will fetch all details</span>
                </div>
              )}
            </div>

            {uploadData.poNumber && !uploadData.isParsing && !isSupplierUnregistered && unknownComponents.length === 0 && (
              <div className="animate-fade-in" style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--success)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   <CheckCircle size={14} /> Data Extracted Successfully
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PO Number</div>
                    <div style={{ fontWeight: 600 }}>{uploadData.poNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier</div>
                    <div style={{ fontWeight: 600 }}>{uploadData.supplier}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Date</div>
                    <div style={{ fontWeight: 600 }}>{uploadData.eta}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scanned Items</div>
                    <div style={{ fontWeight: 600 }}>{uploadData.extractedItems.length} Identified</div>
                  </div>
                </div>

                {/* Auto-Match Shortages Display */}
                {uploadData.extractedItems.some((item: any) => 
                  requisitions.some(req => (item.partNumber && item.partNumber === req.partNumber) || (item.component && item.component.includes(req.partNumber)))
                ) && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent-primary)' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={14} /> Smart Match: Pending Shortages Detected
                    </h5>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Items in this PO match requirements for: 
                      <strong style={{ marginLeft: '0.4rem', color: 'var(--text-primary)' }}>
                        {Array.from(new Set(requisitions.filter((req: any) => 
                          uploadData.extractedItems.some((item: any) => (item.partNumber && item.partNumber === req.partNumber) || (item.component && item.component.includes(req.partNumber)))
                        ).map((r: any) => r.workOrderRef))).join(', ')}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSupplierUnregistered && (
              <div className="animate-fade-in" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--warning)' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--warning)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <AlertTriangle size={18} /> Unregistered Supplier: {uploadData.supplier}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  This vendor is not present in the Approved Supplier List (ASL). You must formally register them before this PO can be processed.
                </p>
                <div className="input-group">
                  <label className="input-label">Contact Person *</label>
                  <input className="input-field" value={newVendorFormData.contact} onChange={e => setNewVendorFormData(p => ({ ...p, contact: e.target.value }))} placeholder="Rep Name" />
                </div>
                <div className="input-group">
                  <label className="input-label">Contact Email *</label>
                  <input className="input-field" type="email" value={newVendorFormData.email} onChange={e => setNewVendorFormData(p => ({ ...p, email: e.target.value }))} placeholder="sales@vendor.com" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input type="checkbox" id="iso-check" checked={newVendorFormData.iso} onChange={e => setNewVendorFormData(p => ({ ...p, iso: e.target.checked }))} />
                  <label htmlFor="iso-check" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Supplier holds active ISO 9001 Certification</label>
                </div>
                <button 
                  className="btn btn-primary" 
                  disabled={!newVendorFormData.contact || !newVendorFormData.email}
                  onClick={() => {
                     const newSupplier = {
                       id: `SUP-${Math.floor(100 + Math.random() * 900)}`,
                       name: uploadData.supplier,
                       contact: newVendorFormData.contact,
                       email: newVendorFormData.email,
                       gstin: 'Pending',
                       iso: newVendorFormData.iso,
                       status: newVendorFormData.iso ? 'Approved' : 'Probation'
                     };
                     const updated = [newSupplier, ...activeSuppliers];
                     setActiveSuppliers(updated);
                     localStorage.setItem('QMS_SUPPLIERS', JSON.stringify(updated));
                     alert(`${uploadData.supplier} has been registered to the ASL! You may now proceed.`);
                     setNewVendorFormData({ contact: '', email: '', iso: false });
                  }}
                  style={{ width: '100%', justifyContent: 'center', background: 'var(--warning)', color: '#000' }}
                >
                  <Building2 size={16} /> Fast-Track Vendor Registration
                </button>
              </div>
            )}

            {unknownComponents.length > 0 && (
              <div className="animate-fade-in" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                <h4 style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Database size={18} /> Unregistered Components Detected
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  This PO contains components not mapped in the Item Master Catalog. You cannot GRN-sync this document until these parts are formally generated strictly by the Store Team.
                </p>
                <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '1.25rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                   {unknownComponents.map((uc: any, i: number) => (
                     <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.2rem 0' }}>
                        • {uc.partNumber ? `${uc.partNumber} - ` : ''}{uc.description || uc.component}
                     </div>
                   ))}
                </div>
                <button 
                  className="btn btn-primary" 
                  disabled={hasPushedQueue}
                  onClick={() => {
                     try {
                       const existingReqs = JSON.parse(localStorage.getItem('QMS_PART_REQUESTS') || '[]');
                       const newReqs = unknownComponents.map((uc: any, index: number) => ({
                         id: `${Date.now()}-${index}`,
                         mfgPart: uc.partNumber || uc.component || 'Unknown Part',
                         description: uc.description || uc.component || 'Pending specifications',
                         supplier: uploadData.supplier,
                         date: new Date().toISOString().split('T')[0]
                       }));
                       localStorage.setItem('QMS_PART_REQUESTS', JSON.stringify([...newReqs, ...existingReqs]));
                       setHasPushedQueue(true);
                     } catch (err) {
                       console.error("Queue push failed logs:", err);
                     }
                  }}
                  style={{ width: '100%', justifyContent: 'center', background: hasPushedQueue ? 'var(--bg-secondary)' : 'transparent', border: hasPushedQueue ? '1px solid var(--border-subtle)' : '1px solid rgba(239, 68, 68, 0.5)', color: hasPushedQueue ? 'var(--text-muted)' : '#ef4444' }}
                >
                  {hasPushedQueue ? (
                    <><CheckCircle size={16} /> Successfully Pushed to Queue</>
                  ) : (
                    <><Send size={16} /> Push Unknown Parts to Store Queue</>
                  )}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setHasPushedQueue(false); }}>Cancel</button>
              {(isSupplierUnregistered || unknownComponents.length > 0) && uploadData.poNumber ? (
                <button className="btn btn-secondary" onClick={handleSaveDraft} style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                  Save PO as Draft
                </button>
              ) : null}
              <button className="btn btn-primary" onClick={handleUpload} disabled={!uploadData.poNumber || uploadData.isParsing || isSupplierUnregistered || unknownComponents.length > 0}>
                <CheckCircle size={16} />
                Confirm & Sync to GRN
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPo && (
        <div 
          onClick={() => setSelectedPo(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ padding: '2rem', width: '900px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> Purchase Order Details: {selectedPo.poNumber}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier</div>
                <div style={{ fontWeight: 600 }}>{selectedPo.supplier}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order Date</div>
                <div style={{ fontWeight: 600 }}>{selectedPo.date}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected ETA</div>
                <div style={{ fontWeight: 600 }}>{selectedPo.eta}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontWeight: 600, color: selectedPo.status === 'PENDING_DELIVERY' ? 'var(--warning)' : 'var(--success)' }}>
                  {selectedPo.status.replace('_', ' ')}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Order Items ({selectedPo.itemsCount})</h3>
            <div className="table-container" style={{ marginBottom: '2rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Part No</th>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPo.mockItems && selectedPo.mockItems.length > 0 ? selectedPo.mockItems.map((item: any, i: number) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{item.id || i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{item.partNumber || '-'}</td>
                      <td>{item.description || item.component}</td>
                      <td>{item.hsn || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{item.declaredQty || '-'}</td>
                      <td>{item.unit || '-'}</td>
                      <td>{item.rate ? `₹${item.rate}` : '-'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.amount ? `₹${item.amount}` : '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                         System items not fully digitized. Physical copy verification required.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPo(null)}>Close Viewer</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Internal Part Number Modal */}
      {showRequestModal && (
        <div 
          onClick={() => {
            setShowRequestModal(false);
            setRequestData({ mfgPart: '', description: '', supplier: '' });
          }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ padding: '2rem', width: '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--warning)' }}
          >
            <h2 style={{ fontSize: '1.2rem', color: 'var(--warning)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} /> Request Internal Part Number
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Send a request to the Store / Engineering team to mint an official internal part number before placing the PO.
            </p>

            <div className="input-group">
              <label className="input-label">Manufacturer Part Number *</label>
              <input 
                className="input-field" 
                placeholder="e.g. ATMEGA328P-PU" 
                value={requestData.mfgPart} 
                onChange={e => setRequestData(p => ({ ...p, mfgPart: e.target.value }))} 
                autoFocus
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Detailed Description *</label>
              <textarea 
                className="input-field" 
                rows={2}
                placeholder="Detailed specifications..." 
                value={requestData.description} 
                onChange={e => setRequestData(p => ({ ...p, description: e.target.value }))} 
              />
            </div>

            <div className="input-group">
              <label className="input-label">Intended Supplier (Optional)</label>
              <input 
                className="input-field" 
                placeholder="e.g. DigiKey, Mouser..." 
                value={requestData.supplier} 
                onChange={e => setRequestData(p => ({ ...p, supplier: e.target.value }))} 
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                disabled={!requestData.mfgPart || !requestData.description}
                style={{ background: 'var(--warning)', color: '#000' }}
                onClick={() => {
                  const existing = JSON.parse(localStorage.getItem('QMS_PART_REQUESTS') || '[]');
                  const newReq = { ...requestData, id: Date.now().toString(), date: new Date().toISOString().split('T')[0] };
                  localStorage.setItem('QMS_PART_REQUESTS', JSON.stringify([newReq, ...existing]));
                  alert('Request sent to Store catalog queue!');
                  setShowRequestModal(false);
                  setRequestData({ mfgPart: '', description: '', supplier: '' });
                }}
              >
                <Send size={16} /> Submit to Store Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
