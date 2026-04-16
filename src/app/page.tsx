'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task, PackingItem } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { MapPin, Star, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, Box } from 'lucide-react';
import Link from 'next/link';


export default function Dashboard() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/packing').then(res => res.json())
    ]).then(([settingsData, categoriesData, packingData]) => {
      setSettings(settingsData);
      setData(categoriesData);
      setPackingItems(packingData);
      setLoading(false);
    });
  }, []);

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading your move overview...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  const packingRooms = Array.from(new Set(packingItems.map(i => i.room)));
  const bringItems = packingItems.filter(i => i.action === 'Bring');
  const packedItems = bringItems.filter(i => i.status === 'Packed').length;
  const packingProgress = bringItems.length > 0 ? Math.round((packedItems / bringItems.length) * 100) : 0;

  // Refined Move Stages with better semantic icons
  const stages = [
    { name: 'Strategy', status: progress > 15 ? 'complete' : 'current', icon: 'assignment' },
    { name: 'Packing', status: progress > 50 ? 'complete' : progress > 15 ? 'current' : 'pending', icon: 'package_2' },
    { name: 'Transit', status: progress > 85 ? 'complete' : progress > 50 ? 'current' : 'pending', icon: 'local_shipping' },
    { name: 'Settling', status: progress === 100 ? 'complete' : progress > 85 ? 'current' : 'pending', icon: 'celebration' }
  ];

  return (
    <div>
      <h1>Overview</h1>
      <p className="section-subtitle">Everything for Andrew & Tory's move to Cold Spring.</p>
      
      {/* Visual Progression Section */}
      <div className="card" style={{ padding: '32px 24px' }}>
        <div className="flex items-center" style={{ width: '100%', marginBottom: '40px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', width: '100%', maxWidth: '800px', alignItems: 'center' }}>
            {stages.map((stage, idx) => (
              <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: idx === stages.length - 1 ? 'none' : 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
                  <div className={`progress-node ${stage.status === 'complete' ? 'complete' : stage.status === 'current' ? 'current' : ''}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{stage.icon}</span>
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: stage.status === 'pending' ? 'var(--text-secondary)' : 'var(--foreground)', 
                    letterSpacing: '0.05em', 
                    textTransform: 'uppercase',
                    position: 'absolute',
                    top: '56px',
                    whiteSpace: 'nowrap'
                  }}>
                    {stage.name}
                  </span>
                </div>
                {idx < stages.length - 1 && <div className={`progress-connector ${stage.status === 'complete' ? 'filled' : ''}`} style={{ marginTop: '-24px' }}></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-stack justify-between items-end" style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Overall Progress</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{progress}%</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Complete</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1, marginBottom: '6px' }}>
              {daysToMove > 0 ? `${daysToMove} Days Left` : daysToMove === 0 ? "Today's the Day!" : 'Welcome Home!'}
            </div>
            <div className="flex items-center gap-2 justify-end" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
              <CalendarIcon size={14} />
              {format(parseISO(moveDate), 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-stack gap-8">
        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star size={18} fill="#f1c40f" color="#f1c40f" />
              Focus Tasks
            </h2>
            <Link href="/tasks" className="badge badge-info" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col">
            {data.tasks.filter(t => t.status !== 'Complete').slice(0, 3).map((task, idx) => (
              <div key={task.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '16px 0', 
                borderBottom: idx === 2 || idx === data.tasks.filter(t => t.status !== 'Complete').slice(0, 3).length - 1 ? 'none' : '1px solid var(--border)' 
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {data.categories.find(c => c.id === task.categoryId)?.name}
                  </div>
                </div>
                <div className="badge badge-neutral" style={{ fontSize: '10px', flexShrink: 0 }}>{task.owner}</div>
              </div>
            ))}
            {data.tasks.filter(t => t.status !== 'Complete').length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={24} color="var(--success)" />
                </div>
                <div style={{ fontSize: '15px', color: 'var(--foreground)', fontWeight: 700, marginBottom: '4px' }}>All caught up!</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>All priority tasks are complete.</div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Box size={18} color="var(--accent)" />
              Packing
            </h2>
            <Link href="/packing" className="badge badge-info" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Inventory <ChevronRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{packingProgress}%</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Items Packed</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {packingRooms.slice(0, 3).map(room => {
              const roomItems = packingItems.filter(i => i.room === room && i.action === 'Bring');
              const roomPacked = roomItems.filter(i => i.status === 'Packed').length;
              const roomProgress = roomItems.length > 0 ? (roomPacked / roomItems.length) * 100 : 0;
              return (
                <div key={room}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--foreground)' }}>{room}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{roomPacked}/{roomItems.length}</span>
                  </div>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${roomProgress}%`, background: 'var(--accent)', transition: 'width 0.4s ease' }}></div>
                  </div>
                </div>
              );
            })}
            {packingRooms.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No packing inventory started.
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={18} color="var(--accent)" />
            Relocation
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
            <div style={{ position: 'relative', paddingLeft: '28px' }}>
              <div style={{ 
                position: 'absolute', 
                left: '6px', 
                top: '8px', 
                bottom: '8px', 
                width: '2px', 
                background: 'linear-gradient(to bottom, var(--border), var(--accent))',
                borderRadius: '1px' 
              }}></div>
              
              <div style={{ position: 'absolute', left: '0', top: '0', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--border)', background: 'white' }}></div>
              <div style={{ position: 'absolute', left: '0', bottom: '0', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--accent)', background: 'white' }}></div>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>Clearwater, FL</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>Cold Spring, NY</div>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--accent-soft)', borderRadius: '10px', border: '1px solid rgba(0, 95, 184, 0.1)' }}>
               <div className="flex items-center gap-3">
                 <div className="flex -space-x-2">
                   <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '2px solid var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--accent)', zIndex: 2 }}>A</div>
                   <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '2px solid var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--accent)', zIndex: 1 }}>T</div>
                 </div>
                 <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--foreground)' }}>Andrew & Tory</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
