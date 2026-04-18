'use client';

import { useEffect, useState } from 'react';
import { Belonging, BelongingAction, BelongingStatus } from '@/lib/types';
import { Check, Plus, Trash2, X, Search, Box, DollarSign, Heart, Trash, Pencil } from 'lucide-react';

const ROOMS = [
  'Kitchen', 'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Bathroom', 'Garage', 'Storage', 'Office', 'Dining Room', 'Outdoor/Patio', 'Other',
];

const ACTION_ICONS: Record<BelongingAction, React.ReactNode> = {
  Bring:  <Box size={16} />,
  Sell:   <DollarSign size={16} />,
  Donate: <Heart size={16} />,
  Trash:  <Trash size={16} />,
};

const ACTIONS: BelongingAction[] = ['Bring', 'Sell', 'Donate', 'Trash'];

export default function BelongingsPage() {
  const [items, setItems] = useState<Belonging[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BelongingAction>('Bring');
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Partial<Belonging> | null>(null);

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

  const tabItems = items.filter(i => i.action === activeTab);
  const visible = tabItems.filter(i => {
    const matchesResolved = showResolved ? i.status === 'resolved' : i.status === 'unresolved';
    const matchesSearch = i.itemName.toLowerCase().includes(search.toLowerCase());
    return matchesResolved && matchesSearch;
  });

  const tabStats = (action: BelongingAction) => {
    const all = items.filter(i => i.action === action);
    return { total: all.length, unresolved: all.filter(i => i.status === 'unresolved').length };
  };

  const totalResolved = items.filter(i => i.status === 'resolved').length;

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading belongings…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Belongings</h1>
          <p className="page-subtitle">Decide what goes where.</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setModal({ action: activeTab, status: 'unresolved', room: 'Kitchen' })}
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16, flexWrap: 'wrap' }}>
        {ACTIONS.map(action => {
          const { unresolved } = tabStats(action);
          const active = activeTab === action;
          return (
            <button
              key={action}
              onClick={() => { setActiveTab(action); setShowResolved(false); setSearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                background: active ? 'var(--color-accent)' : 'transparent',
                color: active ? 'white' : 'var(--color-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {ACTION_ICONS[action]}
              {action}
              {unresolved > 0 && <span style={{ fontSize: 11, opacity: 0.85 }}>({unresolved})</span>}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowResolved(v => !v)}
          style={{ fontSize: 12, fontWeight: 700, color: showResolved ? 'var(--color-accent-dark)' : 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showResolved ? 'View unresolved' : `View resolved (${totalResolved})`}
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)', pointerEvents: 'none' }} />
        <input
          placeholder={`Search in ${activeTab}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 42 }}
        />
      </div>

      {/* Items list */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Box size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>
              {showResolved ? `No resolved items in ${activeTab}.` : `No unresolved items in ${activeTab}.`}
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
  return (
    <div
      className="belonging-row"
      style={{
        display: 'flex', alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        background: done ? 'var(--color-success-soft)' : 'var(--color-surface)',
        borderLeft: `3px solid ${done ? 'var(--color-accent)' : 'transparent'}`,
        transition: 'background 0.2s, border-left-color 0.2s',
      }}
    >
      <button
        onClick={onToggle}
        style={{ width: 48, alignSelf: 'stretch', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
        title={done ? 'Mark unresolved' : 'Mark resolved'}
      >
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: done ? 'var(--color-accent)' : 'transparent',
          border: `2px solid ${done ? 'var(--color-accent)' : 'var(--color-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {done && <Check size={11} color="white" strokeWidth={3} />}
        </div>
      </button>

      <div style={{ flex: 1, padding: '14px 8px 14px 0', cursor: 'pointer', minWidth: 0 }} onClick={onEdit}>
        <div style={{ fontSize: 14, fontWeight: 500, color: done ? 'var(--color-secondary)' : 'var(--color-foreground)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.itemName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span className="section-label">{item.room}</span>
          {item.notes && <span style={{ fontSize: 12, color: 'var(--color-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{item.notes}</span>}
        </div>
      </div>

      <div className="row-actions" style={{ display: 'flex', alignItems: 'center', padding: '0 10px', gap: 2, flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="row-action-btn" title="Edit item">
          <Pencil size={14} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="row-action-btn row-action-delete" title="Delete item">
          <Trash2 size={14} />
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

  const handleSave = () => {
    onSave({ ...item, itemName, room, action, notes: notes || null });
  };

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
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
