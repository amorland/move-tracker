'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';

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

  if (loading || !settings) return <div className="text-gray">Loading timeline...</div>;

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
    { label: 'Planning & Prep', icon: <Clock size={20} />, filter: (d: number) => d <= -60 },
    { label: 'One Month Out', icon: <CalendarIcon size={20} />, filter: (d: number) => d > -60 && d <= -30 },
    { label: 'Final Countdown', icon: <Clock size={20} />, filter: (d: number) => d > -30 && d < 0 },
    { label: 'Move Day', icon: <CheckCircle2 size={20} />, filter: (d: number) => d === 0 },
    { label: 'Welcome Home', icon: <CalendarIcon size={20} />, filter: (d: number) => d > 0 }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Move Timeline</h1>
          <p className="text-gray text-sm">Target Date: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{format(moveDate, 'PPP')}</span></p>
        </div>
      </div>

      <div className="flex flex-col gap-12" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: '19px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--border)', zIndex: 0 }}></div>
        
        {windows.map(window => {
          const tasksInWindow = tasksWithDates.filter(t => {
            if (!t.calculatedDate) return false;
            const diff = differenceInDays(t.calculatedDate, moveDate);
            return window.filter(diff);
          });

          if (tasksInWindow.length === 0) return null;

          return (
            <div key={window.label} style={{ position: 'relative', zIndex: 1, paddingLeft: '56px' }}>
              <div style={{ 
                position: 'absolute', 
                left: '0', 
                top: '0', 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: 'white', 
                border: '2px solid var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--primary)',
                boxShadow: '0 0 0 4px #f8fafc'
              }}>
                {window.icon}
              </div>
              
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800 }}>{window.label}</h2>
              
              <div className="flex flex-col gap-2">
                {tasksInWindow.map(task => (
                  <div key={task.id} className="card" style={{ padding: '14px 20px', margin: 0, backgroundColor: task.status === 'Complete' ? '#f8fafc' : 'white', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronRight size={16} className={task.status === 'Complete' ? 'text-gray' : 'text-primary'} />
                        <div>
                          <div style={{ fontWeight: 600, color: task.status === 'Complete' ? 'var(--secondary)' : 'var(--foreground)' }}>{task.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 500 }}>
                            {task.calculatedDate ? format(task.calculatedDate, 'MMM d') : 'Flexible'} • {data.categories.find(c => c.id === task.categoryId)?.name}
                          </div>
                        </div>
                      </div>
                      {task.status === 'Complete' && <CheckCircle2 size={18} className="text-green" style={{ color: '#22c55e' }} />}
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
