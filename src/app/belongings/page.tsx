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

export default function BelongingsPage() {
  const [items, setItems] = useState<Belonging[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<BelongingAction | 'All'>('All');
  const [showResolved, setShowResolved] = useState(false);
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
    if (showResolved ? i.status !== 'resolved' : i.status !== 'unresolved') return false;
    if (search && !i.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resolvedCount = items.filter(i => i.status === 'resolved').length;
  const unresolvedCount = items.filter(i => i.status === 'unresolved').length;

  const countFor = (action: BelongingAction | 'All') =>
    items.filter(i => (action === 'All' || i.action === action) && i.status === (showResolved ? 'resolved' : 'unresolved')).length;

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading belongings…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Belongings</h1>
          <p className="page-subtitle">{unresolvedCount} to resolve · {resolvedCount} done</p>
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

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['All', ...ACTIONS] as const).map(a => {
          const count = countFor(a);
          return (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`filter-chip ${actionFilter === a ? 'filter-chip-active' : ''}`}
            >
              {a !== 'All' && ACTION_ICONS[a]}
              {a}
              {count > 0 && <span style={{ fontSize: 10, opacity: 0.75 }}>({count})</span>}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowResolved(v => !v)}
          className={`filter-chip ${showResolved ? 'filter-chip-active' : ''}`}
        >
          {showResolved ? `Resolved (${resolvedCount})` : `Show resolved (${resolvedCount})`}
        </button>
      </div>

      {/* Items list */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Box size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>
              {showResolved ? 'No resolved items here.' : 'Nothing to resolve here.'}
            </p>
          </div>
        ) : visible.map((item, i) => (
          <BelongingRow
            key={item.id}
            item={item}
            isLast={i === visible.length - 1}
            onToggle={() => toggleResolved(item)}
            onEdit={() => setModal(item)}
            onDelete={() => deleteItem(item.id)}
          />
        ))}
      </div>

      {modal && (
        <BelongingModal item={modal} onClose={() => setModal(null)} onSave={saveItem} />
      )}
    </div>
  );
}

function BelongingRow({ item, isLast, onToggle, onEdit, onDelete }: {
  item: Belonging; isLast: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const done = item.status === 'resolved';
  const { bg, color } = ACTION_COLORS[item.action];
  return (
    <div
      className="belonging-row"
      style={{
        display: 'flex', alignItems: 'stretch',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        background: done ? 'var(--color-accent-soft)' : 'var(--color-surface)',
        transition: 'background 0.2s',
      }}
    >
      {/* Action badge */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0 }}>
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
        <div style={{ fontSize: 14, fontWeight: 500, color: done ? 'var(--color-secondary)' : 'var(--color-foreground)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.itemName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span className="section-label">{item.room}</span>
          {item.notes && <span style={{ fontSize: 12, color: 'var(--color-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{item.notes}</span>}
        </div>
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
          {done ? <><Check size={13} strokeWidth={3} /> Resolved</> : 'Resolve'}
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
