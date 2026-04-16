'use client';

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckCircle, Calendar, FileText, Settings as SettingsIcon, LogOut, Home } from "lucide-react";

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
        <head>
          <title>Login | Starland Move Tracker</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        </head>
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>Starland Move Tracker</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body>
        <header className="header">
          <div className="header-logo">
            <Home size={22} strokeWidth={2.5} />
            <span>STARLAND MOVE TRACKER</span>
          </div>
        </header>
        <div className="app-container">
          <aside className="sidebar">
            <div style={{ padding: '0 16px', marginBottom: '24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px' }}>
              ANDREW & TORY'S MOVE
            </div>
            <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </Link>
            <Link href="/tasks" className={`nav-item ${pathname === '/tasks' ? 'active' : ''}`}>
              <CheckCircle size={18} />
              <span>Tasks</span>
            </Link>
            <Link href="/timeline" className={`nav-item ${pathname === '/timeline' ? 'active' : ''}`}>
              <Calendar size={18} />
              <span>Timeline</span>
            </Link>
            <Link href="/documents" className={`nav-item ${pathname === '/documents' ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Documents</span>
            </Link>
            <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
              <SettingsIcon size={18} />
              <span>Settings</span>
            </Link>
            <div style={{ flex: 1 }}></div>
            <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <LogOut size={18} />
              <span>Logout</span>
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
