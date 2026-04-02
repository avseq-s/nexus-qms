"use client";

import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, 
  Plus,
  CheckCircle,
  Truck,
  Clock,
  Package,
  Send,
  AlertCircle,
  FileSpreadsheet,
  AlertTriangle,
  XIcon,
  Save,
  Database,
  UploadCloud,
  Layers,
  Factory,
  History,
  Activity
} from 'lucide-react';

const INITIAL_MOCK_KITS = [
  {
    id: 'KIT-2026-012',
    workOrder: 'WO-2026-90',
    product: 'SmartMeter V2',
    qty: 100,
    status: 'DISPATCHED_TO_EMS',
    emsName: 'Precision PCB Assemblies',
    dispatchDate: '2026-03-24',
    expectedReturn: '2026-04-02',
    bom: [
      { part: 'IC-STM32F4', desc: 'MCU', required: 100, picked: 100, shortage: 0, assemblyType: 'EMS' },
      { part: 'CAP-0402-104K', desc: '100nF Cap', required: 1500, picked: 1500, shortage: 0, assemblyType: 'EMS' },
      { part: 'RES-0603-10K', desc: '10K Resistor', required: 800, picked: 800, shortage: 0, assemblyType: 'EMS' },
      { part: 'HRN-POWER-10', desc: 'Main Power Harness', required: 100, picked: 0, shortage: 0, assemblyType: 'In-House' },
      { part: 'SCRW-M3-6', desc: 'M3x6 Mounting Screws', required: 400, picked: 0, shortage: 0, assemblyType: 'In-House' },
    ]
  }
];

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  KIT_PENDING:        { label: 'Kitting in Progress', badge: 'badge-warning' },
  DISPATCHED_TO_EMS:  { label: 'Dispatched to EMS',   badge: 'badge-info'    },
  AWAITING_RETURN:    { label: 'Awaiting Return',      badge: 'badge-warning' },
  RETURNED:           { label: 'Boards Returned',      badge: 'badge-success' },
};

export default function KittingPage() {
  const [kits, setKits] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [inventoryStock, setInventoryStock] = useState<Record<string, number>>({});
  const [savedMasterBoms, setSavedMasterBoms] = useState<any[]>([]);

  const [newKitData, setNewKitData] = useState({
    workOrder: '',
    product: '',
    qty: 1,
    emsName: '',
    bom: [] as any[]
  });

  const [hasCalculatedShortage, setHasCalculatedShortage] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  // CSV Mapping State
  const [isMapping, setIsMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({
    part: '',
    desc: '',
    required: '',
    assembly: ''
  });

  const [activeView, setActiveView] = useState<'KITS' | 'EMS_STOCK'>('KITS');

  useEffect(() => {
    const savedKits = localStorage.getItem('QMS_KITS');
    if (savedKits) {
      setKits(JSON.parse(savedKits));
    } else {
      setKits(INITIAL_MOCK_KITS);
      localStorage.setItem('QMS_KITS', JSON.stringify(INITIAL_MOCK_KITS));
    }

    const savedReels = JSON.parse(localStorage.getItem('QMS_REELS') || '[]');
    const stockMap: Record<string, number> = {};
    savedReels.forEach((r: any) => {
      if (r.status === 'ACCEPTED' || r.status === 'DISPATCHED' || r.status === 'AT_EMS') { 
        stockMap[r.partNumber] = (stockMap[r.partNumber] || 0) + (r.qty || 0);
      }
    });
    setInventoryStock(stockMap);

    const savedBoms = localStorage.getItem('QMS_SAVED_MASTER_BOMS');
    if (savedBoms) setSavedMasterBoms(JSON.parse(savedBoms));
  }, []);

  const handleBomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setNewKitData(p => ({
        ...p,
        bom: [
          { part: 'IC-STM32F4', desc: 'MCU Cortex M4', required: 100 * p.qty, assemblyType: 'EMS' },
          { part: 'RES-0603-10K', desc: '10K Resistor', required: 800 * p.qty, assemblyType: 'EMS' },
          { part: 'SCRW-M3-6', desc: 'M3x6 Screws', required: 400 * p.qty, assemblyType: 'In-House' },
          { part: 'HRN-MAIN-01', desc: 'Main Harness', required: 1 * p.qty, assemblyType: 'In-House' },
        ]
      }));
      setHasCalculatedShortage(false);
      setPushSuccess(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert("CSV file seems empty or missing data rows.");
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1).map(l => l.split(',').map(cell => cell.trim()));

      setCsvHeaders(headers);
      setRawCsvData(dataRows);
      setIsMapping(true);
      
      setMapping({
        part: headers.find(h => /part|number|id|pn/i.test(h)) || '',
        desc: headers.find(h => /desc|name|type/i.test(h)) || '',
        required: headers.find(h => /qty|quantity|req|count/i.test(h)) || '',
        assembly: headers.find(h => /loc|assembly|route/i.test(h)) || ''
      });
    };
    reader.readAsText(file);
  };

  const confirmMapping = () => {
    if (!mapping.part || !mapping.desc || !mapping.required) {
      alert("Please map all 3 required columns first!");
      return;
    }

    const partIdx = csvHeaders.indexOf(mapping.part);
    const descIdx = csvHeaders.indexOf(mapping.desc);
    const qtyIdx = csvHeaders.indexOf(mapping.required);
    const assemblyIdx = csvHeaders.indexOf(mapping.assembly);

    const parsedBom = rawCsvData.map(row => {
      const part = row[partIdx];
      const desc = row[descIdx];
      const required = parseInt(row[qtyIdx] || '0', 10);
      const rawAssembly = assemblyIdx >= 0 ? row[assemblyIdx] : 'EMS';
      const assemblyType = rawAssembly.toLowerCase().includes('in') ? 'In-House' : 'EMS';
      
      if (part && desc) {
        return { part, desc, required: required * (newKitData.qty || 1), assemblyType };
      }
      return null;
    }).filter(Boolean);

    setNewKitData(p => ({ ...p, bom: parsedBom as any[] }));
    setIsMapping(false);
    setHasCalculatedShortage(false);
    setPushSuccess(false);
  };

  const handleSaveMasterBom = () => {
    if (!newKitData.product || newKitData.bom.length === 0) {
      alert("Please specify a Product Build name first!");
      return;
    }
    const builtRatio = newKitData.qty || 1;
    const newBomTemplate = {
      productName: newKitData.product,
      components: newKitData.bom.map(b => ({
         part: b.part, desc: b.desc, requiredPerUnit: Math.ceil(b.required / builtRatio), assemblyType: b.assemblyType || 'EMS'
      }))
    };
    
    const existingIndex = savedMasterBoms.findIndex(b => b.productName === newBomTemplate.productName);
    let updated = [...savedMasterBoms];
    if (existingIndex >= 0) {
      updated[existingIndex] = newBomTemplate;
    } else {
      updated.push(newBomTemplate);
    }
    
    setSavedMasterBoms(updated);
    localStorage.setItem('QMS_SAVED_MASTER_BOMS', JSON.stringify(updated));
    alert(`Master BOM template for '${newKitData.product}' successfully saved to library!`);
  };

  const handleLoadMasterBom = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productName = e.target.value;
    if (!productName) return;
    const template = savedMasterBoms.find(b => b.productName === productName);
    if (template) {
      setNewKitData(p => ({
        ...p,
        product: template.productName,
        bom: template.components.map((c: any) => ({
          part: c.part, desc: c.desc, required: c.requiredPerUnit * (p.qty || 1), picked: 0, shortage: 0, assemblyType: c.assemblyType || 'EMS'
        }))
      }));
      setHasCalculatedShortage(false);
      setPushSuccess(false);
    }
  };

  const calculateShortages = () => {
    const evaluatedBom = newKitData.bom.map(item => {
      const stock = inventoryStock[item.part] || 0;
      const shortage = Math.max(0, item.required - stock);
      return { ...item, stock, shortage, picked: Math.min(item.required, stock) };
    });
    setNewKitData(p => ({ ...p, bom: evaluatedBom }));
    setHasCalculatedShortage(true);
    setPushSuccess(false);
  };

  const pushShortagesToPurchase = () => {
    try {
      const shortages = newKitData.bom.filter(b => b.shortage > 0);
      if (shortages.length === 0) return;

      const existingPRs = JSON.parse(localStorage.getItem('QMS_PURCHASE_REQUISITIONS') || '[]');
      const newPRs = shortages.map((s, idx) => ({
        id: `PR-${Date.now()}-${idx}`,
        partNumber: s.part,
        description: s.desc,
        quantityNeeded: s.shortage,
        workOrderRef: newKitData.workOrder,
        requestedDate: new Date().toISOString().split('T')[0],
        status: 'PENDING'
      }));

      localStorage.setItem('QMS_PURCHASE_REQUISITIONS', JSON.stringify([...newPRs, ...existingPRs]));
      setPushSuccess(true);
    } catch (err) {
      console.error(err);
    }
  };

  const dispatchPartialKit = () => {
    const kit = {
      id: `KIT-${Math.floor(1000 + Math.random() * 9000)}`,
      workOrder: newKitData.workOrder,
      product: newKitData.product,
      qty: newKitData.qty,
      status: 'DISPATCHED_TO_EMS',
      emsName: newKitData.emsName || 'In-House EMS',
      dispatchDate: new Date().toISOString().split('T')[0],
      expectedReturn: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      bom: newKitData.bom.map(b => ({
        part: b.part, desc: b.desc, required: b.required, picked: b.picked || 0, shortage: b.shortage || 0, assemblyType: b.assemblyType || 'EMS'
      }))
    };
    
    const updatedKits = [kit, ...kits];
    setKits(updatedKits);
    localStorage.setItem('QMS_KITS', JSON.stringify(updatedKits));

    const mappedItems = kit.bom.filter(b => b.assemblyType === 'EMS');
    const savedReels = JSON.parse(localStorage.getItem('QMS_REELS') || '[]');
    const updatedReels = savedReels.map((r: any) => {
      if (mappedItems.some(m => m.part === r.partNumber) && r.status === 'ACCEPTED') {
         return {
           ...r,
           status: 'AT_EMS',
           emsName: kit.emsName,
           location: `EMS: ${kit.emsName}`,
           history: [
             ...r.history,
             { date: new Date().toISOString().split('T')[0], stage: 'Outsource', action: `Dispatched to ${kit.emsName} for Kit ${kit.id}`, user: 'System' }
           ]
         };
      }
      return r;
    });
    localStorage.setItem('QMS_REELS', JSON.stringify(updatedReels));

    setShowUploadModal(false);
    setNewKitData({ workOrder: '', product: '', qty: 1, emsName: '', bom: [] });
    setHasCalculatedShortage(false);
  };

  const receiveFromEMS = (kitId: string) => {
    const updatedKits = kits.map(k => {
      if (k.id === kitId) {
        return { ...k, status: 'RETURNED' };
      }
      return k;
    });
    setKits(updatedKits);
    localStorage.setItem('QMS_KITS', JSON.stringify(updatedKits));

    const targetKit = updatedKits.find(k => k.id === kitId);
    const emsItems = targetKit.bom.filter((b: any) => b.assemblyType === 'EMS');
    const savedReels = JSON.parse(localStorage.getItem('QMS_REELS') || '[]');
    const updatedReels = savedReels.map((r: any) => {
       const bomItem = emsItems.find((b: any) => b.part === r.partNumber);
       if (bomItem && r.status === 'AT_EMS' && r.location === `EMS: ${targetKit.emsName}`) {
          const newQty = Math.max(0, r.qty - bomItem.required);
          return {
            ...r,
            qty: newQty,
            history: [...r.history, { date: new Date().toISOString().split('T')[0], stage: 'Manufacturing', action: `Consumed ${bomItem.required} for WO: ${targetKit.workOrder}`, user: 'System' }]
          };
       }
       return r;
    });
    localStorage.setItem('QMS_REELS', JSON.stringify(updatedReels));
    alert(`Received boards! EMS inventory for ${targetKit.emsName} has been auto-debited. Now pull In-House parts.`);
  };

  const reconcileEMSStock = (reelId: string, newQty: number) => {
    const savedReels = JSON.parse(localStorage.getItem('QMS_REELS') || '[]');
    const updatedReels = savedReels.map((r: any) => {
      if (r.id === reelId) {
        return { 
          ...r, 
          qty: newQty,
          history: [...r.history, { date: new Date().toISOString().split('T')[0], stage: 'Inventory Correction', action: `Manual EMS reconciliation from ${r.qty} to ${newQty}`, user: 'Store Manager' }]
        };
      }
      return r;
    });
    localStorage.setItem('QMS_REELS', JSON.stringify(updatedReels));
  };

  const addManualComponent = () => {
    setNewKitData(p => ({
      ...p,
      bom: [...p.bom, { part: 'NEW-PART', desc: 'Manual Entry', required: 0, assemblyType: 'EMS' }]
    }));
    setHasCalculatedShortage(false);
  };

  const updateBomRow = (index: number, field: string, value: string | number) => {
    setNewKitData(p => {
      const newBom = [...p.bom];
      newBom[index] = { ...newBom[index], [field]: value };
      return { ...p, bom: newBom };
    });
    setHasCalculatedShortage(false);
  };

  const activeShortageCount = newKitData.bom.filter(b => b.shortage > 0).length;
  const currentEmsInventory = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('QMS_REELS') || '[]' : '[]').filter((r: any) => r.status === 'AT_EMS');

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Production & EMS Dashboard</h1>
          <p className="text-secondary">Track staged assembly, outsourced inventory, and factory shortages</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn ${activeView === 'KITS' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('KITS')}>
            <Layers size={16} /> Kit Matrix
          </button>
          <button className={`btn ${activeView === 'EMS_STOCK' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('EMS_STOCK')}>
            <Activity size={16} /> EMS Stock Watch
          </button>
          <button className="btn btn-primary" style={{ marginLeft: '1rem' }} onClick={() => setShowUploadModal(true)}>
            <UploadCloud size={16} />
            New Master BOM
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Kitting in Progress', value: kits.filter(k => k.status === 'KIT_PENDING').length, color: 'var(--warning)', icon: Package },
          { label: 'Dispatched to EMS', value: kits.filter(k => k.status === 'DISPATCHED_TO_EMS').length, color: 'var(--accent-primary)', icon: Truck },
          { label: 'Awaiting Return', value: kits.filter(k => k.status === 'AWAITING_RETURN').length, color: '#f59e0b', icon: Clock },
          { label: 'Boards Returned', value: kits.filter(k => k.status === 'RETURNED').length, color: 'var(--success)', icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem', border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <s.icon size={26} color={s.color} />
            <div>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</p>
               <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {activeView === 'EMS_STOCK' ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
           <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
             <Truck size={22} color="var(--accent-primary)" />
             Virtual EMS Warehouse Stock
           </h2>
           <div className="table-container">
             <table className="data-table">
               <thead>
                 <tr>
                   <th>EMS Partner</th>
                   <th>Part Number</th>
                   <th>Reel ID</th>
                   <th>Physical Stock at Vendor</th>
                   <th>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {currentEmsInventory.length === 0 ? (
                   <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No stock currently residing at EMS facilities.</td></tr>
                 ) : (
                   currentEmsInventory.map((r: any) => (
                     <tr key={r.id}>
                       <td style={{ fontWeight: 600 }}>{r.location.replace('EMS: ', '')}</td>
                       <td style={{ color: 'var(--accent-primary)' }}>{r.partNumber}</td>
                       <td style={{ fontSize: '0.85rem' }}>{r.id}</td>
                       <td style={{ fontWeight: 700 }}>{r.qty} Units</td>
                       <td>
                         <button 
                           className="btn btn-secondary" 
                           style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                           onClick={() => {
                             const n = prompt(`Enter new physical count for ${r.id} at EMS:`, r.qty);
                             if (n) reconcileEMSStock(r.id, parseInt(n));
                           }}
                         >
                           Reconcile Count
                         </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PackageCheck size={18} color="var(--accent-primary)" />
              Active Kits
            </h2>
            {kits.map((kit) => {
              const cfg = STATUS_CONFIG[kit.status];
              return (
                <div
                  key={kit.id}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    borderLeft: selected?.id === kit.id ? '3px solid var(--accent-primary)' : '3px solid var(--border-subtle)',
                    background: selected?.id === kit.id ? 'rgba(59,130,246,0.05)' : 'transparent'
                  }}
                  onClick={() => setSelected(kit)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{kit.id}</span>
                    <span className={`badge ${cfg?.badge}`} style={{ fontSize: '0.65rem' }}>{cfg?.label}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{kit.product}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{kit.workOrder} • Qty: {kit.qty}</div>
                </div>
              );
            })}
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            {selected ? (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>{selected.id}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selected.product} • WO: {selected.workOrder} • Qty: {selected.qty} units</p>
                  </div>
                  <span className={`badge ${STATUS_CONFIG[selected.status]?.badge}`}>{STATUS_CONFIG[selected.status]?.label}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'EMS Partner', value: selected.emsName },
                    { label: 'Dispatch Date', value: selected.dispatchDate },
                    { label: 'Expected Return', value: selected.expectedReturn },
                  ].map((d, i) => (
                    <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{d.label}</p>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.value}</p>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>BOM Pick List (Phased)</h3>
                
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Truck size={14} /> PHASE 1: EMS OUTSOURCE ITEMS
                  </h4>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr><th>Part Number</th><th>Required</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {selected.bom.filter((b: any) => b.assemblyType === 'EMS' || !b.assemblyType).map((b: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{b.part}</td>
                            <td>{b.required}</td>
                            <td>
                              {selected.status === 'RETURNED' 
                                ? <span className="badge badge-success">Consumed</span>
                                : (selected.status === 'DISPATCHED_TO_EMS' || selected.status === 'AWAITING_RETURN')
                                  ? <span className="badge badge-info">At Vendor</span>
                                  : <span className="badge badge-warning">Needs Picking</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--warning)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Factory size={14} /> PHASE 2: IN-HOUSE FACTORY ASSEMBLY
                  </h4>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr><th>Part Number</th><th>Required</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {selected.bom.filter((b: any) => b.assemblyType === 'In-House').map((b: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{b.part}</td>
                            <td>{b.required}</td>
                            <td>
                              {selected.status === 'RETURNED' 
                                ? <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => alert(`Pick Ticket for ${b.part} issued.`)}>Issue Factory Pick</button>
                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Wait for board return</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  {selected.status === 'KIT_PENDING' && (
                    <button className="btn btn-primary" onClick={() => dispatchPartialKit()}><Send size={16} /> Dispatch to EMS</button>
                  )}
                  {selected.status === 'DISPATCHED_TO_EMS' && (
                    <button className="btn btn-primary" style={{ background: 'var(--success)' }} onClick={() => receiveFromEMS(selected.id)}><CheckCircle size={16} /> Receive Finished Boards</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <PackageCheck size={48} style={{ opacity: 0.4 }} />
                <p>Select a kit to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '900px', maxWidth: '100%', border: '1px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <FileSpreadsheet size={24} /> Master BOM / MRP Setup
               </h2>
               <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}><XIcon size={16} /> Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="input-group"><label className="input-label">Work Order Ref *</label><input required className="input-field" value={newKitData.workOrder} onChange={e => setNewKitData(p => ({ ...p, workOrder: e.target.value }))} /></div>
              <div className="input-group"><label className="input-label">Product Build *</label><input required className="input-field" value={newKitData.product} onChange={e => setNewKitData(p => ({ ...p, product: e.target.value }))} /></div>
              <div className="input-group"><label className="input-label">Build Qty *</label><input required type="number" className="input-field" value={newKitData.qty} onChange={e => setNewKitData(p => ({ ...p, qty: parseInt(e.target.value) }))} /></div>
            </div>

            {newKitData.bom.length === 0 ? (
              <>
                {isMapping ? (
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Map CSV Columns</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <select className="input-field" value={mapping.part} onChange={e => setMapping(m => ({...m, part: e.target.value}))}><option value="">Part No</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select>
                      <select className="input-field" value={mapping.desc} onChange={e => setMapping(m => ({...m, desc: e.target.value}))}><option value="">Desc</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select>
                      <select className="input-field" value={mapping.required} onChange={e => setMapping(m => ({...m, required: e.target.value}))}><option value="">Qty</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select>
                      <select className="input-field" value={mapping.assembly} onChange={e => setMapping(m => ({...m, assembly: e.target.value}))}><option value="">Assembly</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select>
                    </div>
                    <button className="btn btn-primary" onClick={confirmMapping}>Confirm Mapping</button>
                  </div>
                ) : (
                  <div style={{ border: '2px dashed var(--border-subtle)', padding: '3rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('csv-upload')?.click()}>
                    <input type="file" id="csv-upload" accept=".csv" style={{ display: 'none' }} onChange={handleBomUpload} />
                    <UploadCloud size={48} style={{ margin: '0 auto 1rem' }} />
                    <p>Click to Upload Master BOM (CSV)</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                   <h3>Component Matrix</h3>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button className="btn btn-secondary" onClick={addManualComponent}><Plus size={14} /> Add Part</button>
                     <button className="btn btn-secondary" onClick={handleSaveMasterBom}><Save size={14} /> Save Template</button>
                     <button className="btn btn-primary" onClick={calculateShortages}><AlertCircle size={14} /> Calculate Shortages</button>
                   </div>
                </div>
                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Part</th><th>Desc</th><th>Req</th><th>Route</th></tr></thead>
                    <tbody>
                      {newKitData.bom.map((b: any, index: number) => (
                        <tr key={index}>
                          <td><input className="input-field" value={b.part} onChange={e => updateBomRow(index, 'part', e.target.value)} /></td>
                          <td><input className="input-field" value={b.desc} onChange={e => updateBomRow(index, 'desc', e.target.value)} /></td>
                          <td><input className="input-field" type="number" value={b.required} onChange={e => updateBomRow(index, 'required', parseInt(e.target.value) || 0)} /></td>
                          <td>
                            <select className="input-field" value={b.assemblyType} onChange={e => updateBomRow(index, 'assemblyType', e.target.value)}>
                              <option value="EMS">EMS</option><option value="In-House">In-House</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" disabled={!hasCalculatedShortage} onClick={dispatchPartialKit}><Truck size={16} /> Confirm Dispatch</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
