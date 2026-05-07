'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MoveEvent,
  MoveLocation,
  MoveSettings,
  PlanningTask,
  Task,
  TimelineEntry,
  Track,
  TrackKey,
} from '@/lib/types';
import { format } from 'date-fns';
import {
  Calendar,
  CalendarCheck,
  CarFront,
  CheckCircle2,
  ChevronRight,
  House,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useScrollLock } from '@/lib/useScrollLock';
import DocumentAttachmentSection from '@/components/DocumentAttachmentSection';
import {
  buildTimelineAssets,
  TimelineAsset,
  TimelineAssetFilter,
} from '@/features/timelines/timelineAssets';
import {
  saveTimelineAsset,
  TimelineFormMode,
} from '@/features/timelines/timelineConversion';

const FILTER_CHIPS: { value: TimelineAssetFilter; label: string; Icon: React.ReactNode }[] = [
  { value: 'key_dates', label: 'Key Dates', Icon: null },
  { value: 'events', label: 'Events', Icon: <CalendarCheck size={12} /> },
  { value: 'tasks', label: 'Tasks', Icon: <CheckCircle2 size={12} /> },
  { value: 'drive', label: 'Drive', Icon: <CarFront size={12} /> },
  { value: 'home_purchase', label: 'Home Purchase', Icon: <House size={12} /> },
  { value: 'loan', label: 'Loan', Icon: <CalendarCheck size={12} /> },
  { value: 'home_updates', label: 'Home Updates', Icon: <House size={12} /> },
];

const HOME_TRACK_KEYS: TrackKey[] = ['home_purchase', 'loan', 'home_updates'];

const TRACK_TYPE_LABELS: Record<TrackKey, string> = {
  move: 'Move',
  drive: 'Drive',
  home_purchase: 'Home Purchase',
  loan: 'Loan',
  home_updates: 'Home Updates',
};

function isFilter(value: string): value is TimelineAssetFilter {
  return FILTER_CHIPS.some(chip => chip.value === value);
}

function getInitialFilters() {
  if (typeof window === 'undefined') return new Set<TimelineAssetFilter>();
  const params = new URLSearchParams(window.location.search);
  const filterValues = params.getAll('filter').flatMap(value => value.split(','));
  return new Set(filterValues.filter(isFilter));
}

export default function TimelinePage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<MoveEvent[]>([]);
  const [locations, setLocations] = useState<MoveLocation[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [planningTasks, setPlanningTasks] = useState<PlanningTask[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimelineAsset | null>(null);
  const [editing, setEditing] = useState<TimelineAsset | null>(null);
  const [adding, setAdding] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<TimelineAssetFilter>>(() => getInitialFilters());
  const [search, setSearch] = useState('');

  useScrollLock(selected !== null || editing !== null || adding);

  async function fetchAll() {
    const [settingsRes, categoriesRes, eventsRes, locationsRes, timelineRes, planningTasksRes, tracksRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/events'),
      fetch('/api/locations'),
      fetch('/api/timeline'),
      fetch('/api/planning-tasks'),
      fetch('/api/tracks'),
    ]);

    setSettings(await settingsRes.json());
    const { tasks: moveTasks } = await categoriesRes.json();
    setTasks(moveTasks);
    setEvents(await eventsRes.json());
    setLocations(await locationsRes.json());
    setTimelineEntries(await timelineRes.json());
    setPlanningTasks(await planningTasksRes.json());
    setTracks(await tracksRes.json());
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => fetchAll());
  }, []);

  const allItems = useMemo(() => {
    if (!settings) return [];
    return buildTimelineAssets({
      settings,
      tasks,
      events,
      locations,
      timelineEntries,
      planningTasks,
    });
  }, [settings, tasks, events, locations, timelineEntries, planningTasks]);

  const filteredItems = allItems
    .filter(item => activeFilters.size === 0 || item.filters.some(filter => activeFilters.has(filter)))
    .filter(item => {
      if (!search) return true;
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q)
        || item.label.toLowerCase().includes(q)
        || (item.trackName ?? '').toLowerCase().includes(q);
    });

  const grouped = filteredItems.reduce<Record<string, TimelineAsset[]>>((acc, item) => {
    const key = format(item.date, 'MMMM yyyy');
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});

  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of allItems) {
      const key = getDuplicateKey(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [allItems]);

  const timelineTracks = tracks.filter(track => HOME_TRACK_KEYS.includes(track.key));
  const isFiltering = activeFilters.size > 0 || !!search;
  const defaultTrackKey = HOME_TRACK_KEYS.find(key => activeFilters.has(key as TimelineAssetFilter));

  const toggleFilter = (filter: TimelineAssetFilter) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  };

  const deleteSelected = async (item: TimelineAsset) => {
    if (item.rawEvent) {
      await fetch(`/api/events?id=${item.rawEvent.id}`, { method: 'DELETE' });
    } else if (item.rawTimelineEntry) {
      await fetch(`/api/timeline?id=${item.rawTimelineEntry.id}`, { method: 'DELETE' });
    }
    setSelected(null);
    fetchAll();
  };

  if (loading || !settings) {
    return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading timelines...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Timelines</h1>
          <p className="page-subtitle">Move, drive, tasks, and house purchase dates in one place.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add Entry
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 14 }}>
        <Search size={16} className="search-bar-icon" />
        <input placeholder="Search timelines..." value={search} onChange={event => setSearch(event.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setActiveFilters(new Set())}
          className={`filter-chip ${activeFilters.size === 0 ? 'filter-chip-active' : ''}`}
        >
          All
        </button>
        {FILTER_CHIPS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => toggleFilter(value)}
            className={`filter-chip ${activeFilters.has(value) ? 'filter-chip-active' : ''}`}
          >
            {Icon}
            {label}
          </button>
        ))}
        {isFiltering && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setActiveFilters(new Set()); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
          <Calendar size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>
            {isFiltering ? 'Nothing matches the filters.' : 'Nothing on the timelines yet. Add a date, task, or event.'}
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 56 }}>
          <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--color-border)' }} />

          {Object.keys(grouped).map(monthYear => (
            <div key={monthYear} style={{ marginBottom: 48 }}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ position: 'absolute', left: -56, top: 0, width: 40, height: 40, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <Calendar size={18} color="var(--color-accent)" />
                </div>
                <h2 style={{ margin: 0, paddingTop: 10 }}>{monthYear}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped[monthYear].map(item => (
                  <TimelineRow key={item.id} item={item} possibleDuplicate={duplicateKeys.has(getDuplicateKey(item))} onClick={() => setSelected(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <TimelineDetailModal
          item={selected}
          possibleDuplicate={duplicateKeys.has(getDuplicateKey(selected))}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onDelete={() => deleteSelected(selected)}
        />
      )}

      {(adding || editing) && (
        <TimelineFormModal
          tracks={timelineTracks}
          existing={editing ?? undefined}
          defaultTrackKey={defaultTrackKey}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

function TimelineRow({
  item,
  possibleDuplicate,
  onClick,
}: {
  item: TimelineAsset;
  possibleDuplicate: boolean;
  onClick: () => void;
}) {
  const done = item.status === 'Complete' || item.status === 'complete';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 20px',
        background: 'var(--color-surface)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer',
        transition: 'background 0.15s',
        opacity: done ? 0.64 : 1,
      }}
      className="item-row"
    >
      <TimelineAssetIcon item={item} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: item.kind === 'key_date' ? 15 : 14, fontWeight: item.kind === 'key_date' ? 700 : 500, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span className="section-label" style={{ margin: 0 }}>{item.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {format(item.date, 'MMM d, yyyy')}
          </span>
          {item.time && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>· {item.time}</span>}
          <StatusChip status={item.status} />
          {possibleDuplicate && <span className="badge badge-neutral">Possible duplicate</span>}
        </div>
      </div>
      <ChevronRight size={16} color="var(--color-border)" />
    </div>
  );
}

function TimelineDetailModal({
  item,
  possibleDuplicate,
  onClose,
  onEdit,
  onDelete,
}: {
  item: TimelineAsset;
  possibleDuplicate: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const editable = !!item.rawEvent || !!item.rawTimelineEntry;
  const deletable = editable;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TimelineAssetIcon item={item} />
            <h2 style={{ margin: 0 }}>{item.label}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <p className="section-label" style={{ marginBottom: 4 }}>Title</p>
            <p style={{ fontSize: 18, fontWeight: 600 }}>{item.title}</p>
          </div>
          <div>
            <p className="section-label" style={{ marginBottom: 4 }}>Date</p>
            <p style={{ fontSize: 15 }}>
              {format(item.date, 'MMMM d, yyyy')}
              {item.time && <span style={{ marginLeft: 8, color: 'var(--color-secondary)' }}>at {item.time}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip status={item.status} />
            {item.trackName && <span className="badge badge-neutral">{item.trackName}</span>}
            {possibleDuplicate && <span className="badge badge-neutral">Possible duplicate</span>}
          </div>
          {item.notes && (
            <div>
              <p className="section-label" style={{ marginBottom: 4 }}>Notes</p>
              <p style={{ fontSize: 14, color: 'var(--color-secondary)', lineHeight: 1.6 }}>{item.notes}</p>
            </div>
          )}

          {item.rawEvent && <DocumentAttachmentSection entityType="event" entityId={item.rawEvent.id} />}
          {item.rawTimelineEntry && <DocumentAttachmentSection entityType="timeline_entry" entityId={item.rawTimelineEntry.id} />}
          {item.rawTask && <DocumentAttachmentSection entityType="move_task" entityId={item.rawTask.id} />}
          {item.rawPlanningTask && <DocumentAttachmentSection entityType="planning_task" entityId={item.rawPlanningTask.id} />}

          {item.kind === 'key_date' && (
            <Link href="/" style={{ fontSize: 13, color: 'var(--color-accent-dark)', textDecoration: 'none', fontWeight: 600 }}>
              Edit on HQ →
            </Link>
          )}
          {(item.rawTask || item.rawPlanningTask) && (
            <Link href="/tasks" style={{ fontSize: 13, color: 'var(--color-accent-dark)', textDecoration: 'none', fontWeight: 600 }}>
              Edit in Tasks →
            </Link>
          )}
        </div>
        <div className="modal-footer">
          {deletable && (
            <button className="btn btn-secondary" style={{ marginRight: 'auto', color: '#b91c1c' }} onClick={onDelete}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          {editable && (
            <button className="btn btn-secondary" onClick={onEdit}>
              <Pencil size={14} /> Edit
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function TimelineFormModal({
  tracks,
  existing,
  defaultTrackKey,
  onClose,
  onSaved,
}: {
  tracks: Track[];
  existing?: TimelineAsset;
  defaultTrackKey?: TrackKey;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existingEvent = existing?.rawEvent;
  const existingEntry = existing?.rawTimelineEntry;
  const defaultTrack = tracks.find(track => track.key === defaultTrackKey)
    ?? tracks.find(track => track.key === 'home_purchase')
    ?? tracks[0];

  const [typeChoice, setTypeChoice] = useState<'move_event' | TrackKey>(
    existingEntry?.trackKey ?? (existingEvent ? 'move_event' : defaultTrack?.key ?? 'move_event')
  );
  const [title, setTitle] = useState(existingEvent?.title ?? existingEntry?.title ?? '');
  const [date, setDate] = useState(existingEvent?.date ?? existingEntry?.date ?? '');
  const [time, setTime] = useState(existingEvent?.time ?? existingEntry?.time ?? '');
  const [status, setStatus] = useState(existingEntry?.status ?? (existingEvent?.is_confirmed ? 'confirmed' : 'estimated'));
  const [notes, setNotes] = useState(existingEvent?.notes ?? existingEntry?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }

    const mode: TimelineFormMode = typeChoice === 'move_event' ? 'move_event' : 'track_entry';
    const selectedTrack = typeChoice === 'move_event'
      ? null
      : tracks.find(track => track.key === typeChoice);

    if (mode === 'track_entry' && !selectedTrack) {
      setError('Timeline type is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveTimelineAsset(existing, {
        mode,
        title: title.trim(),
        date,
        time: time || null,
        notes: notes || null,
        status,
        trackId: selectedTrack?.id ?? existingEntry?.trackId ?? defaultTrack?.id ?? 0,
        entryType: existingEntry?.entryType || 'event',
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving entry.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{existing ? 'Edit Timeline Entry' : 'Add Timeline Entry'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{error}</div>
          )}

          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Timeline Type</label>
            <select value={typeChoice} onChange={event => {
              const next = event.target.value as 'move_event' | TrackKey;
              setTypeChoice(next);
              if (next === 'move_event' && status !== 'confirmed') setStatus('estimated');
              if (next !== 'move_event' && status !== 'confirmed' && status !== 'complete' && status !== 'blocked') setStatus('estimated');
            }}>
              <option value="move_event">Move Event</option>
              {tracks.map(track => <option key={track.id} value={track.key}>{TRACK_TYPE_LABELS[track.key] ?? track.name}</option>)}
            </select>
          </div>

          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Home inspection" autoFocus={!existing} />
          </div>

          {typeChoice !== 'move_event' && (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
              <select value={status} onChange={event => setStatus(event.target.value as TimelineEntry['status'])}>
                <option value="estimated">Estimated</option>
                <option value="confirmed">Confirmed</option>
                <option value="complete">Complete</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          )}

          {typeChoice === 'move_event' && (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
              <select value={status === 'confirmed' ? 'confirmed' : 'estimated'} onChange={event => setStatus(event.target.value as TimelineEntry['status'])}>
                <option value="estimated">Estimated</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Date</label>
              <input type="date" value={date} onChange={event => setDate(event.target.value)} />
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Time (optional)</label>
              <input type="time" value={time || ''} onChange={event => setTime(event.target.value)} />
            </div>
          </div>

          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={notes || ''} onChange={event => setNotes(event.target.value)} style={{ height: 80, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : existing ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'confirmed') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700, background: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)', border: '1.5px solid var(--color-accent)' }}>
        Confirmed
      </span>
    );
  }
  if (status === 'estimated') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700, background: 'var(--color-background)', color: 'var(--color-secondary)', border: '1.5px dashed var(--color-border)' }}>
        Estimated
      </span>
    );
  }
  if (status === 'complete' || status === 'Complete') {
    return <span className="badge badge-neutral">Complete</span>;
  }
  if (status === 'blocked') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700, background: '#fff0f0', color: '#b91c1c', border: '1px solid #fca5a5' }}>
        Blocked
      </span>
    );
  }
  return <span className="badge badge-neutral">{status}</span>;
}

function TimelineAssetIcon({ item }: { item: TimelineAsset }) {
  if (item.trackKey === 'home_purchase') {
    return (
      <IconFrame background="var(--color-accent-soft)" border="var(--color-accent)">
        <House size={14} color="var(--color-accent-dark)" />
      </IconFrame>
    );
  }

  if (item.kind === 'key_date') {
    return (
      <IconFrame background="rgba(240,180,50,0.15)" border="#f0b432">
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0b432' }} />
      </IconFrame>
    );
  }

  if (item.kind === 'drive_stop') {
    return (
      <IconFrame background="#eef2ff" border="#6366f1">
        <CarFront size={14} color="#6366f1" />
      </IconFrame>
    );
  }

  if (item.kind === 'move_task' || item.kind === 'planning_task') {
    return (
      <IconFrame background="var(--color-background)" border="var(--color-border)">
        <CheckCircle2 size={14} color="var(--color-secondary)" />
      </IconFrame>
    );
  }

  return (
    <IconFrame background="var(--color-background)" border="var(--color-border)">
      <CalendarCheck size={14} color={item.status === 'confirmed' ? 'var(--color-accent-dark)' : 'var(--color-secondary)'} />
    </IconFrame>
  );
}

function IconFrame({
  background,
  border,
  children,
}: {
  background: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </div>
  );
}

function getDuplicateKey(item: TimelineAsset) {
  return `${format(item.date, 'yyyy-MM-dd')}::${normaliseTitle(item.title)}`;
}

function normaliseTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|and|of|for|to|with)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
