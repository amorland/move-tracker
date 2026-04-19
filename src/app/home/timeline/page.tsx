'use client';

import DocumentAttachmentSection from '@/components/DocumentAttachmentSection';
import HomeSubnav from '@/components/HomeSubnav';
import { TimelineEntry, Track } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { format, parseISO } from 'date-fns';
import { Calendar, CalendarCheck, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomeTimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimelineEntry | null>(null);
  const [editing, setEditing] = useState<TimelineEntry | null>(null);
  const [adding, setAdding] = useState(false);

  useScrollLock(!!selected || !!editing || adding);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [timelineRes, tracksRes] = await Promise.all([
      fetch('/api/timeline'),
      fetch('/api/tracks'),
    ]);
    const timelineData: TimelineEntry[] = await timelineRes.json();
    const trackData: Track[] = await tracksRes.json();
    setTracks(trackData.filter(track => ['home_purchase', 'loan', 'home_updates'].includes(track.key)));
    setEntries(timelineData.filter(entry => ['home_purchase', 'loan', 'home_updates'].includes(entry.trackKey || '')));
    setLoading(false);
  };

  const deleteEntry = async (id: number) => {
    await fetch(`/api/timeline?id=${id}`, { method: 'DELETE' });
    setSelected(null);
    fetchAll();
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading home timeline…</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Home Timeline</h1>
          <p className="page-subtitle">Purchase, loan, and future updates</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add Entry
        </button>
      </div>

      <HomeSubnav />

      {entries.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
          <Calendar size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>No home planning entries yet.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 56 }}>
          <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--color-border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {entries.map(entry => (
              <div key={entry.id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -56, top: 16, width: 40, height: 40, borderRadius: 12, background: entry.trackKey === 'loan' ? '#eef7f3' : entry.trackKey === 'home_updates' ? '#f3f1ed' : 'var(--color-accent-soft)', border: `1px solid ${entry.trackKey === 'loan' ? '#b7d8c7' : entry.trackKey === 'home_updates' ? 'var(--color-border)' : 'var(--color-accent)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <CalendarCheck size={14} color={entry.trackKey === 'loan' ? '#1f6b5b' : entry.trackKey === 'home_updates' ? '#6b655d' : 'var(--color-accent-dark)'} />
                </div>
                <div
                  onClick={() => setSelected(entry)}
                  className="item-row"
                  style={{ padding: '16px 18px', background: 'var(--color-surface)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span className="section-label" style={{ margin: 0 }}>{entry.trackName}</span>
                      <HomeTimelineStatus status={entry.status} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                      {entry.time && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>· {entry.time}</span>}
                    </div>
                    {entry.notes && (
                      <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 8, lineHeight: 1.5 }}>
                        {entry.notes}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} color="var(--color-border)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(adding || editing) && (
        <TimelineEntryModal
          tracks={tracks}
          existing={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); fetchAll(); }}
        />
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Timeline Entry</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ padding: '0 8px' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div>
                <p className="section-label" style={{ marginBottom: 4 }}>Title</p>
                <p style={{ fontSize: 18, fontWeight: 600 }}>{selected.title}</p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 4 }}>Track</p>
                <p style={{ fontSize: 15 }}>{selected.trackName}</p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 4 }}>Date</p>
                <p style={{ fontSize: 15 }}>{format(parseISO(selected.date), 'MMMM d, yyyy')}{selected.time ? ` at ${selected.time}` : ''}</p>
              </div>
              {selected.notes && (
                <div>
                  <p className="section-label" style={{ marginBottom: 4 }}>Notes</p>
                  <p style={{ fontSize: 14, color: 'var(--color-secondary)', lineHeight: 1.6 }}>{selected.notes}</p>
                </div>
              )}
              <DocumentAttachmentSection entityType="timeline_entry" entityId={selected.id} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ marginRight: 'auto', color: '#b91c1c' }} onClick={() => deleteEntry(selected.id)}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setSelected(null); }}>
                <Pencil size={14} /> Edit
              </button>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeTimelineStatus({ status }: { status: string }) {
  if (status === 'confirmed') {
    return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '999px', background: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)', fontSize: 11, fontWeight: 700 }}>Confirmed</span>;
  }
  if (status === 'complete') {
    return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '999px', background: '#eef7f3', color: '#1f6b5b', fontSize: 11, fontWeight: 700 }}>Complete</span>;
  }
  if (status === 'blocked') {
    return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '999px', background: '#fff0f0', color: '#b91c1c', fontSize: 11, fontWeight: 700 }}>Blocked</span>;
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '999px', background: 'var(--color-background)', color: 'var(--color-secondary)', fontSize: 11, fontWeight: 700 }}>Estimated</span>;
}

function TimelineEntryModal({
  tracks,
  existing,
  onClose,
  onSaved,
}: {
  tracks: Track[];
  existing?: TimelineEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [trackId, setTrackId] = useState(existing?.trackId ?? tracks[0]?.id ?? 0);
  const [date, setDate] = useState(existing?.date ?? '');
  const [time, setTime] = useState(existing?.time ?? '');
  const [status, setStatus] = useState(existing?.status ?? 'estimated');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim() || !date || !trackId) {
      setError('Track, title, and date are required.');
      return;
    }
    setSaving(true);
    const body = {
      trackId,
      title: title.trim(),
      date,
      time: time || null,
      status,
      notes: notes || null,
      entryType: existing?.entryType || 'event',
    };
    const res = await fetch('/api/timeline', {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing ? { ...body, id: existing.id } : body),
    });
    if (res.ok) onSaved();
    else {
      const e = await res.json();
      setError(e.error || 'Error saving entry');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{existing ? 'Edit Entry' : 'Add Entry'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{error}</div>
          )}
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Submit signed disclosures" autoFocus={!existing} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Track</label>
              <select value={trackId} onChange={e => setTrackId(Number(e.target.value))}>
                {tracks.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TimelineEntry['status'])}>
                <option value="estimated">Estimated</option>
                <option value="confirmed">Confirmed</option>
                <option value="complete">Complete</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
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
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 80, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
