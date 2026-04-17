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
    fetchData();
  }, []);

  const fetchData = async () => {
    const [settingsRes, categoriesRes, packingRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/packing')
    ]);
    setSettings(await settingsRes.json());
    setData(await categoriesRes.json());
    setPackingItems(await packingRes.json());
    setLoading(false);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'Complete' ? 'Not Started' : 'Complete';
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, status: newStatus })
    });
    fetchData();
  };

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading your move overview...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const moveDate = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDate), new Date());

  const getTaskDate = (task: Task) => {
    if (task.dueDate) return parseISO(task.dueDate);
    if (!settings) return null;
    
    const moveBaseDate = parseISO(settings.confirmedMoveDate || settings.earliestMoveDate);
    const closingDate = settings.closingDate ? parseISO(settings.closingDate) : null;

    let baseDate = moveBaseDate;
    if (task.timingType === 'Before Closing' || task.timingType === 'After Closing') {
      if (!closingDate) return null;
      baseDate = closingDate;
    }
    return addDays(baseDate, task.timingOffsetDays);
  };

  const bringItems = packingItems.filter(i => i.action === 'Bring');
  const packedItems = bringItems.filter(i => i.status === 'Packed').length;
  const packingProgress = bringItems.length > 0 ? Math.round((packedItems / bringItems.length) * 100) : 0;

  // Inventory Decisions Metrics
  const totalItems = packingItems.length;
  const sellItems = packingItems.filter(i => i.action === 'Sell').length;
  const donateItems = packingItems.filter(i => i.action === 'Donate').length;
  const trashItems = packingItems.filter(i => i.action === 'Trash').length;

  const getInventoryPercent = (count: number) => totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;

  const inventorySummary = [
    { label: 'TO BRING', count: bringItems.length, percent: getInventoryPercent(bringItems.length), color: 'var(--accent)', icon: <Box size={14} /> },
    { label: 'TO SELL', count: sellItems, percent: getInventoryPercent(sellItems), color: '#10b981', icon: <Star size={14} /> },
    { label: 'TO DONATE', count: donateItems, percent: getInventoryPercent(donateItems), color: '#f59e0b', icon: <MapPin size={14} /> },
    { label: 'TO TRASH', count: trashItems, percent: getInventoryPercent(trashItems), color: '#ef4444', icon: <Clock size={14} /> }
  ];

  // Anchor Dates Display Logic
  const anchorDates = [
    { label: 'U-Pack Dropoff (FL)', date: settings.upackDropoffDate, confirmed: settings.isUpackDropoffConfirmed },
    { label: 'U-Pack Pickup (FL)', date: settings.upackPickupDate, confirmed: settings.isUpackPickupConfirmed },
    { label: 'Drive Start', date: settings.driveStartDate, confirmed: settings.isDriveStartConfirmed },
    { label: 'House Closing', date: settings.closingDate, confirmed: settings.isClosingDateConfirmed },
    { label: 'Arrival (NY)', date: settings.arrivalDate, confirmed: settings.isArrivalConfirmed },
    { label: 'U-Pack Delivery (NY)', date: settings.upackDeliveryDate, confirmed: settings.isUpackDeliveryConfirmed },
    { label: 'Final Pickup', date: settings.upackFinalPickupDate, confirmed: settings.isUpackFinalPickupConfirmed }
  ];

  const stages = [
    { name: 'Strategy', status: progress > 15 ? 'complete' : 'current', icon: 'assignment' },
    { name: 'Packing', status: progress > 50 ? 'complete' : progress > 15 ? 'current' : 'pending', icon: 'package_2' },
    { name: 'Transit', status: progress > 85 ? 'complete' : progress > 50 ? 'current' : 'pending', icon: 'local_shipping' },
    { name: 'Settling', status: progress === 100 ? 'complete' : progress > 85 ? 'current' : 'pending', icon: 'celebration' }
  ];

  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      <div className="flex flex-stack items-center justify-between mb-10">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Command Center</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Relocation overview for Andrew & Tory.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/settings" className="btn btn-secondary" style={{ gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
            Settings
          </Link>
          <div className="badge badge-info" style={{ height: '40px', padding: '0 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <CalendarIcon size={16} />
             <span style={{ fontWeight: 700 }}>{format(parseISO(moveDate), 'MMMM d, yyyy')}</span>
          </div>
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
        
        {/* Logistics Anchor Dates */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)', gridColumn: '1 / -1' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafbfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <CalendarIcon size={18} color="var(--accent)" />
              Move Logistics & Anchor Dates
            </h2>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--success)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }}></div> CONFIRMED
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px solid #94a3b8' }}></div> ESTIMATED
              </div>
            </div>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {anchorDates.map((ad, idx) => (
                <div key={idx} style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: ad.confirmed ? 'var(--success-soft)' : '#f8fafc',
                  border: ad.confirmed ? '1px solid rgba(26, 138, 95, 0.1)' : '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }} className="card-hover-effect">
                  <div style={{ fontSize: '10px', fontWeight: 800, color: ad.confirmed ? 'var(--success)' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{ad.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)' }}>
                    {ad.date ? format(parseISO(ad.date), 'MMM d, yyyy') : 'TBD'}
                  </div>
                  {ad.confirmed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '9px', fontWeight: 800, marginTop: '2px' }}>
                      <CheckCircle2 size={10} /> CONFIRMED
                    </div>
                  ) : (
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, marginTop: '2px' }}>ESTIMATED</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Decisions Summary */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Box size={18} color="var(--accent)" />
              Inventory Summary
            </h2>
            <Link href="/packing" className="badge badge-info card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>VIEW LIST</span> <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '32px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
               {inventorySummary.map(item => (
                 <div key={item.label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                       <span style={{ color: item.color }}>{item.icon}</span>
                       <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                       <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--foreground)' }}>{item.percent}%</span>
                       <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>({item.count})</span>
                    </div>
                    <div style={{ height: '4px', width: '100%', background: '#f1f5f9', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
                       <div style={{ height: '100%', width: `${item.percent}%`, background: item.color }}></div>
                    </div>
                 </div>
               ))}
            </div>

            <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
               <div className="flex justify-between items-center mb-3">
                 <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--foreground)' }}>Packing Progress</div>
                 <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>{packingProgress}%</div>
               </div>
               <div style={{ height: '8px', background: 'white', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <div style={{ height: '100%', width: `${packingProgress}%`, background: 'var(--accent)', transition: 'width 1s ease' }}></div>
               </div>
               <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', fontWeight: 500 }}>
                 {packedItems} of {bringItems.length} items to bring are packed.
               </p>
            </div>
          </div>
        </div>

        {/* Priority Actions Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Star size={18} fill="var(--warning)" color="var(--warning)" />
              Priority Actions
            </h2>
            <Link href="/tasks" className="badge badge-info card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>VIEW ALL</span> <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.tasks.filter(t => t.status !== 'Complete').slice(0, 8).map((task, idx) => (
              <div key={task.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '18px 28px', 
                borderBottom: idx === 7 || idx === data.tasks.filter(t => t.status !== 'Complete').slice(0, 8).length - 1 ? 'none' : '1px solid #f8f9fa',
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
      </div>
    </div>
  );
}
