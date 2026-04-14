"use client";

import React, { useState } from 'react';
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
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import PrismLogo from './PrismLogo';

const MENU_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: '🛠️ Engineering',
    items: [
      { name: 'Master BOMs', href: '/inventory/boms', icon: Layers },
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
      { name: 'Workflow Rules', href: '/admin/workflows', icon: Settings },
      { name: 'Audit Logs', href: '/audit', icon: ClipboardList },
      { name: 'Users & Roles', href: '/admin/users', icon: Users },
      { name: 'System Settings', href: '/admin/settings', icon: Settings },
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [brandName, setBrandName] = React.useState('EF Prism');
  const [brandLogo, setBrandLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const savedName = localStorage.getItem('QMS_APP_NAME');
    const savedLogo = localStorage.getItem('QMS_APP_LOGO');
    if (savedName) setBrandName(savedName);
    if (savedLogo) setBrandLogo(savedLogo);
  }, []);

  const userName = session?.user?.name ?? 'User';
  const userRole = (session?.user as any)?.role ?? '';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside 
      className="sidebar" 
      style={{ 
        width: isCollapsed ? '76px' : '260px',
        transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: isCollapsed ? '1.5rem 0.5rem' : '1.5rem 1.5rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
        {!isCollapsed && (
          <div>
            <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
              {brandLogo ? (
                 <img src={brandLogo} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              ) : (
                 <PrismLogo size={28} />
              )}
              {brandName}
            </h1>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'grid', placeItems: 'center' }}
        >
          {isCollapsed ? <ChevronRight size={22} color="var(--accent-primary)" /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="custom-scrollbar" style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {MENU_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: isCollapsed ? '1rem' : '0.5rem' }}>
            {!isCollapsed && (
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
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ 
                    fontSize: '0.875rem', 
                    padding: isCollapsed ? '0.75rem 0' : '0.6rem 1.25rem',
                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                  }}
                >
                  <item.icon size={20} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: isCollapsed ? '1.25rem 0.5rem' : '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, justifyContent: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '0.875rem', flexShrink: 0, color: 'white' }}>
            {userInitial}
          </div>
          {!isCollapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {ROLE_LABELS[userRole] ?? userRole}
              </p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', gap: '0.5rem' }}>
          {!isCollapsed && <ThemeToggle />}
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
