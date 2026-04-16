'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus } from '@/lib/types';

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

  if (loading) return <div style={{ color: '#5f6368' }}>Loading Tasks...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1>Tasks</h1>
        <button className="btn btn-primary" onClick={() => fetchData()}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>refresh</span>
          Refresh
        </button>
      </div>

      {data.categories.map(category => (
        <div key={category.id} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ margin: 0 }}>{category.name}</h2>
            <button className="btn btn-outline" style={{ height: '32px', padding: '0 12px' }} onClick={() => addTask(category.id)}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>add</span>
              Add task
            </button>
          </div>
          
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #dadce0', overflow: 'hidden' }}>
            {data.tasks.filter(t => t.categoryId === category.id).map((task, idx) => (
              <div key={task.id} style={{ 
                padding: '12px 16px', 
                borderBottom: idx === data.tasks.filter(t => t.categoryId === category.id).length - 1 ? 'none' : '1px solid #f1f3f4',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                opacity: task.status === 'Complete' ? 0.6 : 1
              }}>
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  style={{ 
                    border: 'none', 
                    background: 'none', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  <span className="material-symbols-outlined" style={{ 
                    color: task.status === 'Complete' ? '#1e8e3e' : '#5f6368',
                    fontSize: '22px'
                  }}>
                    {task.status === 'Complete' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </button>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 400,
                    textDecoration: task.status === 'Complete' ? 'line-through' : 'none'
                  }}>
                    {task.title}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="badge badge-gray" style={{ fontSize: '10px' }}>{task.owner}</div>
                  <button 
                    onClick={() => deleteTask(task.id)} 
                    style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}
                    className="text-gray"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
            {data.tasks.filter(t => t.categoryId === category.id).length === 0 && (
              <div style={{ padding: '16px', color: '#5f6368', fontSize: '14px', fontStyle: 'italic' }}>No tasks in this category.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
