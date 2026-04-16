'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task } from '@/lib/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { MapPin, Calendar as CalendarIcon, CheckCircle2, Clock, Star } from 'lucide-react';
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

  if (loading || !settings) return <div className="text-gray">Loading dashboard...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  return (
    <div>
      <h1>Dashboard</h1>
      
      <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="card flex-1" style={{ minWidth: '300px' }}>
          <div className="flex items-center gap-2 text-gray mb-3">
            <MapPin size={18} />
            <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Route Details</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '18px', fontWeight: 700 }}>Clearwater</span>
            <div style={{ height: '2px', flex: 1, backgroundColor: 'var(--border)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-7px', right: '0' }}>✈️</div>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>Cold Spring</span>
          </div>
          <div className="mt-4">
            {settings.confirmedMoveDate ? (
              <div className="badge badge-green">Confirmed: {format(parseISO(settings.confirmedMoveDate), 'MMM d, yyyy')}</div>
            ) : (
              <div className="badge badge-blue">Window: {format(parseISO(settings.earliestMoveDate), 'MMM d')} – {format(parseISO(settings.latestMoveDate), 'MMM d, yyyy')}</div>
            )}
          </div>
        </div>

        <div className="card flex-1" style={{ minWidth: '300px' }}>
          <div className="flex items-center gap-2 text-gray mb-3">
            <Clock size={18} />
            <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Timeline</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>
            {daysToMove > 0 ? `${daysToMove} Days Left` : daysToMove === 0 ? "It's Move Day!" : 'Welcome Home!'}
          </div>
          <p className="text-sm text-gray mt-1">Based on {settings.confirmedMoveDate ? 'confirmed' : 'earliest'} move date</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-primary" />
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Move Progress</span>
          </div>
          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{progress}%</span>
        </div>
        <div style={{ background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ 
            background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)', 
            height: '100%', 
            width: `${progress}%`, 
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '5px'
          }}></div>
        </div>
        <div className="flex justify-between mt-3 text-sm font-medium">
          <span className="text-gray">{completedTasks} tasks finished</span>
          <span className="text-gray">{totalTasks - completedTasks} remaining</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-10 mb-6">
        <h2 style={{ margin: 0 }}>Priority Next Steps</h2>
        <Link href="/tasks" className="btn btn-secondary gap-2" style={{ fontSize: '12px' }}>
          View All <Star size={14} />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {data.tasks.filter(t => t.status !== 'Complete').slice(0, 4).map(task => (
          <div key={task.id} className="card" style={{ padding: '16px 20px', margin: 0 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
                <span style={{ fontWeight: 600 }}>{task.title}</span>
              </div>
              <div className="badge badge-gray" style={{ fontSize: '10px' }}>{data.categories.find(c => c.id === task.categoryId)?.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
