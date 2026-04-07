"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database,
  Plus,
  Search,
  CheckCircle,
  Filter,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

const MOCK_MASTER_CATALOG = [
  { id: 'IC-STM32F4', category: 'Microcontroller', description: 'STM32F405RGT6 32-bit Cortex M4', hsn: '85423100', uom: 'pcs', active: true },
  { id: 'RES-0603-10K', category: 'Passive', description: '10K Ohm 1% 0603 SMD Resistor', hsn: '8533211', uom: 'pcs', active: true },
  { id: 'CAP-0402-104K', category: 'Passive', description: '0.1uF 10V X7R 0402 Ceramic Cap', hsn: '8532240', uom: 'pcs', active: true },
];

export default function ItemMasterPage() {
  const [catalog, setCatalog] = useState(MOCK_MASTER_CATALOG);
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [reels, setReels] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ id: '', category: 'Passive', description: '', hsn: '', uom: 'pcs' });

  // Load pending requests from local storage
  useEffect(() => {
    const rawRequests = localStorage.getItem('QMS_PART_REQUESTS');
    if (rawRequests) {
      setRequests(JSON.parse(rawRequests));
    }
    
    // Load formal catalog (Resetting for user view)
    setCatalog(MOCK_MASTER_CATALOG);
    localStorage.setItem('QMS_MASTER_CATALOG', JSON.stringify(MOCK_MASTER_CATALOG));

    // Load Live Inventory for Stock Counts
    const savedReels = localStorage.getItem('QMS_REELS');
    if (savedReels) {
      setReels(JSON.parse(savedReels));
    }
  }, []);

  const getStock = (partId: string) => {
    const partReels = reels.filter(r => r.partNumber === partId);
    
    const vendorReels = partReels.filter(r => r.status === 'AT_EMS');
    const vendorBreakdown = vendorReels.reduce((acc: any, r) => {
      const name = r.emsName || 'Unknown Partner';
      acc[name] = (acc[name] || 0) + r.qty;
      return acc;
    }, {});

    return {
      inHouse: partReels.filter(r => r.status === 'ACCEPTED').reduce((sum, r) => sum + r.qty, 0),
      atVendorTotal: vendorReels.reduce((sum, r) => sum + r.qty, 0),
      vendorBreakdown
    };
  };

  const openGenerateForm = (req?: any) => {
    setActiveRequest(req);
    if (req) {
      let prefix = 'PRT-';
      let predictedCategory = 'Passive';
      if (req.description.toLowerCase().includes('resistor') || req.description.toLowerCase().includes('capacitor')) {
        prefix = req.description.toLowerCase().includes('resistor') ? 'RES-' : 'CAP-';
        predictedCategory = 'Passive';
      }
      if (req.description.toLowerCase().includes('ic') || req.description.toLowerCase().includes('micro')) {
        prefix = 'IC-';
        predictedCategory = 'IC';
      }
      if (req.description.toLowerCase().includes('board') || req.description.toLowerCase().includes('pcb')) {
         predictedCategory = 'PCB/Bare Board';
      }

      setFormData({
        id: prefix,
        category: predictedCategory,
        description: req.description,
        hsn: '',
        uom: 'pcs'
      });
    } else {
      setFormData({ id: '', category: 'Passive', description: '', hsn: '', uom: 'pcs' });
    }
    setShowGenerateModal(true);
  };

  const handleGenerate = () => {
    if (!formData.id || !formData.description) return;
    
    // Add to catalog
    const newPart = { ...formData, active: true };
    const updatedCatalog = [newPart, ...catalog];
    setCatalog(updatedCatalog);
    localStorage.setItem('QMS_MASTER_CATALOG', JSON.stringify(updatedCatalog));

    // Clear request if assigning
    if (activeRequest) {
      const remainingReqs = requests.filter(r => r.id !== activeRequest.id);
      setRequests(remainingReqs);
      localStorage.setItem('QMS_PART_REQUESTS', JSON.stringify(remainingReqs));
    }

    setShowGenerateModal(false);
    setActiveRequest(null);
  };

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Item Master Catalog</h1>
          <p className="text-secondary">Store-controlled database defining official internal components</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => openGenerateForm()}>
            <Plus size={16} />
            Create New Part
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '1.5rem' }}>
        
        {/* Pending Requests Column */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--warning)' }}>
            <AlertCircle size={20} />
            Purchase Requests ({requests.length})
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Purchase needs official Internal Part Numbers for these items before ordering.</p>
          
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={32} color="var(--success)" style={{ marginBottom: '0.5rem', opacity: 0.7 }} />
              <p style={{ fontSize: '0.9rem' }}>Queue is empty</p>
            </div>
          ) : (
            requests.map((req, i) => (
              <div 
                key={i} 
                className="glass-card" 
                style={{ padding: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{req.mfgPart}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{req.date}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{req.description}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Supplier: {req.supplier}</div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '1rem', padding: '0.4rem', fontSize: '0.85rem' }}
                  onClick={() => openGenerateForm(req)}
                >
                  <Database size={14} /> Assign Internal Number
                </button>
              </div>
            ))
          )}
        </div>

        {/* Catalog Grid */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Database size={20} color="var(--accent-primary)" /> Official Catalog
            </h2>
            <div className="input-group" style={{ marginBottom: 0, width: '300px', flexDirection: 'row', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search catalog..." 
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
                  <th style={{ textAlign: 'right' }}>In-House</th>
                  <th style={{ textAlign: 'right' }}>At Vendor (EMS)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {catalog.filter(p => p.id.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())).map((part) => (
                  <tr key={part.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{part.id}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>{part.category}</span></td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>{part.description}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: getStock(part.id).inHouse > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {getStock(part.id).inHouse.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--warning)', borderBottom: Object.keys(getStock(part.id).vendorBreakdown).length > 0 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: '2px', marginBottom: '4px' }}>
                        {getStock(part.id).atVendorTotal > 0 ? getStock(part.id).atVendorTotal.toLocaleString() : '-'}
                      </div>
                      {Object.entries(getStock(part.id).vendorBreakdown).map(([name, qty]) => (
                        <div key={name} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1' }}>
                          {name}: {(qty as number).toLocaleString()}
                        </div>
                      ))}
                    </td>
                    <td>
                      <span className={`badge badge-success`}>Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showGenerateModal && (
        <div 
          onClick={() => setShowGenerateModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ width: '550px', maxWidth: '100%', padding: '2rem', border: '1px solid var(--accent-primary)' }}
          >
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Generate Internal Part Number
            </h2>
            
            {activeRequest && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', borderLeft: '3px solid var(--warning)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fulfilling request for: <strong>{activeRequest.mfgPart}</strong></p>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Internal Part Number Core (Store Format) *</label>
              <input required className="input-field" value={formData.id} onChange={e => setFormData(p => ({ ...p, id: e.target.value }))} placeholder="e.g. IC-STM-001" autoFocus />
            </div>

            <div className="input-group">
              <label className="input-label">Component Category</label>
              <select className="input-field" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                <option>Passive</option>
                <option>Microcontroller</option>
                <option>IC</option>
                <option>Connector</option>
                <option>PCB/Bare Board</option>
                <option>Hardware/Mech</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Standard Description *</label>
              <input required className="input-field" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="e.g. 10K Ohm 1% 0603 SMD Resistor" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">HSN / SAC Code</label>
                <input className="input-field" value={formData.hsn} onChange={e => setFormData(p => ({ ...p, hsn: e.target.value }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Default UoM</label>
                <select className="input-field" value={formData.uom} onChange={e => setFormData(p => ({ ...p, uom: e.target.value }))}>
                  <option>pcs</option>
                  <option>meters</option>
                  <option>kg</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!formData.id || !formData.description} onClick={handleGenerate}>
                <CheckCircle size={16} /> Mint Part Number
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
