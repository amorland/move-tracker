'use client';

import { useEffect, useMemo, useState } from 'react';
import { Category, PlanningTask, Task, TaskOwner, TaskStatus, Track } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  House,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import DocumentAttachmentSection from '@/components/DocumentAttachmentSection';
import {
  buildTaskAssets,
  TaskAsset,
  TaskAssetScope,
  TaskAssetSource,
} from '@/features/tasks/taskAssets';

type OwnerFilter = TaskOwner | 'All';

type TaskModalDraft = {
  source: TaskAssetSource;
  id?: number;
  title: string;
  status: TaskStatus;
  owner: TaskOwner | null;
  dueDate: string | null;
  completedAt?: string | null;
  notes: string | null;
  categoryId?: number;
  trackId?: number;
  section?: PlanningTask['section'];
};

const OWNER_CYCLE: (TaskOwner | null)[] = [null, 'Andrew', 'Tory'];

const SCOPE_CHIPS: { value: TaskAssetScope; label: string; Icon: React.ReactNode }[] = [
  { value: 'move', label: 'Move', Icon: <CheckCircle2 size={12} /> },
  { value: 'home_purchase', label: 'Home Purchase', Icon: <House size={12} /> },
  { value: 'loan', label: 'Loan', Icon: <CheckCircle2 size={12} /> },
  { value: 'home_setup', label: 'Home Setup', Icon: <House size={12} /> },
  { value: 'home_updates', label: 'Home Updates', Icon: <House size={12} /> },
];

function isScope(value: string): value is TaskAssetScope {
  return SCOPE_CHIPS.some(scope => scope.value === value);
}

function getInitialScopes() {
  if (typeof window === 'undefined') return new Set<TaskAssetScope>();
  const params = new URLSearchParams(window.location.search);
  const filterValues = params.getAll('filter').flatMap(value => value.split(','));
  return new Set(filterValues.filter(isScope));
}

export default function TasksPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [moveTasks, setMoveTasks] = useState<Task[]>([]);
  const [planningTasks, setPlanningTasks] = useState<PlanningTask[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('All');
  const [activeScopes, setActiveScopes] = useState<Set<TaskAssetScope>>(() => getInitialScopes());
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [modalTask, setModalTask] = useState<TaskModalDraft | null>(null);

  useScrollLock(modalTask !== null);

  async function fetchData() {
    const [categoryRes, planningRes, trackRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/planning-tasks'),
      fetch('/api/tracks'),
    ]);
    const { categories: cats, tasks } = await categoryRes.json();
    setCategories(cats);
    setMoveTasks(tasks);
    setPlanningTasks(await planningRes.json());
    setTracks(await trackRes.json());
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => fetchData());
  }, []);

  const taskAssets = useMemo(() => buildTaskAssets({
    categories,
    tasks: moveTasks,
    planningTasks,
  }), [categories, moveTasks, planningTasks]);

  const filtered = taskAssets.filter(task => {
    if (activeScopes.size > 0 && !activeScopes.has(task.scope)) return false;
    if (ownerFilter !== 'All' && task.owner !== ownerFilter) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const incomplete = filtered
    .filter(task => task.status !== 'Complete')
    .sort(sortTasks);
  const complete = filtered
    .filter(task => task.status === 'Complete')
    .sort(sortTasks);
  const grouped = groupTasks(incomplete);
  const totalDone = taskAssets.filter(task => task.status === 'Complete').length;
  const isFiltering = activeScopes.size > 0 || ownerFilter !== 'All' || !!search;

  const toggleScope = (scope: TaskAssetScope) => {
    setActiveScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const toggleComplete = async (task: TaskAsset) => {
    const isComplete = task.status === 'Complete';
    const status = isComplete ? 'Not Started' : 'Complete';
    const completedAt = isComplete ? null : new Date().toISOString().split('T')[0];
    await patchTask(task, { status, completedAt });
    fetchData();
  };

  const cycleOwner = async (task: TaskAsset) => {
    const index = OWNER_CYCLE.indexOf(task.owner);
    const owner = OWNER_CYCLE[(index + 1) % OWNER_CYCLE.length];
    await patchTask(task, { owner });
    fetchData();
  };

  const deleteTask = async (task: TaskAsset) => {
    if (!confirm('Delete this task?')) return;
    const endpoint = task.source === 'move' ? '/api/tasks' : '/api/planning-tasks';
    await fetch(`${endpoint}?id=${task.id}`, { method: 'DELETE' });
    fetchData();
  };

  const saveTask = async (task: TaskModalDraft) => {
    const endpoint = task.source === 'move' ? '/api/tasks' : '/api/planning-tasks';
    const body = task.source === 'move'
      ? {
          id: task.id,
          title: task.title,
          status: task.status,
          owner: task.owner,
          dueDate: task.dueDate,
          completedAt: task.completedAt,
          notes: task.notes,
          categoryId: task.categoryId,
        }
      : {
          id: task.id,
          title: task.title,
          status: task.status,
          owner: task.owner,
          dueDate: task.dueDate,
          completedAt: task.completedAt,
          notes: task.notes,
          trackId: task.trackId,
          section: task.section,
        };

    const res = await fetch(endpoint, {
      method: task.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setModalTask(null);
      fetchData();
    }
  };

  const openNewTask = () => {
    const scope = activeScopes.size === 1
      ? [...activeScopes][0]
      : activeScopes.size > 0 && !activeScopes.has('move')
        ? [...activeScopes][0]
        : 'move';
    const source: TaskAssetSource = scope === 'move' ? 'move' : 'planning';
    setModalTask(createDefaultTaskDraft({
      source,
      scope,
      categories,
      tracks,
    }));
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading tasks...</div>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Tasks</h1>
          <p className="page-subtitle">{totalDone} of {taskAssets.length} done across move and house planning.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={openNewTask}>
          <Plus size={18} /> Add Task
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Area</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setActiveScopes(new Set())}
              className={`filter-chip ${activeScopes.size === 0 ? 'filter-chip-active' : ''}`}
            >
              All areas
            </button>
            {SCOPE_CHIPS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => toggleScope(value)}
                className={`filter-chip ${activeScopes.has(value) ? 'filter-chip-active' : ''}`}
              >
                {Icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Owner</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['All', 'Andrew', 'Tory'] as const).map(owner => (
              <button
                key={owner}
                onClick={() => setOwnerFilter(owner)}
                className={`filter-chip ${ownerFilter === owner ? 'filter-chip-active' : ''}`}
              >
                {owner === 'All' ? 'All owners' : owner}
              </button>
            ))}
            {isFiltering && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setOwnerFilter('All'); setActiveScopes(new Set()); }}>
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        {grouped.length === 0 && complete.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-secondary)', fontSize: 14, background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            {isFiltering ? 'Nothing matches the filters.' : 'Nothing on the list yet.'}
          </div>
        )}

        {grouped.map(({ groupLabel, tasks }) => (
          <div key={groupLabel} style={{ marginBottom: 24 }}>
            <div style={{ padding: '0 4px', marginBottom: 10 }}>
              <span className="section-label">{groupLabel}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map(task => (
                <TaskRow
                  key={task.uid}
                  task={task}
                  onToggle={() => toggleComplete(task)}
                  onCycleOwner={() => cycleOwner(task)}
                  onEdit={() => setModalTask(toDraft(task))}
                  onDelete={() => deleteTask(task)}
                />
              ))}
            </div>
          </div>
        ))}

        {complete.length > 0 && (
          <div style={{ marginTop: grouped.length > 0 ? 8 : 0 }}>
            <button
              onClick={() => setShowCompleted(value => !value)}
              style={{
                padding: '8px 4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: showCompleted ? 10 : 0,
              }}
            >
              {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {complete.length} completed
            </button>
            {showCompleted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {complete.map(task => (
                  <TaskRow
                    key={task.uid}
                    task={task}
                    onToggle={() => toggleComplete(task)}
                    onCycleOwner={() => cycleOwner(task)}
                    onEdit={() => setModalTask(toDraft(task))}
                    onDelete={() => deleteTask(task)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modalTask && (
        <TaskModal
          task={modalTask}
          categories={categories}
          tracks={tracks}
          onClose={() => setModalTask(null)}
          onSave={saveTask}
        />
      )}
    </div>
  );
}

async function patchTask(task: TaskAsset, update: Partial<TaskModalDraft>) {
  const endpoint = task.source === 'move' ? '/api/tasks' : '/api/planning-tasks';
  await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: task.id, ...update }),
  });
}

function sortTasks(a: TaskAsset, b: TaskAsset) {
  const scopeOrder: TaskAssetScope[] = ['move', 'home_purchase', 'loan', 'home_setup', 'home_updates'];
  const scopeDelta = scopeOrder.indexOf(a.scope) - scopeOrder.indexOf(b.scope);
  if (scopeDelta !== 0) return scopeDelta;
  const groupDelta = a.groupLabel.localeCompare(b.groupLabel);
  if (groupDelta !== 0) return groupDelta;
  return a.sortIndex - b.sortIndex;
}

function groupTasks(tasks: TaskAsset[]) {
  const groups = new Map<string, TaskAsset[]>();
  for (const task of tasks) {
    groups.set(task.groupLabel, [...(groups.get(task.groupLabel) ?? []), task]);
  }
  return [...groups.entries()].map(([groupLabel, rows]) => ({ groupLabel, tasks: rows }));
}

function toDraft(task: TaskAsset): TaskModalDraft {
  return {
    source: task.source,
    id: task.id,
    title: task.title,
    status: task.status,
    owner: task.owner,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    notes: task.notes,
    categoryId: task.categoryId,
    trackId: task.trackId,
    section: task.section,
  };
}

function createDefaultTaskDraft({
  source,
  scope,
  categories,
  tracks,
}: {
  source: TaskAssetSource;
  scope: TaskAssetScope;
  categories: Category[];
  tracks: Track[];
}): TaskModalDraft {
  const track = getTrackForScope(scope, tracks);
  return {
    source,
    title: '',
    status: 'Not Started',
    owner: null,
    dueDate: null,
    notes: '',
    categoryId: categories[0]?.id ?? 0,
    trackId: track?.id ?? tracks.find(item => item.key === 'home_purchase')?.id ?? tracks[0]?.id,
    section: getSectionForScope(scope),
  };
}

function getTrackForScope(scope: TaskAssetScope, tracks: Track[]) {
  if (scope === 'loan') return tracks.find(track => track.key === 'loan');
  if (scope === 'home_updates') return tracks.find(track => track.key === 'home_updates');
  if (scope === 'home_setup') return tracks.find(track => track.key === 'home_purchase');
  if (scope === 'home_purchase') return tracks.find(track => track.key === 'home_purchase');
  return null;
}

function getSectionForScope(scope: TaskAssetScope): PlanningTask['section'] {
  if (scope === 'loan') return 'loan';
  if (scope === 'home_setup') return 'home_setup';
  if (scope === 'home_updates') return 'updates';
  return 'purchase';
}

function getScopeLabel(scope: TaskAssetScope) {
  return SCOPE_CHIPS.find(item => item.value === scope)?.label ?? scope;
}

function TaskRow({
  task,
  onToggle,
  onCycleOwner,
  onEdit,
  onDelete,
}: {
  task: TaskAsset;
  onToggle: () => void;
  onCycleOwner: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = task.status === 'Complete';
  return (
    <div
      className="task-row"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: done ? 'var(--color-background)' : 'var(--color-surface)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0, minWidth: 72 }}>
        <button
          onClick={event => { event.stopPropagation(); onCycleOwner(); }}
          className={`owner-tag ${task.owner ? 'owner-tag-set' : ''}`}
          title="Cycle owner"
          style={{ opacity: done ? 0.4 : 1 }}
        >
          {task.owner ?? '+ owner'}
        </button>
      </div>

      <div style={{ flex: 1, padding: '13px 8px', cursor: 'pointer', minWidth: 0 }} onClick={onEdit}>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-secondary)',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.7 : 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
        }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          {task.scope !== 'move' && (
            <span className="badge badge-neutral">{getScopeLabel(task.scope)}</span>
          )}
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
          <button onClick={event => { event.stopPropagation(); onEdit(); }} className="row-action-btn" title="Edit task">
            <Pencil size={14} />
          </button>
          <button onClick={event => { event.stopPropagation(); onDelete(); }} className="row-action-btn row-action-delete" title="Delete task">
            <Trash2 size={14} />
          </button>
        </div>
        <button
          onClick={event => { event.stopPropagation(); onToggle(); }}
          className={`done-chip ${done ? 'done-chip-active' : ''}`}
          title={done ? 'Mark incomplete' : 'Mark complete'}
        >
          <Check size={14} strokeWidth={done ? 3 : 2} />
        </button>
      </div>
    </div>
  );
}

function TaskModal({
  task,
  categories,
  tracks,
  onClose,
  onSave,
}: {
  task: TaskModalDraft;
  categories: Category[];
  tracks: Track[];
  onClose: () => void;
  onSave: (task: TaskModalDraft) => void;
}) {
  const [editing, setEditing] = useState(task);
  const [error, setError] = useState('');
  const isExisting = !!task.id;

  const save = () => {
    if (!editing.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (editing.source === 'move' && !editing.categoryId) {
      setError('Category is required.');
      return;
    }
    if (editing.source === 'planning' && (!editing.trackId || !editing.section)) {
      setError('Track and section are required.');
      return;
    }
    onSave({ ...editing, title: editing.title.trim(), notes: editing.notes?.trim() || null });
  };

  const setSource = (source: TaskAssetSource) => {
    if (isExisting) return;
    setEditing(current => ({
      ...current,
      source,
      categoryId: source === 'move' ? categories[0]?.id ?? 0 : current.categoryId,
      trackId: source === 'planning'
        ? tracks.find(track => track.key === 'home_purchase')?.id ?? tracks[0]?.id
        : current.trackId,
      section: source === 'planning' ? 'purchase' : current.section,
    }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{isExisting ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{error}</div>
          )}

          {!isExisting && (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Task Area</label>
              <select value={editing.source} onChange={event => setSource(event.target.value as TaskAssetSource)}>
                <option value="move">Move Task</option>
                <option value="planning">House Planning Task</option>
              </select>
            </div>
          )}

          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={editing.title || ''} onChange={event => setEditing({ ...editing, title: event.target.value })} placeholder="e.g. Schedule move-out cleaners" autoFocus={!isExisting} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {editing.source === 'move' ? (
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Category</label>
                <select value={editing.categoryId} onChange={event => setEditing({ ...editing, categoryId: Number(event.target.value) })}>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Track</label>
                <select value={editing.trackId} onChange={event => setEditing({ ...editing, trackId: Number(event.target.value) })}>
                  {tracks.filter(track => ['home_purchase', 'loan', 'home_updates'].includes(track.key)).map(track => (
                    <option key={track.id} value={track.id}>{track.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
              <select value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as TaskStatus })}>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
          </div>

          {editing.source === 'planning' && (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Section</label>
              <select value={editing.section} onChange={event => setEditing({ ...editing, section: event.target.value as PlanningTask['section'] })}>
                <option value="purchase">Purchase</option>
                <option value="loan">Loan</option>
                <option value="home_setup">Home Setup</option>
                <option value="updates">Updates</option>
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Owner</label>
              <select value={editing.owner ?? ''} onChange={event => setEditing({ ...editing, owner: (event.target.value || null) as TaskOwner | null })}>
                <option value="">Unassigned</option>
                <option value="Andrew">Andrew</option>
                <option value="Tory">Tory</option>
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Due Date</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={editing.dueDate || ''}
                  onChange={event => setEditing({ ...editing, dueDate: event.target.value || null })}
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
            <textarea value={editing.notes || ''} onChange={event => setEditing({ ...editing, notes: event.target.value })} style={{ height: 80, resize: 'none' }} />
          </div>

          {isExisting ? (
            <DocumentAttachmentSection
              entityType={editing.source === 'move' ? 'move_task' : 'planning_task'}
              entityId={editing.id!}
            />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>
              Save the task first to attach documents.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Task</button>
        </div>
      </div>
    </div>
  );
}
