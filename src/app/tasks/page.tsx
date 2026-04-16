'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus } from '@/lib/types';
import { CheckCircle2, Circle, Plus, Trash2, Layout } from 'lucide-react';

export default function TasksPage() {
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [loading, setLoading] = useState(true);

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

  const addTask = async (categoryId: number) => {
    const title = prompt('Task Title:');
    if (!title) return;
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, title, owner: 'Both', status: 'Not Started', timingType: 'Flexible', timingOffsetDays: 0, orderIndex: 0 })
    });
    fetchData();
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading tasks...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Task List</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Everything needed for the Clearwater to Cold Spring move.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => fetchData()}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>sync</span>
          Refresh
        </button>
      </div>

      {data.categories.map(category => {
        const catTasks = data.tasks.filter(t => t.categoryId === category.id);
        const completedCount = catTasks.filter(t => t.status === 'Complete').length;
        const progressPercent = catTasks.length > 0 ? (completedCount / catTasks.length) * 100 : 0;

        return (
          <div key={category.id} className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#fdfdfe', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Layout size={16} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{category.name}</h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{completedCount} of {catTasks.length} tasks completed</div>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => addTask(category.id)}>
                <Plus size={14} style={{ marginRight: '6px' }} /> ADD TASK
              </button>
            </div>
            
            {/* Category Progress Bar */}
            <div style={{ height: '3px', width: '100%', background: '#f1f3f5' }}>
               <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--success)', transition: 'width 0.5s ease' }}></div>
            </div>

            <div style={{ padding: '8px 0' }}>
              {catTasks.map((task, idx) => (
                <div key={task.id} style={{ 
                  padding: '14px 24px', 
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
                      <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '24px' }}>check_circle</span> : 
                      <span className="material-symbols-outlined" style={{ color: 'var(--border)', fontSize: '24px' }}>radio_button_unchecked</span>
                    }
                  </button>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 600,
                      color: task.status === 'Complete' ? 'var(--text-secondary)' : 'var(--foreground)',
                      textDecoration: task.status === 'Complete' ? 'line-through' : 'none'
                    }}>
                      {task.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{task.owner}</span>
                    <button 
                      onClick={() => deleteTask(task.id)} 
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--border)' }}
                      className="hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {catTasks.length === 0 && (
                <div style={{ padding: '32px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', fontStyle: 'italic' }}>No tasks in this category yet.</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
