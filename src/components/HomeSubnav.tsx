'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HOME_NAV = [
  { href: '/home', label: 'Overview' },
  { href: '/home/timeline', label: 'Timeline' },
  { href: '/home/tasks', label: 'Tasks' },
  { href: '/home/documents', label: 'Documents' },
  { href: '/home/rooms', label: 'Rooms' },
  { href: '/home/layout', label: 'Layout' },
  { href: '/home/projects', label: 'Projects' },
];

export default function HomeSubnav() {
  const pathname = usePathname();
  const current = HOME_NAV.find(item => item.href === pathname)?.label ?? 'Home';

  return (
    <div style={{ marginBottom: 24, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>Home Planning</div>
          <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>Currently viewing: <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>{current}</span></div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {HOME_NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`filter-chip ${active ? 'filter-chip-active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
