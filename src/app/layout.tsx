import './globals.css';
import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'ISO 9001:2015 QMS',
  description: 'Quality Management & Inventory System Compliant with ISO 9001:2015 standards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var localTheme = localStorage.getItem('qms-theme');
              if (localTheme) {
                document.documentElement.setAttribute('data-theme', localTheme);
              } else {
                document.documentElement.setAttribute('data-theme', 'light');
              }
            } catch (e) {}
          })();
        `}} />
      </head>
      <body>
        <SessionProvider>
          <AppShell>
            {children}
          </AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
