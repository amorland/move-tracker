'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { MapPin, Star, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading your move overview...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  // Refined Move Stages with better semantic icons
  const stages = [
    { name: 'Strategy', status: progress > 15 ? 'complete' : 'current', icon: 'assignment' },
    { name: 'Packing', status: progress > 50 ? 'complete' : progress > 15 ? 'current' : 'pending', icon: 'package_2' },
    { name: 'Transit', status: progress > 85 ? 'complete' : progress > 50 ? 'current' : 'pending', icon: 'local_shipping' },
    { name: 'Settling', status: progress === 100 ? 'complete' : progress > 85 ? 'current' : 'pending', icon: 'celebration' }
  ];

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Overview</h1>
      <p className="section-subtitle">Everything for Andrew & Tory's move to Cold Spring.</p>
      
      {/* Visual Progression Section */}
      <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div className="flex items-center" style={{ width: '100%', marginBottom: '48px', justifyContent: 'center' }}>
          {stages.map((stage, idx) => (
            <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: idx === stages.length - 1 ? 'none' : 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div className={`progress-node ${stage.status === 'complete' ? 'complete' : stage.status === 'current' ? 'current' : ''}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{stage.icon}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: stage.status === 'pending' ? 'var(--text-secondary)' : 'var(--foreground)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{stage.name}</span>
              </div>
              {idx < stages.length - 1 && <div className={`progress-connector ${stage.status === 'complete' ? 'filled' : ''}`}></div>}
            </div>
          ))}
        </div>

        <div className="flex flex-stack justify-between items-end">
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.05em' }}>OVERALL PROGRESS</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--foreground)' }}>{progress}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
              {daysToMove > 0 ? `${daysToMove} Days Left` : daysToMove === 0 ? "Today's the Day!" : 'Welcome Home!'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
              {format(parseISO(moveDate), 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-stack gap-8" style={{ marginTop: '32px' }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star size={18} fill="#f1c40f" color="#f1c40f" />
              Focus Tasks
            </h2>
            <Link href="/tasks" className="badge badge-info" style={{ textDecoration: 'none' }}>View All</Link>
          </div>
          <div className="flex flex-col gap-1">
            {data.tasks.filter(t => t.status !== 'Complete').slice(0, 4).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.3 }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{data.categories.find(c => c.id === task.categoryId)?.name}</div>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{task.owner}</span>
              </div>
            ))}
            {data.tasks.filter(t => t.status !== 'Complete').length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <CheckCircle2 size={32} color="var(--success)" style={{ opacity: 0.2, marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>All priority tasks are complete.</div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ width: '340px', flexShrink: 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={18} color="var(--accent)" />
            Relocation
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '2px', background: 'var(--border)', borderRadius: '1px' }}></div>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>From</div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Clearwater, FL</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>805 S Hercules Ave</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>To</div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Cold Spring, NY</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>25 Chestnut St</div>
              </div>
            </div>
            <div style={{ marginTop: '8px', padding: '16px', background: 'var(--accent-soft)', borderRadius: '8px' }}>
               <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase' }}>Household</div>
               <div className="flex items-center gap-3">
                 <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>A</div>
                 <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>T</div>
                 <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>Andrew & Tory</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
