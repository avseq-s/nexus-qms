"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Plus, 
  UploadCloud, 
  Search, 
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

const MOCK_BOMS = [
  { id: 'bom-001', code: 'PCBA-SMV2', name: 'SmartMeter V2 Main Board', version: 'Rev B', status: 'ACTIVE', partsCount: 142, lastUpdated: '2026-04-06' },
  { id: 'bom-002', code: 'IGW-100', name: 'IoT Gateway Controller', version: 'Rev A', status: 'DRAFT', partsCount: 89, lastUpdated: '2026-04-07' },
  { id: 'bom-003', code: 'PSU-12V-5A', name: 'Power Supply Unit 60W', version: 'Rev C', status: 'ACTIVE', partsCount: 45, lastUpdated: '2026-03-25' },
  { id: 'bom-004', code: 'PCBA-SMV1', name: 'SmartMeter V1 Main Board', version: 'Rev A', status: 'OBSOLETE', partsCount: 135, lastUpdated: '2025-11-12' },
];

export default function MasterBomsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBom, setNewBom] = useState({ code: '', name: '', version: 'Rev A', components: [] as any[] });
  const [boms, setBoms] = useState(MOCK_BOMS);

  React.useEffect(() => {
    const saved = localStorage.getItem('QMS_BOMS');
    if (saved) {
      setBoms([...JSON.parse(saved), ...MOCK_BOMS]);
    }
  }, []);

  const handleDownloadTemplate = () => {
    const csvContent = "Part Number,Description,Qty per Unit,Reference Designators,Footprint\nIC-STM32F4,MCU 32-bit Cortex-M4,1,U1,LQFP-64\nCAP-0402-104K,100nF 10V X7R 0402,12,\"C1, C2, C3, C4\",0402\nRES-0603-10K,Resistor 10K 1% 0603,4,\"R1, R2, R3, R4\",0603";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "bom_import_template_iso9001.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      
      if (lines.length < 2) return alert("Invalid CSV format");

      // Extract headers and data
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);

      const catalog = JSON.parse(localStorage.getItem('QMS_MASTER_CATALOG') || '[]');
      const unknownParts: string[] = [];

      const parsedItems = dataLines.map((line, idx) => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const partNumber = cols[0];
        
        // Link to catalog
        const inCatalog = catalog.some((c: any) => c.id === partNumber || c.description.toLowerCase().includes(partNumber.toLowerCase()));
        if (!inCatalog) unknownParts.push(partNumber);

        return {
          id: `item-${idx}`,
          partNumber: partNumber,
          description: cols[1] || 'Imported Part',
          quantityPerAssy: parseFloat(cols[2]) || 1,
          refDesignators: cols[3] || '',
          footprint: cols[4] || '',
          status: inCatalog ? 'APPROVED' : 'PENDING_CATALOG'
        };
      });

      // Show summary / warning
      if (unknownParts.length > 0) {
        alert(`${unknownParts.length} components (e.g., ${unknownParts[0]}) are not in your Item Master. They have been flagged for manual approval.`);
      }

      const newBomEntry = {
        id: `bom-${Date.now()}`,
        code: `IMP-${new Date().getTime().toString().slice(-4)}`,
        name: `Imported BOM (${file.name})`,
        version: 'Rev A',
        status: unknownParts.length > 0 ? 'DRAFT' : 'ACTIVE',
        partsCount: parsedItems.length,
        lastUpdated: new Date().toISOString().split('T')[0],
        items: parsedItems
      };

      const existingBoms = JSON.parse(localStorage.getItem('QMS_BOMS') || '[]');
      localStorage.setItem('QMS_BOMS', JSON.stringify([newBomEntry, ...existingBoms]));
      
      setShowImportModal(false);
      alert(`BOM ${newBomEntry.code} imported successfully with ${parsedItems.length} items.`);
      window.location.reload(); // Refresh to show new data
    };
    reader.readAsText(file);
  };

  const filteredBoms = boms.filter(bom => 
    bom.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    bom.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={28} />
            Master BOMs
          </h1>
          <p className="text-secondary">Manage Bills of Materials, revisions, and alternates.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <UploadCloud size={16} />
            Import BOM (CSV)
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create Form BOM
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '500px', padding: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Bulk Import BOM</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Upload your PCBA Bill of Materials (CSV). The system will automatically link parts to the Item Master.
                </p>
                
                <div style={{ border: '2px dashed var(--border-subtle)', borderRadius: '8px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                    <UploadCloud size={40} style={{ color: 'var(--accent-primary)', marginBottom: '1rem', opacity: 0.7 }} />
                    <input type="file" accept=".csv" onChange={handleCsvImport} id="bom-csv" hidden />
                    <button className="btn btn-secondary" onClick={() => document.getElementById('bom-csv')?.click()}>Choose CSV File</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={handleDownloadTemplate}>Download Template</button>
                    <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                </div>
            </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '600px', padding: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Manual BOM Creation</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="input-group">
                        <label className="input-label">BOM / Product Code *</label>
                        <input className="input-field" placeholder="e.g. PCBA-V3-MAIN" value={newBom.code} onChange={e => setNewBom({...newBom, code: e.target.value})} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Product Name *</label>
                        <input className="input-field" placeholder="e.g. Next-Gen Gateway Controller" value={newBom.name} onChange={e => setNewBom({...newBom, name: e.target.value})} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Primary Revision</label>
                        <input className="input-field" value={newBom.version} onChange={e => setNewBom({...newBom, version: e.target.value})} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Discard</button>
                    <button className="btn btn-primary" onClick={() => { alert("BOM Draft Created. Redirecting to line-item editor..."); setShowCreateModal(false); }}>Initialize BOM</button>
                </div>
            </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by BOM code or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="btn btn-secondary">
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
              {filteredBoms.map((bom) => (
                <tr key={bom.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Link href={`/inventory/boms/${bom.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {bom.code}
                    </Link>
                  </td>
                  <td>{bom.name}</td>
                  <td>
                    <span style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {bom.version}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {bom.status === 'ACTIVE' && <CheckCircle2 size={14} className="text-success" />}
                      {bom.status === 'DRAFT' && <Clock size={14} className="text-warning" />}
                      {bom.status === 'OBSOLETE' && <AlertCircle size={14} className="text-danger" />}
                      <span className={`badge ${
                        bom.status === 'ACTIVE' ? 'badge-success' : 
                        bom.status === 'DRAFT' ? 'badge-warning' : 
                        'badge-danger'
                      }`}>
                        {bom.status}
                      </span>
                    </div>
                  </td>
                  <td>{bom.partsCount} items</td>
                  <td className="text-secondary">{bom.lastUpdated}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/inventory/boms/${bom.id}`}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem' }}>
                        <MoreVertical size={16} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredBoms.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No BOMs found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
