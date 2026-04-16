'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus } from '@/lib/types';
import { Plus, Trash2, CheckCircle2, Circle, LayoutGrid, ChevronRight, User, MoreHorizontal } from 'lucide-react';

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
    if (!confirm('Are you sure?')) return;
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

  if (loading) return <div className="text-gray">Loading tasks...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Task Board</h1>
          <p className="text-gray text-sm">Organize and track every detail of your move.</p>
        </div>
        <div className="flex gap-2">
           <button className="btn btn-secondary" onClick={() => fetchData()}>Refresh</button>
        </div>
      </div>

      {data.categories.map(category => (
        <div key={category.id} className="mb-12">
          <div className="flex items-center justify-between mb-4 pb-2 border-bottom" style={{ borderBottom: '2px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-primary" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{category.name}</h2>
              <span className="badge badge-gray" style={{ marginLeft: '8px', fontSize: '10px' }}>
                {data.tasks.filter(t => t.categoryId === category.id).length}
              </span>
            </div>
            <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => addTask(category.id)}>
              <Plus size={14} style={{ marginRight: '4px' }} /> New Task
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            {data.tasks.filter(t => t.categoryId === category.id).map(task => (
              <div key={task.id} className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '20px', border: 'none', backgroundColor: task.status === 'Complete' ? '#f8fafc' : 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <button onClick={() => toggleTaskStatus(task)} style={{ display: 'flex', color: task.status === 'Complete' ? 'var(--primary)' : 'var(--secondary)' }}>
                  {task.status === 'Complete' ? 
                    <CheckCircle2 size={22} /> : 
                    <Circle size={22} />
                  }
                </button>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: '15px',
                    color: task.status === 'Complete' ? 'var(--secondary)' : 'var(--foreground)',
                    textDecoration: task.status === 'Complete' ? 'line-through' : 'none'
                  }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '2px' }}>
                      {task.description}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1 text-gray" style={{ fontSize: '12px', fontWeight: 600 }}>
                    <User size={14} />
                    {task.owner}
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="text-gray hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {data.tasks.filter(t => t.categoryId === category.id).length === 0 && (
              <div className="text-gray text-sm italic py-4 px-2">No tasks in this category yet.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
