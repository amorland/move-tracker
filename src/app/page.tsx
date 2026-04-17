'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task, PackingItem } from '@/lib/types';
import { format, parseISO, isBefore } from 'date-fns';
import { MapPin, Star, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, Box, X, Save, Edit3, Sparkles, Navigation, DollarSign, Heart, Trash } from 'lucide-react';
import Link from 'next/link';
import { getMilestones, validateDates, Milestone } from '@/lib/dateUtils';

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
    
    // EMERGENCY CLEANUP (Frontend): Sanitize state to avoid validation deadlock
    if (settingsData.isClosingDateConfirmed && !settingsData.closingDate) settingsData.isClosingDateConfirmed = false;
    if (settingsData.isUpackDropoffConfirmed && !settingsData.upackDropoffDate) settingsData.isUpackDropoffConfirmed = false;
    if (settingsData.isUpackPickupConfirmed && !settingsData.upackPickupDate) settingsData.isUpackPickupConfirmed = false;
    if (settingsData.isDriveStartConfirmed && !settingsData.driveStartDate) settingsData.isDriveStartConfirmed = false;
    if (settingsData.isArrivalConfirmed && !settingsData.arrivalDate) settingsData.isArrivalConfirmed = false;
    if (settingsData.isUpackDeliveryConfirmed && !settingsData.upackDeliveryDate) settingsData.isUpackDeliveryConfirmed = false;
    if (settingsData.isUpackFinalPickupConfirmed && !settingsData.upackFinalPickupDate) settingsData.isUpackFinalPickupConfirmed = false;

    setSettings(settingsData);
    setData(await categoriesRes.json());
    setPackingItems(await packingRes.json());
    setLoading(false);
  };

  const getActualConfirmKey = (key: string) => {
    const confirmKeyMap: Record<string, string> = {
      'closingDate': 'isClosingDateConfirmed',
      'upackDropoffDate': 'isUpackDropoffConfirmed',
      'upackPickupDate': 'isUpackPickupConfirmed',
      'driveStartDate': 'isDriveStartConfirmed',
      'arrivalDate': 'isArrivalConfirmed',
      'upackDeliveryDate': 'isUpackDeliveryConfirmed',
      'upackFinalPickupDate': 'isUpackFinalPickupConfirmed'
    };
    return confirmKeyMap[key] || `is${key.charAt(0).toUpperCase()}${key.slice(1)}Confirmed`.replace('DateConfirmed', 'Confirmed');
  };

  const openDateModal = (key: string, label: string) => {
    if (!settings) return;
    setActiveDateKey(key);
    setActiveDateLabel(label);
    setValidationError(null);
    // @ts-ignore
    setTempDate(settings[key] || '');
    const actualConfirmKey = getActualConfirmKey(key);
    // @ts-ignore
    setTempConfirmed(!!settings[actualConfirmKey]);
    setIsDateModalOpen(true);
  };

  const saveQuickDate = async () => {
    if (!settings || !activeDateKey) return;
    const normalizedDate = (tempDate && tempDate.trim()) ? tempDate.trim() : null;
    const updatePayload: any = { [activeDateKey]: normalizedDate };
    const actualConfirmKey = getActualConfirmKey(activeDateKey);
    
    if (tempConfirmed && !normalizedDate) {
      setValidationError(`${activeDateLabel} cannot be confirmed without a date.`);
      return;
    }
    updatePayload[actualConfirmKey] = tempConfirmed;

    const projectedSettings = { ...settings, ...updatePayload };
    
    // Sanitize projected settings before validation
    if (projectedSettings.isClosingDateConfirmed && !projectedSettings.closingDate) projectedSettings.isClosingDateConfirmed = false;
    if (projectedSettings.isUpackDropoffConfirmed && !projectedSettings.upackDropoffDate) projectedSettings.isUpackDropoffConfirmed = false;
    if (projectedSettings.isUpackPickupConfirmed && !projectedSettings.upackPickupDate) projectedSettings.isUpackPickupConfirmed = false;
    if (projectedSettings.isDriveStartConfirmed && !projectedSettings.driveStartDate) projectedSettings.isDriveStartConfirmed = false;
    if (projectedSettings.isArrivalConfirmed && !projectedSettings.arrivalDate) projectedSettings.isArrivalConfirmed = false;
    if (projectedSettings.isUpackDeliveryConfirmed && !projectedSettings.upackDeliveryDate) projectedSettings.isUpackDeliveryConfirmed = false;
    if (projectedSettings.isUpackFinalPickupConfirmed && !projectedSettings.upackFinalPickupDate) projectedSettings.isUpackFinalPickupConfirmed = false;

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
      setSettings(projectedSettings);
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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading Starland Hub...</div>;

  const milestones = getMilestones(settings);

  const bringItems = packingItems.filter(i => i.action === 'Bring');
  const resolvedItems = packingItems.filter(i => i.status === 'Resolved');
  const resolutionProgress = packingItems.length > 0 ? Math.round((resolvedItems.length / packingItems.length) * 100) : 0;

  const inventorySummary = [
    { label: 'BRING', count: bringItems.length, resolved: bringItems.filter(i => i.status === 'Resolved').length, color: 'var(--accent)', icon: <Box size={14} /> },
    { label: 'SELL', count: packingItems.filter(i => i.action === 'Sell').length, resolved: packingItems.filter(i => i.action === 'Sell' && i.status === 'Resolved').length, color: '#d1cdc4', icon: <DollarSign size={14} /> },
    { label: 'DONATE', count: packingItems.filter(i => i.action === 'Donate').length, resolved: packingItems.filter(i => i.action === 'Donate' && i.status === 'Resolved').length, color: '#e0dbd5', icon: <Heart size={14} /> },
    { label: 'TRASH', count: packingItems.filter(i => i.action === 'Trash').length, resolved: packingItems.filter(i => i.action === 'Trash' && i.status === 'Resolved').length, color: '#e5e1da', icon: <Trash size={14} /> }
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingBottom: '80px' }}>
      <div className="flex flex-stack items-center justify-between" style={{ marginBottom: '48px' }}>
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
            <h1 style={{ marginBottom: '8px', letterSpacing: '0.02em' }}>
              Starland Moving
            </h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Andrew & Tory’s Relocation Hub</p>
          </div>
        </div>
      </div>
      
      <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '48px', alignItems: 'start' }}>
        
        {/* Move Narrative Card */}
        <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
            <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Move Narrative
            </h2>
            <Link href="/timeline" className="badge badge-neutral card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>VIEW ALL</span> <ChevronRight size={14} />
            </Link>
          </div>
          <div className="timeline-container" style={{ position: 'relative', padding: '32px' }}>
            {milestones.map((m, index) => (
              <div key={m.key} style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                {/* Timeline Connector Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: m.status === 'confirmed' ? 'var(--accent)' : m.status === 'estimated' ? 'var(--text-secondary)' : '#fff', 
                    border: m.status === 'unset' ? '2px solid var(--border)' : 'none',
                    zIndex: 2,
                    marginTop: '12px',
                    boxShadow: m.status === 'confirmed' ? '0 0 0 4px var(--accent-soft)' : 'none'
                  }} />
                  {index < milestones.length - 1 && (
                    <div style={{ 
                      width: '1px', 
                      flex: 1, 
                      background: 'var(--border)', 
                      margin: '8px 0',
                      zIndex: 1
                    }} />
                  )}
                </div>
                
                {/* Card Container */}
                <div style={{ flex: 1, paddingBottom: index === milestones.length - 1 ? 0 : '32px' }}>
                  <NarrativeCard 
                    milestone={m} 
                    onClick={() => openDateModal(m.key, m.label)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {/* Inventory Resolution Card */}
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
              <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Inventory Resolution
              </h2>
              <Link href="/packing" className="badge badge-neutral card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>VIEW ALL</span> <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ padding: '32px' }}>
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

          {/* Priority Actions Card */}
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
              <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Focus
              </h2>
              <Link href="/tasks" className="badge badge-neutral card-hover-effect" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>VIEW ALL</span> <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.tasks.filter(t => t.status !== 'Complete').slice(0, 8).map((task) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 32px', borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s ease', cursor: 'pointer' }} className="task-row clickable" onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}>
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

function NarrativeCard({ milestone, onClick }: { milestone: Milestone, onClick: () => void }) {
  const isConfirmed = milestone.status === 'confirmed';
  const isUnset = milestone.status === 'unset';
  const date = milestone.date ? parseISO(milestone.date) : null;
  
  return (
    <div 
      onClick={onClick}
      style={{ 
        padding: '24px 28px', 
        borderRadius: '12px', 
        background: isConfirmed ? 'var(--accent-soft)' : isUnset ? 'transparent' : '#fff',
        border: isConfirmed ? '1px solid var(--accent)' : isUnset ? '1px dashed var(--border)' : '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        boxShadow: isConfirmed ? 'var(--shadow-sm)' : 'none',
        opacity: isUnset ? 0.7 : 1
      }} 
      className="card-hover-effect"
    >
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '10px', 
          fontWeight: 700, 
          color: isConfirmed ? 'var(--accent)' : 'var(--text-secondary)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.12em',
          marginBottom: '8px'
        }}>
          {milestone.label}
        </div>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: isConfirmed ? 600 : 500, 
          color: isUnset ? 'var(--text-secondary)' : 'var(--foreground)',
          fontFamily: 'var(--font-headings)',
          letterSpacing: '-0.01em'
        }}>
          {date ? format(date, 'MMMM d, yyyy') : 'Not set'}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <div style={{ 
          fontSize: '9px', 
          fontWeight: 700, 
          color: isConfirmed ? 'var(--accent)' : 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '4px 8px',
          background: isConfirmed ? 'rgba(255,255,255,0.5)' : isUnset ? 'transparent' : 'var(--background)',
          borderRadius: '4px',
          border: '1px solid',
          borderColor: isConfirmed ? 'var(--accent)' : 'var(--border)'
        }}>
          {isConfirmed ? 'CONFIRMED' : isUnset ? 'UNSET' : 'ESTIMATED'}
        </div>
        {isConfirmed ? (
          <CheckCircle2 size={16} color="var(--accent)" fill="white" />
        ) : (
          <Clock size={16} color="var(--text-secondary)" />
        )}
      </div>
    </div>
  );
}

// Wrapper for reusing TaskModal logic from Tasks page
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Due Date</label>
              <input type="date" value={editing.dueDate || ''} onChange={e => setEditing({...editing, dueDate: e.target.value || null})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Completion Date</label>
              <input type="date" value={editing.completionDate || ''} onChange={e => setEditing({...editing, completionDate: e.target.value || null})} />
            </div>
          </div>
          <div style={{ padding: '20px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>Scheduled Event</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Event Date</label>
                <input type="date" value={editing.scheduledEventDate || ''} onChange={e => setEditing({...editing, scheduledEventDate: e.target.value || null})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Time Window</label>
                <input value={editing.scheduledEventTimeWindow || ''} onChange={e => setEditing({...editing, scheduledEventTimeWindow: e.target.value})} placeholder="e.g. 12pm - 4pm" />
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Notes</label>
            <textarea value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} style={{ height: '80px', resize: 'none' }} />
          </div>
        </div>
        <div style={{ padding: '24px 32px', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Task</button>
        </div>
      </div>
    </div>
  );
}
