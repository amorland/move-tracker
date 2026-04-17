'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, ChevronRight, Calendar as CalendarIcon, MapPin, Heart } from 'lucide-react';
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
    <div style={{ width: '100%', paddingBottom: '60px' }}>
      <div className="flex flex-stack items-center justify-between mb-16">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '18px', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(212, 122, 106, 0.25)'
          }}>
            <Heart size={32} color="white" fill="white" />
          </div>
          <div>
            <h1 style={{ marginBottom: '2px' }}>Starland Timeline</h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '16px', fontWeight: 600 }}>
              Chronological roadmap of key dates and actions.
            </p>
          </div>
        </div>
        <div className="badge badge-info" style={{ height: '48px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '14px', fontSize: '15px' }}>
           <CalendarIcon size={18} />
           <span style={{ fontWeight: 700 }}>{format(moveDate, 'MMMM d, yyyy')}</span>
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: '56px' }}>
        {/* Central Vertical Connector */}
        <div style={{ 
          position: 'absolute', 
          left: '21px', 
          top: '0', 
          bottom: '0', 
          width: '3px', 
          background: 'var(--border)',
          opacity: 0.6
        }}></div>

        {windows.map((window) => {
          const itemsInWindow = allTimelineItems.filter(item => {
            if (!item.calculatedDate) return false;
            const diff = differenceInDays(item.calculatedDate, moveDate);
            return window.filter(diff);
          });

          if (itemsInWindow.length === 0) return null;

          return (
            <div key={window.label} style={{ marginBottom: '64px' }}>
              <div style={{ position: 'relative', marginBottom: '32px' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-56px', 
                  top: '0', 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '14px', 
                  background: 'white', 
                  border: '2.5px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  boxShadow: '0 0 0 6px var(--background)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--accent)' }}>{window.icon}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontFamily: 'var(--font-headings)' }}>{window.label}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {itemsInWindow.map((item: any) => {
                  const isTask = item.type === 'task';
                  const isComplete = isTask && item.status === 'Complete';
                  const isAnchor = item.type === 'anchor';
                  const isConfirmed = item.status === 'confirmed';

                  return (
                    <div key={item.id} style={{ 
                      padding: isAnchor ? '20px 24px' : '16px 24px', 
                      borderRadius: '16px',
                      background: isAnchor ? (isConfirmed ? 'var(--success-soft)' : '#fff') : (isComplete ? 'rgba(232, 224, 213, 0.2)' : 'white'),
                      border: isAnchor ? (isConfirmed ? '1px solid rgba(107, 142, 123, 0.2)' : '1px solid var(--border)') : (isComplete ? '1px solid transparent' : '1px solid var(--border)'),
                      boxShadow: (isAnchor || isComplete) ? 'none' : 'var(--shadow-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      opacity: isComplete ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: isAnchor ? '17px' : '15px', 
                          fontWeight: (isAnchor || !isComplete) ? 700 : 500, 
                          color: isComplete ? 'var(--text-secondary)' : 'var(--foreground)',
                          textDecoration: isComplete ? 'line-through' : 'none',
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CalendarIcon size={12} />
                          {format(item.calculatedDate, 'MMM d, yyyy')}
                          {isAnchor && item.status === 'estimated' && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', border: '1.5px solid var(--text-secondary)', color: 'var(--text-secondary)', fontWeight: 800 }}>ESTIMATED</span>}
                          {isAnchor && item.status === 'confirmed' && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'var(--success)', color: 'white', fontWeight: 800 }}>CONFIRMED</span>}
                        </div>
                      </div>
                      {isComplete && (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '16px', fontWeight: 'bold' }}>done</span>
                        </div>
                      )}
                      {isAnchor && <span className="material-symbols-outlined" style={{ color: isConfirmed ? 'var(--success)' : 'var(--text-secondary)', fontSize: '24px' }}>event_available</span>}
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
