'use client';

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckSquare, Calendar, FileText, Settings as SettingsIcon, LogOut, Layout } from "lucide-react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const handleLogout = async () => {
    await fetch('/api/auth?action=logout', { method: 'POST', body: JSON.stringify({}) });
    router.push('/login');
    router.refresh();
  };

  if (isLoginPage) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="header-logo">
            <Layout size={24} color="#0070ff" fill="#0070ff" />
            <span>MOVE PIPELINE</span>
          </div>
        </header>
        <div className="app-container">
          <aside className="sidebar">
            <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              Overview
            </Link>
            <Link href="/tasks" className={`nav-item ${pathname === '/tasks' ? 'active' : ''}`}>
              <CheckSquare size={18} />
              Steps
            </Link>
            <Link href="/timeline" className={`nav-item ${pathname === '/timeline' ? 'active' : ''}`}>
              <Calendar size={18} />
              Pipeline
            </Link>
            <Link href="/documents" className={`nav-item ${pathname === '/documents' ? 'active' : ''}`}>
              <FileText size={18} />
              Artifacts
            </Link>
            <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
              <SettingsIcon size={18} />
              Configure
            </Link>
            <div style={{ flex: 1 }}></div>
            <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <LogOut size={18} />
              Logout
            </button>
          </aside>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
