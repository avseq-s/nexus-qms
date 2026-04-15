"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <div className="app-container">
      {!isLoginPage && <Sidebar />}
      <main 
        className="main-content" 
        style={{ 
          padding: isLoginPage ? '0' : undefined,
          background: isLoginPage ? 'var(--bg-primary)' : undefined
        }}
      >
        {children}
      </main>
    </div>
  );
}
