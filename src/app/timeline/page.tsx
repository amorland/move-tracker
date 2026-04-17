'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, ChevronRight, Calendar as CalendarIcon, MapPin, Star } from 'lucide-react';
import { getMilestones } from '@/lib/dateUtils';

export default function TimelinePage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [loading, setLoading] = useState(true);

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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Preparing Starland timeline...</div>;

  const moveDate = parseISO(settings.confirmedMoveDate || settings.earliestMoveDate);

  const getTaskDate = (task: Task) => {
    if (task.dueDate) return parseISO(task.dueDate);
    if (!settings) return null;
    const moveBaseDate = parseISO(settings.confirmedMoveDate || settings.earliestMoveDate);
    const closingDate = settings.closingDate ? parseISO(settings.closingDate) : null;

    let baseDate = moveBaseDate;
    if (task.timingType === 'Before Closing' || task.timingType === 'After Closing') {
      if (!closingDate) return null;
      baseDate = closingDate;
    }
    return addDays(baseDate, task.timingOffsetDays);
  };

  const tasksWithDates = data.tasks.map(t => ({
    ...t,
    calculatedDate: getTaskDate(t)
  })).sort((a, b) => {
    if (!a.calculatedDate) return 1;
    if (!b.calculatedDate) return -1;
    return a.calculatedDate.getTime() - b.calculatedDate.getTime();
  });

  const milestones = getMilestones(settings);
  const anchorDatesTimeline = milestones
    .filter(m => m.date)
    .map(m => ({
      id: `anchor-${m.label}`,
      title: m.label,
      calculatedDate: parseISO(m.date!),
      type: 'anchor',
      status: m.status
    }));

  const allTimelineItems = [
    ...tasksWithDates.map(t => ({ ...t, type: 'task' })),
    ...anchorDatesTimeline
  ].sort((a, b) => {
    if (!a.calculatedDate) return 1;
    if (!b.calculatedDate) return -1;
    return a.calculatedDate.getTime() - b.calculatedDate.getTime();
  });

  const windows = [
    { label: 'Strategy', filter: (d: number) => d <= -60, icon: 'assignment' },
    { label: 'Packing', filter: (d: number) => d > -60 && d <= -14, icon: 'package_2' },
    { label: 'Transit', filter: (d: number) => d > -14 && d < 0, icon: 'local_shipping' },
    { label: 'Move Day', filter: (d: number) => d === 0, icon: 'local_shipping' },
    { label: 'Settling', filter: (d: number) => d > 0, icon: 'celebration' }
  ];

  return (
    <div style={{ width: '100%', paddingBottom: '80px' }}>
      <div className="flex flex-stack items-center justify-between mb-16">
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
            <h1 style={{ marginBottom: '4px' }}>Starland Timeline</h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Chronological Roadmap
            </p>
          </div>
        </div>
        <div className="badge badge-info" style={{ height: '48px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: 'var(--radius)', fontSize: '14px', background: 'var(--accent-soft)', color: 'var(--foreground)', border: 'none' }}>
           <CalendarIcon size={18} />
           <span style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{format(moveDate, 'MMMM d, yyyy').toUpperCase()}</span>
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: '64px' }}>
        {/* Central Vertical Connector */}
        <div style={{ 
          position: 'absolute', 
          left: '26px', 
          top: '0', 
          bottom: '0', 
          width: '2px', 
          background: 'var(--border)',
          opacity: 0.8
        }}></div>

        {windows.map((window) => {
          const itemsInWindow = allTimelineItems.filter(item => {
            if (!item.calculatedDate) return false;
            const diff = differenceInDays(item.calculatedDate, moveDate);
            return window.filter(diff);
          });

          if (itemsInWindow.length === 0) return null;

          return (
            <div key={window.label} style={{ marginBottom: '80px' }}>
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
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--accent)' }}>{window.icon}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--foreground)', fontFamily: 'var(--font-headings)' }}>{window.label}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {itemsInWindow.map((item: any) => {
                  const isTask = item.type === 'task';
                  const isComplete = isTask && item.status === 'Complete';
                  const isAnchor = item.type === 'anchor';
                  const isConfirmed = item.status === 'confirmed';

                  return (
                    <div key={item.id} style={{ 
                      padding: isAnchor ? '24px 32px' : '20px 32px', 
                      borderRadius: 'var(--radius)',
                      background: isAnchor ? (isConfirmed ? 'var(--success-soft)' : '#fff') : (isComplete ? 'var(--background)' : 'white'),
                      border: isAnchor ? (isConfirmed ? '1px solid var(--border)' : '1px solid var(--border)') : (isComplete ? '1px solid transparent' : '1px solid var(--border)'),
                      boxShadow: (isAnchor || isComplete) ? 'none' : 'var(--shadow-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '24px',
                      opacity: isComplete ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: isAnchor ? '16px' : '15px', 
                          fontWeight: (isAnchor || !isComplete) ? 600 : 500, 
                          color: isComplete ? 'var(--text-secondary)' : 'var(--foreground)',
                          textDecoration: isComplete ? 'line-through' : 'none',
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          <CalendarIcon size={12} />
                          {format(item.calculatedDate, 'MMM d, yyyy')}
                          {isAnchor && item.status === 'estimated' && <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>ESTIMATED</span>}
                          {isAnchor && item.status === 'confirmed' && <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent)', color: 'white', fontWeight: 700 }}>CONFIRMED</span>}
                        </div>
                      </div>
                      {isComplete && (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '16px', fontWeight: 'bold' }}>done</span>
                        </div>
                      )}
                      {isAnchor && <span className="material-symbols-outlined" style={{ color: isConfirmed ? 'var(--accent)' : 'var(--border)', fontSize: '24px' }}>event_available</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
