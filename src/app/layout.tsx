'use client';

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckCircle, Calendar, FileText, Settings as SettingsIcon, LogOut, Home, Menu, X, Map as MapIcon, Box } from "lucide-react";
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
          <button 
            className="header-menu-btn" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ border: 'none', background: 'none', display: 'none' }}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="header-logo">
            <Home size={20} strokeWidth={3} />
            <span>STARLAND</span>
          </div>
        </header>
        <div className="app-container">
          <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div style={{ padding: '0 16px', marginBottom: '24px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              ANDREW & TORY
            </div>
            <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
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
