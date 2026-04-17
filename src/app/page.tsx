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
  
  // Task Editing state for interactivity
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

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
      body: JSON.stringify({ ...task, status: newStatus, completionDate: newStatus === 'Complete' ? new Date().toISOString().split('T')[0] : null })
    });
    fetchData();
  };

  const saveTask = async (task: Partial<Task>) => {
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    setIsTaskModalOpen(false);
    fetchData();
  };

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading Starland hub...</div>;

  const completedTasks = data.tasks.filter(t => t.status === 'Complete').length;
  const totalTasks = data.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const moveDateStr = settings.confirmedMoveDate || settings.earliestMoveDate;
  const daysToMove = differenceInDays(parseISO(moveDateStr), new Date());

  const bringItems = packingItems.filter(i => i.action === 'Bring');
  const resolvedItems = packingItems.filter(i => i.status === 'Resolved');
  const resolutionProgress = packingItems.length > 0 ? Math.round((resolvedItems.length / packingItems.length) * 100) : 0;

  const totalItems = packingItems.length;
  const getInventoryPercent = (count: number) => totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;

  const inventorySummary = [
    { label: 'BRING', count: bringItems.length, resolved: bringItems.filter(i => i.status === 'Resolved').length, color: 'var(--accent)', icon: <Box size={14} /> },
    { label: 'SELL', count: packingItems.filter(i => i.action === 'Sell').length, resolved: packingItems.filter(i => i.action === 'Sell' && i.status === 'Resolved').length, color: '#d1cdc4', icon: <Star size={14} /> },
    { label: 'DONATE', count: packingItems.filter(i => i.action === 'Donate').length, resolved: packingItems.filter(i => i.action === 'Donate' && i.status === 'Resolved').length, color: '#e0dbd5', icon: <MapPin size={14} /> },
    { label: 'TRASH', count: packingItems.filter(i => i.action === 'Trash').length, resolved: packingItems.filter(i => i.action === 'Trash' && i.status === 'Resolved').length, color: '#e5e1da', icon: <Clock size={14} /> }
  ];

  const milestones = getMilestones(settings);

  const stages = [
    { name: 'Strategy', status: progress > 15 ? 'complete' : 'current', icon: 'assignment' },
    { name: 'Packing', status: progress > 50 ? 'complete' : progress > 15 ? 'current' : 'pending', icon: 'package_2' },
    { name: 'Transit', status: progress > 85 ? 'complete' : progress > 50 ? 'current' : 'pending', icon: 'local_shipping' },
    { name: 'Settling', status: progress === 100 ? 'complete' : progress > 85 ? 'current' : 'pending', icon: 'celebration' }
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
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
                  <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-headings)', color: stage.status === 'pending' ? 'var(--text-secondary)' : 'var(--foreground)', letterSpacing: '0.15em', textTransform: 'uppercase', position: 'absolute', top: '75px', whiteSpace: 'nowrap' }}>
                    {stage.name}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`progress-connector ${stage.status === 'complete' ? 'filled' : ''}`} style={{ marginTop: '-40px', height: '1.5px', background: stage.status === 'complete' ? 'var(--accent)' : 'var(--border)' }}></div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-stack justify-between items-end" style={{ marginTop: '100px', paddingTop: '48px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Overall Progress</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <span style={{ fontSize: '72px', fontWeight: 500, fontFamily: 'var(--font-headings)', color: 'var(--foreground)', lineHeight: 1, letterSpacing: '-0.02em' }}>{progress}%</span>
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Complete</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div onClick={() => openDateModal('confirmedMoveDate', 'Move Date')} style={{ fontSize: '32px', fontWeight: 600, fontFamily: 'var(--font-headings)', color: 'var(--foreground)', lineHeight: 1, marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }} className="hover-opacity">
              {daysToMove > 0 ? `${daysToMove} Days` : daysToMove === 0 ? "Move Day" : 'Complete'}
            </div>
            <div onClick={() => openDateModal('confirmedMoveDate', 'Move Date')} className="flex items-center gap-2 justify-end" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {settings.confirmedMoveDate ? <CheckCircle2 size={14} color="var(--accent)" /> : <Clock size={14} />}
              <span>{settings.confirmedMoveDate ? 'Confirmed' : 'Estimated'}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <CalendarIcon size={18} color="var(--accent)" />
              Relocation Milestones
            </h2>
          </div>
          <div style={{ padding: '32px' }}>
            <MilestoneGrid milestones={milestones} onEdit={openDateModal} />
          </div>
        </div>

        <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Box size={18} color="var(--accent)" />
                Inventory Resolution
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
                         <span style={{ fontSize: '32px', fontWeight: 500, fontFamily: 'var(--font-headings)', color: 'var(--foreground)' }}>{item.resolved}/{item.count}</span>
                         <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>RESOLVED</span>
                      </div>
                   </div>
                 ))}
              </div>
              <div style={{ padding: '32px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                 <div className="flex justify-between items-center mb-4">
                   <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Resolution Progress</div>
                   <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>{resolutionProgress}%</div>
                 </div>
                 <div style={{ height: '8px', background: '#fff', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', width: `${resolutionProgress}%`, background: 'var(--accent)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                 </div>
              </div>
            </div>
          </div>

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
              {data.tasks.filter(t => t.status !== 'Complete').slice(0, 8).map((task, idx) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 32px', borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s ease', cursor: 'pointer' }} className="task-row clickable" onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}>
                  <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border)', background: '#fff' }}></div>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                  </div>
                  <ChevronRight size={14} color="var(--border)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isDateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,42,38,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', borderRadius: '16px' }}>
             <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
               <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>Update {activeDateLabel}</h2>
               <button onClick={() => setIsDateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
             </div>
             <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', background: '#fff' }}>
                {validationError && <div style={{ padding: '16px 20px', borderRadius: '8px', background: '#fff', border: '1px solid #dc2626', color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>{validationError}</div>}
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date (YYYY-MM-DD)</label>
                      <button onClick={() => setTempDate('')} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>CLEAR</button>
                   </div>
                   <div style={{ position: 'relative' }}>
                     <input type="text" value={tempDate} onChange={e => setTempDate(e.target.value)} style={{ paddingRight: '48px', height: '52px', fontSize: '15px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)' }} />
                     <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                           <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }} />
                           <CalendarIcon size={20} color="var(--accent)" style={{ position: 'absolute', inset: 0, margin: 'auto', zIndex: 1 }} />
                        </div>
                     </div>
                   </div>
                </div>
                <div onClick={() => setTempConfirmed(!tempConfirmed)} style={{ padding: '24px', borderRadius: '12px', border: '1px solid', borderColor: tempConfirmed ? 'var(--accent)' : 'var(--border)', background: tempConfirmed ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1.5px solid', borderColor: tempConfirmed ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tempConfirmed ? 'var(--accent)' : 'transparent' }}>{tempConfirmed && <CheckCircle2 size={16} color="#fff" />}</div>
                  <div><div style={{ fontSize: '14px', fontWeight: 600 }}>Confirmed</div><div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lock this date in the timeline.</div></div>
                </div>
             </div>
             <div style={{ padding: '24px 32px', backgroundColor: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <button className="btn btn-secondary" onClick={() => setIsDateModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveQuickDate}>SAVE</button>
             </div>
          </div>
        </div>
      )}

      {isTaskModalOpen && editingTask && (
        <TaskModalWrapper task={editingTask} onClose={() => setIsTaskModalOpen(false)} onSave={saveTask} categories={data.categories} />
      )}
    </div>
  );
}

// Wrapper for reusing TaskModal logic from Tasks page but with some customization if needed
function TaskModalWrapper({ task, onClose, onSave, categories }: { task: Partial<Task>, onClose: () => void, onSave: (t: Partial<Task>) => void, categories: Category[] }) {
  const [editing, setEditing] = useState(task);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,42,38,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>EDIT TASK</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#fff', maxHeight: '70vh', overflowY: 'auto' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Title</label>
            <input value={editing.title || ''} onChange={e => setEditing({...editing, title: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Status</label>
              <select value={editing.status} onChange={e => setEditing({...editing, status: e.target.value as any})}>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Owner</label>
              <select value={editing.owner} onChange={e => setEditing({...editing, owner: e.target.value as any})}>
                <option value="Andrew">Andrew</option>
                <option value="Tory">Tory</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: '24px 32px', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save</button>
        </div>
      </div>
    </div>
  );
}
