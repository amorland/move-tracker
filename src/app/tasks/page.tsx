'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskStatus, TaskOwner, TimingType } from '@/lib/types';
import { Plus, Trash2, Edit2, CheckCircle2, Circle } from 'lucide-react';

export default function TasksPage() {
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1>All Tasks</h1>
        <button className="btn btn-primary" onClick={() => fetchData()}>Refresh</button>
      </div>

      {data.categories.map(category => (
        <div key={category.id} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ margin: 0 }}>{category.name}</h2>
            <button className="btn btn-secondary flex items-center gap-2" onClick={() => addTask(category.id)}>
              <Plus size={16} /> Add Task
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            {data.tasks.filter(t => t.categoryId === category.id).map(task => (
              <div key={task.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={() => toggleTaskStatus(task)}>
                  {task.status === 'Complete' ? 
                    <CheckCircle2 size={20} className="text-blue" /> : 
                    <Circle size={20} className="text-gray-300" />
                  }
                </button>
                <div style={{ flex: 1, textDecoration: task.status === 'Complete' ? 'line-through' : 'none', color: task.status === 'Complete' ? 'var(--gray-600)' : 'inherit' }}>
                  <div style={{ fontWeight: 500 }}>{task.title}</div>
                  {task.description && <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{task.description}</div>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="badge badge-gray">{task.owner}</div>
                  <button onClick={() => deleteTask(task.id)} className="text-gray-600 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {data.tasks.filter(t => t.categoryId === category.id).length === 0 && (
              <div className="text-gray-600 text-sm italic">No tasks yet.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
