'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus, TaskOwner, TimingType, TaskPhase } from '@/lib/types';
import { CheckCircle2, Circle, Plus, Trash2, Layout, User, Calendar as CalendarIcon, X, Save, Edit3, Filter, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TasksPage() {
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
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
    const res = await fetch('/api/categories');
    const data = await res.json();
    setData(data);
    setLoading(false);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'Complete' ? 'Not Started' : 'Complete';
    const updated = { ...task, status: newStatus };
    
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
      timingType: 'Flexible',
      timingOffsetDays: 0,
      dueDate: null,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const saveTask = async () => {
    if (!editingTask || !editingTask.title) return;

    const method = editingTask.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/tasks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingTask)
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

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading tasks...</div>;

  return (
    <div>
      <div className="flex flex-stack items-center justify-between mb-8">
        <div>
          <h1>Tasks</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Manage and track every detail of the move.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" style={{ gap: '8px' }} onClick={() => fetchData()}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sync</span>
            Sync
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: '32px', border: 'none', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
          <Filter size={14} /> FILTERS:
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>OWNER</label>
          <select 
            value={ownerFilter} 
            onChange={e => setOwnerFilter(e.target.value as any)}
            style={{ padding: '4px 12px', fontSize: '12px', height: '32px', minWidth: '100px' }}
          >
            <option value="All">All Owners</option>
            <option value="Andrew">Andrew</option>
            <option value="Tory">Tory</option>
            <option value="Both">Both</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>PHASE</label>
          <select 
            value={phaseFilter} 
            onChange={e => setPhaseFilter(e.target.value as any)}
            style={{ padding: '4px 12px', fontSize: '12px', height: '32px', minWidth: '120px' }}
          >
            <option value="All">All Phases</option>
            <option value="Move Out">Move Out</option>
            <option value="Move In">Move In</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {data.categories.map(category => {
          const catTasks = filteredTasks.filter(t => t.categoryId === category.id);
          const allCatTasks = data.tasks.filter(t => t.categoryId === category.id);
          const completedCount = allCatTasks.filter(t => t.status === 'Complete').length;
          const progressPercent = allCatTasks.length > 0 ? (completedCount / allCatTasks.length) * 100 : 0;

          if (catTasks.length === 0 && (ownerFilter !== 'All' || phaseFilter !== 'All')) return null;

          return (
            <div key={category.id} className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Layout size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{category.name}</h2>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{completedCount} of {allCatTasks.length} COMPLETED</div>
                  </div>
                </div>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', height: '32px' }} onClick={() => openAddModal(category.id)}>
                  <Plus size={14} style={{ marginRight: '6px' }} /> NEW TASK
                </button>
              </div>
              
              {/* Category Progress Bar */}
              <div style={{ height: '4px', width: '100%', background: '#f8f9fa' }}>
                 <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--success)', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
              </div>

              <div style={{ padding: '4px 0' }}>
                {catTasks.map((task, idx) => (
                  <div key={task.id} style={{ 
                    padding: '12px 24px', 
                    borderBottom: idx === catTasks.length - 1 ? 'none' : '1px solid #f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    backgroundColor: task.status === 'Complete' ? 'rgba(0,0,0,0.01)' : 'transparent',
                    transition: 'background-color 0.2s ease'
                  }} className="task-row">
                    <button 
                      onClick={() => toggleTaskStatus(task)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}
                    >
                      {task.status === 'Complete' ? 
                        <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '24px' }}>check_circle</span> : 
                        <span className="material-symbols-outlined" style={{ color: '#d1d5db', fontSize: '24px' }}>radio_button_unchecked</span>
                      }
                    </button>
                    
                    <div style={{ flex: 1, cursor: 'pointer', minWidth: 0, display: 'flex', alignItems: 'center', gap: '20px' }} onClick={() => openEditModal(task)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 600,
                          color: task.status === 'Complete' ? 'var(--text-secondary)' : 'var(--foreground)',
                          textDecoration: task.status === 'Complete' ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {task.title}
                        </div>
                        {/* Mobile-only metadata */}
                        <div className="mobile-only" style={{ display: 'none', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{task.dueDate ? format(parseISO(task.dueDate), 'MMM d') : ''}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)' }}>{task.owner}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }} className="task-metadata">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px' }}>
                          <CalendarIcon size={12} style={{ color: 'var(--text-secondary)' }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'No date'}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '70px' }}>
                          {task.phase}
                        </div>
                        <div className="badge badge-neutral" style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', minWidth: '65px', textAlign: 'center' }}>
                          {task.owner}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
                        style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '6px' }}
                        className="hover:text-red-500 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {catTasks.length === 0 && (
                  <div style={{ padding: '48px 24px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                    No matching tasks in this category.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Edit/Add Modal */}
      {isModalOpen && editingTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="justify-between">
              <h2 style={{ margin: 0, fontSize: '18px' }}>{editingTask.id ? 'Edit Task' : 'New Task'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Title</label>
                <input 
                  value={editingTask.title || ''} 
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  placeholder="Task title"
                  autoFocus
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Owner</label>
                  <select 
                    value={editingTask.owner || 'Both'} 
                    onChange={e => setEditingTask({...editingTask, owner: e.target.value as TaskOwner})}
                  >
                    <option value="Andrew">Andrew</option>
                    <option value="Tory">Tory</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Phase</label>
                  <select 
                    value={editingTask.phase || 'Both'} 
                    onChange={e => setEditingTask({...editingTask, phase: e.target.value as TaskPhase})}
                  >
                    <option value="Move Out">Move Out</option>
                    <option value="Move In">Move In</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Due Date (Optional)</label>
                <input 
                  type="date"
                  value={editingTask.dueDate || ''} 
                  onChange={e => setEditingTask({...editingTask, dueDate: e.target.value || null})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Notes</label>
                <textarea 
                  value={editingTask.notes || ''} 
                  onChange={e => setEditingTask({...editingTask, notes: e.target.value})}
                  placeholder="Additional details..."
                  style={{ height: '80px', resize: 'none' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', backgroundColor: '#fcfcfd', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ gap: '8px' }} onClick={saveTask}>
                <Save size={16} /> Save Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
