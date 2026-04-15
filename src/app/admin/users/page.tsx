// =============================================================================
// Admin → Users & Roles page
// =============================================================================
// ADMIN-only control panel for creating, editing, and removing system users.
// Every user is assigned one of five roles (ADMIN / QUALITY / STORE / PURCHASE
// / PRODUCTION) which is enforced by requireRole() in every GraphQL resolver.
//
// Data flow (post-GraphQL migration):
//   useUsers()         — list all users
//   useCreateUser()    — provision a new account (ADMIN-only)
//   useUpdateUser()    — edit name/role, optionally reset password
//   useDeleteUser()    — remove a user (guard: cannot delete self)
//
// Dropped from the old localStorage version:
//   - `active` toggle (no backend column yet — add isActive Boolean to User
//     in prisma when soft-deactivation is needed).
//   - `lastLogin` string (requires a real login tracking column).
// =============================================================================

"use client";

import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Shield,
  Mail,
  User,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type UserRecord,
  type Role,
} from '@/lib/graphql/hooks';

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: '#ef4444',
  QUALITY: '#3b82f6',
  STORE: '#10b981',
  PURCHASE: '#f59e0b',
  PRODUCTION: '#8b5cf6',
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  QUALITY: 'Quality Inspector',
  STORE: 'Store Manager',
  PURCHASE: 'Purchase Team',
  PRODUCTION: 'Production',
};

const ROLE_ORDER: Role[] = ['ADMIN', 'QUALITY', 'STORE', 'PURCHASE', 'PRODUCTION'];

export default function UsersRolesPage() {
  const { data, loading, error, refetch } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const users: UserRecord[] = data?.users ?? [];

  // ---- Local UI state ------------------------------------------------------
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; role: Role; password: string }>({
    name: '',
    email: '',
    role: 'STORE',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const roleCounts = ROLE_ORDER.map((role) => ({
    role,
    count: users.filter((u) => u.role === role).length,
  }));

  // ---- Handlers ------------------------------------------------------------
  function openNew() {
    setEditTarget(null);
    setForm({ name: '', email: '', role: 'STORE', password: '' });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(user: UserRecord) {
    setEditTarget(user);
    // Password field is blank on edit; populating it triggers a server-side reset.
    setForm({ name: user.name ?? '', email: user.email, role: user.role, password: '' });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!form.email.trim()) {
      setFormError('Email is required.');
      return;
    }
    try {
      if (editTarget) {
        await updateUser.execute({
          id: editTarget.id,
          input: {
            email: form.email.trim(),
            name: form.name.trim() || null,
            role: form.role,
            password: form.password ? form.password : undefined,
          },
        });
      } else {
        if (!form.password || form.password.length < 8) {
          setFormError('Password must be at least 8 characters.');
          return;
        }
        await createUser.execute({
          input: {
            email: form.email.trim(),
            name: form.name.trim() || null,
            role: form.role,
            password: form.password,
          },
        });
      }
      await refetch();
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save user');
    }
  }

  async function handleDelete(user: UserRecord) {
    if (!confirm(`Delete user "${user.email}"? This cannot be undone.`)) return;
    try {
      await deleteUser.execute({ id: user.id });
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete user');
    }
  }

  // -------------------------------------------------------------------------
  return (
    <div className="animate-fade-in stagger-1">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

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

      {error && (
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--danger)' }}>{error.message}</span>
            <button className="btn btn-secondary" onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      )}

      {/* Role summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {roleCounts.map(({ role, count }) => (
          <div key={role} className="glass-card" style={{ padding: '1.1rem', borderLeft: `3px solid ${ROLE_COLORS[role]}` }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
              {ROLE_LABELS[role]}
            </p>
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
            placeholder="Search users by name, email or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* User table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                  Loading users…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((user) => {
              const displayName = user.name ?? user.email;
              return (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, ${ROLE_COLORS[user.role]}88)`,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{displayName}</p>
                        <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail size={11} /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: `${ROLE_COLORS[user.role]}15`,
                        color: ROLE_COLORS[user.role],
                        border: `1px solid ${ROLE_COLORS[user.role]}30`,
                      }}
                    >
                      <Shield size={11} style={{ marginRight: '0.3rem' }} />
                      {user.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
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
                        onClick={() => handleDelete(user)}
                        disabled={deleteUser.loading}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '440px', padding: '2rem', margin: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '1.5rem' }}>{editTarget ? 'Edit User' : 'Add New User'}</h2>

            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                className="input-field"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address *</label>
              <input
                className="input-field"
                type="email"
                placeholder="email@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Role</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {ROLE_ORDER.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]} ({role})
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">
                {editTarget ? 'New Password (leave blank to keep current)' : 'Password *'}
              </label>
              <input
                className="input-field"
                type="password"
                placeholder={editTarget ? 'Leave empty to keep current' : 'At least 8 characters'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {formError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{formError}</div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={createUser.loading || updateUser.loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={createUser.loading || updateUser.loading}
              >
                {createUser.loading || updateUser.loading ? (
                  <><Loader2 size={14} className="spin" /> Saving…</>
                ) : (
                  <><User size={14} /> {editTarget ? 'Save Changes' : 'Create User'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
