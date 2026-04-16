'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, ChevronRight, Calendar as CalendarIcon, MapPin } from 'lucide-react';

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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)' }}>Preparing your timeline...</div>;

  const moveDate = parseISO(settings.confirmedMoveDate || settings.earliestMoveDate);
  const closingDate = settings.closingDate ? parseISO(settings.closingDate) : null;

  const getTaskDate = (task: Task) => {
    if (task.dueDate) return parseISO(task.dueDate);
    let baseDate = moveDate;
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

  const windows = [
    { label: 'Initialization', filter: (d: number) => d <= -60, icon: 'edit_calendar' },
    { label: 'Strategic Planning', filter: (d: number) => d > -60 && d <= -30, icon: 'event_note' },
    { label: 'Final Countdown', filter: (d: number) => d > -30 && d < 0, icon: 'notifications_active' },
    { label: 'Move Day', filter: (d: number) => d === 0, icon: 'local_shipping' },
    { label: 'Settling In', filter: (d: number) => d > 0, icon: 'auto_awesome' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Move Timeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            A chronological view of your relocation journey.
          </p>
        </div>
        <div className="badge badge-info" style={{ height: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <CalendarIcon size={14} />
           {format(moveDate, 'MMMM d, yyyy')}
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        {/* Central Vertical Connector */}
        <div style={{ 
          position: 'absolute', 
          left: '35px', 
          top: '0', 
          bottom: '0', 
          width: '2px', 
          background: 'linear-gradient(180deg, var(--border) 0%, var(--border) 100%)',
          zIndex: 0 
        }}></div>

        {windows.map((window, wIdx) => {
          const tasksInWindow = tasksWithDates.filter(t => {
            if (!t.calculatedDate) return false;
            const diff = differenceInDays(t.calculatedDate, moveDate);
            return window.filter(diff);
          });

          if (tasksInWindow.length === 0) return null;

          const isComplete = tasksInWindow.every(t => t.status === 'Complete');

          return (
            <div key={window.label} style={{ marginBottom: '48px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px' }}>
                {/* Node */}
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: isComplete ? 'var(--success)' : 'white', 
                  border: isComplete ? 'none' : '2px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '4px',
                  boxShadow: '0 0 0 4px var(--background)'
                }}>
                  {isComplete && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white' }}>check</span>}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>{window.icon}</span>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{window.label}</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {tasksInWindow.map(task => (
                      <div key={task.id} className="card" style={{ 
                        margin: 0, 
                        padding: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        border: 'none', 
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        background: task.status === 'Complete' ? '#fdfdfe' : 'white',
                        opacity: task.status === 'Complete' ? 0.8 : 1
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: task.status === 'Complete' ? 'var(--success)' : 'var(--accent)' }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>{task.title}</div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {task.calculatedDate ? format(task.calculatedDate, 'MMM d') : 'Flexible'}
                          </div>
                        </div>
                        {task.status === 'Complete' && <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '18px' }}>check_circle</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
