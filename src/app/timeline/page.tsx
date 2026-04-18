'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, ChevronRight, Calendar as CalendarIcon, MapPin, Star, Bell, Clock, X } from 'lucide-react';
import { getMilestones } from '@/lib/dateUtils';

export default function TimelinePage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/categories').then(res => res.json())
    ]).then(([settingsData, categoriesData]) => {
      setSettings(settingsData);
      setData(categoriesData);
      setLoading(false);
    });
  }, []);

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading Starland Timeline...</div>;

  const milestones = getMilestones(settings);
  const anchorDatesTimeline = milestones
    .filter(m => m.date)
    .map(m => ({
      id: `anchor-${m.label}`,
      title: m.label,
      calculatedDate: parseISO(m.date!),
      type: 'anchor',
      status: m.status,
      originalData: m
    }));

  const taskItems = data.tasks.flatMap(t => {
    const items = [];
    if (t.dueDate) {
      items.push({
        id: `task-${t.id}`,
        title: t.title,
        calculatedDate: parseISO(t.dueDate),
        type: t.timingType === 'Fixed' ? 'event' : 'task',
        status: t.status,
        originalData: t
      });
    }
    return items;
  });

  const allTimelineItems = [
    ...taskItems,
    ...anchorDatesTimeline
  ].sort((a, b) => a.calculatedDate.getTime() - b.calculatedDate.getTime());

  // Group chronologically by Month/Year
  const groupedItems = allTimelineItems.reduce((acc, item) => {
    const monthYear = format(item.calculatedDate, 'MMMM yyyy');
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <div className="flex flex-stack items-center justify-between" style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: 'var(--radius)', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Star size={32} color="white" fill="white" />
          </div>
          <div>
            <h1 style={{ marginBottom: '8px', letterSpacing: '0.02em' }}>Move Narrative</h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chronology</p>
          </div>
        </div>
      </div>

      {Object.keys(groupedItems).length === 0 ? (
        <div style={{ padding: '80px 32px', textAlign: 'center', background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <CalendarIcon size={48} color="var(--border)" style={{ margin: '0 auto 24px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Your timeline is empty. Set anchor dates or task due dates to build your roadmap.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '64px' }}>
          <div style={{ position: 'absolute', left: '26px', top: '0', bottom: '0', width: '2px', background: 'var(--border)', opacity: 0.8 }}></div>

          {Object.keys(groupedItems).map((monthYear) => (
            <div key={monthYear} style={{ marginBottom: '80px' }}>
              <div style={{ position: 'relative', marginBottom: '32px' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-64px', 
                  top: '0', 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '12px', 
                  background: '#fff', 
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <CalendarIcon size={24} color="var(--accent)" />
                </div>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--foreground)', fontFamily: 'var(--font-headings)' }}>{monthYear}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {groupedItems[monthYear].map((item) => (
                  <TimelineRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <TimelineDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

function TimelineRow({ item, onClick }: { item: any, onClick: () => void }) {
  const isComplete = item.status === 'Complete' || item.status === 'Resolved' || item.status === 'confirmed';
  const isEvent = item.type === 'event';
  const isAnchor = item.type === 'anchor';

  return (
    <div 
      onClick={onClick}
      style={{ 
        padding: '20px 24px', 
        borderRadius: 'var(--radius)',
        background: isEvent ? 'var(--accent-soft)' : '#fff',
        border: isEvent ? '1px solid var(--accent)' : '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        opacity: isComplete ? 0.7 : 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isEvent ? 'var(--shadow-sm)' : 'none'
      }} 
      className="task-row clickable"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isEvent && <Bell size={14} color="var(--accent)" />}
          {isAnchor && <MapPin size={14} color="var(--accent)" />}
          {item.title}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <CalendarIcon size={12} />
          {format(item.calculatedDate, 'MMM d, yyyy')}
          {item.timeWindow && (
            <>
              <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></div>
              <Clock size={12} /> {item.timeWindow}
            </>
          )}
          {isAnchor && item.status === 'estimated' && <span style={{ opacity: 0.6 }}>(ESTIMATED)</span>}
          {isAnchor && item.status === 'confirmed' && <span style={{ color: 'var(--accent)' }}>(CONFIRMED)</span>}
        </div>
      </div>
      <ChevronRight size={18} color="var(--border)" />
    </div>
  );
}

function TimelineDetailModal({ item, onClose }: { item: any, onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,42,38,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>DETAILS</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#fff' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}>Title</div>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>{item.title}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}>Schedule</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
              <CalendarIcon size={16} color="var(--accent)" />
              {format(item.calculatedDate, 'MMMM d, yyyy')}
              {item.timeWindow && <><Clock size={16} color="var(--accent)" /> {item.timeWindow}</>}
            </div>
          </div>
          {item.originalData.notes && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}>Notes</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{item.originalData.notes}</div>
            </div>
          )}
        </div>
        <div style={{ padding: '24px 32px', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
