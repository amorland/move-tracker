'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task, PackingItem } from '@/lib/types';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { MapPin, Star, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, Box, X, Save, Edit3, Heart } from 'lucide-react';
import Link from 'next/link';
import MilestoneGrid from '@/components/MilestoneGrid';
import { getMilestones, validateDates } from '@/lib/dateUtils';

export default function Dashboard() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Editing Modal State
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [activeDateLabel, setActiveDateLabel] = useState('');
  const [tempDate, setTempDate] = useState('');
  const [tempConfirmed, setTempConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [settingsRes, categoriesRes, packingRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/packing')
    ]);
    const settingsData = await settingsRes.json();
    setSettings(settingsData);
    setData(await categoriesRes.json());
    setPackingItems(await packingRes.json());
    setLoading(false);
  };

  const openDateModal = (key: string, label: string) => {
    if (!settings) return;
    setActiveDateKey(key);
    setActiveDateLabel(label);
    setValidationError(null);
    
    // @ts-ignore
    setTempDate(settings[key] || '');
    
    if (key === 'confirmedMoveDate') {
      // @ts-ignore
      setTempConfirmed(!!settings[key]);
    } else {
      const confirmKey = `is${key.charAt(0).toUpperCase()}${key.slice(1)}Confirmed`.replace('DateConfirmed', 'Confirmed');
      let actualConfirmKey = confirmKey;
      if (key === 'closingDate') actualConfirmKey = 'isClosingDateConfirmed';
      if (key === 'upackDropoffDate') actualConfirmKey = 'isUpackDropoffConfirmed';
      if (key === 'upackPickupDate') actualConfirmKey = 'isUpackPickupConfirmed';
      if (key === 'driveStartDate') actualConfirmKey = 'isDriveStartConfirmed';
      if (key === 'arrivalDate') actualConfirmKey = 'isArrivalConfirmed';
      if (key === 'upackDeliveryDate') actualConfirmKey = 'isUpackDeliveryConfirmed';
      if (key === 'upackFinalPickupDate') actualConfirmKey = 'isUpackFinalPickupConfirmed';
      
      // @ts-ignore
      setTempConfirmed(!!settings[actualConfirmKey]);
    }
    setIsDateModalOpen(true);
  };

  const saveQuickDate = async () => {
    if (!settings || !activeDateKey) return;
    
    // Create update object
    const updatePayload: any = { [activeDateKey]: tempDate || null };
    
    if (activeDateKey === 'confirmedMoveDate') {
      if (tempConfirmed && !tempDate) {
        setValidationError("Final move date cannot be confirmed without a date.");
        return;
      }
      if (!tempConfirmed) {
        updatePayload[activeDateKey] = null;
      }
    } else {
      let actualConfirmKey = `is${activeDateKey.charAt(0).toUpperCase()}${activeDateKey.slice(1)}Confirmed`.replace('DateConfirmed', 'Confirmed');
      if (activeDateKey === 'closingDate') actualConfirmKey = 'isClosingDateConfirmed';
      if (activeDateKey === 'upackDropoffDate') actualConfirmKey = 'isUpackDropoffConfirmed';
      if (activeDateKey === 'upackPickupDate') actualConfirmKey = 'isUpackPickupConfirmed';
      if (activeDateKey === 'driveStartDate') actualConfirmKey = 'isDriveStartConfirmed';
      if (activeDateKey === 'arrivalDate') actualConfirmKey = 'isArrivalConfirmed';
      if (activeDateKey === 'upackDeliveryDate') actualConfirmKey = 'isUpackDeliveryConfirmed';
      if (activeDateKey === 'upackFinalPickupDate') actualConfirmKey = 'isUpackFinalPickupConfirmed';
      
      if (tempConfirmed && !tempDate) {
        setValidationError(`${activeDateLabel} cannot be confirmed without a date.`);
        return;
      }

      updatePayload[actualConfirmKey] = tempConfirmed;
    }

    // Client-side validation for business rules
    const mergedSettings = { ...settings, ...updatePayload };
    const ruleError = validateDates(mergedSettings);
    if (ruleError) {
      setValidationError(ruleError);
      return;
    }

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    if (res.ok) {
      // Update local state by merging
      setSettings({ ...settings, ...updatePayload });
      setIsDateModalOpen(false);
      setValidationError(null);
    } else {
      const err = await res.json();
      setValidationError(err.error || 'Unknown error');
    }
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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading Starland hub...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const moveDateStr = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDateStr), new Date());

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

  const milestones = getMilestones(settings);

  const stages = [
    { name: 'Strategy', status: progress > 15 ? 'complete' : 'current', icon: 'assignment' },
    { name: 'Packing', status: progress > 50 ? 'complete' : progress > 15 ? 'current' : 'pending', icon: 'package_2' },
    { name: 'Transit', status: progress > 85 ? 'complete' : progress > 50 ? 'current' : 'pending', icon: 'local_shipping' },
    { name: 'Settling', status: progress === 100 ? 'complete' : progress > 85 ? 'current' : 'pending', icon: 'celebration' }
  ];

  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      <div className="flex flex-stack items-center justify-between mb-10">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 95, 184, 0.2)'
          }}>
            <Heart size={24} color="white" fill="white" />
          </div>
          <div>
            <h1 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Starland Moving
            </h1>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>Tory & Andrew's Relocation Hub</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link href="/settings" className="btn btn-secondary" style={{ gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
            Settings
          </Link>
          <div 
            onClick={() => openDateModal('confirmedMoveDate', 'Move Date')}
            className="badge badge-info card-hover-effect" 
            style={{ height: '40px', padding: '0 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
             <CalendarIcon size={16} />
             <span style={{ fontWeight: 700 }}>{format(parseISO(moveDateStr), 'MMMM d, yyyy')}</span>
          </div>
        </div>
      </div>
      
      {/* Visual Progression Section */}
      <div className="card" style={{ padding: '48px 32px', marginBottom: '40px', border: 'none', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-soft)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 1s ease-in-out' }}></div>
        </div>

        <div className="flex items-center" style={{ width: '100%', marginBottom: '64px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', width: '100%', maxWidth: '1000px', alignItems: 'center' }}>
            {stages.map((stage, idx) => (
              <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: idx === stages.length - 1 ? 'none' : 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
                  <div className={`progress-node ${stage.status === 'complete' ? 'complete' : stage.status === 'current' ? 'current' : ''}`} style={{ width: '56px', height: '56px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>{stage.icon}</span>
                  </div>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    color: stage.status === 'pending' ? 'var(--text-secondary)' : 'var(--foreground)', 
                    letterSpacing: '0.05em', 
                    textTransform: 'uppercase',
                    position: 'absolute',
                    top: '70px',
                    whiteSpace: 'nowrap'
                  }}>
                    {stage.name}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`progress-connector ${stage.status === 'complete' ? 'filled' : ''}`} style={{ 
                    marginTop: '-24px',
                    height: '3px',
                    background: stage.status === 'complete' ? 'var(--success)' : 'var(--border)'
                  }}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-stack justify-between items-end" style={{ marginTop: '72px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Overall Move Progress</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '56px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1, letterSpacing: '-0.02em' }}>{progress}%</span>
              <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Complete</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div 
              onClick={() => openDateModal('confirmedMoveDate', 'Move Date')}
              style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1, marginBottom: '8px', letterSpacing: '-0.01em', cursor: 'pointer' }}
              className="hover-opacity"
            >
              {daysToMove > 0 ? `${daysToMove} Days to Move` : daysToMove === 0 ? "Today is Move Day!" : 'Relocation Complete'}
            </div>
            <div 
              onClick={() => openDateModal('confirmedMoveDate', 'Move Date')}
              className="flex items-center gap-2 justify-end" 
              style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
            >
              {settings.confirmedMoveDate ? <CheckCircle2 size={16} color="var(--success)" /> : <Clock size={16} />}
              <span>{settings.confirmedMoveDate ? 'Final date confirmed' : 'Target date estimated'}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Full-width Logistics Anchor Dates */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafbfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <CalendarIcon size={20} color="var(--accent)" />
              Relocation Milestones & Logistics
            </h2>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: 'var(--success)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }}></div> CONFIRMED
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px solid #94a3b8' }}></div> ESTIMATED
              </div>
            </div>
          </div>
          <div style={{ padding: '28px' }}>
            <MilestoneGrid milestones={milestones} onEdit={openDateModal} />
          </div>
        </div>

        <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
          
          {/* Inventory Summary Card */}
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Box size={20} color="var(--accent)" />
                Belongings & Inventory
              </h2>
              <Link href="/packing" className="badge badge-info card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800 }}>VIEW FULL LIST</span> <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ padding: '32px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                 {inventorySummary.map(item => (
                   <div key={item.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                         <span style={{ color: item.color }}>{item.icon}</span>
                         <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{item.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                         <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--foreground)' }}>{item.percent}%</span>
                         <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>({item.count})</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: '#f1f5f9', borderRadius: '3px', marginTop: '16px', overflow: 'hidden' }}>
                         <div style={{ height: '100%', width: `${item.percent}%`, background: item.color, borderRadius: '3px' }}></div>
                      </div>
                   </div>
                 ))}
              </div>

              <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '20px', border: '2px solid #f1f5f9' }}>
                 <div className="flex justify-between items-center mb-4">
                   <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--foreground)' }}>Packing Progress (to bring)</div>
                   <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>{packingProgress}%</div>
                 </div>
                 <div style={{ height: '12px', background: 'white', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ height: '100%', width: `${packingProgress}%`, background: 'var(--accent)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                 </div>
                 <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                   <CheckCircle2 size={14} />
                   <span>{packedItems} of {bringItems.length} items to bring are packed and ready.</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Priority Actions Card */}
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Star size={20} fill="var(--warning)" color="var(--warning)" />
                Focus Tasks
              </h2>
              <Link href="/tasks" className="badge badge-info card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800 }}>VIEW ALL TASKS</span> <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.tasks.filter(t => t.status !== 'Complete').slice(0, 10).map((task, idx) => (
                <div key={task.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '20px 28px', 
                  borderBottom: idx === 9 || idx === data.tasks.filter(t => t.status !== 'Complete').slice(0, 10).length - 1 ? 'none' : '1px solid #f8f9fa',
                  transition: 'background-color 0.2s ease'
                }} className="task-row">
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: '26px' }}>radio_button_unchecked</span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {data.categories.find(c => c.id === task.categoryId)?.name}
                      </div>
                      {getTaskDate(task) && (
                        <>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }}></div>
                          <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarIcon size={12} />
                            <span>{format(getTaskDate(task)!, 'MMM d')}</span>
                            {!task.dueDate && <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: 800 }}>• TARGET</span>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="badge badge-neutral" style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, flexShrink: 0 }}>{task.owner.toUpperCase()}</div>
                </div>
              ))}
              {data.tasks.filter(t => t.status !== 'Complete').length === 0 && (
                <div style={{ padding: '80px 32px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 size={32} color="var(--success)" />
                  </div>
                  <div style={{ fontSize: '18px', color: 'var(--foreground)', fontWeight: 800, marginBottom: '8px' }}>Move Plan Clear!</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>All active priorities have been completed.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Date Edit Modal */}
      {isDateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 0, overflow: 'hidden' }}>
             <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Update {activeDateLabel}</h2>
               <button onClick={() => setIsDateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
             </div>
             <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {validationError && (
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    background: '#fef2f2', 
                    border: '1px solid #fee2e2', 
                    color: '#dc2626', 
                    fontSize: '13px', 
                    fontWeight: 600,
                    lineHeight: '1.4'
                  }}>
                    {validationError}
                  </div>
                )}
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date (YYYY-MM-DD)</label>
                      <button 
                        onClick={() => setTempDate('')}
                        style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        CLEAR DATE
                      </button>
                   </div>
                   <div style={{ position: 'relative' }}>
                     <input 
                       type="text"
                       placeholder="2026-04-16"
                       value={tempDate}
                       onChange={e => setTempDate(e.target.value)}
                       style={{ paddingRight: '48px', height: '48px', fontSize: '15px', fontWeight: 700, borderRadius: '10px' }}
                     />
                     <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                           <input 
                             type="date" 
                             value={tempDate} 
                             onChange={e => setTempDate(e.target.value)} 
                             style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                           />
                           <CalendarIcon size={20} color="var(--accent)" style={{ position: 'absolute', inset: 0, margin: 'auto', zIndex: 1 }} />
                        </div>
                     </div>
                   </div>
                   <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: '1.4' }}>Type dates manually for speed, or click the blue icon for a calendar.</p>
                </div>

                <div 
                  onClick={() => setTempConfirmed(!tempConfirmed)}
                  style={{ 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: '2px solid',
                    borderColor: tempConfirmed ? 'var(--success)' : 'var(--border)',
                    background: tempConfirmed ? 'var(--success-soft)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    border: '2px solid',
                    borderColor: tempConfirmed ? 'var(--success)' : '#d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: tempConfirmed ? 'var(--success)' : 'transparent',
                    flexShrink: 0
                  }}>
                    {tempConfirmed && <CheckCircle2 size={18} color="#fff" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)' }}>Confirmed Date</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Toggle this once the date is finalized.</div>
                  </div>
                </div>
             </div>
             <div style={{ padding: '20px 24px', backgroundColor: '#fafbfc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setIsDateModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ gap: '10px', height: '44px', padding: '0 24px' }} onClick={saveQuickDate}>
                  <Save size={18} /> Update Date
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
