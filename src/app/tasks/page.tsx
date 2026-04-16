'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus, TaskOwner, TimingType } from '@/lib/types';
import { CheckCircle2, Circle, Plus, Trash2, Layout, User, Calendar as CalendarIcon, X, Save, Edit3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TasksPage() {
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

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

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading tasks...</div>;

  return (
    <div>
      <div className="flex flex-stack items-center justify-between mb-12">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Tasks</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Manage and track every detail of the move.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => fetchData()}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>sync</span>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {data.categories.map(category => {
          const catTasks = data.tasks.filter(t => t.categoryId === category.id);
          const completedCount = catTasks.filter(t => t.status === 'Complete').length;
          const progressPercent = catTasks.length > 0 ? (completedCount / catTasks.length) * 100 : 0;

          return (
            <div key={category.id} className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Layout size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{category.name}</h2>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{completedCount} of {catTasks.length} COMPLETED</div>
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
                    padding: '16px 24px', 
                    borderBottom: idx === catTasks.length - 1 ? 'none' : '1px solid #f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    backgroundColor: task.status === 'Complete' ? 'rgba(0,0,0,0.01)' : 'transparent'
                  }}>
                    <button 
                      onClick={() => toggleTaskStatus(task)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      {task.status === 'Complete' ? 
                        <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '26px' }}>check_circle</span> : 
                        <span className="material-symbols-outlined" style={{ color: '#d1d5db', fontSize: '26px' }}>radio_button_unchecked</span>
                      }
                    </button>
                    
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openEditModal(task)}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 600,
                        color: task.status === 'Complete' ? 'var(--text-secondary)' : 'var(--foreground)',
                        textDecoration: task.status === 'Complete' ? 'line-through' : 'none',
                        transition: 'all 0.2s ease'
                      }}>
                        {task.title}
                      </div>
                      {task.dueDate && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon size={10} />
                          {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5 badge badge-neutral" style={{ fontSize: '10px', padding: '4px 8px' }}>
                        <User size={10} />
                        {task.owner}
                      </div>
                      <button 
                        onClick={() => deleteTask(task.id)} 
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e5e7eb' }}
                        className="hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {catTasks.length === 0 && (
                  <div style={{ padding: '40px 24px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', fontStyle: 'italic' }}>
                    No tasks in this category. Click "New Task" to add one.
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
                  value={editingTask.description || ''} 
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
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
