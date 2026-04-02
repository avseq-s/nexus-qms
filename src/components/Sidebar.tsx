"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  Users,
  ShieldAlert,
  PackageCheck,
  Cpu,
  Truck,
  Database,
  Building2,
  LogOut,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const MENU_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: '📥 Inward Flow',
    items: [
      { name: 'Purchase & POs', href: '/purchase', icon: FileText },
      { name: 'Suppliers & Vendors', href: '/purchase/suppliers', icon: Building2 },
      { name: 'Item Master Catalog', href: '/inventory/master', icon: Database },
      { name: 'Inventory & GRN', href: '/inventory', icon: Package },
      { name: 'IQC Inspection', href: '/quality/iqc', icon: ShieldCheck },
      { name: 'NCR & Rejections', href: '/quality/ncr', icon: AlertTriangle },
    ],
  },
  {
    label: '📤 Outward Flow',
    items: [
      { name: 'Kitting & EMS', href: '/kitting', icon: PackageCheck },
      { name: 'Programming & Testing', href: '/testing', icon: Cpu },
      { name: 'Dispatch / FG Store', href: '/dispatch', icon: Truck },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Document Control', href: '/documents', icon: FileText },
      { name: 'Audit Logs', href: '/audit', icon: ClipboardList },
      { name: 'Users & Roles', href: '/admin/users', icon: Users },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  QUALITY: 'Quality Inspector',
  STORE: 'Store Manager',
  PURCHASE: 'Purchase Team',
  PRODUCTION: 'Production',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? 'User';
  const userRole = (session?.user as any)?.role ?? '';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar" style={{ overflowY: 'auto' }}>
      <div style={{ padding: '1.5rem 1.5rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 700 }}>
          <ShieldCheck size={26} color="var(--accent-primary)" />
          Nexus QMS
        </h1>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          ISO 9001:2015 Compliant
        </p>
      </div>

      <nav style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
        {MENU_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: '0.5rem' }}>
            <div style={{
              padding: '0.5rem 1.25rem 0.25rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem' }}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '0.875rem', flexShrink: 0, color: 'white' }}>
            {userInitial}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {ROLE_LABELS[userRole] ?? userRole}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ThemeToggle />
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                display: 'grid',
                placeItems: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
