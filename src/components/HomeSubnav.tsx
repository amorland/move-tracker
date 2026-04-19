'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HOME_NAV = [
  { href: '/home', label: 'Overview' },
  { href: '/home/timeline', label: 'Timeline' },
  { href: '/home/tasks', label: 'Tasks' },
  { href: '/home/documents', label: 'Documents' },
  { href: '/home/rooms', label: 'Rooms' },
  { href: '/home/projects', label: 'Projects' },
];

export default function HomeSubnav() {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
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
  );
}
