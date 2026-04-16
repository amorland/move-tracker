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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Preparing your timeline...</div>;

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
    { label: 'Strategy', filter: (d: number) => d <= -60, icon: 'assignment' },
    { label: 'Packing', filter: (d: number) => d > -60 && d <= -14, icon: 'package_2' },
    { label: 'Transit', filter: (d: number) => d > -14 && d < 0, icon: 'local_shipping' },
    { label: 'Move Day', filter: (d: number) => d === 0, icon: 'local_shipping' },
    { label: 'Settling', filter: (d: number) => d > 0, icon: 'celebration' }
  ];

  return (
    <div>
      <div className="flex flex-stack items-center justify-between mb-12">
        <div>
          <h1>Timeline</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {tasksInWindow.map(task => (
                      <div key={task.id} className="card" style={{ 
                        margin: 0, 
                        padding: '16px 20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px', 
                        border: 'none', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        background: task.status === 'Complete' ? 'rgba(255,255,255,0.6)' : 'white',
                        transition: 'all 0.2s ease',
                        borderLeft: task.status === 'Complete' ? '4px solid var(--success)' : '4px solid var(--accent)'
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: task.status === 'Complete' ? 'var(--text-secondary)' : 'var(--foreground)',
                            textDecoration: task.status === 'Complete' ? 'line-through' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarIcon size={10} />
                            {task.calculatedDate ? format(task.calculatedDate, 'MMM d, yyyy') : 'Flexible'}
                          </div>
                        </div>
                        {task.status === 'Complete' && (
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 'bold' }}>done</span>
                          </div>
                        )}
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
