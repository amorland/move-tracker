'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus, TaskOwner, TaskPhase, MoveSettings } from '@/lib/types';
import { CheckCircle2, Plus, Trash2, Layout, Calendar as CalendarIcon, X, Save, Filter, Clock, MoreVertical, MapPin, Bell } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';

export default function TasksPage() {
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  
  // Filters
  const [ownerFilter, setOwnerFilter] = useState<TaskOwner | 'All'>('All');
  const [phaseFilter, setPhaseFilter] = useState<TaskPhase | 'All'>('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [catRes, settingsRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/settings')
    ]);
    const categoriesData = await catRes.json();
    const settingsData = await settingsRes.json();
    setData(categoriesData);
    setSettings(settingsData);
    setLoading(false);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'Complete' ? 'Not Started' : 'Complete';
    const updated = { ...task, status: newStatus, completionDate: newStatus === 'Complete' ? new Date().toISOString().split('T')[0] : null };
    
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    fetchData();
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const openAddModal = (categoryId: number) => {
    setEditingTask({
      categoryId,
      title: '',
      description: '',
      status: 'Not Started',
      owner: 'Both',
      phase: 'Both',
      dueDate: null,
      completionDate: null,
      scheduledEventDate: null,
      scheduledEventTimeWindow: null,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const saveTask = async (task: Partial<Task>) => {
    const method = task.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/tasks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingTask(null);
      fetchData();
    }
  };

  const filteredTasks = data.tasks.filter(t => {
    const matchesOwner = ownerFilter === 'All' || t.owner === ownerFilter;
    const matchesPhase = phaseFilter === 'All' || t.phase === phaseFilter;
    return matchesOwner && matchesPhase;
  });

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading Starland Tasks...</div>;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <div className="flex flex-stack items-center justify-between mb-12">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Move Tasks</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Every action required for a successful transition.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px', height: '48px', padding: '0 24px', borderRadius: '12px' }} onClick={() => openAddModal(data.categories[0]?.id)}>
          <Plus size={20} /> Add Task
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>OWNER</label>
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value as any)} style={{ padding: '8px 16px', fontSize: '12px', height: '40px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <option value="All">All Owners</option>
            <option value="Andrew">Andrew</option>
            <option value="Tory">Tory</option>
            <option value="Both">Both</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>PHASE</label>
          <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value as any)} style={{ padding: '8px 16px', fontSize: '12px', height: '40px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <option value="All">All Phases</option>
            <option value="Move Out">Move Out</option>
            <option value="Move In">Move In</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {data.categories.map(category => {
          const catTasks = filteredTasks.filter(t => t.categoryId === category.id);
          if (catTasks.length === 0 && (ownerFilter !== 'All' || phaseFilter !== 'All')) return null;

          return (
            <div key={category.id}>
              <div className="flex justify-between items-center mb-4 px-2">
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>{category.name.toUpperCase()}</h2>
                <button 
                  onClick={() => openAddModal(category.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700 }}
                >
                  <Plus size={14} /> ADD
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--border)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {catTasks.length > 0 ? catTasks.map(task => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    onToggle={() => toggleTaskStatus(task)} 
                    onEdit={() => { setEditingTask(task); setIsModalOpen(true); }} 
                    onDelete={() => deleteTask(task.id)}
                  />
                )) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#fff', color: 'var(--text-secondary)', fontSize: '13px' }}>No tasks in this category.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && editingTask && (
        <TaskModal task={editingTask} onClose={() => setIsModalOpen(false)} onSave={saveTask} categories={data.categories} />
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task, onToggle: () => void, onEdit: () => void, onDelete: () => void }) {
  const isComplete = task.status === 'Complete';
  const hasEvent = !!task.scheduledEventDate;

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px', 
      padding: '16px 24px', 
      background: hasEvent ? 'var(--accent-soft)' : '#fff',
      opacity: isComplete ? 0.6 : 1
    }} className="task-row clickable" onClick={onEdit}>
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}
      >
        {isComplete ? 
          <CheckCircle2 size={24} color="var(--accent)" /> : 
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--border)', background: '#fff' }}></div>
        }
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {task.owner}
          </div>
          {task.dueDate && (
            <>
              <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarIcon size={12} /> {format(parseISO(task.dueDate), 'MMM d')}
              </div>
            </>
          )}
          {hasEvent && (
            <>
              <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></div>
              <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Bell size={12} /> EVENT: {format(parseISO(task.scheduledEventDate!), 'MMM d')}
                {task.scheduledEventTimeWindow && <span style={{ opacity: 0.8 }}>({task.scheduledEventTimeWindow})</span>}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><MoreVertical size={18} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover:text-red-500"><Trash2 size={18} /></button>
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onSave, categories }: { task: Partial<Task>, onClose: () => void, onSave: (t: Partial<Task>) => void, categories: Category[] }) {
  const [editing, setEditing] = useState(task);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,42,38,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{task.id ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#fff', maxHeight: '70vh', overflowY: 'auto' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Title</label>
            <input value={editing.title || ''} onChange={e => setEditing({...editing, title: e.target.value})} placeholder="e.g. Schedule move-out help" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Category</label>
              <select value={editing.categoryId} onChange={e => setEditing({...editing, categoryId: parseInt(e.target.value)})}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Owner</label>
              <select value={editing.owner} onChange={e => setEditing({...editing, owner: e.target.value as TaskOwner})}>
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
