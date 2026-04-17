'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task, PackingItem } from '@/lib/types';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { MapPin, Star, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, Box, X, Save, Edit3, Sparkles } from 'lucide-react';
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
      const confirmKeyMap: Record<string, string> = {
        'closingDate': 'isClosingDateConfirmed',
        'upackDropoffDate': 'isUpackDropoffConfirmed',
        'upackPickupDate': 'isUpackPickupConfirmed',
        'driveStartDate': 'isDriveStartConfirmed',
        'arrivalDate': 'isArrivalConfirmed',
        'upackDeliveryDate': 'isUpackDeliveryConfirmed',
        'upackFinalPickupDate': 'isUpackFinalPickupConfirmed'
      };
      const actualConfirmKey = confirmKeyMap[key] || `is${key.charAt(0).toUpperCase()}${key.slice(1)}Confirmed`.replace('DateConfirmed', 'Confirmed');
      // @ts-ignore
      setTempConfirmed(!!settings[actualConfirmKey]);
    }
    setIsDateModalOpen(true);
  };

  const saveQuickDate = async () => {
    if (!settings || !activeDateKey) return;
    
    const normalizedDate = (tempDate && tempDate.trim()) ? tempDate.trim() : null;
    const updatePayload: any = { [activeDateKey]: normalizedDate };
    
    if (activeDateKey === 'confirmedMoveDate') {
      if (tempConfirmed && !normalizedDate) {
        setValidationError("Final move date cannot be confirmed without a date.");
        return;
      }
      updatePayload[activeDateKey] = tempConfirmed ? normalizedDate : null;
    } else {
      const confirmKeyMap: Record<string, string> = {
        'closingDate': 'isClosingDateConfirmed',
        'upackDropoffDate': 'isUpackDropoffConfirmed',
        'upackPickupDate': 'isUpackPickupConfirmed',
        'driveStartDate': 'isDriveStartConfirmed',
        'arrivalDate': 'isArrivalConfirmed',
        'upackDeliveryDate': 'isUpackDeliveryConfirmed',
        'upackFinalPickupDate': 'isUpackFinalPickupConfirmed'
      };
      const actualConfirmKey = confirmKeyMap[activeDateKey] || `is${activeDateKey.charAt(0).toUpperCase()}${activeDateKey.slice(1)}Confirmed`.replace('DateConfirmed', 'Confirmed');
      
      if (tempConfirmed && !normalizedDate) {
        setValidationError(`${activeDateLabel} cannot be confirmed without a date.`);
        return;
      }
      updatePayload[actualConfirmKey] = tempConfirmed;
    }

    const projectedSettings = { ...settings, ...updatePayload };
    const ruleError = validateDates(projectedSettings);
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

  const totalItems = packingItems.length;
  const getInventoryPercent = (count: number) => totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;

  const inventorySummary = [
    { label: 'TO BRING', count: bringItems.length, percent: getInventoryPercent(bringItems.length), color: 'var(--accent)', icon: <Box size={14} /> },
    { label: 'TO SELL', count: packingItems.filter(i => i.action === 'Sell').length, percent: getInventoryPercent(packingItems.filter(i => i.action === 'Sell').length), color: '#d1cdc4', icon: <Star size={14} /> },
    { label: 'TO DONATE', count: packingItems.filter(i => i.action === 'Donate').length, percent: getInventoryPercent(packingItems.filter(i => i.action === 'Donate').length), color: '#e0dbd5', icon: <MapPin size={14} /> },
    { label: 'TO TRASH', count: packingItems.filter(i => i.action === 'Trash').length, percent: getInventoryPercent(packingItems.filter(i => i.action === 'Trash').length), color: '#e5e1da', icon: <Clock size={14} /> }
  ];

  const milestones = getMilestones(settings);

  const stages = [
    { name: 'Strategy', status: progress > 15 ? 'complete' : 'current', icon: 'assignment' },
    { name: 'Packing', status: progress > 50 ? 'complete' : progress > 15 ? 'current' : 'pending', icon: 'package_2' },
    { name: 'Transit', status: progress > 85 ? 'complete' : progress > 50 ? 'current' : 'pending', icon: 'local_shipping' },
    { name: 'Settling', status: progress === 100 ? 'complete' : progress > 85 ? 'current' : 'pending', icon: 'celebration' }
  ];

  return (
    <div style={{ width: '100%', paddingBottom: '80px' }}>
      <div className="flex flex-stack items-center justify-between mb-16">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: 'var(--radius)', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Star size={32} color="white" fill="white" />
          </div>
          <div>
            <h1 style={{ marginBottom: '4px' }}>
              Starland Moving
            </h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Andrew & Tory’s Relocation Hub</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link href="/settings" className="btn btn-secondary" style={{ gap: '8px', padding: '0 24px', height: '48px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
            Settings
          </Link>
          <div 
            onClick={() => openDateModal('confirmedMoveDate', 'Move Date')}
            className="badge badge-info card-hover-effect" 
            style={{ height: '48px', padding: '0 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: 'var(--radius)', background: 'var(--accent-soft)', color: 'var(--foreground)', border: 'none' }}
          >
             <CalendarIcon size={18} />
             <span style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{format(parseISO(moveDateStr), 'MMMM d, yyyy').toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      {/* Visual Progression Section */}
      <div className="card" style={{ padding: '80px 48px', marginBottom: '64px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden', background: '#fff', borderRadius: 'var(--radius)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-soft)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 1s ease-in-out' }}></div>
        </div>

        <div className="flex items-center" style={{ width: '100%', marginBottom: '100px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', width: '100%', maxWidth: '1200px', alignItems: 'center' }}>
            {stages.map((stage, idx) => (
              <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: idx === stages.length - 1 ? 'none' : 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', position: 'relative' }}>
                  <div className={`progress-node ${stage.status === 'complete' ? 'complete' : stage.status === 'current' ? 'current' : ''}`} style={{ width: '56px', height: '56px', borderRadius: '12px', border: '1.5px solid' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{stage.icon}</span>
                  </div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    fontFamily: 'var(--font-headings)',
                    color: stage.status === 'pending' ? 'var(--text-secondary)' : 'var(--foreground)', 
                    letterSpacing: '0.15em', 
                    textTransform: 'uppercase',
                    position: 'absolute',
                    top: '75px',
                    whiteSpace: 'nowrap'
                  }}>
                    {stage.name}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`progress-connector ${stage.status === 'complete' ? 'filled' : ''}`} style={{ 
                    marginTop: '-40px',
                    height: '1.5px',
                    background: stage.status === 'complete' ? 'var(--accent)' : 'var(--border)'
                  }}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-stack justify-between items-end" style={{ marginTop: '100px', paddingTop: '48px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Progress</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <span style={{ fontSize: '72px', fontWeight: 500, fontFamily: 'var(--font-headings)', color: 'var(--foreground)', lineHeight: 1, letterSpacing: '-0.02em' }}>{progress}%</span>
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Complete</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div 
              onClick={() => openDateModal('confirmedMoveDate', 'Move Date')}
              style={{ fontSize: '32px', fontWeight: 600, fontFamily: 'var(--font-headings)', color: 'var(--foreground)', lineHeight: 1, marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}
              className="hover-opacity"
            >
              {daysToMove > 0 ? `${daysToMove} Days` : daysToMove === 0 ? "Move Day" : 'Complete'}
            </div>
            <div 
              onClick={() => openDateModal('confirmedMoveDate', 'Move Date')}
              className="flex items-center gap-2 justify-end" 
              style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              {settings.confirmedMoveDate ? <CheckCircle2 size={14} color="var(--accent)" /> : <Clock size={14} />}
              <span>{settings.confirmedMoveDate ? 'Confirmed' : 'Estimated'}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        {/* Logistics Anchor Dates */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <CalendarIcon size={18} color="var(--accent)" />
              Relocation Milestones
            </h2>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }}></div> CONFIRMED
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid var(--text-secondary)' }}></div> ESTIMATED
              </div>
            </div>
          </div>
          <div style={{ padding: '32px' }}>
            <MilestoneGrid milestones={milestones} onEdit={openDateModal} />
          </div>
        </div>

        <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
          
          {/* Inventory Summary Card */}
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Box size={18} color="var(--accent)" />
                Inventory
              </h2>
              <Link href="/packing" className="badge badge-neutral card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>VIEW ALL</span> <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ padding: '40px 32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '48px' }}>
                 {inventorySummary.map(item => (
                   <div key={item.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                         <span style={{ color: item.color }}>{item.icon}</span>
                         <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>{item.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                         <span style={{ fontSize: '32px', fontWeight: 500, fontFamily: 'var(--font-headings)', color: 'var(--foreground)' }}>{item.percent}%</span>
                         <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>({item.count})</span>
                      </div>
                      <div style={{ height: '4px', width: '100%', background: 'var(--accent-soft)', borderRadius: '2px', marginTop: '16px', overflow: 'hidden' }}>
                         <div style={{ height: '100%', width: `${item.percent}%`, background: item.color, borderRadius: '2px' }}></div>
                      </div>
                   </div>
                 ))}
              </div>

              <div style={{ padding: '32px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                 <div className="flex justify-between items-center mb-4">
                   <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Packing Progress</div>
                   <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>{packingProgress}%</div>
                 </div>
                 <div style={{ height: '8px', background: '#fff', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', width: `${packingProgress}%`, background: 'var(--accent)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                 </div>
                 <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>
                   <CheckCircle2 size={14} />
                   <span>{packedItems} of {bringItems.length} items packed.</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Priority Actions Card */}
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Sparkles size={18} color="var(--accent)" />
                Focus
              </h2>
              <Link href="/tasks" className="badge badge-neutral card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>VIEW ALL</span> <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.tasks.filter(t => t.status !== 'Complete').slice(0, 10).map((task, idx) => (
                <div key={task.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '20px', 
                  padding: '24px 32px', 
                  borderBottom: idx === 9 || idx === data.tasks.filter(t => t.status !== 'Complete').slice(0, 10).length - 1 ? 'none' : '1px solid var(--border)',
                  transition: 'background-color 0.2s ease'
                }} className="task-row">
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ color: 'var(--border)', fontSize: '24px' }}>radio_button_unchecked</span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {data.categories.find(c => c.id === task.categoryId)?.name}
                      </div>
                      {getTaskDate(task) && (
                        <>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }}></div>
                          <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CalendarIcon size={12} />
                            <span>{format(getTaskDate(task)!, 'MMM d').toUpperCase()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="badge badge-neutral" style={{ fontSize: '9px', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--foreground)', border: 'none' }}>{task.owner.toUpperCase()}</div>
                </div>
              ))}
              {data.tasks.filter(t => t.status !== 'Complete').length === 0 && (
                <div style={{ padding: '100px 32px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 size={24} color="var(--accent)" />
                  </div>
                  <div style={{ fontSize: '16px', color: 'var(--foreground)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Plan Clear</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 400 }}>All priorities completed.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Date Edit Modal */}
      {isDateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,42,38,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', borderRadius: '16px' }}>
             <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
               <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>Update {activeDateLabel}</h2>
               <button onClick={() => setIsDateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
             </div>
             <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', background: '#fff' }}>
                {validationError && (
                  <div style={{ 
                    padding: '16px 20px', 
                    borderRadius: '8px', 
                    background: '#fff', 
                    border: '1px solid #dc2626', 
                    color: '#dc2626', 
                    fontSize: '13px', 
                    fontWeight: 500,
                    lineHeight: '1.5'
                  }}>
                    {validationError}
                  </div>
                )}
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date (YYYY-MM-DD)</label>
                      <button 
                        onClick={() => setTempDate('')}
                        style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}
                      >
                        CLEAR
                      </button>
                   </div>
                   <div style={{ position: 'relative' }}>
                     <input 
                       type="text"
                       placeholder="2026-04-16"
                       value={tempDate}
                       onChange={e => setTempDate(e.target.value)}
                       style={{ paddingRight: '48px', height: '52px', fontSize: '15px', fontWeight: 500, borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)' }}
                     />
                     <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
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
                </div>

                <div 
                  onClick={() => setTempConfirmed(!tempConfirmed)}
                  style={{ 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid',
                    borderColor: tempConfirmed ? 'var(--accent)' : 'var(--border)',
                    background: tempConfirmed ? 'var(--accent-soft)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    border: '1.5px solid',
                    borderColor: tempConfirmed ? 'var(--accent)' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: tempConfirmed ? 'var(--accent)' : 'transparent',
                    flexShrink: 0
                  }}>
                    {tempConfirmed && <CheckCircle2 size={16} color="#fff" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '0.02em' }}>Confirmed</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Lock this date in the timeline.</div>
                  </div>
                </div>
             </div>
             <div style={{ padding: '24px 32px', backgroundColor: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <button className="btn btn-secondary" style={{ background: 'transparent', border: '1px solid var(--border)', height: '48px', padding: '0 24px' }} onClick={() => setIsDateModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ gap: '10px', height: '48px', padding: '0 32px', fontWeight: 700, letterSpacing: '0.05em' }} onClick={saveQuickDate}>
                  SAVE
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
