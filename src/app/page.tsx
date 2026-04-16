'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task } from '@/lib/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Home, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
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

  if (loading || !settings) return <div>Loading...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  return (
    <div>
      <h1>Dashboard</h1>
      
      <div className="flex gap-4 mb-4">
        <div className="card flex-1">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Home size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Move Window</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 600 }}>Clearwater, FL</span>
            <ArrowRight size={16} />
            <span style={{ fontWeight: 600 }}>Cold Spring, NY</span>
          </div>
          <div className="mt-4 text-sm">
            {settings.confirmedMoveDate ? (
              <div className="badge badge-green">Confirmed: {format(parseISO(settings.confirmedMoveDate), 'MMM d, yyyy')}</div>
            ) : (
              <div className="badge badge-blue">Window: {format(parseISO(settings.earliestMoveDate), 'MMM d')} – {format(parseISO(settings.latestMoveDate), 'MMM d, yyyy')}</div>
            )}
          </div>
        </div>

        <div className="card flex-1">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Clock size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Countdown</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>
            {daysToMove > 0 ? `${daysToMove} days to go` : daysToMove === 0 ? 'Today is the day!' : 'Moved!'}
          </div>
          <p className="text-sm text-gray-600">Based on {settings.confirmedMoveDate ? 'confirmed' : 'earliest'} move date</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-blue" />
            <span style={{ fontWeight: 600 }}>Overall Progress</span>
          </div>
          <span style={{ fontWeight: 600 }}>{progress}%</span>
        </div>
        <div style={{ background: 'var(--gray-100)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--blue)', height: '100%', width: `${progress}%`, transition: 'width 0.5s' }}></div>
        </div>
        <p className="mt-4 text-sm text-gray-600">{completedTasks} of {totalTasks} tasks completed</p>
      </div>

      <h2>Priority Tasks</h2>
      <div className="flex flex-col gap-2">
        {data.tasks.filter(t => t.status !== 'Complete').slice(0, 5).map(task => (
          <div key={task.id} className="card" style={{ padding: '12px 16px', marginBottom: '8px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-gray-600" />
                <span>{task.title}</span>
              </div>
              <div className="badge badge-gray">{data.categories.find(c => c.id === task.categoryId)?.name}</div>
            </div>
          </div>
        ))}
        <Link href="/tasks" className="text-blue text-sm font-medium mt-2 hover:underline">View all tasks →</Link>
      </div>
    </div>
  );
}
