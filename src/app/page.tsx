'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, MapPin, Clock, ArrowRight, Star } from 'lucide-react';
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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)' }}>Loading your move overview...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  // Friendly Move Stages
  const stages = [
    { name: 'Plan', status: progress > 15 ? 'complete' : 'current', icon: 'list_alt' },
    { name: 'Pack', status: progress > 50 ? 'complete' : progress > 15 ? 'current' : 'pending', icon: 'inventory_2' },
    { name: 'Move', status: progress > 85 ? 'complete' : progress > 50 ? 'current' : 'pending', icon: 'local_shipping' },
    { name: 'Settle', status: progress === 100 ? 'complete' : progress > 85 ? 'current' : 'pending', icon: 'auto_awesome' }
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '40px' }}>Move Overview</h1>
      
      {/* Visual Progression Section */}
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="flex items-center" style={{ width: '100%', marginBottom: '48px', justifyContent: 'center' }}>
          {stages.map((stage, idx) => (
            <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: idx === stages.length - 1 ? 'none' : 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div className={`progress-node ${stage.status === 'complete' ? 'complete' : stage.status === 'current' ? 'current' : ''}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{stage.icon}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: stage.status === 'pending' ? 'var(--text-secondary)' : 'var(--foreground)', letterSpacing: '0.5px' }}>{stage.name}</span>
              </div>
              {idx < stages.length - 1 && <div className={`progress-connector ${stage.status === 'complete' ? 'filled' : ''}`}></div>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>CURRENT PROGRESS</div>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>{progress}% Done</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>{daysToMove > 0 ? `${daysToMove} Days to Go` : 'Moving Day!'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Target: {format(parseISO(moveDate), 'MMM d, yyyy')}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-8" style={{ marginTop: '40px' }}>
        <div className="card" style={{ flex: 1 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={18} fill="var(--warning)" color="var(--warning)" />
            Next Tasks
          </h2>
          <div className="flex flex-col gap-1">
            {data.tasks.filter(t => t.status !== 'Complete').slice(0, 4).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{task.title}</span>
                <span className="badge badge-neutral" style={{ marginLeft: 'auto', fontSize: '10px' }}>{task.owner}</span>
              </div>
            ))}
            <Link href="/tasks" className="btn btn-secondary" style={{ marginTop: '20px' }}>View All Tasks</Link>
          </div>
        </div>

        <div className="card" style={{ width: '320px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={18} color="var(--accent)" />
            Route
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>From</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Clearwater, FL</div>
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }}></div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>To</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Cold Spring, NY</div>
            </div>
            <div style={{ marginTop: '8px' }}>
               <div className="badge badge-info" style={{ width: '100%', justifyContent: 'center' }}>
                 Andrew & Wife
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
