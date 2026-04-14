"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Shield, Check, Save, Maximize2, Layers, GitBranch } from 'lucide-react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  Node, 
  Edge, 
  Connection,
  NodeChange,
  EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';

const DEFAULT_WORKFLOW_RULES = [
  { id: 'submit_ecr', label: 'Submit ECR', from: 'DRAFT', to: 'PENDING_APPROVAL', allowedRoles: ['ENGINEER', 'ADMIN'] },
  { id: 'approve_ecn', label: 'Approve ECN', from: 'PENDING_APPROVAL', to: 'ACTIVE', allowedRoles: ['ADMIN'] },
  { id: 'reject_ecr', label: 'Reject ECR', from: 'PENDING_APPROVAL', to: 'DRAFT', allowedRoles: ['ADMIN'] }
];

const ALL_ROLES = ['ADMIN', 'ENGINEER', 'QUALITY', 'STORE', 'PURCHASE', 'PRODUCTION'];

export default function WorkflowSettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'matrix' | 'flow'>('matrix');
  const [rules, setRules] = useState<any[]>(DEFAULT_WORKFLOW_RULES);
  const [isSaving, setIsSaving] = useState(false);
  
  // React Flow State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Guard access
  const userRole = (session?.user as any)?.role ?? 'ENGINEER';
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    const savedRules = localStorage.getItem('QMS_WORKFLOW_RULES');
    const parseRules = savedRules ? JSON.parse(savedRules) : DEFAULT_WORKFLOW_RULES;
    
    // Safety mapping for legacy rules missing from/to
    const normalizedRules = parseRules.map((r: any) => {
      if (!r.from) {
        if (r.id === 'submit_ecr') return { ...r, from: 'DRAFT', to: 'PENDING_APPROVAL' };
        if (r.id === 'approve_ecn') return { ...r, from: 'PENDING_APPROVAL', to: 'ACTIVE' };
        if (r.id === 'reject_ecr') return { ...r, from: 'PENDING_APPROVAL', to: 'DRAFT' };
      }
      return r;
    });

    setRules(normalizedRules);
    generateGraphFromRules(normalizedRules);
  }, []);

  const generateGraphFromRules = (currentRules: any[]) => {
    // Determine unique states
    const states = new Set<string>();
    currentRules.forEach(rule => {
      if (rule.from) states.add(rule.from);
      if (rule.to) states.add(rule.to);
    });

    // For simplistic auto-layout
    const statesArray = Array.from(states);
    const initialNodes: Node[] = statesArray.map((state, i) => ({
      id: state,
      // Calculate a rough layout: zigzag or row
      position: { x: (i % 3) * 250 + 100, y: Math.floor(i / 3) * 150 + 100 },
      data: { label: state },
      style: { 
        background: 'var(--bg-primary)', 
        color: 'var(--text-primary)', 
        border: '2px solid var(--accent-primary)',
        borderRadius: '8px',
        padding: '10px 20px',
        fontWeight: 'bold',
        fontSize: '12px'
      }
    }));

    const initialEdges: Edge[] = currentRules.map((rule, i) => ({
      id: `e-${rule.from}-${rule.to}-${rule.id}`, // Add rule.id to handle multiple edges
      source: rule.from,
      target: rule.to,
      label: rule.label,
      animated: true,
      style: { stroke: 'var(--accent-primary)' },
      labelStyle: { fill: 'var(--text-secondary)', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: 'var(--bg-tertiary)', fillOpacity: 0.8 }
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = deletedNodes.map((n) => n.id);
      setRules((r) => r.filter((rule) => !deletedIds.includes(rule.from) && !deletedIds.includes(rule.to)));
    },
    [setRules]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const deletedRules = deletedEdges.map((e) => e.id.split('-').pop()); // Extracted rule.id from edge.id
      setRules((r) => r.filter((rule) => !deletedRules.includes(rule.id)));
    },
    [setRules]
  );

  // Custom connection event saves a new Transition Rule
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent-primary)' } }, eds));
      const actionName = prompt("Enter transition label (e.g. Request Approval):", "Transition Action");
      if (actionName && params.source && params.target) {
        const newRule = {
          id: `trans_${Date.now()}`,
          label: actionName,
          from: params.source,
          to: params.target,
          allowedRoles: ['ADMIN']
        };
        setRules(r => [...r, newRule]);
      }
    },
    [setEdges]
  );

  const handleToggleRole = (ruleId: string, role: string) => {
    setRules(current => 
      current.map(rule => {
        if (rule.id === ruleId) {
          const hasRole = rule.allowedRoles.includes(role);
          return {
            ...rule,
            allowedRoles: hasRole 
              ? rule.allowedRoles.filter((r:string) => r !== role)
              : [...rule.allowedRoles, role]
          };
        }
        return rule;
      })
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm("Are you sure you want to delete this transition?")) {
      const newRules = rules.filter(r => r.id !== ruleId);
      setRules(newRules);
      generateGraphFromRules(newRules);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('QMS_WORKFLOW_RULES', JSON.stringify(rules));
    
    // Save visual state technically (for next load persistence of node positioning)
    // Skipped full visual save here to keep data structure simple; nodes auto-layout based on index.
    
    setTimeout(() => {
      setIsSaving(false);
      alert('Visual Workflow & Policies updated successfully!');
    }, 600);
  };

  const handleAddState = () => {
    const newState = prompt("Enter new State Name (e.g. QUALITY_HOLD):");
    if (newState) {
       setNodes([...nodes, {
         id: newState.toUpperCase(),
         position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
         data: { label: newState.toUpperCase() },
         style: { 
            background: 'var(--bg-primary)', 
            color: 'var(--text-primary)', 
            border: '2px solid var(--accent-primary)',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: 'bold',
            fontSize: '12px'
         }
       }]);
    }
  };

  if (!isAdmin && process.env.NODE_ENV !== 'development') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Shield size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h1>Access Denied</h1>
        <p className="text-secondary">Only administrators can modify workflow rules.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in stagger-1" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
            <Settings size={28} /> Process Flow Manager
          </h1>
          <p className="text-secondary" style={{ fontSize: '1.1rem', maxWidth: '600px' }}>
            Visually draft process linkages across lifecycle stages, mapping operational permissions to defined statuses.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <span className="spin" style={{ display: 'inline-block' }}>⚙️</span> : <Save size={18} />}
          {isSaving ? ' Saving Policy...' : ' Save Policies'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => { setActiveTab('matrix'); generateGraphFromRules(rules); }}
          style={{ 
            background: 'none', border: 'none', padding: '0.75rem 0', 
            color: activeTab === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            borderBottom: activeTab === 'matrix' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Layers size={18} /> Permission Matrix
        </button>
        <button 
          onClick={() => { setActiveTab('flow'); generateGraphFromRules(rules); }}
          style={{ 
            background: 'none', border: 'none', padding: '0.75rem 0', 
            color: activeTab === 'flow' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            borderBottom: activeTab === 'flow' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <GitBranch size={18} /> Visual Diagram Canvas
        </button>
      </div>

      {activeTab === 'flow' && (
        <div className="glass-panel" style={{ padding: '0', height: '600px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Drag from handles to create links. Nodes represent Document Statuses. Edges represent action buttons.
            </span>
            <button className="btn btn-secondary" onClick={handleAddState} style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>
              <Maximize2 size={14}/> Inject Custom Status Node
            </button>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-primary)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              onConnect={onConnect}
              fitView
              className="dark-theme-canvas"
            >
              <Background gap={20} color="var(--border-subtle)" />
              <Controls />
              <MiniMap style={{ background: 'var(--bg-tertiary)' }} nodeColor="var(--accent-primary)" />
            </ReactFlow>
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
            <thead style={{ background: 'var(--bg-tertiary)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', width: '35%' }}>Workflow Origin & Action</th>
                <th>Authorized Roles Matrix</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '1.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {rule.label}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Origin Status <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}> {rule.from} </span> → Targets <span style={{ color: 'var(--success)', fontWeight: 'bold' }}> {rule.to} </span>
                    </div>
                    <button className="btn" style={{ marginTop: '0.75rem', color: 'var(--danger)', fontSize: '0.75rem', padding: '0' }} onClick={() => handleDeleteRule(rule.id)}>Delete Transition (Caution)</button>
                  </td>
                  <td style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {ALL_ROLES.map(role => {
                        const isAllowed = rule.allowedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            onClick={() => handleToggleRole(rule.id, role)}
                            style={{
                              background: isAllowed ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                              color: isAllowed ? '#fff' : 'var(--text-secondary)',
                              border: `1px solid ${isAllowed ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                              padding: '0.4rem 0.8rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            {isAllowed && <Check size={14} />}
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
