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

  if (loading || !settings) return <div>Loading...</div>;

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
    { label: '90+ Days Out', filter: (d: number) => d <= -90 },
    { label: '60 Days Out', filter: (d: number) => d > -90 && d <= -60 },
    { label: '30 Days Out', filter: (d: number) => d > -60 && d <= -30 },
    { label: '2 Weeks Out', filter: (d: number) => d > -30 && d <= -14 },
    { label: '1 Week Out', filter: (d: number) => d > -14 && d < 0 },
    { label: 'Move Day', filter: (d: number) => d === 0 },
    { label: 'Post-Move', filter: (d: number) => d > 0 }
  ];

  return (
    <div>
      <h1>Timeline</h1>
      <p className="mb-8 text-gray-600">
        Tasks anchored to {settings.confirmedMoveDate ? 'confirmed move date' : 'earliest move date'}: 
        <strong> {format(moveDate, 'PPP')}</strong>
      </p>

      {windows.map(window => {
        const tasksInWindow = tasksWithDates.filter(t => {
          if (!t.calculatedDate) return false;
          const diff = differenceInDays(t.calculatedDate, moveDate);
          return window.filter(diff);
        });

        if (tasksInWindow.length === 0) return null;

        return (
          <div key={window.label} className="mb-8">
            <h2 className="mb-4">{window.label}</h2>
            <div className="flex flex-col gap-2">
              {tasksInWindow.map(task => (
                <div key={task.id} className="card" style={{ padding: '12px 16px' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                        {task.calculatedDate ? format(task.calculatedDate, 'MMM d') : 'No date'} • {data.categories.find(c => c.id === task.categoryId)?.name}
                      </div>
                    </div>
                    <div className={`badge ${task.status === 'Complete' ? 'badge-green' : 'badge-gray'}`}>
                      {task.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
