"use client";

import { useState } from 'react';
import { Users, Plus, Search, Shield, Mail, User, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#ef4444',
  QUALITY: '#3b82f6',
  STORE: '#10b981',
  PURCHASE: '#f59e0b',
  PRODUCTION: '#8b5cf6',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  QUALITY: 'Quality Inspector',
  STORE: 'Store Manager',
  PURCHASE: 'Purchase Team',
  PRODUCTION: 'Production',
};

type Role = 'ADMIN' | 'QUALITY' | 'STORE' | 'PURCHASE' | 'PRODUCTION';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLogin: string;
}

const INITIAL_USERS: UserRecord[] = [
  { id: '1', name: 'Admin User', email: 'admin@nexusqms.com', role: 'ADMIN', active: true, lastLogin: 'Today, 09:14' },
  { id: '2', name: 'Quality Inspector', email: 'quality@nexusqms.com', role: 'QUALITY', active: true, lastLogin: 'Today, 08:55' },
  { id: '3', name: 'Store Manager', email: 'store@nexusqms.com', role: 'STORE', active: true, lastLogin: 'Today, 08:30' },
  { id: '4', name: 'Purchase Team', email: 'purchase@nexusqms.com', role: 'PURCHASE', active: true, lastLogin: 'Yesterday' },
  { id: '5', name: 'Production Team', email: 'production@nexusqms.com', role: 'PRODUCTION', active: false, lastLogin: '3 days ago' },
];

export default function UsersRolesPage() {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'STORE' as Role, password: '' });

  const filtered = users.filter(
    (u) =>
      search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditUser(null);
    setForm({ name: '', email: '', role: 'STORE', password: '' });
    setShowForm(true);
  };

  const openEdit = (user: UserRecord) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, password: '' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.email) return;
    if (editUser) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, name: form.name, email: form.email, role: form.role } : u))
      );
    } else {
      setUsers((prev) => [
        ...prev,
        { id: String(Date.now()), name: form.name, email: form.email, role: form.role, active: true, lastLogin: 'Never' },
      ]);
    }
    setShowForm(false);
  };

  const toggleActive = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const roleCounts = Object.keys(ROLE_LABELS).map((role) => ({
    role,
    count: users.filter((u) => u.role === role).length,
  }));

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Users & Roles</h1>
          <p className="text-secondary">Manage system access and role-based permissions</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Role Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {roleCounts.map(({ role, count }) => (
          <div key={role} className="glass-card" style={{ padding: '1.1rem', borderLeft: `3px solid ${ROLE_COLORS[role]}` }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{ROLE_LABELS[role]}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: ROLE_COLORS[role] }}>{count}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem', marginBottom: 0 }}
            placeholder="Search users by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* User Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, ${ROLE_COLORS[user.role]}88)`,
                      display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem',
                    }}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user.name}</p>
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Mail size={11} /> {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge" style={{
                    background: `${ROLE_COLORS[user.role]}15`,
                    color: ROLE_COLORS[user.role],
                    border: `1px solid ${ROLE_COLORS[user.role]}30`,
                  }}>
                    <Shield size={11} style={{ marginRight: '0.3rem' }} />
                    {user.role}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => toggleActive(user.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  >
                    {user.active ? (
                      <><CheckCircle size={16} color="var(--success)" /><span style={{ color: 'var(--success)' }}>Active</span></>
                    ) : (
                      <><XCircle size={16} color="var(--text-muted)" /><span style={{ color: 'var(--text-muted)' }}>Inactive</span></>
                    )}
                  </button>
                </td>
                <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{user.lastLogin}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      onClick={() => openEdit(user)}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      onClick={() => deleteUser(user.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem', margin: '1rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editUser ? 'Edit User' : 'Add New User'}</h2>

            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input-field" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input className="input-field" type="email" placeholder="email@nexusqms.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label} ({value})</option>
                ))}
              </select>
            </div>
            {!editUser && (
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input-field" type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <User size={14} />
                {editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
