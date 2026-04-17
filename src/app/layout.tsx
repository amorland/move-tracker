'use client';

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckCircle, Calendar, FileText, Settings as SettingsIcon, LogOut, Star, Menu, X, Map as MapIcon, Box } from "lucide-react";
import { useState, useEffect } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isLoginPage = pathname === '/login';

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body>
        <header className="header">
          <button 
            className="header-menu-btn" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ border: 'none', background: 'none', display: 'none' }}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="header-logo">
            <Star size={18} strokeWidth={2.5} fill="currentColor" />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '0.15em', fontFamily: 'var(--font-headings)' }}>Starland Moving</span>
              <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginTop: '2px' }}>EST. 2026 — RELOCATION HUB</span>
            </div>
          </div>
        </header>
        <div className="app-container">
          <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div style={{ padding: '0 16px', marginBottom: '28px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.12em', fontFamily: 'var(--font-headings)' }}>
              PERSONAL HUB
            </div>
            <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span>Overview</span>
            </Link>
            <Link href="/tasks" className={`nav-item ${pathname === '/tasks' ? 'active' : ''}`}>
              <CheckCircle size={18} />
              <span>Tasks</span>
            </Link>
            <Link href="/packing" className={`nav-item ${pathname === '/packing' ? 'active' : ''}`}>
              <Box size={18} />
              <span>Inventory List</span>
            </Link>
            <Link href="/timeline" className={`nav-item ${pathname === '/timeline' ? 'active' : ''}`}>
              <Calendar size={18} />
              <span>Timeline</span>
            </Link>
            <Link href="/map" className={`nav-item ${pathname === '/map' ? 'active' : ''}`}>
              <MapIcon size={18} />
              <span>Move Map</span>
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
