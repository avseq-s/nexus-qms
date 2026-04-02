"use client";

import React, { useState } from 'react';
import { 
  Cpu, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  FlaskConical,
  ChevronRight
} from 'lucide-react';

const MOCK_BATCHES = [
  {
    id: 'TEST-2026-008',
    kit: 'KIT-2026-011',
    product: 'IoT Gateway',
    totalBoards: 50,
    programmed: 50,
    tested: 42,
    passed: 40,
    failed: 2,
    status: 'IN_TESTING',
    boards: [
      { sn: 'IOT-GW-001', programmed: true, testResult: 'PASS', testedBy: 'Technician A', time: '09:10 AM' },
      { sn: 'IOT-GW-002', programmed: true, testResult: 'PASS', testedBy: 'Technician A', time: '09:18 AM' },
      { sn: 'IOT-GW-003', programmed: true, testResult: 'FAIL', testedBy: 'Technician B', time: '09:25 AM', failReason: 'WiFi module not responding' },
      { sn: 'IOT-GW-004', programmed: true, testResult: 'PASS', testedBy: 'Technician A', time: '09:33 AM' },
      { sn: 'IOT-GW-005', programmed: true, testResult: 'FAIL', testedBy: 'Technician B', time: '09:41 AM', failReason: 'Power rail 3.3V out of spec' },
      { sn: 'IOT-GW-006', programmed: true, testResult: 'PASS', testedBy: 'Technician A', time: '09:48 AM' },
    ]
  },
  {
    id: 'TEST-2026-007',
    kit: 'KIT-2026-010',
    product: 'PowerSupply 12V',
    totalBoards: 200,
    programmed: 200,
    tested: 200,
    passed: 198,
    failed: 2,
    status: 'COMPLETE',
    boards: []
  },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  IN_PROGRAMMING: { label: 'Programming',  badge: 'badge-warning' },
  IN_TESTING:     { label: 'In Testing',   badge: 'badge-info'    },
  COMPLETE:       { label: 'Complete',     badge: 'badge-success' },
};

export default function TestingPage() {
  const [selected, setSelected] = useState<any>(MOCK_BATCHES[0]);
  const [activeBoard, setActiveBoard] = useState<any>(null);

  const passRate = selected ? Math.round((selected.passed / (selected.tested || 1)) * 100) : 0;

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Programming & Testing</h1>
          <p className="text-secondary">In-house firmware programming & functional test logging</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Boards to Program', value: '50', color: 'var(--warning)', icon: Zap },
          { label: 'In Testing', value: '42', color: 'var(--accent-primary)', icon: FlaskConical },
          { label: 'Passed & Ready', value: '40', color: 'var(--success)', icon: CheckCircle },
          { label: 'Failed (NCR)', value: '2', color: 'var(--danger)', icon: AlertTriangle },
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '1.5rem' }}>
        {/* Left: Batch List */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="var(--accent-primary)" />
            Test Batches
          </h2>
          {MOCK_BATCHES.map((batch) => {
            const cfg = STATUS_CONFIG[batch.status];
            const rate = Math.round((batch.passed / (batch.tested || 1)) * 100);
            return (
              <div
                key={batch.id}
                className="glass-card"
                style={{
                  padding: '1rem', cursor: 'pointer',
                  borderLeft: selected?.id === batch.id ? '3px solid var(--accent-primary)' : '3px solid var(--border-subtle)',
                  background: selected?.id === batch.id ? 'rgba(59,130,246,0.05)' : 'transparent'
                }}
                onClick={() => setSelected(batch)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{batch.id}</span>
                  <span className={`badge ${cfg?.badge}`} style={{ fontSize: '0.65rem' }}>{cfg?.label}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{batch.product}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {batch.passed}/{batch.totalBoards} passed
                </div>
                {/* Mini Progress Bar */}
                <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${rate}%`, height: '100%', background: rate >= 95 ? 'var(--success)' : 'var(--warning)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{rate}% pass rate</div>
              </div>
            );
          })}
        </div>

        {/* Right: Board Detail */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {selected && (
            <div className="animate-fade-in">
              {/* Batch Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>{selected.product}</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selected.id} • Kit: {selected.kit}</p>
                </div>
                <span className={`badge ${STATUS_CONFIG[selected.status]?.badge}`}>{STATUS_CONFIG[selected.status]?.label}</span>
              </div>

              {/* Progress Ring Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Boards', value: selected.totalBoards, color: 'var(--text-secondary)' },
                  { label: 'Programmed', value: selected.programmed, color: 'var(--accent-primary)' },
                  { label: 'Passed ✓', value: selected.passed, color: 'var(--success)' },
                  { label: 'Failed ✗', value: selected.failed, color: 'var(--danger)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{m.label}</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Pass Rate Bar */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Overall Pass Rate</span>
                  <span style={{ fontWeight: 700, color: passRate >= 95 ? 'var(--success)' : passRate >= 80 ? 'var(--warning)' : 'var(--danger)' }}>{passRate}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${passRate}%`, height: '100%', background: passRate >= 95 ? 'var(--success)' : passRate >= 80 ? 'var(--warning)' : 'var(--danger)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Board-level Table */}
              {selected.boards.length > 0 && (
                <>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Board-Level Results</h3>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Serial No.</th>
                          <th>Programmed</th>
                          <th>Test Result</th>
                          <th>Tested By</th>
                          <th>Time</th>
                          <th>Fail Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.boards.map((b: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{b.sn}</td>
                            <td>
                              {b.programmed 
                                ? <span className="badge badge-success">✓ Done</span>
                                : <span className="badge badge-warning">Pending</span>
                              }
                            </td>
                            <td>
                              {b.testResult === 'PASS' 
                                ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--success)', fontWeight: 600 }}><CheckCircle size={14} /> PASS</span>
                                : <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--danger)', fontWeight: 600 }}><XCircle size={14} /> FAIL</span>
                              }
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{b.testedBy}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.time}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{b.failReason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                {selected.failed > 0 && (
                  <button className="btn btn-danger">
                    <AlertTriangle size={16} />
                    Raise NCR for {selected.failed} Failed Boards
                  </button>
                )}
                {selected.passed > 0 && (
                  <button className="btn btn-primary" style={{ background: 'var(--success)', boxShadow: '0 4px 12px var(--success-glow)' }}>
                    <ChevronRight size={16} />
                    Forward {selected.passed} Passed Boards to Dispatch
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
