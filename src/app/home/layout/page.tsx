'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { Room, RoomItem } from '@/lib/types';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Grid3X3, MoveDiagonal, Package } from 'lucide-react';

type RoomTemplate = {
  match: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
};

const FLOOR_TEMPLATES: Record<string, RoomTemplate[]> = {
  'Main Floor': [
    { match: ['First Floor Living Room', 'Living Room'], x: 4, y: 20, w: 45, h: 62, label: 'Living Room' },
    { match: ['Dining Room'], x: 51, y: 12, w: 20, h: 32, label: 'Dining' },
    { match: ['Kitchen'], x: 72, y: 12, w: 24, h: 44, label: 'Kitchen' },
    { match: ['Bathroom'], x: 52, y: 50, w: 14, h: 16, label: 'Bath' },
  ],
  'Second Floor': [
    { match: ['Primary Bedroom'], x: 4, y: 8, w: 34, h: 34, label: 'Primary' },
    { match: ['Bathroom'], x: 40, y: 8, w: 18, h: 18, label: 'Bath' },
    { match: ['Bedroom 2'], x: 60, y: 8, w: 36, h: 30, label: 'Bedroom 2' },
    { match: ['Office'], x: 4, y: 46, w: 34, h: 36, label: 'Office' },
    { match: ['Yoga / Nursery', 'Bedroom 3'], x: 42, y: 40, w: 54, h: 42, label: 'Yoga / Nursery' },
  ],
  'Lower Level': [
    { match: ['Basement'], x: 4, y: 10, w: 92, h: 72, label: 'Basement' },
  ],
  Exterior: [
    { match: ['Garage'], x: 4, y: 10, w: 36, h: 36, label: 'Garage' },
    { match: ['Outdoor / Yard'], x: 44, y: 10, w: 52, h: 60, label: 'Outdoor / Yard' },
  ],
  Flexible: [
    { match: ['Office'], x: 10, y: 18, w: 80, h: 58, label: 'Office' },
  ],
  Multiple: [
    { match: ['Bathroom'], x: 10, y: 20, w: 80, h: 56, label: 'Bathrooms' },
  ],
};

const FALLBACK_TEMPLATE: RoomTemplate = { match: [], x: 10, y: 14, w: 80, h: 60 };

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

  const floors = orderedFloors(rooms);
  const unplacedItems = items.filter(item => item.roomId === null);

  return (
    <div style={{ maxWidth: 1260, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Visual Layout</h1>
          <p className="page-subtitle">A crude blueprint-inspired rendering of the house for placing major furniture and nursery plans</p>
        </div>
        <Link href="/home/rooms" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
          Manage Rooms & Items
        </Link>
      </div>

      <HomeSubnav />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>Blueprint-inspired mode</div>
            <div style={{ fontSize: 13, color: 'var(--color-secondary)', maxWidth: 780 }}>
              This view now arranges rooms as connected floor layouts rather than separate cards. It is still crude, but it is meant to be much closer to the real house shape and room relationships from the blueprint and listing materials.
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
            <FloorPlan
              floor={floor}
              rooms={floorRooms}
              items={items}
              onMoveItem={moveItem}
            />
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

function FloorPlan({
  floor,
  rooms,
  items,
  onMoveItem,
}: {
  floor: string;
  rooms: Room[];
  items: RoomItem[];
  onMoveItem: (item: RoomItem, roomId: number | null, layoutX: number, layoutY: number) => void;
}) {
  const templates = FLOOR_TEMPLATES[floor] || [];

  return (
    <div
      style={{
        position: 'relative',
        minHeight: floor === 'Second Floor' ? 560 : 500,
        borderRadius: 18,
        border: '1px solid var(--color-border)',
        background: 'linear-gradient(180deg, #f8f4ec 0%, #efe6d8 100%)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        padding: 16,
      }}
    >
      <div style={{ position: 'absolute', inset: 16, borderRadius: 14, border: '1px solid rgba(0,0,0,0.05)', pointerEvents: 'none' }} />
      {floor === 'Main Floor' && (
        <div style={{ position: 'absolute', left: '48.5%', top: '22%', width: '2%', height: '56%', borderRadius: 8, background: 'rgba(92,86,72,0.06)', pointerEvents: 'none' }} />
      )}
      {floor === 'Second Floor' && (
        <>
          <div style={{ position: 'absolute', left: '38%', top: '28%', width: '4%', height: '42%', borderRadius: 10, background: 'rgba(92,86,72,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '42%', top: '26%', width: '16%', height: '6%', borderRadius: 10, background: 'rgba(92,86,72,0.06)', pointerEvents: 'none' }} />
        </>
      )}
      {rooms.map(room => {
        const template = resolveTemplate(room, templates);
        const roomItems = items.filter(item => item.roomId === room.id);
        return (
          <RoomZone
            key={room.id}
            room={room}
            template={template}
            items={roomItems}
            allItems={items}
            onMoveItem={onMoveItem}
          />
        );
      })}
    </div>
  );
}

function RoomZone({
  room,
  template,
  items,
  allItems,
  onMoveItem,
}: {
  room: Room;
  template: RoomTemplate;
  items: RoomItem[];
  allItems: RoomItem[];
  onMoveItem: (item: RoomItem, roomId: number | null, layoutX: number, layoutY: number) => void;
}) {
  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const itemId = Number(e.dataTransfer.getData('text/plain'));
        const item = allItems.find(entry => entry.id === itemId) || null;
        const rect = e.currentTarget.getBoundingClientRect();
        const nextX = clamp(((e.clientX - rect.left - 48) / rect.width) * 100, 2, 76);
        const nextY = clamp(((e.clientY - rect.top - 18) / rect.height) * 100, 10, 82);
        if (item) onMoveItem(item, room.id, nextX, nextY);
      }}
      style={{
        position: 'absolute',
        left: `${template.x}%`,
        top: `${template.y}%`,
        width: `${template.w}%`,
        height: `${template.h}%`,
        borderRadius: 16,
        border: '2px solid rgba(92, 86, 72, 0.28)',
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(1px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 10, border: '1px dashed rgba(0,0,0,0.06)', borderRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 12, top: 10, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground)', letterSpacing: '0.03em', textTransform: 'uppercase' as const }}>
            {template.label || room.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-secondary)', marginTop: 3 }}>
            {items.length} placed item{items.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--color-secondary)', opacity: 0.75 }}>
          <Package size={22} />
          <span style={{ fontSize: 11 }}>Drop larger items here</span>
        </div>
      )}

      {items.map((item, index) => {
        const defaultX = 6 + ((index % 2) * 42);
        const defaultY = 24 + (Math.floor(index / 2) * 22);
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
              minHeight: 42,
              borderRadius: 12,
              border: item.itemSource === 'existing_belonging' ? '1px solid var(--color-accent)' : '1px solid #1f6b5b',
              background: item.itemSource === 'existing_belonging' ? 'rgba(246, 224, 205, 0.96)' : 'rgba(226, 243, 235, 0.96)',
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

function resolveTemplate(room: Room, templates: RoomTemplate[]) {
  return templates.find(template => template.match.includes(room.name)) || FALLBACK_TEMPLATE;
}

function orderedFloors(rooms: Room[]) {
  const preferred = ['Main Floor', 'Second Floor', 'Lower Level', 'Exterior', 'Flexible', 'Multiple', 'Unassigned floor'];
  const seen = [...new Set(rooms.map(room => room.floor || 'Unassigned floor'))];
  return [
    ...preferred.filter(floor => seen.includes(floor)),
    ...seen.filter(floor => !preferred.includes(floor)),
  ];
}

function estimateWidth(item: RoomItem) {
  const label = item.itemName.toLowerCase();
  if (label.includes('sectional') || label.includes('sofa') || label.includes('couch')) return 34;
  if (label.includes('crib')) return 28;
  if (label.includes('bed') || label.includes('table')) return 30;
  if (label.includes('desk') || label.includes('dresser') || label.includes('shelves')) return 24;
  if (label.includes('peloton') || label.includes('rebounder')) return 22;
  return 20;
}

function estimateHeight(item: RoomItem) {
  const label = item.itemName.toLowerCase();
  if (label.includes('bed') || label.includes('crib')) return 22;
  if (label.includes('table')) return 20;
  if (label.includes('sofa') || label.includes('couch')) return 18;
  return 16;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
