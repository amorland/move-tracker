'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MoveSettings, Task, MoveEvent, MoveLocation } from '@/lib/types';
import { format, parseISO, addDays } from 'date-fns';
import { CheckCircle2, Calendar, CalendarCheck, Plus, X, ChevronRight, Trash2, Pencil, Search, CarFront } from 'lucide-react';
import { getMilestones } from '@/lib/dateUtils';
import { useScrollLock } from '@/lib/useScrollLock';
import DocumentAttachmentSection from '@/components/DocumentAttachmentSection';

type ItemType = 'anchor' | 'event' | 'task' | 'drive';

type TimelineItem = {
  id: string;
  title: string;
  date: Date;
  type: ItemType;
  status: string;
  time?: string | null;
  notes?: string | null;
  rawEvent?: MoveEvent;
  isLast?: boolean;
};

const TYPE_CHIPS: { value: ItemType; label: string; Icon: React.ReactNode }[] = [
  { value: 'anchor', label: 'Key Dates', Icon: null },
  { value: 'event',  label: 'Events',    Icon: <CalendarCheck size={12} /> },
  { value: 'task',   label: 'Tasks',     Icon: <CheckCircle2 size={12} /> },
  { value: 'drive',  label: 'Drive',     Icon: <CarFront size={12} /> },
];

export default function TimelinePage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<MoveEvent[]>([]);
  const [locations, setLocations] = useState<MoveLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editEvent, setEditEvent] = useState<MoveEvent | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<ItemType>>(new Set());
  const [search, setSearch] = useState('');

  const anyModal = selected !== null || addModal || editEvent !== null;
  useScrollLock(anyModal);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [sRes, cRes, eRes, lRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/events'),
      fetch('/api/locations'),
    ]);
    setSettings(await sRes.json());
    const { tasks: ts } = await cRes.json();
    setTasks(ts);
    setEvents(await eRes.json());
    setLocations(await lRes.json());
    setLoading(false);
  };

  if (loading || !settings) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading timeline…</div>;

  const milestones = getMilestones(settings);

  const driveStops = settings.driveStartDate ? (() => {
    const base = parseISO(settings.driveStartDate);
    const driveStatus = settings.isDriveStartConfirmed ? 'confirmed' : 'estimated';
    const visibleStops = locations
      .filter(l => l.category === 'Origin' || l.category === 'Destination' ||
        (l.category === 'Stop' && !!l.notes?.startsWith('[overnight]')))
      .sort((a, b) => {
        if (a.category === 'Origin') return -1;
        if (b.category === 'Origin') return 1;
        if (a.category === 'Destination') return 1;
        if (b.category === 'Destination') return -1;
        return (a.id ?? 0) - (b.id ?? 0);
      });
    return visibleStops.map((loc, idx): TimelineItem => {
      const isOrigin = loc.category === 'Origin';
      const isDest = loc.category === 'Destination';
      return {
        id: `drive-${loc.id}`,
        title: isOrigin ? `Depart ${loc.name}` : isDest ? `Arrive ${loc.name}` : `Overnight: ${loc.name}`,
        date: addDays(base, idx),
        type: 'drive' as const,
        status: driveStatus,
        notes: loc.notes?.replace(/^\[overnight\]\s*/, '') || null,
      };
    });
  })() : [];

  const allItems: TimelineItem[] = [
    ...milestones
      .filter(m => m.date)
      .map(m => ({
        id: `anchor-${m.key as string}`,
        title: m.label,
        date: parseISO(m.date!),
        type: 'anchor' as const,
        status: m.status,
      })),
    ...tasks
      .filter(t => t.dueDate)
      .map(t => ({
        id: `task-${t.id}`,
        title: t.title,
        date: parseISO(t.dueDate!),
        type: 'task' as const,
        status: t.status,
      })),
    ...events.map(e => ({
      id: `event-${e.id}`,
      title: e.title,
      date: parseISO(e.date),
      type: 'event' as const,
      status: e.is_confirmed ? 'confirmed' : 'estimated',
      time: e.time,
      notes: e.notes,
      rawEvent: e,
    })),
    ...driveStops,
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const toggleType = (type: ItemType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const items = allItems
    .filter(i => activeTypes.size === 0 || activeTypes.has(i.type))
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()));

  // Group by month
  const grouped: Record<string, TimelineItem[]> = {};
  for (const item of items) {
    const key = format(item.date, 'MMMM yyyy');
    (grouped[key] = grouped[key] || []).push(item);
  }

  const deleteEvent = async (id: number) => {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
    setSelected(null);
    fetchAll();
  };

  const isFiltering = activeTypes.size > 0 || !!search;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>The Journey</h1>
          <p className="page-subtitle">Clearwater → Cold Spring</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setAddModal(true)}>
          <Plus size={18} /> Add Event
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 14 }}>
        <Search size={16} className="search-bar-icon" />
        <input placeholder="Search timeline…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setActiveTypes(new Set())}
          className={`filter-chip ${activeTypes.size === 0 ? 'filter-chip-active' : ''}`}
        >
          All
        </button>
        {TYPE_CHIPS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => toggleType(value)}
            className={`filter-chip ${activeTypes.has(value) ? 'filter-chip-active' : ''}`}
          >
            {Icon}
            {label}
          </button>
        ))}
        {isFiltering && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setActiveTypes(new Set()); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
          <Calendar size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>
            {isFiltering ? 'No items match your search.' : 'Your timeline is empty. Set key dates on the Overview page, or add an event here.'}
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 56 }}>
          <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--color-border)' }} />

          {Object.keys(grouped).map(monthYear => {
            const monthItems = grouped[monthYear];
            return (
              <div key={monthYear} style={{ marginBottom: 48 }}>
                {/* Month header */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <div style={{ position: 'absolute', left: -56, top: 0, width: 40, height: 40, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <Calendar size={18} color="var(--color-accent)" />
                  </div>
                  <h2 style={{ margin: 0, paddingTop: 10 }}>{monthYear}</h2>
                </div>

                {/* Flat row container — no individual card borders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monthItems.map((item) => (
                    <TimelineRow
                      key={item.id}
                      item={item}
                      onClick={() => setSelected(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TypeIcon type={selected.type} confirmed={selected.status === 'confirmed'} />
                <h2 style={{ margin: 0 }}>{selected.type === 'anchor' ? 'Key Date' : selected.type === 'event' ? 'Event' : selected.type === 'drive' ? 'Drive Stop' : 'Task'}</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ padding: '0 8px' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div>
                <p className="section-label" style={{ marginBottom: 4 }}>Title</p>
                <p style={{ fontSize: 18, fontWeight: 600 }}>{selected.title}</p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 4 }}>Date</p>
                <p style={{ fontSize: 15 }}>
                  {format(selected.date, 'MMMM d, yyyy')}
                  {selected.time && <span style={{ marginLeft: 8, color: 'var(--color-secondary)' }}>at {selected.time}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <StatusChip status={selected.status} />
              </div>
              {selected.notes && (
                <div>
                  <p className="section-label" style={{ marginBottom: 4 }}>Notes</p>
                  <p style={{ fontSize: 14, color: 'var(--color-secondary)', lineHeight: 1.6 }}>{selected.notes}</p>
                </div>
              )}
              {selected.type === 'event' && selected.rawEvent && (
                <DocumentAttachmentSection entityType="event" entityId={selected.rawEvent.id} />
              )}
              {selected.type === 'anchor' && (
                <Link href="/" style={{ fontSize: 13, color: 'var(--color-accent-dark)', textDecoration: 'none', fontWeight: 600 }}>
                  Edit on Overview →
                </Link>
              )}
            </div>
            <div className="modal-footer">
              {selected.type === 'event' && selected.rawEvent && (
                <>
                  <button className="btn btn-secondary" style={{ marginRight: 'auto', color: '#b91c1c' }} onClick={() => deleteEvent(selected.rawEvent!.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setEditEvent(selected.rawEvent!); setSelected(null); }}>
                    <Pencil size={14} /> Edit
                  </button>
                </>
              )}
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {addModal && (
        <EventFormModal onClose={() => setAddModal(false)} onSaved={() => { setAddModal(false); fetchAll(); }} />
      )}
      {editEvent && (
        <EventFormModal existing={editEvent} onClose={() => setEditEvent(null)} onSaved={() => { setEditEvent(null); fetchAll(); }} />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'confirmed') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700, background: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)', border: '1.5px solid var(--color-accent)' }}>
        ✓ Confirmed
      </span>
    );
  }
  if (status === 'estimated') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700, background: 'var(--color-background)', color: 'var(--color-secondary)', border: '1.5px dashed var(--color-border)' }}>
        ~ Estimated
      </span>
    );
  }
  return <span className="badge badge-neutral">{status}</span>;
}

function TimelineRow({ item, onClick }: { item: TimelineItem; onClick: () => void }) {
  const isAnchor = item.type === 'anchor';
  const isConfirmed = item.status === 'confirmed';
  const isDone = item.status === 'Complete';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 20px',
        background: 'var(--color-surface)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 16,
        cursor: 'pointer', transition: 'background 0.15s',
        opacity: isDone ? 0.6 : 1,
      }}
      className="item-row"
    >
      <TypeIcon type={item.type} confirmed={isConfirmed} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isAnchor ? 15 : 14, fontWeight: isAnchor ? 700 : 500, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {format(item.date, 'MMM d, yyyy')}
          </span>
          {item.time && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>· {item.time}</span>}
          {(isAnchor || item.type === 'event') && (
            <StatusChip status={item.status} />
          )}
        </div>
      </div>
      <ChevronRight size={16} color="var(--color-border)" />
    </div>
  );
}

function TypeIcon({ type, confirmed }: { type: string; confirmed?: boolean }) {
  if (type === 'anchor') {
    return (
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(240,180,50,0.15)', border: '1.5px solid #f0b432', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0b432' }} />
      </div>
    );
  }
  if (type === 'drive') {
    return (
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eef2ff', border: '1.5px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CarFront size={14} color="#6366f1" />
      </div>
    );
  }
  const color = confirmed ? 'var(--color-accent-dark)' : 'var(--color-secondary)';
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-background)', border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {type === 'event' ? <CalendarCheck size={14} color={color} /> : <CheckCircle2 size={14} color={color} />}
    </div>
  );
}

function EventFormModal({ existing, onClose, onSaved }: {
  existing?: MoveEvent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? '');
  const [time, setTime] = useState(existing?.time ?? '');
  const [confirmed, setConfirmed] = useState(existing?.is_confirmed ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!date) { setError('Date is required.'); return; }
    setSaving(true);
    const body = { title: title.trim(), date, time: time || null, is_confirmed: confirmed, notes: notes || null };
    const res = await fetch('/api/events', {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing ? { ...body, id: existing.id } : body),
    });
    if (res.ok) onSaved();
    else { const e = await res.json(); setError(e.error || 'Error saving event'); setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{existing ? 'Edit Event' : 'Add Event'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{error}</div>
          )}
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Home inspection" autoFocus={!existing} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Time (optional)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div
            className={`confirmed-toggle ${confirmed ? 'on' : ''}`}
            onClick={() => setConfirmed(v => !v)}
          >
            <div className={`check-circle ${confirmed ? 'checked' : ''}`}>
              {confirmed && <CheckCircle2 size={14} color="white" />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Confirmed</div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 2 }}>Lock this date in the timeline</div>
            </div>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 72, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
