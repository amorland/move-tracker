'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { Room, RoomItem } from '@/lib/types';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Grid3X3, MoveDiagonal, Package } from 'lucide-react';

export default function HomeLayoutPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [roomsRes, itemsRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/room-items'),
    ]);
    setRooms(await roomsRes.json());
    setItems(await itemsRes.json());
    setLoading(false);
  };

  const moveItem = async (item: RoomItem, roomId: number | null, layoutX: number, layoutY: number) => {
    await fetch('/api/room-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        roomId,
        layoutX,
        layoutY,
      }),
    });
    fetchAll();
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading visual planner…</div>;

  const floors = [...new Set(rooms.map(room => room.floor || 'Unassigned floor'))];
  const unplacedItems = items.filter(item => item.roomId === null);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Visual Layout</h1>
          <p className="page-subtitle">A crude house rendering for placing major furniture and planned purchases by room</p>
        </div>
        <Link href="/home/rooms" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
          Manage Rooms & Items
        </Link>
      </div>

      <HomeSubnav />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>How it works</div>
            <div style={{ fontSize: 13, color: 'var(--color-secondary)', maxWidth: 760 }}>
              This planner uses your saved rooms as a simplified floor map. Drag room items around each room to sketch an initial placement plan. Add or edit items from the Rooms page, then come back here to place them visually.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-neutral">{rooms.length} rooms</span>
            <span className="badge badge-neutral">{items.length} room items</span>
            <span className="badge badge-neutral">{unplacedItems.length} unplaced</span>
          </div>
        </div>
      </div>

      {floors.map(floor => {
        const floorRooms = rooms.filter(room => (room.floor || 'Unassigned floor') === floor);
        return (
          <div key={floor} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Grid3X3 size={15} color="var(--color-accent-dark)" />
              <h2 style={{ margin: 0 }}>{floor}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {floorRooms.map(room => (
                <RoomCanvas
                  key={room.id}
                  room={room}
                  items={items.filter(item => item.roomId === room.id)}
                  allItems={items}
                  onMoveItem={moveItem}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ margin: 0 }}>Unplaced Items</h2>
            <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>Drag these into a room when you decide where they should start</div>
          </div>
        </div>
        <div
          className="card-body"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            const itemId = Number(e.dataTransfer.getData('text/plain'));
            const item = items.find(entry => entry.id === itemId);
            if (!item) return;
            moveItem(item, null, 12, 12);
          }}
          style={{ minHeight: 120 }}
        >
          {unplacedItems.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>All saved room items are currently placed in rooms.</div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {unplacedItems.map(item => <LayoutChip key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomCanvas({
  room,
  items,
  allItems,
  onMoveItem,
}: {
  room: Room;
  items: RoomItem[];
  allItems: RoomItem[];
  onMoveItem: (item: RoomItem, roomId: number | null, layoutX: number, layoutY: number) => void;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 style={{ margin: 0 }}>{room.name}</h2>
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>
            {room.notes || `${items.length} items placed here`}
          </div>
        </div>
      </div>
      <div
        className="card-body"
        style={{ paddingTop: 0 }}
      >
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            const itemId = Number(e.dataTransfer.getData('text/plain'));
            const item = allItems.find(entry => entry.id === itemId) || null;
            const rect = e.currentTarget.getBoundingClientRect();
            const nextX = clamp(((e.clientX - rect.left - 50) / rect.width) * 100, 0, 76);
            const nextY = clamp(((e.clientY - rect.top - 18) / rect.height) * 100, 0, 82);
            if (item) {
              onMoveItem(item, room.id, nextX, nextY);
              return;
            }
          }}
          style={{
            position: 'relative',
            minHeight: 260,
            borderRadius: 14,
            border: '1px solid var(--color-border)',
            background: 'linear-gradient(180deg, #faf8f4 0%, #f4efe7 100%)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 12, border: '1px dashed rgba(0,0,0,0.08)', borderRadius: 10, pointerEvents: 'none' }} />
          {items.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--color-secondary)' }}>
              <Package size={26} />
              <span style={{ fontSize: 12 }}>Drop larger items here</span>
            </div>
          )}
          {items.map((item, index) => {
            const defaultX = 6 + ((index % 2) * 42);
            const defaultY = 10 + (Math.floor(index / 2) * 20);
            const width = item.layoutW ?? estimateWidth(item);
            const height = item.layoutH ?? estimateHeight(item);
            return (
              <button
                key={item.id}
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', String(item.id))}
                style={{
                  position: 'absolute',
                  left: `${item.layoutX ?? defaultX}%`,
                  top: `${item.layoutY ?? defaultY}%`,
                  width: `${width}%`,
                  minWidth: 72,
                  height: `${height}%`,
                  minHeight: 44,
                  borderRadius: 12,
                  border: item.itemSource === 'existing_belonging' ? '1px solid var(--color-accent)' : '1px solid #1f6b5b',
                  background: item.itemSource === 'existing_belonging' ? 'var(--color-accent-soft)' : '#eef7f3',
                  color: 'var(--color-foreground)',
                  padding: '8px 10px',
                  textAlign: 'left',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'grab',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{item.itemName}</div>
                  <MoveDiagonal size={12} color="var(--color-secondary)" />
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-secondary)', marginTop: 6 }}>
                  {item.itemSource === 'existing_belonging' ? 'Bring' : 'Planned'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LayoutChip({ item }: { item: RoomItem }) {
  return (
    <button
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', String(item.id))}
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 10, padding: '10px 12px', cursor: 'grab' }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground)' }}>{item.itemName}</div>
      <div style={{ fontSize: 10, color: 'var(--color-secondary)', marginTop: 4 }}>{item.itemSource === 'existing_belonging' ? 'Bring' : 'Planned'}</div>
    </button>
  );
}

function estimateWidth(item: RoomItem) {
  const label = item.itemName.toLowerCase();
  if (label.includes('sofa') || label.includes('sectional')) return 34;
  if (label.includes('bed') || label.includes('table')) return 30;
  if (label.includes('desk') || label.includes('dresser')) return 24;
  return 22;
}

function estimateHeight(item: RoomItem) {
  const label = item.itemName.toLowerCase();
  if (label.includes('bed') || label.includes('table')) return 22;
  if (label.includes('sofa') || label.includes('sectional')) return 18;
  return 16;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
