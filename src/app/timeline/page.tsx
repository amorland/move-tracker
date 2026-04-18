'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category, MoveEvent } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Calendar, MapPin, Bell, Plus, X, ChevronRight, Trash2 } from 'lucide-react';
import { getMilestones } from '@/lib/dateUtils';

type TimelineItem = {
  id: string;
  title: string;
  date: Date;
  type: 'anchor' | 'event' | 'task';
  status: string;
  time?: string | null;
  notes?: string | null;
  rawEvent?: MoveEvent;
};

export default function TimelinePage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<MoveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  const [eventModal, setEventModal] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [sRes, cRes, eRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/events'),
    ]);
    setSettings(await sRes.json());
    const { tasks: ts } = await cRes.json();
    setTasks(ts);
    setEvents(await eRes.json());
    setLoading(false);
  };

  if (loading || !settings) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading timeline…</div>;

  const milestones = getMilestones(settings);

  const items: TimelineItem[] = [
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
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Timeline</h1>
          <p className="page-subtitle">Chronology of your move.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setEventModal(true)}>
          <Plus size={18} /> Add Event
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
          <Calendar size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>
            Your timeline is empty. Set key dates on the Overview page, or add an event here.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 56 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--color-border)' }} />

          {Object.keys(grouped).map(monthYear => (
            <div key={monthYear} style={{ marginBottom: 56 }}>
              {/* Month header */}
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <div style={{ position: 'absolute', left: -56, top: 0, width: 40, height: 40, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <Calendar size={18} color="var(--color-accent)" />
                </div>
                <h2 style={{ margin: 0, paddingTop: 10 }}>{monthYear}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grouped[monthYear].map(item => (
                  <TimelineRow key={item.id} item={item} onClick={() => setSelected(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TypeIcon type={selected.type} />
                <h2 style={{ margin: 0 }}>{selected.type === 'anchor' ? 'Key Date' : selected.type === 'event' ? 'Event' : 'Task'}</h2>
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
                <span className={`badge ${selected.status === 'confirmed' ? 'badge-accent' : selected.status === 'Complete' ? 'badge-success' : 'badge-neutral'}`}>
                  {selected.status === 'confirmed' ? 'Confirmed' : selected.status === 'estimated' ? 'Estimated' : selected.status}
                </span>
              </div>
              {selected.notes && (
                <div>
                  <p className="section-label" style={{ marginBottom: 4 }}>Notes</p>
                  <p style={{ fontSize: 14, color: 'var(--color-secondary)', lineHeight: 1.6 }}>{selected.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selected.type === 'event' && selected.rawEvent && (
                <button className="btn btn-secondary" style={{ marginRight: 'auto', color: '#b91c1c' }} onClick={() => deleteEvent(selected.rawEvent!.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add event modal */}
      {eventModal && (
        <AddEventModal onClose={() => setEventModal(false)} onSaved={() => { setEventModal(false); fetchAll(); }} />
      )}
    </div>
  );
}

function TimelineRow({ item, onClick }: { item: TimelineItem; onClick: () => void }) {
  const isAnchor = item.type === 'anchor';
  const isEvent = item.type === 'event';
  const isConfirmed = item.status === 'confirmed';
  const isDone = item.status === 'Complete';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 20px',
        borderRadius: 12,
        background: isAnchor && isConfirmed ? 'var(--color-accent-soft)' : 'var(--color-surface)',
        border: `1px solid ${isAnchor && isConfirmed ? 'var(--color-accent)' : 'var(--color-border)'}`,
        display: 'flex', alignItems: 'center', gap: 16,
        cursor: 'pointer', transition: 'all 0.15s',
        opacity: isDone ? 0.65 : 1,
      }}
      className="item-row"
    >
      <TypeIcon type={item.type} confirmed={isConfirmed} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {format(item.date, 'MMM d, yyyy')}
          </span>
          {item.time && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>· {item.time}</span>}
          {isAnchor && item.status === 'estimated' && <span style={{ fontSize: 11, color: 'var(--color-secondary)', opacity: 0.7 }}>Estimated</span>}
          {isAnchor && isConfirmed && <span className="badge badge-accent" style={{ fontSize: 10 }}>Confirmed</span>}
          {isEvent && isConfirmed && <span className="badge badge-accent" style={{ fontSize: 10 }}>Confirmed</span>}
        </div>
      </div>
      <ChevronRight size={16} color="var(--color-border)" />
    </div>
  );
}

function TypeIcon({ type, confirmed }: { type: string; confirmed?: boolean }) {
  const color = confirmed ? 'var(--color-accent-dark)' : 'var(--color-secondary)';
  if (type === 'anchor') return <MapPin size={16} color={color} />;
  if (type === 'event') return <Bell size={16} color={color} />;
  return <CheckCircle2 size={16} color={color} />;
}

function AddEventModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!date) { setError('Date is required.'); return; }
    setSaving(true);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), date, time: time || null, is_confirmed: confirmed, notes: notes || null }),
    });
    if (res.ok) onSaved();
    else { const e = await res.json(); setError(e.error || 'Error saving event'); setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>Add Event</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{error}</div>
          )}
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Home inspection" autoFocus />
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
            {saving ? 'Saving…' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
