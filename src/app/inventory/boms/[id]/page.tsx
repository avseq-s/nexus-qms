"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Layers,
  GitCommit,
  GitMerge,
  Save,
  Plus,
  Box,
  AlertTriangle,
  History,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  Send,
  Lock,
  Download,
  CheckCircle2,
  X,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const DEFAULT_WORKFLOW_RULES = [
  { id: 'submit_ecr', label: 'Submit ECR', description: 'Transitions a DRAFT BOM to PENDING_APPROVAL', allowedRoles: ['ENGINEER', 'ADMIN'] },
  { id: 'approve_ecn', label: 'Approve ECN', description: 'Approves a PENDING_APPROVAL BOM to ACTIVE status', allowedRoles: ['ADMIN'] },
  { id: 'reject_ecr', label: 'Reject ECR', description: 'Demotes a PENDING_APPROVAL BOM back to DRAFT', allowedRoles: ['ADMIN'] }
];

// Mock data matching the specific BOM ID
const BOM_DETAIL = {
  id: 'bom-001',
  code: 'PCBA-SMV2',
  name: 'SmartMeter V2 Main Board',
  version: 'Rev B',
  status: 'ACTIVE',
  lastUpdated: '2026-04-06',
};

const BOM_ITEMS = [
  { 
    id: 'item-1', 
    partNumber: 'IC-STM32F4', 
    description: 'MCU 32-bit ARM Cortex-M4', 
    qty: 1, 
    ref: 'U1',
    mockStock: 250, // Available in mock inventory
    alternates: []
  },
  { 
    id: 'item-2', 
    partNumber: 'CAP-0402-104K', 
    description: '100nF 10V X7R 0402', 
    qty: 12, 
    ref: 'C1-C12',
    mockStock: 500, // Available in mock inventory
    alternates: [
      { id: 'alt-1', partNumber: 'CAP-0402-104M', description: '100nF 16V X7R 0402', isApproved: true }
    ]
  },
  { 
    id: 'item-3', 
    partNumber: 'RES-0603-10K', 
    description: 'Resistor 10K Ohm 1% 0603', 
    qty: 4, 
    ref: 'R1-R4',
    mockStock: 8000, // Available in mock inventory
    alternates: [
      { id: 'alt-2', partNumber: 'RES-0603-10K-5', description: 'Resistor 10K Ohm 5% 0603', isApproved: false }
    ]
  },
];

const AUDIT_LOGS = [
  { id: 'log-1', action: 'BOM Activated', user: 'Admin User', date: '2026-04-06 09:12 AM', details: 'Status changed from DRAFT to ACTIVE.' },
  { id: 'log-2', action: 'Alternate Added', user: 'Engineer', date: '2026-04-05 14:30 PM', details: 'Added CAP-0402-104M as alternate to CAP-0402-104K.' },
  { id: 'log-3', action: 'BOM Created', user: 'Engineer', date: '2026-04-01 10:00 AM', details: 'Imported from initial CSV.' },
];

export default function BomDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'components' | 'history'>('components');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Shortage Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buildQty, setBuildQty] = useState<number>(100);
  const [isSubmittingPr, setIsSubmittingPr] = useState(false);
  const [prSuccess, setPrSuccess] = useState(false);

  const [bom, setBom] = useState<any>(BOM_DETAIL);
  const [items, setItems] = useState<any[]>(BOM_ITEMS);
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const router = useRouter();

  const { data: session } = useSession();
  const userName = session?.user?.name ?? 'Assumed Engineer';
  const userRole = (session?.user as any)?.role ?? 'ENGINEER';
  const isAdmin = userRole === 'ADMIN';

  const [genericTransitionData, setGenericTransitionData] = useState<{ trans: any } | null>(null);
  const [transComment, setTransComment] = useState('');
  const [workflowRules, setWorkflowRules] = useState<any[]>(DEFAULT_WORKFLOW_RULES);

  React.useEffect(() => {
    try {
      const savedBomsRaw = localStorage.getItem('QMS_BOMS');
      const savedBoms = savedBomsRaw ? JSON.parse(savedBomsRaw) : [];
      if (Array.isArray(savedBoms)) {
        const found = savedBoms.find((b: any) => b.id === params.id);
        if (found) {
          setBom(found);
          setItems(found.items?.map((it: any) => ({
            ...it,
            qty: it.quantityPerAssy,
            ref: it.refDesignators,
            mockStock: Math.floor(Math.random() * 1000)
          })) || []);
        }
      }
    } catch (err) {
      console.error("Error loading BOM detail", err);
    }

    const savedRules = localStorage.getItem('QMS_WORKFLOW_RULES');
    const parseRules = savedRules ? JSON.parse(savedRules) : DEFAULT_WORKFLOW_RULES;
    
    const normalizedRules = parseRules.map((r: any) => {
      if (!r.from) {
        if (r.id === 'submit_ecr') return { ...r, from: 'DRAFT', to: 'PENDING_APPROVAL' };
        if (r.id === 'approve_ecn') return { ...r, from: 'PENDING_APPROVAL', to: 'ACTIVE' };
        if (r.id === 'reject_ecr') return { ...r, from: 'PENDING_APPROVAL', to: 'DRAFT' };
      }
      return r;
    });

    setWorkflowRules(normalizedRules);
  }, [params.id]);

  const availableTransitions = workflowRules.filter((r: any) => r.from === bom.status && r.allowedRoles.includes(userRole));


  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleConfirmShortage = () => {
    setIsSubmittingPr(true);
    
    // Simulate API delay forming PR
    setTimeout(() => {
      // 1. Identify items with shortages
      const confirmedShortages = shortageData
        .filter(item => item.shortage > 0)
        .map(item => ({
          partNumber: item.partNumber,
          description: item.description,
          quantityNeeded: item.shortage,
          workOrderRef: `PLAN-${BOM_DETAIL.code}-${new Date().getTime().toString().slice(-4)}`,
          status: 'PENDING_PO'
        }));

      // 2. Persist to localStorage (matching the key used in /purchase page)
      const existingReqs = JSON.parse(localStorage.getItem('QMS_PURCHASE_REQUISITIONS') || '[]');
      localStorage.setItem('QMS_PURCHASE_REQUISITIONS', JSON.stringify([...confirmedShortages, ...existingReqs]));

      setIsSubmittingPr(false);
      setPrSuccess(true);
    }, 1500);
  };

  const resetAndCloseModal = () => {
    setIsModalOpen(false);
    setPrSuccess(false);
    setIsSubmittingPr(false);
  };

  const updateBomInStorage = (updatedBom: any) => {
    const existingBoms = JSON.parse(localStorage.getItem('QMS_BOMS') || '[]');
    const bomsIndex = existingBoms.findIndex((b: any) => b.id === bom.id);
    const updatedBoms = [...existingBoms];
    if (bomsIndex >= 0) {
      updatedBoms[bomsIndex] = { ...updatedBom, items };
    } else {
      updatedBoms.push({ ...updatedBom, items });
    }
    localStorage.setItem('QMS_BOMS', JSON.stringify(updatedBoms));
    setBom(updatedBom);
  };

  // Derive shortages based on the selected build Qty
  const shortageData = items.map((item) => {
    const required = item.qty * buildQty;
    const shortage = Math.max(0, required - (item.mockStock || 0));
    return { ...item, required, shortage };
  });

  const totalShortItems = shortageData.filter(i => i.shortage > 0).length;

  const handleEditDraft = () => {
    setIsEditMode(true);
    setEditedItems(JSON.parse(JSON.stringify(items))); // Deep copy
  };

  const handleSaveDraft = () => {
    const changes: string[] = [];
    editedItems.forEach((eItem, i) => {
      const original = items[i];
      if (!original) return;
      if (eItem.qty !== original.qty) {
        changes.push(`${eItem.partNumber}: Qty changed from ${original.qty} to ${eItem.qty}`);
      }
      if (eItem.ref !== original.ref) {
        changes.push(`${eItem.partNumber}: Ref changed from '${original.ref}' to '${eItem.ref}'`);
      }
    });
    
    if (changes.length > 0) {
      const detailsText = changes.join(' | ');

      const updatedBom = {
        ...bom,
        lastUpdated: new Date().toISOString().split('T')[0],
        history: [
          {
            id: `log-${Date.now()}`,
            action: 'Line Items Updated',
            user: 'Engineer',
            date: new Date().toLocaleString(),
            details: detailsText
          },
          ...(bom.history || AUDIT_LOGS)
        ]
      };

      const existingBoms = JSON.parse(localStorage.getItem('QMS_BOMS') || '[]');
      const bomsIndex = existingBoms.findIndex((b: any) => b.id === bom.id);
      
      const updatedBoms = [...existingBoms];
      const mergedItems = editedItems.map(it => ({
        ...it,
        quantityPerAssy: it.qty,
        refDesignators: it.ref
      }));

      if (bomsIndex >= 0) {
        updatedBoms[bomsIndex] = { ...updatedBom, items: mergedItems };
      } else {
        updatedBoms.push({ ...updatedBom, items: mergedItems });
      }

      localStorage.setItem('QMS_BOMS', JSON.stringify(updatedBoms));
      
      setBom(updatedBom);
      setItems(editedItems);
    }
    
    setIsEditMode(false);
  };

  const handleDownloadEcn = () => {
    const modifications = bom.history?.filter((h: any) => h.action === 'Line Items Updated') || [];
    const modsText = modifications.length > 0 
      ? modifications.map((m: any) => `${m.date}:\n  ${m.details.replace(/ \| /g, '\n  ')}`).join('\n\n')
      : "No line item changes explicitly logged inline.";

    const bomDump = items.map(i => `- ${i.partNumber.padEnd(16)} | Qty: ${String(i.qty).padEnd(4)} | Ref: ${i.ref}`).join('\n');

    const ecnContent = `
=============================================================
             ENGINEERING CHANGE NOTICE (ECN)
=============================================================

DOCUMENT IDENTIFICATION
-------------------------------------------------------------
Product Code   : ${bom.code}
Product Name   : ${bom.name}
Target Revision: ${bom.version}
Date Issued    : ${new Date().toLocaleDateString()}

CHANGE ORIGIN
-------------------------------------------------------------
Requested By   : ${bom.ecrMeta?.requester || 'Legacy / Direct Integration'}
Requesting Team: ${bom.ecrMeta?.team || 'N/A'}
Reason         : ${bom.ecrMeta?.reason || 'N/A'}

SPECIFIC LINE-ITEM MODIFICATIONS
-------------------------------------------------------------
${modsText}

=============================================================
         FINAL AUTHORIZED BILL OF MATERIALS (BOM)
=============================================================
${bomDump}

-------------------------------------------------------------
Generated by Prism System
-------------------------------------------------------------
`;

    const blob = new Blob([ecnContent.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ECN_Report_${bom.code}_${bom.version.replace(' ', '')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenericTransition = (trans: any) => {
    setGenericTransitionData({ trans });
  };

  const executeGenericTransition = () => {
    if (!genericTransitionData) return;
    const { trans } = genericTransitionData;

    let historyAction = `Transitioned to ${trans.to}`;
    let historyDetails = `Triggered via: ${trans.label}. ${transComment ? 'Comment: ' + transComment : ''}`;

    if (trans.id === 'submit_ecr') {
      historyAction = 'ECR Submitted';
      historyDetails = `Reason: ${transComment || 'N/A'}`;
    } else if (trans.id === 'approve_ecn') {
      historyAction = 'ECN Approved';
      historyDetails = 'Engineering Change Notice (ECN) approved.';
    }

    const existingBoms = JSON.parse(localStorage.getItem('QMS_BOMS') || '[]');
    let updatedBoms = existingBoms;

    // Built-in behavior: If hitting ACTIVE, automatically obsolete previous ACTIVE revs of same BOM code
    if (trans.to === 'ACTIVE') {
      updatedBoms = existingBoms.map((b: any) => {
        if (b.code === bom.code && b.id !== bom.id && b.status === 'ACTIVE') {
          return { 
            ...b, 
            status: 'OBSOLETE',
            history: [
              {
                id: `log-${Date.now()}-obs`,
                action: 'Superseded',
                user: userName,
                date: new Date().toLocaleString(),
                details: `Superseded by newly targeted revision ${bom.version}.`
              },
              ...(b.history || [])
            ]
          };
        }
        return b;
      });
    }

    const updatedBom = {
      ...bom,
      status: trans.to,
      // Record ECR meta generally if transitioning to ANY pending state.
      ecrMeta: (trans.to.includes('PENDING') || trans.id === 'submit_ecr') 
        ? { requester: userName, team: userRole, reason: transComment } 
        : bom.ecrMeta,
      lastUpdated: new Date().toISOString().split('T')[0],
      history: [
        {
          id: `log-${Date.now()}`,
          action: historyAction,
          user: userName,
          date: new Date().toLocaleString(),
          details: historyDetails
        },
        ...(bom.history || AUDIT_LOGS)
      ]
    };

    const bomsIndex = updatedBoms.findIndex((b: any) => b.id === bom.id);
    if (bomsIndex >= 0) {
      updatedBoms[bomsIndex] = { ...updatedBom, items };
    } else {
      updatedBoms.push({ ...updatedBom, items });
    }

    localStorage.setItem('QMS_BOMS', JSON.stringify(updatedBoms));
    setBom(updatedBom);
    setGenericTransitionData(null);
    setTransComment('');
  };

  const getNextVersion = (currentVersion: string) => {
    const match = currentVersion.match(/Rev ([A-Z]+)/);
    if (!match) return `Rev ${currentVersion}.1`;
    
    const rev = match[1];
    let nextRev = '';
    let i = rev.length - 1;
    while (i >= 0 && rev[i] === 'Z') i--;
    
    if (i === -1) {
      nextRev = 'A'.repeat(rev.length + 1);
    } else {
      const charCode = rev.charCodeAt(i);
      nextRev = rev.substring(0, i) + String.fromCharCode(charCode + 1) + 'A'.repeat(rev.length - i - 1);
    }
    return `Rev ${nextRev}`;
  };

  const handleCreateNewRevision = () => {
    setIsCreatingRevision(true);
    
    // Simulate some logic delay
    setTimeout(() => {
      const existingBoms = JSON.parse(localStorage.getItem('QMS_BOMS') || '[]');
      const newVersion = getNextVersion(bom.version);
      const newId = `bom-${Date.now()}`;
      
      const newRevision = {
        ...bom,
        id: newId,
        version: newVersion,
        status: 'DRAFT',
        lastUpdated: new Date().toISOString().split('T')[0],
        history: [
          {
            id: `log-${Date.now()}`,
            action: 'Revision Created',
            user: 'Engineer (Draft)',
            date: new Date().toLocaleString(),
            details: `Cloned from ${bom.version} to initialize new draft revision.`
          }
        ],
        items: items.map(it => ({
          ...it,
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          quantityPerAssy: it.qty,
          refDesignators: it.ref
        }))
      };

      localStorage.setItem('QMS_BOMS', JSON.stringify([newRevision, ...existingBoms]));
      router.push(`/inventory/boms/${newId}`);
      setIsCreatingRevision(false);
    }, 1000);
  };

  return (
    <div className="animate-fade-in stagger-1">
      
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/inventory/boms" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem', width: 'fit-content' }}>
          <ArrowLeft size={16} /> Back to Master BOMs
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 className="text-gradient" style={{ margin: 0 }}>{bom.code}</h1>
              <span className={`badge ${
                bom.status === 'ACTIVE' ? 'badge-success' : 
                bom.status === 'PENDING_APPROVAL' ? 'badge-warning' :
                bom.status === 'OBSOLETE' ? 'badge-danger' :
                'badge-secondary'
              }`}>{bom.status}</span>
              <span style={{ padding: '0.2rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                {bom.version}
              </span>
            </div>
            <p className="text-secondary" style={{ fontSize: '1.1rem' }}>{bom.name}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>
              <Box size={16} /> Calculate Shortages
            </button>
            
            {bom.status === 'ACTIVE' && (
              <button 
                className="btn btn-primary" 
                onClick={handleCreateNewRevision}
                disabled={isCreatingRevision}
              >
                {isCreatingRevision ? (
                  <><Loader2 size={16} className="spin" /> Generating...</>
                ) : (
                  <><GitBranch size={16} /> Create New Rev</>
                )}
              </button>
            )}

            {bom.status === 'ACTIVE' && (
              <button className="btn btn-secondary" onClick={handleDownloadEcn}>
                <Download size={16} /> Download ECN Report
              </button>
            )}

            {availableTransitions.map((trans: any) => (
              <button 
                 key={trans.id} 
                 className="btn" 
                 onClick={() => handleGenericTransition(trans)}
                 style={{ 
                    // Automatically color basic transitions for logic sanity, default to primary otherwise
                    background: trans.to === 'ACTIVE' ? 'var(--success)' : 
                                trans.to === 'DRAFT'  ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-primary)',
                    color: trans.to === 'DRAFT' ? 'var(--danger)' : 'white'
                 }}
              >
                {trans.to === 'ACTIVE' ? <ThumbsUp size={16} /> : 
                 trans.to === 'DRAFT' ? <ThumbsDown size={16} /> : <GitCommit size={16} />}
                {trans.label}
              </button>
            ))}

            {bom.status !== 'ACTIVE' && bom.status !== 'OBSOLETE' && availableTransitions.length === 0 && (
              <button className="btn btn-secondary" disabled style={{ opacity: 0.7 }}>
                <Lock size={16} /> Locked / Unmapped State
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('components')}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '0.75rem 0', 
            color: activeTab === 'components' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            borderBottom: activeTab === 'components' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={18} /> Component List
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '0.75rem 0', 
            color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            borderBottom: activeTab === 'history' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <History size={18} /> Revision History
        </button>
      </div>

      {/* Components Tab Content */}
      {activeTab === 'components' && (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Line Items</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {bom.status === 'DRAFT' && !isEditMode && (
                <button className="btn btn-primary" onClick={handleEditDraft} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                  Edit Draft
                </button>
              )}
              {isEditMode && (
                <>
                  <button className="btn btn-secondary" onClick={() => setIsEditMode(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveDraft} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                    Save Changes
                  </button>
                </>
              )}
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} disabled={isEditMode}>
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Part Number</th>
                <th>Description</th>
                <th>Ref Des</th>
                <th>Req Qty</th>
                <th>Alternates</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <React.Fragment key={item.id}>
                  <tr style={{ borderBottom: expandedRow === item.id ? 'none' : '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.partNumber}
                    </td>
                    <td>{item.description}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {isEditMode ? (
                        <input
                           value={editedItems.find(i => i.id === item.id)?.ref || ''}
                           onChange={(e) => setEditedItems(editedItems.map(i => i.id === item.id ? { ...i, ref: e.target.value } : i))}
                           style={{ width: '100%', padding: '0.2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                        />
                      ) : (
                        item.ref
                      )}
                    </td>
                    <td>
                      {isEditMode ? (
                        <input
                           type="number"
                           value={editedItems.find(i => i.id === item.id)?.qty || 0}
                           onChange={(e) => setEditedItems(editedItems.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value) } : i))}
                           style={{ width: '60px', padding: '0.2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                           min="0"
                        />
                      ) : (
                        <span style={{ fontWeight: 'bold' }}>{item.qty}</span>
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => toggleRow(item.id)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', gap: '0.25rem', border: item.alternates.length > 0 ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)' }}
                      >
                        <GitMerge size={12} />
                        {item.alternates.length} Alternates
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Alternate Viewer for this row */}
                  {expandedRow === item.id && (
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={5} style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ padding: '1rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                              <GitMerge size={16} /> Approved Alternate Parts for {item.partNumber}
                            </h4>
                            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                              <Plus size={14} /> Route New Alternate
                            </button>
                          </div>
                          
                          {item.alternates.length > 0 ? (
                            <table className="data-table" style={{ background: 'transparent' }}>
                              <thead>
                                <tr>
                                  <th>Alt Part No</th>
                                  <th>Description</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.alternates.map((alt: any) => (
                                  <tr key={alt.id} style={{ background: 'var(--bg-tertiary)' }}>
                                    <td style={{ fontWeight: 600 }}>{alt.partNumber}</td>
                                    <td>{alt.description}</td>
                                    <td>
                                      {alt.isApproved ? (
                                        <span className="badge badge-success">Approved (QA)</span>
                                      ) : (
                                        <span className="badge badge-warning">Pending Approval</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              <AlertTriangle size={16} /> No alternate parts defined for this component yet.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revision History Content */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} /> ISO 9001 Change Audit Trail
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {(bom.history || AUDIT_LOGS).map((log: any) => (
              <div key={log.id} style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'grid', placeItems: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
                  {log.action.includes('Activated') ? <CheckCircle2 size={18} /> : <Save size={18} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{log.action}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{log.date}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{log.details}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Performed by: {log.user}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shortage Calculation Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Box size={20} className="text-secondary" />
                Shortage Calculation
              </h2>
              <button 
                onClick={resetAndCloseModal}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {prSuccess ? (
              <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', display: 'grid', placeItems: 'center' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Purchase Alert Confirmed</h3>
                <p className="text-secondary" style={{ maxWidth: '400px' }}>
                  Purchase department has been notified to procure the missing parts for the {BOM_DETAIL.code} assembly run. A PR draft has been generated successfully.
                </p>
                <button className="btn btn-secondary" onClick={resetAndCloseModal} style={{ marginTop: '1rem' }}>
                  Close Report
                </button>
              </div>
            ) : (
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Target Production Build Quantity
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      value={buildQty}
                      onChange={(e) => setBuildQty(Number(e.target.value) || 0)}
                      className="search-input"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                    />
                  </div>
                  <button className="btn btn-secondary" style={{ height: '45px', padding: '0 1.5rem' }}>
                    Recalculate
                  </button>
                </div>

                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                      <tr>
                        <th>Part Number</th>
                        <th>Required Qty</th>
                        <th>Current Stock</th>
                        <th>Shortage Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortageData.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.partNumber}</td>
                          <td>{item.required.toLocaleString()}</td>
                          <td>{item.mockStock.toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: item.shortage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {item.shortage > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <AlertTriangle size={14} /> Short by {item.shortage.toLocaleString()}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={14} /> Fully Available
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            {!prSuccess && (
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                  {totalShortItems > 0 
                    ? <><strong style={{ color: 'var(--danger)' }}>{totalShortItems} components</strong> require procurement.</>
                    : "No shortages found for this build quantity!"
                  }
                </span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={resetAndCloseModal} disabled={isSubmittingPr}>
                    Cancel
                  </button>
                  {totalShortItems > 0 && (
                    <button className="btn btn-primary" onClick={handleConfirmShortage} disabled={isSubmittingPr} style={{ background: 'var(--accent-primary)', color: 'white', minWidth: '200px' }}>
                      {isSubmittingPr ? (
                        <><Loader2 size={16} className="spin" /> Linking PR...</>
                      ) : (
                        <><ShoppingCart size={16} /> Confirm & Notify Purchase</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Universal Transition Modal */}
      {genericTransitionData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '500px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                <Send size={18} /> Confirm Transition
              </h3>
              <button onClick={() => setGenericTransitionData(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px dashed var(--accent-primary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                 You are advancing this document via <strong>{genericTransitionData.trans.label}</strong>.<br/>
                 It will change from <strong style={{color: 'var(--text-primary)'}}>{genericTransitionData.trans.from}</strong> to <strong style={{color: 'var(--text-primary)'}}>{genericTransitionData.trans.to}</strong>.
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Optional Transition Comment / Reason</label>
                <textarea 
                  className="search-input" 
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', minHeight: '80px', resize: 'vertical' }} 
                  placeholder="Summarize reasons or link external notes..."
                  value={transComment}
                  onChange={e => setTransComment(e.target.value)}
                />
              </div>

            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-tertiary)' }}>
              <button className="btn btn-secondary" onClick={() => setGenericTransitionData(null)}>Cancel</button>
              <button 
                 className="btn btn-primary" 
                 style={{ background: 'var(--accent-primary)', color: 'white' }} 
                 onClick={executeGenericTransition}
              >
                Execute Transition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

