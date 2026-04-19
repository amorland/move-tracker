'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const MoveMap = dynamic(() => import('@/components/MoveMap'), { 
  ssr: false,
  loading: () => (
    <div style={{ height: '600px', background: '#f8f9fa', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dee2e6' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#5c6063' }}>Loading Interactive Map...</div>
      </div>
    </div>
  )
});

export default function MapPage() {
  return (
    <div>
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>The Route</h1>
          <p className="page-subtitle">Map the drive north and plan who rides where</p>
        </div>
        <Link href="/drive-plan" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
          Open Drive Plan
        </Link>
      </div>

      <div style={{ height: 'calc(100vh - 260px)' }}>
        <MoveMap />
      </div>
    </div>
  );
}
