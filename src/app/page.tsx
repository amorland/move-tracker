'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task } from '@/lib/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import Link from 'next/link';

export default function Dashboard() {
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

  if (loading || !settings) return <div style={{ color: '#5f6368' }}>Loading Dashboard...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  return (
    <div>
      <h1>Dashboard</h1>
      
      <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 300px' }}>
          <div className="card-title">
            <span className="material-symbols-outlined" style={{ color: '#1a73e8' }}>location_on</span>
            Move Window
          </div>
          <div className="flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 500, color: '#3c4043' }}>
            Clearwater
            <span className="material-symbols-outlined" style={{ color: '#5f6368' }}>arrow_forward</span>
            Cold Spring
          </div>
          <div className="mt-4">
            {settings.confirmedMoveDate ? (
              <div className="badge badge-green">Confirmed: {format(parseISO(settings.confirmedMoveDate), 'MMM d, yyyy')}</div>
            ) : (
              <div className="badge badge-blue">Window: {format(parseISO(settings.earliestMoveDate), 'MMM d')} – {format(parseISO(settings.latestMoveDate), 'MMM d, yyyy')}</div>
            )}
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 300px' }}>
          <div className="card-title">
            <span className="material-symbols-outlined" style={{ color: '#d93025' }}>schedule</span>
            Countdown
          </div>
          <div style={{ fontSize: '28px', fontWeight: 500, color: '#202124' }}>
            {daysToMove > 0 ? `${daysToMove} Days` : daysToMove === 0 ? "Move Day" : 'Completed'}
          </div>
          <div style={{ color: '#5f6368', fontSize: '14px', marginTop: '4px' }}>
            Until {settings.confirmedMoveDate ? 'confirmed' : 'estimated'} date
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span className="material-symbols-outlined" style={{ color: '#1e8e3e' }}>assignment_turned_in</span>
          Move Progress
        </div>
        <div className="flex justify-between items-center mb-2">
          <span style={{ fontSize: '14px', color: '#5f6368' }}>{completedTasks} of {totalTasks} tasks completed</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e8e3e' }}>{progress}%</span>
        </div>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%`, backgroundColor: '#1e8e3e' }}></div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 style={{ margin: 0 }}>Upcoming Tasks</h2>
        <Link href="/tasks" style={{ color: '#1a73e8', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>View all</Link>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #dadce0', overflow: 'hidden' }}>
        {data.tasks.filter(t => t.status !== 'Complete').slice(0, 5).map((task, idx) => (
          <div key={task.id} style={{ 
            padding: '12px 16px', 
            borderBottom: idx === 4 ? 'none' : '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <span className="material-symbols-outlined" style={{ color: '#5f6368', fontSize: '20px' }}>radio_button_unchecked</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{task.title}</div>
              <div style={{ fontSize: '12px', color: '#5f6368' }}>{data.categories.find(c => c.id === task.categoryId)?.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
