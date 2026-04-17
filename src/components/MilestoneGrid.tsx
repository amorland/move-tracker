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
            padding: '24px', 
            borderRadius: 'var(--radius)', 
            background: ad.status === 'confirmed' ? 'var(--success-soft)' : ad.status === 'estimated' ? 'var(--accent-soft)' : '#fff',
            border: ad.status === 'confirmed' ? '1px solid rgba(107, 142, 123, 0.2)' : ad.status === 'estimated' ? '1px solid rgba(212, 122, 106, 0.15)' : '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            boxShadow: ad.status === 'unset' ? 'none' : 'var(--shadow-sm)'
          }} className="card-hover-effect">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: ad.status === 'confirmed' ? 'var(--success)' : ad.status === 'estimated' ? 'var(--accent)' : 'transparent',
                border: ad.status === 'confirmed' ? 'none' : ad.status === 'estimated' ? 'none' : '1.5px solid var(--text-secondary)'
              }}></div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: ad.status === 'confirmed' ? 'var(--success)' : ad.status === 'estimated' ? 'var(--accent)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-headings)' }}>{ad.label}</div>
            </div>
            <Edit3 size={12} color="var(--text-secondary)" opacity={0.4} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: ad.status === 'unset' ? 'var(--text-secondary)' : 'var(--foreground)', opacity: ad.status === 'unset' ? 0.5 : 1 }}>
            {ad.date ? format(parseISO(ad.date), 'MMM d, yyyy') : 'TBD'}
          </div>
          {ad.status === 'confirmed' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>
              <CheckCircle2 size={14} fill="var(--success-soft)" /> CONFIRMED
            </div>
          ) : ad.status === 'estimated' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>
              <Clock size={14} /> ESTIMATED
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, marginTop: '2px', opacity: 0.6 }}>
              <Clock size={14} /> NOT SET
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
