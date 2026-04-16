'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, Circle, PlayCircle, Clock } from 'lucide-react';
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

  if (loading || !settings) return <div style={{ color: '#949a9f' }}>Loading Pipeline Overview...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  // Simplified Pipeline Graph for Dashboard
  const stages = [
    { name: 'Planning', status: progress > 20 ? 'success' : 'in-progress' },
    { name: 'Packing', status: progress > 50 ? 'success' : progress > 20 ? 'in-progress' : 'pending' },
    { name: 'Transit', status: progress > 80 ? 'success' : progress > 50 ? 'in-progress' : 'pending' },
    { name: 'Settling', status: progress === 100 ? 'success' : progress > 80 ? 'in-progress' : 'pending' }
  ];

  return (
    <div>
      <h1>Pipeline Overview</h1>
      
      <div className="card" style={{ padding: '40px' }}>
        <div className="flex items-center" style={{ width: '100%', marginBottom: '40px' }}>
          {stages.map((stage, idx) => (
            <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: idx === stages.length - 1 ? 'none' : 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className={`pipeline-node ${stage.status}`}>
                  {stage.status === 'success' && <CheckCircle2 size={20} />}
                  {stage.status === 'in-progress' && <PlayCircle size={20} />}
                  {stage.status === 'pending' && <Circle size={20} />}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#949a9f', textTransform: 'uppercase' }}>{stage.name}</span>
              </div>
              {idx < stages.length - 1 && <div className="pipeline-line"></div>}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div>
            <div style={{ fontSize: '32px', fontWeight: 300 }}>{progress}% Successful</div>
            <div style={{ color: '#949a9f', fontSize: '14px' }}>{completedTasks} of {totalTasks} steps completed</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--jenkins-blue)' }}>T-Minus {daysToMove} Days</div>
            <div style={{ color: '#949a9f', fontSize: '14px' }}>Target: {format(parseISO(moveDate), 'MMM d, yyyy')}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="card" style={{ flex: 1 }}>
          <h2>Current Steps</h2>
          <div className="flex flex-col gap-3">
            {data.tasks.filter(t => t.status !== 'Complete').slice(0, 5).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f0f4f7' }}>
                <PlayCircle size={18} className="text-blue" style={{ color: 'var(--jenkins-blue)' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{task.title}</span>
                <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>{task.owner}</span>
              </div>
            ))}
            <Link href="/tasks" className="btn btn-outline" style={{ marginTop: '10px', textAlign: 'center' }}>View Pipeline Steps</Link>
          </div>
        </div>

        <div className="card" style={{ width: '300px' }}>
          <h2>Environment</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#949a9f', marginBottom: '4px' }}>SOURCE</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>805 S Hercules Ave, Clearwater</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#949a9f', marginBottom: '4px' }}>DESTINATION</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>25 Chestnut St, Cold Spring</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#949a9f', marginBottom: '4px' }}>RESOURCES</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span className="badge badge-info">Andrew</span>
                <span className="badge badge-info">Wife</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
