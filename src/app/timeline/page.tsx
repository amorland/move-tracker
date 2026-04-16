'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, PlayCircle, Circle, ChevronDown } from 'lucide-react';

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

  if (loading || !settings) return <div style={{ color: '#949a9f' }}>Loading Pipeline Graph...</div>;

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
    { label: 'Initialization', filter: (d: number) => d <= -60 },
    { label: 'Strategic Planning', filter: (d: number) => d > -60 && d <= -30 },
    { label: 'Final Build', filter: (d: number) => d > -30 && d < 0 },
    { label: 'Deployment (Move Day)', filter: (d: number) => d === 0 },
    { label: 'Post-Deployment', filter: (d: number) => d > 0 }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Pipeline Graph</h1>
          <p style={{ color: '#949a9f', fontSize: '14px' }}>
            Build Status: <span style={{ color: 'var(--jenkins-green)', fontWeight: 700 }}>STABLE</span> • Target: {format(moveDate, 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {windows.map((window, wIdx) => {
          const tasksInWindow = tasksWithDates.filter(t => {
            if (!t.calculatedDate) return false;
            const diff = differenceInDays(t.calculatedDate, moveDate);
            return window.filter(diff);
          });

          if (tasksInWindow.length === 0) return null;

          const isSuccess = tasksInWindow.every(t => t.status === 'Complete');
          const isInProgress = tasksInWindow.some(t => t.status === 'In Progress') || (!isSuccess && tasksInWindow.some(t => t.status === 'Not Started'));

          return (
            <div key={window.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
                   <div className={`pipeline-node ${isSuccess ? 'success' : 'in-progress'}`} style={{ width: '24px', height: '24px' }}>
                     {isSuccess ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
                   </div>
                   {wIdx < windows.length - 1 && <div style={{ width: '2px', height: '40px', background: 'var(--border)', margin: '4px 0' }}></div>}
                </div>
                
                <div style={{ flex: 1, marginBottom: '20px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    {window.label}
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#949a9f' }}>({tasksInWindow.length} STEPS)</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {tasksInWindow.map(task => (
                      <div key={task.id} className="card" style={{ padding: '10px 16px', margin: 0, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {task.status === 'Complete' ? <CheckCircle2 size={14} color="var(--jenkins-green)" /> : <PlayCircle size={14} color="var(--jenkins-blue)" />}
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{task.title}</div>
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
