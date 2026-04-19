'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, Package, Calendar, Map, LogOut, House
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV = [
  { href: '/',          label: 'Overview',   Icon: LayoutDashboard },
  { href: '/home/timeline', label: 'Home',   Icon: House           },
  { href: '/tasks',     label: 'Tasks',      Icon: CheckSquare     },
  { href: '/belongings',label: 'Belongings', Icon: Package         },
  { href: '/timeline',  label: 'Timeline',   Icon: Calendar        },
  { href: '/map',       label: 'Move Map',   Icon: Map             },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLogin = pathname === '/login';
  const isMap = pathname === '/map';

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth?action=logout', { method: 'POST', body: JSON.stringify({}) });
    router.push('/login');
    router.refresh();
  };

  if (isLogin) {
    return (
      <html lang="en">
        <head>
          <title>Login | Starland Move Tracker</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* Header */}
        <header className="app-header">
          {/* Mobile hamburger */}
          <button
            className="mobile-only btn btn-ghost"
            style={{ padding: '0 8px', height: 36 }}
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 20 }}>
              <div style={{ height: 2, background: 'var(--color-foreground)', borderRadius: 2, transition: 'all .2s', transform: sidebarOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
              <div style={{ height: 2, background: 'var(--color-foreground)', borderRadius: 2, opacity: sidebarOpen ? 0 : 1, transition: 'all .2s' }} />
              <div style={{ height: 2, background: 'var(--color-foreground)', borderRadius: 2, transition: 'all .2s', transform: sidebarOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
            </div>
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, border: '1.5px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--color-accent)', fontFamily: 'var(--font-sans)', lineHeight: 1 }}>SL</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1, color: 'var(--color-foreground)', fontFamily: 'var(--font-serif)' }}>Starland™ Moving</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Desktop logout */}
          <button onClick={handleLogout} className="desktop-only btn btn-ghost btn-sm" style={{ gap: 6, color: 'var(--color-secondary)' }}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </header>

        <div className="app-shell">
          {/* Sidebar overlay on mobile */}
          {sidebarOpen && (
            <div
              className="mobile-only"
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`sidebar desktop-only ${sidebarOpen ? 'open' : ''}`}>
            <div className="section-label" style={{ padding: '0 8px', marginBottom: 16 }}>Navigation</div>
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${pathname === href ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            <div style={{ flex: 1 }} />
            <div className="divider" style={{ margin: '16px 0' }} />
            <button onClick={handleLogout} className="nav-link" style={{ color: 'var(--color-secondary)' }}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </aside>

          {/* Mobile sidebar */}
          <aside className={`sidebar mobile-only ${sidebarOpen ? 'open' : ''}`} style={{ width: '80vw', zIndex: 50 }}>
            <div className="section-label" style={{ padding: '0 8px', marginBottom: 16 }}>Navigation</div>
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${pathname === href ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={handleLogout} className="nav-link" style={{ color: 'var(--color-secondary)' }}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </aside>

          <main className="main-content">
            {children}
            {!isMap && (
              <footer style={{ marginTop: 80, borderTop: '1px solid var(--color-border)', padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--color-secondary)', fontFamily: 'var(--font-serif)', letterSpacing: '0.04em', marginBottom: 8 }}>
                  Andrew · Tory · Remy · Winston · Harper
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-secondary)', opacity: 0.7, marginBottom: 14 }}>Clearwater, FL → Cold Spring, NY · Summer 2026</div>
                <div style={{ fontSize: 11, color: 'var(--color-secondary)', opacity: 0.55, fontStyle: 'italic', maxWidth: 420, margin: '0 auto', lineHeight: 1.6, padding: '0 16px' }}>Starland™ Moving is a Starland™ Enterprises production — incorporated 2017, licensed 2022.</div>
              </footer>
            )}
          </main>
        </div>

        {/* Bottom nav — mobile only */}
        <nav className="bottom-nav">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`bottom-nav-item ${pathname === href ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
