'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { Belonging, Room, RoomItem } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { Box, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomeRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [belongings, setBelongings] = useState<Belonging[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomModal, setRoomModal] = useState<Partial<Room> | null>(null);
  const [itemModal, setItemModal] = useState<Partial<RoomItem> | null>(null);

  useScrollLock(roomModal !== null || itemModal !== null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [roomsRes, itemsRes, belongingsRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/room-items'),
      fetch('/api/belongings'),
    ]);
    setRooms(await roomsRes.json());
    setItems(await itemsRes.json());
    const belongingData: Belonging[] = await belongingsRes.json();
    setBelongings(belongingData.filter(item => item.action === 'Bring'));
    setLoading(false);
  };

  const saveRoom = async (room: Partial<Room>) => {
    const res = await fetch('/api/rooms', {
      method: room.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
    if (res.ok) {
      setRoomModal(null);
      fetchAll();
    }
  };

  const saveItem = async (item: Partial<RoomItem>) => {
    const res = await fetch('/api/room-items', {
      method: item.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      setItemModal(null);
      fetchAll();
    }
  };

  const deleteRoom = async (id: number) => {
    if (!confirm('Delete this room?')) return;
    await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this room item?')) return;
    await fetch(`/api/room-items?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading rooms…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Rooms</h1>
          <p className="page-subtitle">Assign brought items and plan new purchases by room</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setRoomModal({ name: '', floor: '', notes: '' })}>
          <Plus size={18} /> Add Room
        </button>
      </div>

      <HomeSubnav />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {rooms.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <Box size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>No rooms yet. Add your first room above.</p>
          </div>
        ) : rooms.map(room => {
          const roomItems = items.filter(item => item.roomId === room.id);
          return (
            <div key={room.id} className="card">
              <div className="card-header">
                <div>
                  <h2 style={{ margin: 0 }}>{room.name}</h2>
                  <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>
                    {room.floor || 'Floor not set'} · {roomItems.length} planned items
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setItemModal({ roomId: room.id, itemSource: 'planned_purchase', status: 'planned', itemName: '', notes: '' })}>
                    <Plus size={14} /> Add Item
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setRoomModal(room)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteRoom(room.id)} style={{ color: '#b91c1c' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {room.notes && (
                  <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>{room.notes}</div>
                )}
                {roomItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>No items assigned yet.</div>
                ) : roomItems.map(item => (
                  <div key={item.id} className="task-row" style={{ display: 'flex', alignItems: 'stretch', background: 'var(--color-background)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0 }}>
                      <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                        {item.itemSource === 'existing_belonging' ? 'Bring' : 'Planned'}
                      </span>
                    </div>
                    <div style={{ flex: 1, padding: '13px 8px', minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-secondary)' }}>{item.itemName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span className="section-label" style={{ margin: 0 }}>{item.status}</span>
                        {item.dimensions && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{item.dimensions}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4 }}>
                      <button className="row-action-btn" onClick={() => setItemModal(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="row-action-btn row-action-delete" onClick={() => deleteItem(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {roomModal && (
        <RoomModal room={roomModal} onClose={() => setRoomModal(null)} onSave={saveRoom} />
      )}
      {itemModal && (
        <RoomItemModal
          item={itemModal}
          rooms={rooms}
          belongings={belongings}
          onClose={() => setItemModal(null)}
          onSave={saveItem}
        />
      )}
    </div>
  );
}

function RoomModal({
  room,
  onClose,
  onSave,
}: {
  room: Partial<Room>;
  onClose: () => void;
  onSave: (room: Partial<Room>) => void;
}) {
  const [editing, setEditing] = useState(room);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{room.id ? 'Edit Room' : 'New Room'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Room Name</label>
            <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Floor</label>
            <input value={editing.floor || ''} onChange={e => setEditing({ ...editing, floor: e.target.value })} placeholder="e.g. Main floor" />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={{ height: 72, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Room</button>
        </div>
      </div>
    </div>
  );
}

function RoomItemModal({
  item,
  rooms,
  belongings,
  onClose,
  onSave,
}: {
  item: Partial<RoomItem>;
  rooms: Room[];
  belongings: Belonging[];
  onClose: () => void;
  onSave: (item: Partial<RoomItem>) => void;
}) {
  const [editing, setEditing] = useState(item);

  const selectedBelonging = belongings.find(belonging => belonging.id === editing.belongingId);

  const setSource = (itemSource: RoomItem['itemSource']) => {
    if (itemSource === 'existing_belonging') {
      setEditing({
        ...editing,
        itemSource,
        belongingId: selectedBelonging?.id ?? belongings[0]?.id ?? null,
        itemName: selectedBelonging?.itemName ?? belongings[0]?.itemName ?? '',
      });
      return;
    }
    setEditing({
      ...editing,
      itemSource,
      belongingId: null,
      itemName: editing.itemSource === 'existing_belonging' ? '' : editing.itemName,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{item.id ? 'Edit Room Item' : 'Add Room Item'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Room</label>
            <select value={editing.roomId ?? ''} onChange={e => setEditing({ ...editing, roomId: Number(e.target.value) })}>
              {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Source</label>
            <select value={editing.itemSource} onChange={e => setSource(e.target.value as RoomItem['itemSource'])}>
              <option value="planned_purchase">Planned Purchase</option>
              <option value="existing_belonging">Existing Belonging</option>
            </select>
          </div>
          {editing.itemSource === 'existing_belonging' ? (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Belonging</label>
              <select
                value={editing.belongingId ?? ''}
                onChange={e => {
                  const belonging = belongings.find(item => item.id === Number(e.target.value));
                  setEditing({
                    ...editing,
                    belongingId: Number(e.target.value),
                    itemName: belonging?.itemName ?? '',
                  });
                }}
              >
                {belongings.map(belonging => <option key={belonging.id} value={belonging.id}>{belonging.itemName}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Item Name</label>
              <input value={editing.itemName || ''} onChange={e => setEditing({ ...editing, itemName: e.target.value })} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
              <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as RoomItem['status'] })}>
                <option value="planned">Planned</option>
                <option value="placed">Placed</option>
                <option value="undecided">Undecided</option>
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Dimensions</label>
              <input value={editing.dimensions || ''} onChange={e => setEditing({ ...editing, dimensions: e.target.value })} placeholder="e.g. 84in x 38in" />
            </div>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={{ height: 72, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Item</button>
        </div>
      </div>
    </div>
  );
}
