'use client';

import { useEffect, useState } from 'react';
import { Belonging, BelongingAction } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { Check, Plus, Trash2, X, Search, Box, DollarSign, Heart, Trash, Pencil } from 'lucide-react';

const ROOMS = [
  'Kitchen', 'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Bathroom', 'Garage', 'Storage', 'Office', 'Dining Room', 'Outdoor/Patio', 'Other',
];

const ACTIONS: BelongingAction[] = ['Bring', 'Sell', 'Donate', 'Trash'];

const ACTION_TODO_LABEL: Record<BelongingAction, string> = {
  Bring: 'Resolve',
  Sell: 'Sell it',
  Donate: 'Donate',
  Trash: 'Trash it',
};

const ACTION_DONE_LABEL: Record<BelongingAction, string> = {
  Bring: 'Resolved',
  Sell: 'Sold',
  Donate: 'Donated',
  Trash: 'Trashed',
};

const ACTION_ICONS: Record<BelongingAction, React.ReactNode> = {
  Bring:  <Box size={13} />,
  Sell:   <DollarSign size={13} />,
  Donate: <Heart size={13} />,
  Trash:  <Trash size={13} />,
};

const ACTION_COLORS: Record<BelongingAction, { bg: string; color: string }> = {
  Bring:  { bg: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)' },
  Sell:   { bg: '#fef3c7', color: '#92400e' },
  Donate: { bg: '#dbeafe', color: '#1e40af' },
  Trash:  { bg: 'var(--color-background)', color: 'var(--color-secondary)' },
};

type ResolvedFilter = 'all' | 'active' | 'done';

export default function BelongingsPage() {
  const [items, setItems] = useState<Belonging[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<BelongingAction | 'All'>('All');
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Partial<Belonging> | null>(null);

  useScrollLock(modal !== null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const res = await fetch('/api/belongings');
    setItems(await res.json());
    setLoading(false);
  };

  const saveItem = async (item: Partial<Belonging>) => {
    const method = item.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/belongings', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) { setModal(null); fetchItems(); }
    else { const e = await res.json(); alert(e.error || 'Error saving'); }
  };

  const toggleResolved = async (item: Belonging) => {
    await saveItem({ ...item, status: item.status === 'resolved' ? 'unresolved' : 'resolved' });
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Remove this item?')) return;
    await fetch(`/api/belongings?id=${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const visible = items.filter(i => {
    if (actionFilter !== 'All' && i.action !== actionFilter) return false;
    if (resolvedFilter === 'active' && i.status !== 'unresolved') return false;
    if (resolvedFilter === 'done' && i.status !== 'resolved') return false;
    if (search && !i.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resolvedCount = items.filter(i => i.status === 'resolved').length;
  const unresolvedCount = items.filter(i => i.status === 'unresolved').length;

  const actionCount = (a: BelongingAction | 'All') =>
    items.filter(i => (a === 'All' || i.action === a)).length;

  // Group visible items by room
  const sortedRooms = [...new Set(visible.map(i => i.room))].sort();

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading the Starland inventory…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>The Big Sort</h1>
          <p className="page-subtitle">{unresolvedCount} still in the air · {resolvedCount} sorted across what we&apos;re bringing, selling, donating, or trashing</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setModal({ action: 'Bring', status: 'unresolved', room: 'Kitchen' })}
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 14 }}>
        <Search size={16} className="search-bar-icon" />
        <input
          placeholder="Search belongings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['All', ...ACTIONS] as const).map(a => (
          <button
            key={a}
            onClick={() => setActionFilter(a)}
            className={`filter-chip ${actionFilter === a ? 'filter-chip-active' : ''}`}
          >
            {a !== 'All' && ACTION_ICONS[a]}
            {a === 'All' ? 'All types' : a}
            <span style={{ fontSize: 10, opacity: 0.6 }}>({actionCount(a)})</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="seg-control">
          {([['all', 'All'], ['active', 'Active'], ['done', 'Done']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setResolvedFilter(val)}
              className={`seg-btn ${resolvedFilter === val ? 'seg-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Items list grouped by room */}
      <div>
        {visible.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <Box size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>Nothing here.</p>
          </div>
        ) : sortedRooms.map((room) => {
          const roomItems = visible.filter(i => i.room === room);
          const roomResolved = roomItems.filter(i => i.status === 'resolved').length;
          return (
            <div key={room} style={{ marginBottom: 24 }}>
              <div style={{ padding: '0 4px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="section-label">{room}</span>
                {roomResolved > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--color-accent-dark)', background: 'var(--color-accent-soft)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                    {roomResolved}/{roomItems.length} sorted
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {roomItems.map((item) => (
                  <BelongingRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleResolved(item)}
                    onEdit={() => setModal(item)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <BelongingModal item={modal} onClose={() => setModal(null)} onSave={saveItem} />
      )}
    </div>
  );
}

function BelongingRow({ item, onToggle, onEdit, onDelete }: {
  item: Belonging;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const done = item.status === 'resolved';
  const { bg, color } = ACTION_COLORS[item.action];
  return (
    <div
      className="belonging-row"
      style={{
        display: 'flex', alignItems: 'stretch',
        background: done ? 'var(--color-background)' : 'var(--color-surface)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        transition: 'background 0.2s',
      }}
    >
      {/* Action badge */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0, opacity: done ? 0.4 : 1, transition: 'opacity 0.2s' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 'var(--radius-pill)',
          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          background: bg, color,
        }}>
          {ACTION_ICONS[item.action]}
          {item.action}
        </span>
      </div>

      {/* Item info — click to edit */}
      <div style={{ flex: 1, padding: '13px 8px', cursor: 'pointer', minWidth: 0 }} onClick={onEdit}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: 'var(--color-secondary)',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.7 : 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'all 0.2s',
        }}>
          {item.itemName}
        </div>
        {item.notes && (
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, marginTop: 2, opacity: done ? 0.5 : 0.8 }}>
            {item.notes}
          </div>
        )}
      </div>

      {/* Right: edit/delete (hover) + resolve pill */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6, flexShrink: 0 }}>
        <div className="row-actions" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="row-action-btn" title="Edit item">
            <Pencil size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="row-action-btn row-action-delete" title="Delete item">
            <Trash2 size={14} />
          </button>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`done-pill ${done ? 'done-pill-active' : ''}`}
        >
          {done ? <><Check size={13} strokeWidth={3} /> {ACTION_DONE_LABEL[item.action]}</> : ACTION_TODO_LABEL[item.action]}
        </button>
      </div>
    </div>
  );
}

function BelongingModal({ item, onClose, onSave }: {
  item: Partial<Belonging>; onClose: () => void; onSave: (i: Partial<Belonging>) => void;
}) {
  const [itemName, setItemName] = useState(item.itemName || '');
  const [room, setRoom] = useState(item.room || ROOMS[0]);
  const [action, setAction] = useState<BelongingAction>(item.action || 'Bring');
  const [notes, setNotes] = useState(item.notes || '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{item.id ? 'Edit Item' : 'New Item'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Item Name</label>
            <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Dining table" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Room</label>
              <select value={room} onChange={e => setRoom(e.target.value)}>
                {ROOMS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Action</label>
              <select value={action} onChange={e => setAction(e.target.value as BelongingAction)}>
                {ACTIONS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 72, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ ...item, itemName, room, action, notes: notes || null })}>Save</button>
        </div>
      </div>
    </div>
  );
}
