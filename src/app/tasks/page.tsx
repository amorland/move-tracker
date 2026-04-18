'use client';

import { useEffect, useState } from 'react';
import { Category, Task, TaskOwner } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { Check, CheckCircle2, Plus, Trash2, X, ChevronDown, ChevronRight, Calendar, Pencil, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type OwnerFilter = TaskOwner | 'All';

const OWNER_CYCLE: (TaskOwner | null)[] = [null, 'Andrew', 'Tory'];

export default function TasksPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('All');
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [modalTask, setModalTask] = useState<Partial<Task> | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | null>(null);

  useScrollLock(modalTask !== null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const res = await fetch('/api/categories');
    const { categories: cats, tasks: ts } = await res.json();
    setCategories(cats);
    setTasks(ts);
    if (cats.length) setDefaultCategoryId(cats[0].id);
    setLoading(false);
  };

  const toggleComplete = async (task: Task) => {
    const isComplete = task.status === 'Complete';
    const newStatus = isComplete ? 'Not Started' : 'Complete';
    const completedAt = isComplete ? null : new Date().toISOString().split('T')[0];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as any, completedAt } : t));
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus, completedAt }),
    });
  };

  const cycleOwner = async (task: Task) => {
    const idx = OWNER_CYCLE.indexOf(task.owner);
    const next = OWNER_CYCLE[(idx + 1) % OWNER_CYCLE.length];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, owner: next } : t));
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, owner: next }),
    });
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const saveTask = async (task: Partial<Task>) => {
    const method = task.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/tasks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (res.ok) { setModalTask(null); fetchData(); }
  };

  const filtered = tasks.filter(t => {
    if (ownerFilter !== 'All' && t.owner !== ownerFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const incomplete = filtered.filter(t => t.status !== 'Complete');
  const complete = filtered.filter(t => t.status === 'Complete');

  // Group incomplete tasks by category, preserving category order
  const grouped = categories
    .map(cat => ({ cat, tasks: incomplete.filter(t => t.categoryId === cat.id) }))
    .filter(g => g.tasks.length > 0);

  const totalDone = tasks.filter(t => t.status === 'Complete').length;
  const isFiltering = ownerFilter !== 'All' || !!search;

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading tasks…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>The List</h1>
          <p className="page-subtitle">{totalDone} of {tasks.length} complete</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setModalTask({ categoryId: defaultCategoryId ?? 0, title: '', status: 'Not Started', owner: null, dueDate: null, notes: '' })}>
          <Plus size={18} /> Add Task
        </button>
      </div>

      {/* Search + Owner filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['All', 'Andrew', 'Tory'] as const).map(o => (
            <button
              key={o}
              onClick={() => setOwnerFilter(o)}
              className={`filter-chip ${ownerFilter === o ? 'filter-chip-active' : ''}`}
            >
              {o === 'All' ? 'All owners' : o}
            </button>
          ))}
          {isFiltering && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setOwnerFilter('All'); }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Single flat task list */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 32 }}>
        {grouped.length === 0 && complete.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-secondary)', fontSize: 14 }}>
            {isFiltering ? 'No tasks match your filters.' : 'No tasks yet. Add one above.'}
          </div>
        )}

        {grouped.map(({ cat, tasks: catTasks }, groupIdx) => (
          <div key={cat.id}>
            {/* Category divider */}
            <div style={{
              padding: '8px 16px',
              background: 'var(--color-background)',
              borderTop: groupIdx > 0 ? '1px solid var(--color-border)' : 'none',
            }}>
              <span className="section-label">{cat.name}</span>
            </div>
            {catTasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                isLast={false}
                onToggle={() => toggleComplete(task)}
                onCycleOwner={() => cycleOwner(task)}
                onEdit={() => setModalTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        ))}

        {/* Completed section */}
        {complete.length > 0 && (
          <>
            <button
              onClick={() => setShowCompleted(v => !v)}
              style={{
                width: '100%', padding: '10px 20px',
                background: 'var(--color-background)', border: 'none',
                borderTop: grouped.length > 0 ? '1px solid var(--color-border)' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 11, fontWeight: 700, color: 'var(--color-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {complete.length} completed
            </button>
            {showCompleted && complete.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                isLast={i === complete.length - 1}
                onToggle={() => toggleComplete(task)}
                onCycleOwner={() => cycleOwner(task)}
                onEdit={() => setModalTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </>
        )}
      </div>

      {modalTask && (
        <TaskModal task={modalTask} categories={categories} onClose={() => setModalTask(null)} onSave={saveTask} />
      )}
    </div>
  );
}

function TaskRow({ task, isLast, onToggle, onCycleOwner, onEdit, onDelete }: {
  task: Task; isLast: boolean;
  onToggle: () => void; onCycleOwner: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const done = task.status === 'Complete';
  return (
    <div
      className="task-row"
      style={{
        display: 'flex', alignItems: 'stretch',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        borderLeft: done ? 'none' : '3px solid var(--color-accent)',
        background: done ? 'var(--color-background)' : 'var(--color-surface)',
        transition: 'background 0.2s',
      }}
    >
      {/* Left: owner tag */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0, minWidth: 72 }}>
        <button
          onClick={e => { e.stopPropagation(); onCycleOwner(); }}
          className={`owner-tag ${task.owner ? 'owner-tag-set' : ''}`}
          title="Cycle owner"
          style={{ opacity: done ? 0.4 : 1 }}
        >
          {task.owner ?? '+ owner'}
        </button>
      </div>

      {/* Task info — click to edit */}
      <div style={{ flex: 1, padding: '13px 8px', cursor: 'pointer', minWidth: 0 }} onClick={onEdit}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: 'var(--color-secondary)',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.7 : 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'all 0.2s',
        }}>
          {task.title}
        </div>
        {(task.dueDate || (done && task.completedAt)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            {task.dueDate && !done && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-secondary)', opacity: 0.8 }}>
                <Calendar size={10} /> {format(parseISO(task.dueDate), 'MMM d')}
              </span>
            )}
            {done && task.completedAt && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-accent-dark)', opacity: 0.7 }}>
                <CheckCircle2 size={10} /> {format(parseISO(task.completedAt), 'MMM d')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: icon chips */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4, flexShrink: 0 }}>
        <div className="row-actions" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="row-action-btn" title="Edit task">
            <Pencil size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="row-action-btn row-action-delete" title="Delete task">
            <Trash2 size={14} />
          </button>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`done-chip ${done ? 'done-chip-active' : ''}`}
          title={done ? 'Mark incomplete' : 'Mark complete'}
        >
          <Check size={14} strokeWidth={done ? 3 : 2} />
        </button>
      </div>
    </div>
  );
}

function TaskModal({ task, categories, onClose, onSave }: {
  task: Partial<Task>; categories: Category[];
  onClose: () => void; onSave: (t: Partial<Task>) => void;
}) {
  const [editing, setEditing] = useState(task);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{task.id ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Schedule move-out cleaners" autoFocus={!task.id} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Category</label>
              <select value={editing.categoryId} onChange={e => setEditing({ ...editing, categoryId: Number(e.target.value) })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Due Date</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={editing.dueDate || ''}
                  onChange={e => setEditing({ ...editing, dueDate: e.target.value || null })}
                  style={{ flex: 1, minWidth: 0 }}
                />
                {editing.dueDate && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing({ ...editing, dueDate: null })} style={{ flexShrink: 0 }}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={{ height: 80, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Task</button>
        </div>
      </div>
    </div>
  );
}
