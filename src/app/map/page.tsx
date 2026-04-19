'use client';

import dynamic from 'next/dynamic';

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
    <div style={{ height: 'calc(100vh - 260px)' }}>
      <MoveMap />
    </div>
  );
}
