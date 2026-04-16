'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';

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

  if (loading || !settings) return <div style={{ color: '#5f6368' }}>Loading Timeline...</div>;

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
    { label: '90+ Days Out', filter: (d: number) => d <= -90, color: '#1a73e8' },
    { label: '60 Days Out', filter: (d: number) => d > -90 && d <= -60, color: '#1a73e8' },
    { label: '30 Days Out', filter: (d: number) => d > -60 && d <= -30, color: '#1a73e8' },
    { label: '2 Weeks Out', filter: (d: number) => d > -30 && d <= -14, color: '#1a73e8' },
    { label: '1 Week Out', filter: (d: number) => d > -14 && d < 0, color: '#1a73e8' },
    { label: 'Move Day', filter: (d: number) => d === 0, color: '#d93025' },
    { label: 'Post-Move', filter: (d: number) => d > 0, color: '#1e8e3e' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1>Timeline</h1>
        <div className="badge badge-blue">
          Move Date: {format(moveDate, 'PPP')}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ 
          position: 'absolute', 
          left: '11px', 
          top: '0', 
          bottom: '0', 
          width: '2px', 
          background: '#f1f3f4' 
        }}></div>

        {windows.map(window => {
          const tasksInWindow = tasksWithDates.filter(t => {
            if (!t.calculatedDate) return false;
            const diff = differenceInDays(t.calculatedDate, moveDate);
            return window.filter(diff);
          });

          if (tasksInWindow.length === 0) return null;

          return (
            <div key={window.label} style={{ marginBottom: '40px', position: 'relative', paddingLeft: '40px' }}>
              <div style={{ 
                position: 'absolute', 
                left: '0', 
                top: '4px', 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                background: 'white', 
                border: `2px solid ${window.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: window.color }}></div>
              </div>

              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500, color: window.color }}>
                {window.label}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {tasksInWindow.map(task => (
                  <div key={task.id} className="card" style={{ margin: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ 
                      fontSize: '20px', 
                      color: task.status === 'Complete' ? '#1e8e3e' : '#5f6368' 
                    }}>
                      {task.status === 'Complete' ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 500,
                        textDecoration: task.status === 'Complete' ? 'line-through' : 'none',
                        color: task.status === 'Complete' ? '#5f6368' : '#202124'
                      }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5f6368' }}>
                        {task.calculatedDate ? format(task.calculatedDate, 'MMM d') : 'Flexible'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
