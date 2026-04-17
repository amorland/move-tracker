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
            padding: '32px 24px', 
            borderRadius: 'var(--radius)', 
            background: ad.status === 'confirmed' ? 'var(--accent-soft)' : '#fff',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            boxShadow: ad.status === 'unset' ? 'none' : 'var(--shadow-sm)'
          }} className="card-hover-effect">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: ad.status === 'confirmed' ? 'var(--accent)' : 'transparent',
                border: ad.status === 'confirmed' ? 'none' : '1px solid var(--text-secondary)'
              }}></div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'var(--font-headings)' }}>{ad.label}</div>
            </div>
            <Edit3 size={10} color="var(--text-secondary)" opacity={0.3} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 500, color: ad.status === 'unset' ? 'var(--border)' : 'var(--foreground)', letterSpacing: '0.02em' }}>
            {ad.date ? format(parseISO(ad.date), 'MMM d, yyyy') : 'TBD'}
          </div>
          {ad.status === 'confirmed' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--foreground)', fontSize: '10px', fontWeight: 700, marginTop: '4px', letterSpacing: '0.05em' }}>
              <CheckCircle2 size={12} strokeWidth={2.5} /> CONFIRMED
            </div>
          ) : ad.status === 'estimated' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 600, marginTop: '4px', letterSpacing: '0.05em' }}>
              <Clock size={12} strokeWidth={2} /> ESTIMATED
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--border)', fontSize: '10px', fontWeight: 600, marginTop: '4px', letterSpacing: '0.05em' }}>
              <Clock size={12} strokeWidth={2} /> NOT SET
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
