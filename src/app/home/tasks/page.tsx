'use client';

import DocumentAttachmentSection from '@/components/DocumentAttachmentSection';
import HomeSubnav from '@/components/HomeSubnav';
import { PlanningTask, TaskOwner, Track, TrackKey } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { format, parseISO } from 'date-fns';
import { Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type OwnerFilter = TaskOwner | 'All';
type SectionKey = PlanningTask['section'] | 'all';

const OWNER_CYCLE: (TaskOwner | null)[] = [null, 'Andrew', 'Tory'];
const TRACK_FILTERS: TrackKey[] = ['home_purchase', 'loan', 'home_updates'];

export default function HomeTasksPage() {
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('All');
  const [trackFilter, setTrackFilter] = useState<TrackKey | 'all'>('all');
  const [sectionFilter, setSectionFilter] = useState<SectionKey>('all');
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [modalTask, setModalTask] = useState<Partial<PlanningTask> | null>(null);

  useScrollLock(modalTask !== null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [taskRes, trackRes] = await Promise.all([
      fetch('/api/planning-tasks'),
      fetch('/api/tracks'),
    ]);
    const taskData: PlanningTask[] = await taskRes.json();
    const trackData: Track[] = await trackRes.json();
    setTasks(taskData.filter(task => TRACK_FILTERS.includes(task.trackKey as TrackKey)));
    setTracks(trackData.filter(track => TRACK_FILTERS.includes(track.key)));
    setLoading(false);
  };

  const toggleComplete = async (task: PlanningTask) => {
    const isComplete = task.status === 'Complete';
    const status = isComplete ? 'Not Started' : 'Complete';
    const completedAt = isComplete ? null : new Date().toISOString().split('T')[0];
    setTasks(prev => prev.map(item => item.id === task.id ? { ...item, status, completedAt } : item));
    await fetch('/api/planning-tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status, completedAt }),
    });
  };

  const cycleOwner = async (task: PlanningTask) => {
    const idx = OWNER_CYCLE.indexOf(task.owner);
    const next = OWNER_CYCLE[(idx + 1) % OWNER_CYCLE.length];
    setTasks(prev => prev.map(item => item.id === task.id ? { ...item, owner: next } : item));
    await fetch('/api/planning-tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, owner: next }),
    });
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/planning-tasks?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const saveTask = async (task: Partial<PlanningTask>) => {
    const method = task.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/planning-tasks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (res.ok) {
      setModalTask(null);
      fetchAll();
    }
  };

  const visible = tasks.filter(task => {
    if (ownerFilter !== 'All' && task.owner !== ownerFilter) return false;
    if (trackFilter !== 'all' && task.trackKey !== trackFilter) return false;
    if (sectionFilter !== 'all' && task.section !== sectionFilter) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const incomplete = visible.filter(task => task.status !== 'Complete');
  const complete = visible.filter(task => task.status === 'Complete');
  const sectionOrder: PlanningTask['section'][] = ['purchase', 'loan', 'home_setup', 'updates'];

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading the Chestnut task list…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>House Tasks</h1>
          <p className="page-subtitle">{tasks.filter(task => task.status === 'Complete').length} of {tasks.length} done for 25 Chestnut and the loan.</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setModalTask({ trackId: tracks[0]?.id ?? 0, section: 'purchase', title: '', status: 'Not Started', owner: null, dueDate: null, notes: '' })}
        >
          <Plus size={18} /> Add Task
        </button>
      </div>

      <HomeSubnav />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input placeholder="Search home tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Track</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setTrackFilter('all')} className={`filter-chip ${trackFilter === 'all' ? 'filter-chip-active' : ''}`}>All tracks</button>
            {tracks.map(track => (
              <button key={track.id} onClick={() => setTrackFilter(track.key)} className={`filter-chip ${trackFilter === track.key ? 'filter-chip-active' : ''}`}>
                {track.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Owner</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['All', 'Andrew', 'Tory'] as const).map(owner => (
              <button key={owner} onClick={() => setOwnerFilter(owner)} className={`filter-chip ${ownerFilter === owner ? 'filter-chip-active' : ''}`}>
                {owner === 'All' ? 'All owners' : owner}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Section</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'purchase', 'loan', 'home_setup', 'updates'] as const).map(section => (
              <button key={section} onClick={() => setSectionFilter(section)} className={`filter-chip ${sectionFilter === section ? 'filter-chip-active' : ''}`}>
                {section === 'all' ? 'All sections' : section.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        {sectionOrder.map(section => {
          const rows = incomplete.filter(task => task.section === section);
          if (!rows.length) return null;
          return (
            <div key={section} style={{ marginBottom: 24 }}>
              <div style={{ padding: '0 4px', marginBottom: 10 }}>
                <span className="section-label">{section.replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map(task => (
                  <PlanningTaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleComplete(task)}
                    onCycleOwner={() => cycleOwner(task)}
                    onEdit={() => setModalTask(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {complete.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowCompleted(v => !v)}
              style={{ padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: showCompleted ? 10 : 0 }}
            >
              {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {complete.length} completed
            </button>
            {showCompleted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {complete.map(task => (
                  <PlanningTaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleComplete(task)}
                    onCycleOwner={() => cycleOwner(task)}
                    onEdit={() => setModalTask(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modalTask && (
        <PlanningTaskModal task={modalTask} tracks={tracks} onClose={() => setModalTask(null)} onSave={saveTask} />
      )}
    </div>
  );
}

function PlanningTaskRow({
  task,
  onToggle,
  onCycleOwner,
  onEdit,
  onDelete,
}: {
  task: PlanningTask;
  onToggle: () => void;
  onCycleOwner: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = task.status === 'Complete';
  return (
    <div className="task-row" style={{ display: 'flex', alignItems: 'stretch', background: done ? 'var(--color-background)' : 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0, minWidth: 72 }}>
        <button onClick={e => { e.stopPropagation(); onCycleOwner(); }} className={`owner-tag ${task.owner ? 'owner-tag-set' : ''}`} title="Cycle owner" style={{ opacity: done ? 0.4 : 1 }}>
          {task.owner ?? '+ owner'}
        </button>
      </div>

      <div style={{ flex: 1, padding: '13px 8px', cursor: 'pointer', minWidth: 0 }} onClick={onEdit}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-secondary)', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <span className="section-label" style={{ margin: 0 }}>{task.trackName}</span>
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4, flexShrink: 0 }}>
        <div className="row-actions" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="row-action-btn" title="Edit task">
            <Pencil size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="row-action-btn row-action-delete" title="Delete task">
            <Trash2 size={14} />
          </button>
        </div>
        <button onClick={e => { e.stopPropagation(); onToggle(); }} className={`done-chip ${done ? 'done-chip-active' : ''}`} title={done ? 'Mark incomplete' : 'Mark complete'}>
          <Check size={14} strokeWidth={done ? 3 : 2} />
        </button>
      </div>
    </div>
  );
}

function PlanningTaskModal({
  task,
  tracks,
  onClose,
  onSave,
}: {
  task: Partial<PlanningTask>;
  tracks: Track[];
  onClose: () => void;
  onSave: (task: Partial<PlanningTask>) => void;
}) {
  const [editing, setEditing] = useState(task);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{task.id ? 'Edit Home Task' : 'New Home Task'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} autoFocus={!task.id} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Track</label>
              <select value={editing.trackId} onChange={e => setEditing({ ...editing, trackId: Number(e.target.value) })}>
                {tracks.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Section</label>
              <select value={editing.section} onChange={e => setEditing({ ...editing, section: e.target.value as PlanningTask['section'] })}>
                <option value="purchase">Purchase</option>
                <option value="loan">Loan</option>
                <option value="home_setup">Home Setup</option>
                <option value="updates">Updates</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
              <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as PlanningTask['status'] })}>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Due Date</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={editing.dueDate || ''} onChange={e => setEditing({ ...editing, dueDate: e.target.value || null })} style={{ flex: 1, minWidth: 0 }} />
                {editing.dueDate && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing({ ...editing, dueDate: null })} style={{ flexShrink: 0 }}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Description</label>
            <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} style={{ height: 64, resize: 'none' }} />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={{ height: 80, resize: 'none' }} />
          </div>
          {task.id ? (
            <DocumentAttachmentSection entityType="planning_task" entityId={task.id} />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>Save the task first to attach documents.</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Task</button>
        </div>
      </div>
    </div>
  );
}
