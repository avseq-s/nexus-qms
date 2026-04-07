"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  CheckCircle,
  AlertTriangle,
  XOctagon,
  Award,
  Filter,
  FileText,
  Calendar,
  Box,
  Upload,
  DownloadCloud
} from 'lucide-react';

const INITIAL_MOCK_SUPPLIERS = [
  { id: 'SUP-001', name: 'Mouser Electronics', contact: 'Sales Team', email: 'sales@mouser.com', gstin: '27AABCU9603R1ZX', iso: true, status: 'Approved' },
  { id: 'SUP-002', name: 'DigiKey', contact: 'Global Support', email: 'support@digikey.com', gstin: 'GLOBAL-DK', iso: true, status: 'Approved' },
  { id: 'SUP-003', name: 'Avnet', contact: 'Rahul Verma', email: 'rahul.v@avnet.com', gstin: '29BBDCA4821Q1Z5', iso: true, status: 'Approved' },
  { id: 'SUP-004', name: 'Local Supplier A', contact: 'Amit Shah', email: 'amit@localhw.in', gstin: '24XXYYZ9876A1Z2', iso: false, status: 'Probation' },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(INITIAL_MOCK_SUPPLIERS);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').filter(r => r.trim() !== '');
      if (rows.length < 2) return alert('Invalid CSV: Need standard headers and at least one row');
      
      const newSuppliers: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        // Simple comma split handling quotes is complex, sticking to simple format
        // Expected: Name, Contact, Email, GSTIN, ISO (true/false)
        const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 3 && cols[0]) {
          const isIso = cols[4] ? cols[4].toLowerCase() === 'true' || cols[4].toLowerCase() === 'yes' || cols[4] === '1' : false;
          newSuppliers.push({
            id: `SUP-${Math.floor(100 + Math.random() * 900)}${i}`,
            name: cols[0],
            contact: cols[1] || 'N/A',
            email: cols[2] || 'N/A',
            gstin: cols[3] || 'N/A',
            iso: isIso,
            status: isIso ? 'Approved' : 'Probation'
          });
        }
      }

      if (newSuppliers.length > 0) {
        const updated = [...newSuppliers, ...suppliers];
        setSuppliers(updated);
        localStorage.setItem('QMS_SUPPLIERS', JSON.stringify(updated));
        alert(`Successfully imported ${newSuppliers.length} vendors to ASL!`);
      } else {
        alert("No valid rows found to import. Make sure your CSV has Name, Contact, Email, GST, and ISO columns.");
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const downloadSupplierTemplate = () => {
    const csvContent = "Name,Contact,Email,GSTIN,ISO Certified (True/False)\nAcme Corp,John Doe,john@acme.com,12ABCDE3456F7Z8,True\nTechSupplies Inc,,info@techsupplies.com,,False";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "supplier_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHistory = (supId: string) => {
    const seed = supId.charCodeAt(supId.length - 1);
    const count = (seed % 3) + 1; 
    const shipments = [
      { 
        id: 'GRN-2026-081', invoice: 'INV-A1099', date: '2026-03-22', status: 'PASS',
        components: [
          { part: '10K Ohm 0603 Resistor', qty: 5000, lotId: 'LOT-26A-0012', inspector: 'K. Lee', status: 'PASS', defect: 'None', measurement: '9.98k ~ 10.02k Ohm' },
          { part: '0.1uF Ceramic Capacitor', qty: 2000, lotId: 'LOT-26A-0045', inspector: 'K. Lee', status: 'PASS', defect: 'None', measurement: '0.098uF ~ 0.101uF' }
        ]
      },
      { 
        id: 'GRN-2026-075', invoice: 'INV-B4402', date: '2026-03-15', status: 'PASS',
        components: [
          { part: 'STM32F405 Microcontroller', qty: 500, lotId: 'LOT-26B-0089', inspector: 'M. Chen', status: 'PASS', defect: 'None', measurement: 'Visual Pass' }
        ]
      },
      { 
        id: 'GRN-2026-060', invoice: 'INV-C119', date: '2026-02-28', status: 'FAIL',
        components: [
          { part: 'USB-C Connector', qty: 1000, lotId: 'LOT-26C-0112', inspector: 'S. Smith', status: 'FAIL', defect: 'Bent Pins', measurement: 'Visual Fail' },
          { part: '22uH Power Inductor', qty: 3000, lotId: 'LOT-25D-0992', inspector: 'S. Smith', status: 'PASS', defect: 'None', measurement: '21.5uH ~ 22.1uH' }
        ]
      }
    ];
    return shipments.slice(0, count);
  };
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    gstin: '',
    iso: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('QMS_SUPPLIERS');
    if (saved) {
      setSuppliers(JSON.parse(saved));
    } else {
      localStorage.setItem('QMS_SUPPLIERS', JSON.stringify(INITIAL_MOCK_SUPPLIERS));
    }
  }, []);

  const handleRegister = () => {
    if (!formData.name || !formData.contact || !formData.email) return;

    const newSupplier = {
      id: `SUP-${Math.floor(100 + Math.random() * 900)}`,
      name: formData.name,
      contact: formData.contact,
      email: formData.email,
      gstin: formData.gstin || 'N/A',
      iso: formData.iso,
      status: formData.iso ? 'Approved' : 'Probation' // ISO 9001 rule enforcement
    };

    const updated = [newSupplier, ...suppliers];
    setSuppliers(updated);
    localStorage.setItem('QMS_SUPPLIERS', JSON.stringify(updated));
    setShowModal(false);
    setFormData({ name: '', contact: '', email: '', phone: '', gstin: '', iso: false });
  };

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
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            Bulk Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Register New Vendor
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Total ASL Handlers</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{suppliers.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--success)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>ISO 9001 Certified</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
            {suppliers.filter(s => s.iso).length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--warning)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>On Probation</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
            {suppliers.filter(s => s.status === 'Probation').length}
          </div>
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
              {suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.gstin.toLowerCase().includes(search.toLowerCase())).map((sup) => (
                <tr key={sup.id} className="hover-row" onClick={() => setSelectedSupplier(sup)} style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--text-muted)' }}>{sup.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} />
                      {sup.name}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{sup.gstin}</td>
                  <td>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{sup.contact}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sup.email}</div>
                  </td>
                  <td>
                    {sup.iso ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 500 }}>
                        <Award size={14} /> Certified
                      </span>
                    ) : (
                      <span style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>None</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      sup.status === 'Approved' ? 'badge-success' : 
                      sup.status === 'Probation' ? 'badge-warning' : 
                      'badge-danger'
                    }`}>
                      {sup.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSupplier && (
        <div 
          onClick={() => setSelectedSupplier(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
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
                  <span>ID: {selectedSupplier.id}</span>
                  <span>|</span>
                  <span>Contact: {selectedSupplier.contact} ({selectedSupplier.email})</span>
                </div>
              </div>
              <span className={`badge ${selectedSupplier.status === 'Approved' ? 'badge-success' : selectedSupplier.status === 'Probation' ? 'badge-warning' : 'badge-danger'}`}>
                {selectedSupplier.status}
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

      {showModal && (
        <div 
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
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
              <input required className="input-field" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Texas Instruments" autoFocus />
            </div>

            <div className="input-group">
              <label className="input-label">Tax ID / GSTIN (Optional)</label>
              <input className="input-field" value={formData.gstin} onChange={e => setFormData(p => ({ ...p, gstin: e.target.value }))} placeholder="e.g. 29AABCU9603R1ZX" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Primary Contact Person *</label>
                <input required className="input-field" value={formData.contact} onChange={e => setFormData(p => ({ ...p, contact: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="input-group">
                <label className="input-label">Contact Email *</label>
                <input required type="email" className="input-field" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="john@company.com" />
              </div>
            </div>

            <div className="input-group" style={{ 
              background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem'
            }}>
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>ISO 9001 Certified?</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Does this supplier hold valid quality certifications?</div>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} checked={formData.iso} onChange={e => setFormData(p => ({ ...p, iso: e.target.checked }))} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: formData.iso ? 'var(--success)' : 'var(--bg-secondary)', 
                  transition: '.4s', borderRadius: '24px', border: '1px solid var(--border-subtle)'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '16px', width: '16px', left: '4px', bottom: '3px',
                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                    transform: formData.iso ? 'translateX(22px)' : 'translateX(0)'
                  }} />
                </span>
              </label>
            </div>
            
            {!formData.iso && (
              <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={14} /> Without ISO 9001 verification, this supplier will be placed on Probation.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!formData.name || !formData.contact || !formData.email} onClick={handleRegister}>
                <CheckCircle size={16} /> Register Vendor to ASL
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedShipment && (
        <div 
          onClick={() => setSelectedShipment(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
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
    </div>
  );
}
