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

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'Complete' ? 'Not Started' : 'Complete';
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, status: newStatus })
    });
    // Refresh data
    const categoriesRes = await fetch('/api/categories');
    const categoriesData = await categoriesRes.json();
    setData(categoriesData);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex flex-stack items-center justify-between mb-8">
        <div>
          <h1>Overview</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Command center for your relocation journey.</p>
        </div>
      </div>
      
      {/* Visual Progression Section */}
      <div className="card" style={{ padding: '40px 24px', marginBottom: '40px', border: 'none', boxShadow: 'var(--shadow-md)' }}>
        <div className="flex items-center" style={{ width: '100%', marginBottom: '48px', justifyContent: 'center' }}>
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

        <div className="flex flex-stack justify-between items-end" style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Overall Progress</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{progress}%</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Complete</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1, marginBottom: '8px' }}>
              {daysToMove > 0 ? `${daysToMove} Days Left` : daysToMove === 0 ? "Today's the Day!" : 'Welcome Home!'}
            </div>
            <div className="flex items-center gap-2 justify-end" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
              <CalendarIcon size={14} />
              {format(parseISO(moveDate), 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>

      <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        {/* Focus Tasks Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 700 }}>
              <Star size={18} fill="#f1c40f" color="#f1c40f" />
              Focus Tasks
            </h2>
            <Link href="/tasks" className="badge badge-info" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.tasks.filter(t => t.status !== 'Complete').slice(0, 5).map((task, idx) => (
              <div key={task.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '16px 24px', 
                borderBottom: idx === 4 || idx === data.tasks.filter(t => t.status !== 'Complete').slice(0, 5).length - 1 ? 'none' : '1px solid #f8f9fa' 
              }}>
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#d1d5db', fontSize: '22px' }}>radio_button_unchecked</span>
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {data.categories.find(c => c.id === task.categoryId)?.name}
                    </div>
                    {task.dueDate && (
                      <>
                        <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></div>
                        <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CalendarIcon size={10} />
                          {format(parseISO(task.dueDate), 'MMM d')}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="badge badge-neutral" style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px' }}>{task.owner}</div>
              </div>
            ))}
            {data.tasks.filter(t => t.status !== 'Complete').length === 0 && (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={24} color="var(--success)" />
                </div>
                <div style={{ fontSize: '15px', color: 'var(--foreground)', fontWeight: 700, marginBottom: '4px' }}>All caught up!</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>All priority tasks are complete.</div>
              </div>
            )}
          </div>
        </div>

        {/* Packing Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 700 }}>
              <Box size={18} color="var(--accent)" />
              Packing Progress
            </h2>
            <Link href="/packing" className="badge badge-info" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Inventory <ChevronRight size={12} />
            </Link>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{packingProgress}%</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Packed</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {packingRooms.slice(0, 4).map(room => {
                const roomItems = packingItems.filter(i => i.room === room && i.action === 'Bring');
                const roomPacked = roomItems.filter(i => i.status === 'Packed').length;
                const roomProgress = roomItems.length > 0 ? (roomPacked / roomItems.length) * 100 : 0;
                return (
                  <div key={room}>
                    <div className="flex justify-between items-center mb-2">
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--foreground)' }}>{room}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{roomPacked}/{roomItems.length}</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
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
        </div>

        {/* Relocation Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 700 }}>
              <MapPin size={18} color="var(--accent)" />
              Relocation
            </h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ position: 'relative', paddingLeft: '32px', marginBottom: '32px' }}>
              <div style={{ 
                position: 'absolute', 
                left: '7px', 
                top: '8px', 
                bottom: '8px', 
                width: '2px', 
                background: 'linear-gradient(to bottom, var(--border), var(--accent))',
                borderRadius: '1px' 
              }}></div>
              
              <div style={{ position: 'absolute', left: '0', top: '0', width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--border)', background: 'white' }}></div>
              <div style={{ position: 'absolute', left: '0', bottom: '0', width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--accent)', background: 'white' }}></div>

              <div style={{ marginBottom: '40px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origin</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)' }}>Clearwater, FL</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>805 S Hercules Ave</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)' }}>Cold Spring, NY</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>25 Chestnut St</div>
              </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--accent-soft)', borderRadius: '12px', border: '1px solid rgba(0, 95, 184, 0.05)' }}>
               <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moving Household</div>
               <div className="flex items-center gap-4">
                 <div className="flex -space-x-3">
                   <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '2px solid var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'var(--accent)', zIndex: 2 }}>A</div>
                   <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '2px solid var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'var(--accent)', zIndex: 1 }}>T</div>
                 </div>
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>Andrew & Tory</div>
                   <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Two Adults • Cold Spring Resident</div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
