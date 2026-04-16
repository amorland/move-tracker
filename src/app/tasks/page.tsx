'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus } from '@/lib/types';
import { CheckCircle2, Circle, PlayCircle, Plus, Trash2 } from 'lucide-react';

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
    if (!confirm('Abort step?')) return;
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const addTask = async (categoryId: number) => {
    const title = prompt('Step Title:');
    if (!title) return;
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, title, owner: 'Both', status: 'Not Started', timingType: 'Flexible', timingOffsetDays: 0, orderIndex: 0 })
    });
    fetchData();
  };

  if (loading) return <div style={{ color: '#949a9f' }}>Loading Pipeline Steps...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1>Pipeline Steps</h1>
        <button className="btn btn-outline" onClick={() => fetchData()}>Refresh Build</button>
      </div>

      {data.categories.map(category => (
        <div key={category.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', backgroundColor: '#f0f4f7', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{category.name}</h2>
            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => addTask(category.id)}>
              <Plus size={14} style={{ marginRight: '4px' }} /> ADD STEP
            </button>
          </div>
          
          <div>
            {data.tasks.filter(t => t.categoryId === category.id).map((task, idx) => (
              <div key={task.id} style={{ 
                padding: '12px 24px', 
                borderBottom: idx === data.tasks.filter(t => t.categoryId === category.id).length - 1 ? 'none' : '1px solid #f0f4f7',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  {task.status === 'Complete' ? 
                    <CheckCircle2 size={20} color="var(--jenkins-green)" /> : 
                    <PlayCircle size={20} color="var(--jenkins-blue)" />
                  }
                </button>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 500,
                    color: task.status === 'Complete' ? '#949a9f' : 'inherit'
                  }}>
                    {task.title}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="badge badge-gray">{task.owner}</span>
                  <button 
                    onClick={() => deleteTask(task.id)} 
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#949a9f' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {data.tasks.filter(t => t.categoryId === category.id).length === 0 && (
              <div style={{ padding: '24px', color: '#949a9f', fontSize: '13px', textAlign: 'center' }}>No steps defined in this stage.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
