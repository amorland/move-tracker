'use client';

import { useEffect, useMemo, useState } from 'react';
import { Belonging, BelongingAction, BelongingSizeClass } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { Check, Plus, Trash2, X, Search, Box, DollarSign, Heart, Trash, Pencil, LayoutDashboard } from 'lucide-react';

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
type GroupMode = 'room' | 'outcome';
type PlacementFilter = 'all' | 'floorplan' | 'boxed';

function formatDimensions(item: Belonging): string | null {
  const parts: string[] = [];
  if (item.widthIn !== null && item.widthIn !== undefined) parts.push(`${item.widthIn}″ W`);
  if (item.depthIn !== null && item.depthIn !== undefined) parts.push(`${item.depthIn}″ D`);
  if (item.heightIn !== null && item.heightIn !== undefined) parts.push(`${item.heightIn}″ H`);
  return parts.length === 0 ? null : parts.join(' · ');
}

export default function BelongingsPage() {
  const [items, setItems] = useState<Belonging[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<BelongingAction | 'All'>('All');
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('all');
  const [placementFilter, setPlacementFilter] = useState<PlacementFilter>('all');
  const [roomFilter, setRoomFilter] = useState<string>('All');
  const [groupMode, setGroupMode] = useState<GroupMode>('room');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Partial<Belonging> | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useScrollLock(modal !== null);

  const fetchItems = async () => {
    const res = await fetch('/api/belongings');
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchItems());
  }, []);

  const saveItem = async (item: Partial<Belonging>) => {
    const method = item.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/belongings', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) { setModal(null); void fetchItems(); }
    else { const e = await res.json(); alert(e.error || 'Error saving'); }
  };

  const toggleResolved = async (item: Belonging) => {
    await saveItem({ id: item.id, status: item.status === 'resolved' ? 'unresolved' : 'resolved' });
  };

  const togglePlacement = async (item: Belonging) => {
    const next: BelongingSizeClass = item.sizeClass === 'floorplan_item' ? 'boxed' : 'floorplan_item';
    await saveItem({ id: item.id, sizeClass: next });
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Remove this item?')) return;
    await fetch(`/api/belongings?id=${id}`, { method: 'DELETE' });
    void fetchItems();
  };

  const visibleBeforeRoom = items.filter(i => {
    if (actionFilter !== 'All' && i.action !== actionFilter) return false;
    if (resolvedFilter === 'active' && i.status !== 'unresolved') return false;
    if (resolvedFilter === 'done' && i.status !== 'resolved') return false;
    if (placementFilter === 'floorplan' && i.sizeClass !== 'floorplan_item') return false;
    if (placementFilter === 'boxed' && i.sizeClass !== 'boxed') return false;
    if (search && !i.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visible = visibleBeforeRoom.filter(i => roomFilter === 'All' || i.room === roomFilter);
  const visibleIds = useMemo(() => new Set(visible.map(item => item.id)), [visible]);

  const resolvedCount = items.filter(i => i.status === 'resolved').length;
  const unresolvedCount = items.filter(i => i.status === 'unresolved').length;
  const floorplanCount = items.filter(i => i.sizeClass === 'floorplan_item').length;

  const actionCount = (a: BelongingAction | 'All') =>
    items.filter(i => (a === 'All' || i.action === a)).length;

  const roomOptions = useMemo(
    () => [...new Set(items.map(item => item.room).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [items]
  );
  const roomCount = (room: string) => visibleBeforeRoom.filter(item => item.room === room).length;

  const groups = groupItems(visible, groupMode);

  const selectedVisibleIds = useMemo(
    () => Array.from(selected).filter(id => visibleIds.has(id)),
    [selected, visibleIds],
  );
  const allVisibleSelected = visible.length > 0 && selectedVisibleIds.length === visible.length;

  const toggleSelected = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(item => next.add(item.id));
      return next;
    });
  };

  const applyBulkSizeClass = async (sizeClass: BelongingSizeClass) => {
    if (selectedVisibleIds.length === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(selectedVisibleIds.map(id =>
        fetch('/api/belongings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, sizeClass }),
        })
      ));
      clearSelection();
      await fetchItems();
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading the Starland inventory…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>The Big Sort</h1>
          <p className="page-subtitle">{unresolvedCount} to sort. {resolvedCount} already decided. {floorplanCount} on the floor plan.</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setModal({ action: 'Bring', status: 'unresolved', sizeClass: 'boxed', room: 'Kitchen' })}
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="seg-control" aria-label="Placement filter">
            {([['all', 'All sizes'], ['floorplan', 'On floor plan'], ['boxed', 'Boxed']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPlacementFilter(val)}
                className={`seg-btn ${placementFilter === val ? 'seg-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="seg-control" aria-label="Group items">
            {([['room', 'Room'], ['outcome', 'Outcome']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setGroupMode(val)}
                className={`seg-btn ${groupMode === val ? 'seg-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="seg-control" aria-label="Resolved filter">
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
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Room</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setRoomFilter('All')}
            className={`filter-chip ${roomFilter === 'All' ? 'filter-chip-active' : ''}`}
          >
            All rooms
            <span style={{ fontSize: 10, opacity: 0.6 }}>({visibleBeforeRoom.length})</span>
          </button>
          {roomOptions.map(room => (
            <button
              key={room}
              onClick={() => setRoomFilter(room)}
              className={`filter-chip ${roomFilter === room ? 'filter-chip-active' : ''}`}
            >
              {room}
              <span style={{ fontSize: 10, opacity: 0.6 }}>({roomCount(room)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedVisibleIds.length > 0 ? (
        <div
          style={{
            position: 'sticky',
            top: 8,
            zIndex: 5,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 12,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-secondary)' }}>
            {selectedVisibleIds.length} selected
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={bulkBusy}
            onClick={() => applyBulkSizeClass('floorplan_item')}
          >
            <LayoutDashboard size={14} /> Mark on floor plan
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={bulkBusy}
            onClick={() => applyBulkSizeClass('boxed')}
          >
            <Box size={14} /> Mark boxed
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={clearSelection}>Clear</button>
        </div>
      ) : visible.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, fontSize: 12, color: 'var(--color-secondary)' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={allVisibleSelected ? clearSelection : selectAllVisible}
          >
            {allVisibleSelected ? 'Clear' : `Select all ${visible.length}`}
          </button>
          <span>Click checkboxes to bulk-mark items as on the floor plan or boxed.</span>
        </div>
      )}

      {/* Items list */}
      <div>
        {visible.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <Box size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>No items here.</p>
          </div>
        ) : groups.map((group) => {
          return (
            <div key={group.key} style={{ marginBottom: 24 }}>
              <div style={{ padding: '0 4px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {group.icon}
                  {group.label}
                </span>
                {group.resolvedCount > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--color-accent-dark)', background: 'var(--color-accent-soft)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                    {group.resolvedCount}/{group.items.length} sorted
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map((item) => (
                  <BelongingRow
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onSelectToggle={() => toggleSelected(item.id)}
                    onToggle={() => toggleResolved(item)}
                    onTogglePlacement={() => togglePlacement(item)}
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

function groupItems(items: Belonging[], groupMode: GroupMode) {
  if (groupMode === 'outcome') {
    return ACTIONS
      .map(action => {
        const actionItems = items.filter(item => item.action === action);
        return {
          key: action,
          label: action,
          icon: ACTION_ICONS[action],
          items: actionItems,
          resolvedCount: actionItems.filter(item => item.status === 'resolved').length,
        };
      })
      .filter(group => group.items.length > 0);
  }

  return [...new Set(items.map(item => item.room))]
    .sort((a, b) => a.localeCompare(b))
    .map(room => {
      const roomItems = items.filter(item => item.room === room);
      return {
        key: room,
        label: room,
        icon: null,
        items: roomItems,
        resolvedCount: roomItems.filter(item => item.status === 'resolved').length,
      };
    });
}

function BelongingRow({ item, selected, onSelectToggle, onToggle, onTogglePlacement, onEdit, onDelete }: {
  item: Belonging;
  selected: boolean;
  onSelectToggle: () => void;
  onToggle: () => void;
  onTogglePlacement: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = item.status === 'resolved';
  const onFloor = item.sizeClass === 'floorplan_item';
  const { bg, color } = ACTION_COLORS[item.action];
  const dims = formatDimensions(item);
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: 4,
        }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelectToggle}
          aria-label={`Select ${item.itemName}`}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
      </div>
      {/* Action badge */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4, paddingRight: 10, flexShrink: 0, opacity: done ? 0.4 : 1, transition: 'opacity 0.2s' }}>
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
        <div style={{ display: 'flex', gap: 10, marginTop: 2, fontSize: 12, color: 'var(--color-secondary)', opacity: done ? 0.5 : 0.85 }}>
          {dims && <span>{dims}</span>}
          {item.notes && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {item.notes}
            </span>
          )}
        </div>
      </div>

      {/* Right: placement toggle + edit/delete + resolve pill */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6, flexShrink: 0 }}>
        {item.action === 'Bring' && (
          <button
            onClick={e => { e.stopPropagation(); onTogglePlacement(); }}
            className="row-action-btn"
            title={onFloor ? 'On floor plan — click to mark boxed' : 'Boxed — click to put on floor plan'}
            style={{
              background: onFloor ? 'var(--color-accent-soft)' : 'transparent',
              color: onFloor ? 'var(--color-accent-dark)' : 'var(--color-secondary)',
              border: onFloor ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
            }}
          >
            <LayoutDashboard size={14} />
          </button>
        )}
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
  const [sizeClass, setSizeClass] = useState<BelongingSizeClass>(item.sizeClass ?? 'boxed');
  const [widthIn, setWidthIn] = useState(item.widthIn?.toString() ?? '');
  const [depthIn, setDepthIn] = useState(item.depthIn?.toString() ?? '');
  const [heightIn, setHeightIn] = useState(item.heightIn?.toString() ?? '');

  const parseDim = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
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
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>On floor plan?</label>
            <div className="seg-control" aria-label="Floor plan placement">
              {([['floorplan_item', 'Place on floor plan'], ['boxed', 'Boxed / not placed']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSizeClass(val)}
                  className={`seg-btn ${sizeClass === val ? 'seg-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6, marginBottom: 0 }}>
              {sizeClass === 'floorplan_item'
                ? 'Will appear on the layout page so you can position it in the new home.'
                : 'Tracked in inventory only — small items, dishes, contents of drawers.'}
            </p>
          </div>
          {sizeClass === 'floorplan_item' && (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Dimensions (inches)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <input value={widthIn} onChange={e => setWidthIn(e.target.value)} placeholder="W" inputMode="decimal" />
                <input value={depthIn} onChange={e => setDepthIn(e.target.value)} placeholder="D" inputMode="decimal" />
                <input value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="H" inputMode="decimal" />
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6, marginBottom: 0 }}>
                Leave blank to use estimates from the furniture type. Used to render this item to scale on the floor plan.
              </p>
            </div>
          )}
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 72, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({
              ...item,
              itemName,
              room,
              action,
              notes: notes || null,
              sizeClass,
              widthIn: parseDim(widthIn),
              depthIn: parseDim(depthIn),
              heightIn: parseDim(heightIn),
            })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
