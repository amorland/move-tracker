'use client';

import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CheckCircle2, Edit3 } from 'lucide-react';
import { Milestone } from '@/lib/dateUtils';

interface MilestoneGridProps {
  milestones: Milestone[];
  onEdit: (key: string, label: string) => void;
}

export default function MilestoneGrid({ milestones, onEdit }: MilestoneGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
      {milestones.map((ad) => (
        <div 
          key={ad.key} 
          onClick={() => onEdit(ad.key, ad.label)}
          style={{ 
            padding: '20px', 
            borderRadius: '16px', 
            background: ad.status === 'confirmed' ? 'var(--success-soft)' : ad.status === 'estimated' ? 'rgba(0, 95, 184, 0.03)' : '#fcfcfd',
            border: ad.status === 'confirmed' ? '2px solid rgba(26, 138, 95, 0.1)' : ad.status === 'estimated' ? '2px solid rgba(0, 95, 184, 0.08)' : '2px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }} className="card-hover-effect">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: ad.status === 'confirmed' ? 'var(--success)' : ad.status === 'estimated' ? 'transparent' : '#e2e8f0',
                border: ad.status === 'confirmed' ? 'none' : ad.status === 'estimated' ? '1.5px solid #94a3b8' : 'none'
              }}></div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: ad.status === 'confirmed' ? 'var(--success)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{ad.label}</div>
            </div>
            <Edit3 size={10} color="#cbd5e1" />
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: ad.status === 'unset' ? '#cbd5e1' : 'var(--foreground)' }}>
            {ad.date ? format(parseISO(ad.date), 'MMM d, yyyy') : 'TBD'}
          </div>
          {ad.status === 'confirmed' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '10px', fontWeight: 800, marginTop: '2px' }}>
              <CheckCircle2 size={12} fill="var(--success-soft)" /> CONFIRMED
            </div>
          ) : ad.status === 'estimated' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
              <Clock size={12} /> ESTIMATED
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
              <Clock size={12} /> NOT SET
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
