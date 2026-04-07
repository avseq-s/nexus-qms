"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  FileCheck, 
  History, 
  Upload, 
  Clock, 
  Eye, 
  CheckCircle2,
  Edit,
  Save,
  X
} from 'lucide-react';
import { PRELOADED_SOPS } from '@/data/sops';

export default function DocumentControlPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Simulating Admin state for the demo
  const isAdmin = true;

  useEffect(() => {
    const savedDocs = localStorage.getItem('QMS_DOCUMENTS');
    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs));
    } else {
      setDocuments(PRELOADED_SOPS);
      localStorage.setItem('QMS_DOCUMENTS', JSON.stringify(PRELOADED_SOPS));
    }
  }, []);

  const handleOpenDoc = (doc: any) => {
    setSelectedDoc(doc);
    setEditContent(doc.procedure);
    setIsEditing(false);
  };

  const handleSaveDoc = () => {
    if (!selectedDoc) return;
    
    const updatedDocs = documents.map(d => {
      if (d.id === selectedDoc.id) {
        return { ...d, procedure: editContent, lastUpdated: new Date().toISOString().split('T')[0] };
      }
      return d;
    });

    setDocuments(updatedDocs);
    localStorage.setItem('QMS_DOCUMENTS', JSON.stringify(updatedDocs));
    
    // Update local selected state to reflect changes
    setSelectedDoc({ ...selectedDoc, procedure: editContent });
    setIsEditing(false);
  };

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Document Control System</h1>
          <p className="text-secondary">ISO 9001 Clause 7.5 - SOPs, Formats & Versioning</p>
        </div>
        <button className="btn btn-primary">
          <Upload size={16} />
          Upload New Revision
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('active')} 
          className="btn" 
          style={{ 
            background: activeTab === 'active' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
          <FileCheck size={16} />
          Active Documents
        </button>
        <button 
          onClick={() => setActiveTab('review')} 
          className="btn" 
          style={{ 
            background: activeTab === 'review' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'review' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
          <Clock size={16} />
          Pending Approvals
        </button>
        <button 
          onClick={() => setActiveTab('archive')} 
          className="btn" 
          style={{ 
            background: activeTab === 'archive' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'archive' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
          <History size={16} />
          Obsolete Archive
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document ID</th>
                <th>Title & Description</th>
                <th>Rev</th>
                <th>Status</th>
                <th>Author / Approver</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.filter(d => activeTab === 'active' ? d.status === 'APPROVED' : activeTab === 'review' ? (d.status === 'IN_REVIEW' || d.status === 'DRAFT') : d.status === 'OBSOLETE').map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} />
                      {doc.id}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{doc.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.purpose}</div>
                  </td>
                  <td><span className="badge badge-info" style={{ background: 'var(--bg-tertiary)' }}>{doc.rev}</span></td>
                  <td>
                    <span className={`badge ${
                      doc.status === 'APPROVED' ? 'badge-success' : 
                      doc.status === 'IN_REVIEW' ? 'badge-warning' : 
                      'badge-info'
                    }`}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>Created: {doc.author}</div>
                    <div style={{ fontSize: '0.75rem', color: doc.status === 'APPROVED' ? 'var(--success)' : 'var(--text-muted)' }}>
                      Approved: {doc.approver}
                    </div>
                  </td>
                  <td>{doc.lastUpdated}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleOpenDoc(doc)}>
                        <Eye size={16} color="var(--accent-primary)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.filter(d => activeTab === 'active' ? d.status === 'APPROVED' : activeTab === 'review' ? (d.status === 'IN_REVIEW' || d.status === 'DRAFT') : d.status === 'OBSOLETE').length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No documents found in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDoc && (
        <div 
          onClick={() => setSelectedDoc(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-fade-in" 
            style={{ 
              padding: '2.5rem', width: '900px', maxWidth: '100%', maxHeight: '90vh', 
              display: 'flex', flexDirection: 'column', border: '1px solid var(--accent-primary)' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={24} color="var(--accent-primary)" /> {selectedDoc.id} : {selectedDoc.title}
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {selectedDoc.scope} | Rev {selectedDoc.rev}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isAdmin && !isEditing && (
                  <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                    <Edit size={16} /> Edit SOP
                  </button>
                )}
                {isEditing && (
                  <button className="btn btn-primary" onClick={handleSaveDoc}>
                    <Save size={16} /> Save Changes
                  </button>
                )}
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setSelectedDoc(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Purpose:</strong>
                <p style={{ marginTop: '0.25rem', color: 'var(--text-primary)' }}>{selectedDoc.purpose}</p>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Official Procedure:</strong>
                {isEditing ? (
                  <textarea 
                    className="input-field" 
                    style={{ flex: 1, minHeight: '300px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', resize: 'vertical' }}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                ) : (
                  <div style={{ 
                    background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', 
                    whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)', minHeight: '300px'
                  }}>
                    {selectedDoc.procedure}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
