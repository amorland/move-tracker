'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task, PackingItem } from '@/lib/types';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
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

  const getTaskDate = (task: Task) => {
    if (task.dueDate) return parseISO(task.dueDate);
    if (!settings) return null;
    
    const moveDate = parseISO(settings.confirmedMoveDate || settings.earliestMoveDate);
    const closingDate = settings.closingDate ? parseISO(settings.closingDate) : null;

    let baseDate = moveDate;
    if (task.timingType === 'Before Closing' || task.timingType === 'After Closing') {
      if (!closingDate) return null;
      baseDate = closingDate;
    }
    return addDays(baseDate, task.timingOffsetDays);
  };

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div className="flex flex-stack items-center justify-between mb-10">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Command Center</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Relocation overview for Andrew & Tory.</p>
        </div>
        <div className="badge badge-info" style={{ height: '40px', padding: '0 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <CalendarIcon size={16} />
           <span style={{ fontWeight: 700 }}>{format(parseISO(moveDate), 'MMMM d, yyyy')}</span>
        </div>
      </div>
      
      {/* Visual Progression Section */}
      <div className="card" style={{ padding: '48px 32px', marginBottom: '40px', border: 'none', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-soft)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 1s ease-in-out' }}></div>
        </div>

        <div className="flex items-center" style={{ width: '100%', marginBottom: '64px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', width: '100%', maxWidth: '900px', alignItems: 'center' }}>
            {stages.map((stage, idx) => (
              <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: idx === stages.length - 1 ? 'none' : 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
                  <div className={`progress-node ${stage.status === 'complete' ? 'complete' : stage.status === 'current' ? 'current' : ''}`} style={{ width: '48px', height: '48px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{stage.icon}</span>
                  </div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    color: stage.status === 'pending' ? 'var(--text-secondary)' : 'var(--foreground)', 
                    letterSpacing: '0.05em', 
                    textTransform: 'uppercase',
                    position: 'absolute',
                    top: '60px',
                    whiteSpace: 'nowrap'
                  }}>
                    {stage.name}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`progress-connector ${stage.status === 'complete' ? 'filled' : ''}`} style={{ 
                    marginTop: '-24px',
                    height: '2px',
                    background: stage.status === 'complete' ? 'var(--accent)' : 'var(--border)'
                  }}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-stack justify-between items-end" style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Current Completion</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '48px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1, letterSpacing: '-0.02em' }}>{progress}%</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>of total move tasks</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1, marginBottom: '8px', letterSpacing: '-0.01em' }}>
              {daysToMove > 0 ? `${daysToMove} Days to Move` : daysToMove === 0 ? "It's Move Day!" : 'Relocation Complete'}
            </div>
            <div className="flex items-center gap-2 justify-end" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
              <Clock size={14} />
              <span>Target date is confirmed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px', alignItems: 'start' }}>
        {/* Focus Tasks Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Star size={18} fill="var(--warning)" color="var(--warning)" />
              Priority Actions
            </h2>
            <Link href="/tasks" className="badge badge-info card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>VIEW ALL</span> <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.tasks.filter(t => t.status !== 'Complete').slice(0, 5).map((task, idx) => (
              <div key={task.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '18px 28px', 
                borderBottom: idx === 4 || idx === data.tasks.filter(t => t.status !== 'Complete').slice(0, 5).length - 1 ? 'none' : '1px solid #f8f9fa',
                transition: 'background-color 0.2s ease'
              }} className="task-row">
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: '24px' }}>radio_button_unchecked</span>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {data.categories.find(c => c.id === task.categoryId)?.name}
                    </div>
                    {getTaskDate(task) && (
                      <>
                        <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></div>
                        <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon size={11} />
                          <span>{format(getTaskDate(task)!, 'MMM d')}</span>
                          {!task.dueDate && <span style={{ fontSize: '8px', opacity: 0.6 }}>TARGET</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="badge badge-neutral" style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, flexShrink: 0 }}>{task.owner.toUpperCase()}</div>
              </div>
            ))}
            {data.tasks.filter(t => t.status !== 'Complete').length === 0 && (
              <div style={{ padding: '64px 32px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={28} color="var(--success)" />
                </div>
                <div style={{ fontSize: '16px', color: 'var(--foreground)', fontWeight: 800, marginBottom: '6px' }}>All Clear!</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>All priority tasks for this phase are complete.</div>
              </div>
            )}
          </div>
        </div>

        {/* Packing Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Box size={18} color="var(--accent)" />
              Inventory Status
            </h2>
            <Link href="/packing" className="badge badge-info card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>LOG ITEMS</span> <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '32px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1, letterSpacing: '-0.02em' }}>{packingProgress}%</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Packed</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {packingRooms.slice(0, 4).map(room => {
                const roomItems = packingItems.filter(i => i.room === room && i.action === 'Bring');
                const roomPacked = roomItems.filter(i => i.status === 'Packed').length;
                const roomProgress = roomItems.length > 0 ? (roomPacked / roomItems.length) * 100 : 0;
                return (
                  <div key={room}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--foreground)' }}>{room}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>{roomPacked} / {roomItems.length}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${roomProgress}%`, background: 'var(--accent)', borderRadius: '4px', transition: 'width 0.6s ease' }}></div>
                    </div>
                  </div>
                );
              })}
              {packingRooms.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                  No inventory items tracked yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Relocation Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafbfc' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <MapPin size={18} color="var(--accent)" />
              Route Details
            </h2>
          </div>
          <div style={{ padding: '32px 28px' }}>
            <div style={{ position: 'relative', paddingLeft: '36px', marginBottom: '32px' }}>
              <div style={{ 
                position: 'absolute', 
                left: '7px', 
                top: '10px', 
                bottom: '10px', 
                width: '2px', 
                background: 'linear-gradient(to bottom, var(--border), var(--accent))',
                borderRadius: '1px' 
              }}></div>
              
              <div style={{ position: 'absolute', left: '0', top: '0', width: '16px', height: '16px', borderRadius: '50%', border: '3px solid white', background: 'var(--border)', boxShadow: '0 0 0 1px var(--border)' }}></div>
              <div style={{ position: 'absolute', left: '0', bottom: '0', width: '16px', height: '16px', borderRadius: '50%', border: '3px solid white', background: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' }}></div>

              <div style={{ marginBottom: '48px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origin</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2 }}>Clearwater, FL</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>805 S Hercules Ave</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2 }}>Cold Spring, NY</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>25 Chestnut St</div>
              </div>
            </div>

            <div style={{ padding: '24px', background: 'var(--accent-soft)', borderRadius: '16px', border: '1px solid rgba(0, 95, 184, 0.08)' }}>
               <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Move Team</div>
               <div className="flex items-center gap-4">
                 <div className="flex -space-x-3">
                   <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '2px solid var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'var(--accent)', zIndex: 2, boxShadow: 'var(--shadow-sm)' }}>A</div>
                   <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '2px solid var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'var(--accent)', zIndex: 1, boxShadow: 'var(--shadow-sm)' }}>T</div>
                 </div>
                 <div>
                   <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)' }}>Andrew & Tory</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cold Spring, NY Residents</div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
