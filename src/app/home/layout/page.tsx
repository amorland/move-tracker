'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { fallbackFloorPlansForRooms, floorForRoom, itemFootprint, planRectForRoom, PlanRect } from '@/lib/homeLayout';
import { HomeFloorPlan, Room, RoomItem } from '@/lib/types';
import { Eye, EyeOff, Grid3X3, Image as ImageIcon, MoveDiagonal, Package, Ruler, Save, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type OverlayFit = 'contain' | 'cover' | 'stretch';
type SaveResult = { ok: true } | { ok: false; message: string };

export default function HomeLayoutPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [floorPlans, setFloorPlans] = useState<HomeFloorPlan[]>([]);
  const [activeFloorName, setActiveFloorName] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [overlayFit, setOverlayFit] = useState<OverlayFit>('contain');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [roomsRes, itemsRes, floorPlansRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/room-items'),
      fetch('/api/home-floor-plans'),
    ]);
    const nextRooms: Room[] = await roomsRes.json();
    const nextItems: RoomItem[] = await itemsRes.json();
    const nextFloorPlans: HomeFloorPlan[] = floorPlansRes.ok ? await floorPlansRes.json() : [];

    setRooms(nextRooms);
    setItems(nextItems);
    setFloorPlans(nextFloorPlans);
    setActiveFloorName(current => current ?? (nextFloorPlans[0]?.name ?? fallbackFloorPlansForRooms(nextRooms)[0]?.name ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const measuredFloors = useMemo(() => {
    const source = floorPlans.length > 0 ? floorPlans : fallbackFloorPlansForRooms(rooms);
    return source.filter(floor => rooms.some(room => floorForRoom(room, source)?.name === floor.name) || floor.name === 'Main Floor');
  }, [floorPlans, rooms]);

  const activeFloor = measuredFloors.find(floor => floor.name === activeFloorName) ?? measuredFloors[0];
  const unplacedItems = items.filter(item => item.roomId === null);

  const moveItem = async (item: RoomItem, roomId: number | null, planXFt: number, planYFt: number) => {
    await fetch('/api/room-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        roomId,
        planXFt: roundToQuarter(planXFt),
        planYFt: roundToQuarter(planYFt),
      }),
    });
    fetchAll();
  };

  const saveFloorPlan = async (floorPlan: Partial<HomeFloorPlan> & { id: number }): Promise<SaveResult> => {
    const method = floorPlan.id > 0 ? 'PATCH' : 'POST';
    const res = await fetch('/api/home-floor-plans', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(floorPlan),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Save failed with HTTP ${res.status}` };
    }

    fetchAll();
    return { ok: true };
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading layout...</div>;

  return (
    <div style={{ maxWidth: 1260, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Visual Layout</h1>
          <p className="page-subtitle">Measured room and furniture planning.</p>
        </div>
        <Link href="/home/rooms" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
          Manage Rooms & Items
        </Link>
      </div>

      <HomeSubnav />

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'grid', placeItems: 'center' }}>
              <Ruler size={18} color="var(--color-accent-dark)" />
            </div>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Measured model</div>
              <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>
                {activeFloor ? `${activeFloor.label} · ${activeFloor.widthFt}' x ${activeFloor.depthFt}'` : 'No floor selected'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-neutral">{rooms.length} rooms</span>
            <span className="badge badge-neutral">{items.length} room items</span>
            <span className="badge badge-neutral">{unplacedItems.length} unplaced</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {measuredFloors.map(floor => (
          <button
            key={floor.id}
            type="button"
            className={`filter-chip ${floor.name === activeFloor?.name ? 'filter-chip-active' : ''}`}
            onClick={() => setActiveFloorName(floor.name)}
          >
            {floor.label}
          </button>
        ))}
      </div>

      {activeFloor && (
        <>
          <BlueprintOverlayControls
            key={activeFloor.id}
            floorPlan={activeFloor}
            overlayVisible={overlayVisible}
            overlayOpacity={overlayOpacity}
            overlayFit={overlayFit}
            onToggleOverlay={() => setOverlayVisible(value => !value)}
            onOpacityChange={setOverlayOpacity}
            onFitChange={setOverlayFit}
            onSave={saveFloorPlan}
          />
          <MeasuredFloorPlan
            floorPlan={activeFloor}
            floorPlans={measuredFloors}
            rooms={rooms}
            items={items}
            overlayVisible={overlayVisible}
            overlayOpacity={overlayOpacity}
            overlayFit={overlayFit}
            onMoveItem={moveItem}
          />
        </>
      )}

      <div className="card" style={{ marginTop: 22 }}>
        <div className="card-header">
          <div>
            <h2 style={{ margin: 0 }}>Unplaced Items</h2>
            <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>Furniture and planned items without a selected room.</div>
          </div>
        </div>
        <div className="card-body" style={{ minHeight: 108 }}>
          {unplacedItems.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>All saved room items are currently assigned.</div>
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

function BlueprintOverlayControls({
  floorPlan,
  overlayVisible,
  overlayOpacity,
  overlayFit,
  onToggleOverlay,
  onOpacityChange,
  onFitChange,
  onSave,
}: {
  floorPlan: HomeFloorPlan;
  overlayVisible: boolean;
  overlayOpacity: number;
  overlayFit: OverlayFit;
  onToggleOverlay: () => void;
  onOpacityChange: (value: number) => void;
  onFitChange: (value: OverlayFit) => void;
  onSave: (floorPlan: Partial<HomeFloorPlan> & { id: number }) => Promise<SaveResult>;
}) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    blueprintImagePath: floorPlan.blueprintImagePath ?? '',
    blueprintPage: floorPlan.blueprintPage?.toString() ?? '',
    widthFt: floorPlan.widthFt.toString(),
    depthFt: floorPlan.depthFt.toString(),
    overlayOffsetXFt: (floorPlan.overlayOffsetXFt ?? 0).toString(),
    overlayOffsetYFt: (floorPlan.overlayOffsetYFt ?? 0).toString(),
    overlayWidthFt: (floorPlan.overlayWidthFt ?? floorPlan.widthFt).toString(),
    overlayDepthFt: (floorPlan.overlayDepthFt ?? floorPlan.depthFt).toString(),
  });
  const previewSrc = toBlueprintImageSrc(draft.blueprintImagePath);
  const isBundledBlueprint = previewSrc?.startsWith('/blueprints/');

  const save = async () => {
    setSaveState('saving');
    setSaveMessage(null);
    const result = await onSave({
      id: floorPlan.id,
      name: floorPlan.name,
      label: floorPlan.label,
      level: floorPlan.level,
      blueprintImagePath: draft.blueprintImagePath.trim() || null,
      blueprintPage: nullableNumber(draft.blueprintPage),
      widthFt: nullableNumber(draft.widthFt) ?? floorPlan.widthFt,
      depthFt: nullableNumber(draft.depthFt) ?? floorPlan.depthFt,
      overlayOffsetXFt: nullableNumber(draft.overlayOffsetXFt) ?? 0,
      overlayOffsetYFt: nullableNumber(draft.overlayOffsetYFt) ?? 0,
      overlayWidthFt: nullableNumber(draft.overlayWidthFt) ?? nullableNumber(draft.widthFt) ?? floorPlan.widthFt,
      overlayDepthFt: nullableNumber(draft.overlayDepthFt) ?? nullableNumber(draft.depthFt) ?? floorPlan.depthFt,
      ceilingHeightFt: floorPlan.ceilingHeightFt,
      notes: floorPlan.notes,
      sortIndex: floorPlan.sortIndex,
    });
    if (result.ok) {
      setSaveState('saved');
      setSaveMessage('Overlay saved.');
      window.setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    setSaveState('error');
    setSaveMessage(result.message);
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ImageIcon size={17} color="var(--color-accent-dark)" />
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Blueprint overlay</div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>
                Using the bundled blueprint overlay when no custom URL is set.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onToggleOverlay}>
              {overlayVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              {overlayVisible ? 'Hide' : 'Show'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saveState === 'saving'}>
              <Save size={14} /> {saveState === 'saving' ? 'Saving...' : 'Save Overlay'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label style={{ display: 'block', gridColumn: 'span 2' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Image URL</span>
            <input
              value={draft.blueprintImagePath}
              onChange={event => setDraft({ ...draft, blueprintImagePath: event.target.value })}
              placeholder="/blueprints/second-floor.png or https://..."
            />
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Page</span>
            <input value={draft.blueprintPage} onChange={event => setDraft({ ...draft, blueprintPage: event.target.value })} type="number" min="1" />
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Width ft</span>
            <input value={draft.widthFt} onChange={event => setDraft({ ...draft, widthFt: event.target.value })} type="number" min="1" step="0.25" />
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Depth ft</span>
            <input value={draft.depthFt} onChange={event => setDraft({ ...draft, depthFt: event.target.value })} type="number" min="1" step="0.25" />
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Fit</span>
            <select value={overlayFit} onChange={event => onFitChange(event.target.value as OverlayFit)}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="stretch">Stretch</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Overlay X ft</span>
            <input value={draft.overlayOffsetXFt} onChange={event => setDraft({ ...draft, overlayOffsetXFt: event.target.value })} type="number" step="0.25" />
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Overlay Y ft</span>
            <input value={draft.overlayOffsetYFt} onChange={event => setDraft({ ...draft, overlayOffsetYFt: event.target.value })} type="number" step="0.25" />
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Overlay width ft</span>
            <input value={draft.overlayWidthFt} onChange={event => setDraft({ ...draft, overlayWidthFt: event.target.value })} type="number" min="1" step="0.25" />
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Overlay depth ft</span>
            <input value={draft.overlayDepthFt} onChange={event => setDraft({ ...draft, overlayDepthFt: event.target.value })} type="number" min="1" step="0.25" />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <SlidersHorizontal size={14} color="var(--color-secondary)" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 260 }}>
            <span className="section-label" style={{ margin: 0, fontSize: 10 }}>Opacity</span>
            <input
              type="range"
              min="0.08"
              max="0.9"
              step="0.02"
              value={overlayOpacity}
              onChange={event => onOpacityChange(Number(event.target.value))}
            />
            <span style={{ fontSize: 12, color: 'var(--color-secondary)', width: 36 }}>{Math.round(overlayOpacity * 100)}%</span>
          </label>
          {draft.blueprintImagePath && !previewSrc && (
            <span style={{ fontSize: 12, color: '#b45309' }}>This does not look like a browser-loadable image URL.</span>
          )}
          {isBundledBlueprint && (
            <span style={{ fontSize: 12, color: 'var(--color-secondary)' }}>Bundled blueprint asset. It deploys with the app.</span>
          )}
          {floorPlan.id < 0 && (
            <span style={{ fontSize: 12, color: '#b45309' }}>This floor is using defaults; saving will create its floor-plan row.</span>
          )}
          {saveMessage && (
            <span style={{ fontSize: 12, color: saveState === 'error' ? '#b91c1c' : '#1f6b5b', fontWeight: 700 }}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MeasuredFloorPlan({
  floorPlan,
  floorPlans,
  rooms,
  items,
  overlayVisible,
  overlayOpacity,
  overlayFit,
  onMoveItem,
}: {
  floorPlan: HomeFloorPlan;
  floorPlans: HomeFloorPlan[];
  rooms: Room[];
  items: RoomItem[];
  overlayVisible: boolean;
  overlayOpacity: number;
  overlayFit: OverlayFit;
  onMoveItem: (item: RoomItem, roomId: number | null, planXFt: number, planYFt: number) => void;
}) {
  const floorRooms = rooms.filter(room => floorForRoom(room, floorPlans)?.name === floorPlan.name);
  const roomRects = floorRooms.map(room => ({ room, rect: planRectForRoom(room) }));
  const floorItems = items.filter(item => item.roomId && floorRooms.some(room => room.id === item.roomId));
  const gridLinesX = gridLines(floorPlan.widthFt);
  const gridLinesY = gridLines(floorPlan.depthFt);
  const overlaySrc = toBlueprintImageSrc(floorPlan.blueprintImagePath);
  const overlayRect = {
    x: floorPlan.overlayOffsetXFt ?? 0,
    y: floorPlan.overlayOffsetYFt ?? 0,
    width: floorPlan.overlayWidthFt ?? floorPlan.widthFt,
    depth: floorPlan.overlayDepthFt ?? floorPlan.depthFt,
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 style={{ margin: 0 }}>{floorPlan.label}</h2>
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 6 }}>
            {floorPlan.notes || `Blueprint page ${floorPlan.blueprintPage ?? 'not set'}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-neutral">{floorRooms.length} rooms</span>
          <span className="badge badge-neutral">{floorItems.length} placed items</span>
        </div>
      </div>
      <div className="card-body">
        <div
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            const itemId = Number(event.dataTransfer.getData('text/plain'));
            const item = items.find(entry => entry.id === itemId);
            if (!item) return;

            const bounds = event.currentTarget.getBoundingClientRect();
            const planXFt = clamp(((event.clientX - bounds.left) / bounds.width) * floorPlan.widthFt, 0, floorPlan.widthFt);
            const planYFt = clamp(((event.clientY - bounds.top) / bounds.height) * floorPlan.depthFt, 0, floorPlan.depthFt);
            const target = roomRects.find(({ rect }) => containsPoint(rect, planXFt, planYFt));
            onMoveItem(item, target?.room.id ?? item.roomId ?? null, planXFt, planYFt);
          }}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: `${floorPlan.widthFt} / ${floorPlan.depthFt}`,
            minHeight: 480,
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: '#f8f4ec',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)',
          }}
        >
          {overlayVisible && overlaySrc && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${(overlayRect.x / floorPlan.widthFt) * 100}%`,
                top: `${(overlayRect.y / floorPlan.depthFt) * 100}%`,
                width: `${(overlayRect.width / floorPlan.widthFt) * 100}%`,
                height: `${(overlayRect.depth / floorPlan.depthFt) * 100}%`,
                backgroundImage: `url(${JSON.stringify(overlaySrc)})`,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: overlayFit === 'stretch' ? '100% 100%' : overlayFit,
                opacity: overlayOpacity,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          )}
          {gridLinesX.map(line => (
            <div
              key={`x-${line}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(line / floorPlan.widthFt) * 100}%`,
                borderLeft: line === 0 ? 'none' : '1px solid rgba(92,86,72,0.08)',
                zIndex: 1,
              }}
            />
          ))}
          {gridLinesY.map(line => (
            <div
              key={`y-${line}`}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${(line / floorPlan.depthFt) * 100}%`,
                borderTop: line === 0 ? 'none' : '1px solid rgba(92,86,72,0.08)',
                zIndex: 1,
              }}
            />
          ))}
          {roomRects.map(({ room, rect }) => (
            <RoomZone key={room.id} room={room} rect={rect} floorPlan={floorPlan} />
          ))}
          {floorItems.map((item, index) => {
            const room = floorRooms.find(entry => entry.id === item.roomId);
            if (!room) return null;
            const rect = planRectForRoom(room);
            const footprint = itemFootprint(item);
            const defaultX = rect.x + 1 + (index % 2) * Math.min(footprint.widthFt + 1, Math.max(rect.width / 3, 2));
            const defaultY = rect.y + 1 + Math.floor(index / 2) * Math.min(footprint.depthFt + 1, Math.max(rect.depth / 4, 2));
            const x = clamp(item.planXFt ?? defaultX, rect.x, Math.max(rect.x, rect.x + rect.width - footprint.widthFt));
            const y = clamp(item.planYFt ?? defaultY, rect.y, Math.max(rect.y, rect.y + rect.depth - footprint.depthFt));
            return (
              <PlacedItem
                key={item.id}
                item={item}
                x={x}
                y={y}
                width={footprint.widthFt}
                depth={footprint.depthFt}
                floorPlan={floorPlan}
              />
            );
          })}
          {floorRooms.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--color-secondary)', textAlign: 'center', padding: 24 }}>
              <div>
                <Grid3X3 size={28} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 13 }}>No rooms are assigned to this floor.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomZone({ room, rect, floorPlan }: { room: Room; rect: PlanRect; floorPlan: HomeFloorPlan }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${(rect.x / floorPlan.widthFt) * 100}%`,
        top: `${(rect.y / floorPlan.depthFt) * 100}%`,
        width: `${(rect.width / floorPlan.widthFt) * 100}%`,
        height: `${(rect.depth / floorPlan.depthFt) * 100}%`,
        border: '2px solid rgba(92,86,72,0.48)',
        background: 'rgba(255,255,255,0.58)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.72)',
        overflow: 'hidden',
        zIndex: 2,
      }}
    >
      <div style={{ padding: 8, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-foreground)', textTransform: 'uppercase', letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {room.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-secondary)', marginTop: 3 }}>
          {formatFt(rect.width)} x {formatFt(rect.depth)}
        </div>
      </div>
    </div>
  );
}

function PlacedItem({
  item,
  x,
  y,
  width,
  depth,
  floorPlan,
}: {
  item: RoomItem;
  x: number;
  y: number;
  width: number;
  depth: number;
  floorPlan: HomeFloorPlan;
}) {
  return (
    <button
      draggable
      onDragStart={event => event.dataTransfer.setData('text/plain', String(item.id))}
      title={`${item.itemName} · ${formatFt(width)} x ${formatFt(depth)}`}
      style={{
        position: 'absolute',
        left: `${(x / floorPlan.widthFt) * 100}%`,
        top: `${(y / floorPlan.depthFt) * 100}%`,
        width: `${(width / floorPlan.widthFt) * 100}%`,
        height: `${(depth / floorPlan.depthFt) * 100}%`,
        minWidth: 52,
        minHeight: 34,
        borderRadius: 6,
        border: item.itemSource === 'existing_belonging' ? '1px solid var(--color-accent)' : '1px solid #1f6b5b',
        background: item.itemSource === 'existing_belonging' ? 'rgba(246,224,205,0.96)' : 'rgba(226,243,235,0.96)',
        color: 'var(--color-foreground)',
        padding: 6,
        textAlign: 'left',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'grab',
        transform: `rotate(${item.rotationDeg ?? 0}deg)`,
        transformOrigin: 'center',
        zIndex: 3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.itemName}</div>
        <MoveDiagonal size={11} color="var(--color-secondary)" />
      </div>
      <div style={{ fontSize: 9, color: 'var(--color-secondary)', marginTop: 4, whiteSpace: 'nowrap' }}>
        {formatFt(width)} x {formatFt(depth)}
      </div>
    </button>
  );
}

function LayoutChip({ item }: { item: RoomItem }) {
  const footprint = itemFootprint(item);
  return (
    <button
      draggable
      onDragStart={event => event.dataTransfer.setData('text/plain', String(item.id))}
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 8, padding: '10px 12px', cursor: 'grab', minWidth: 132, textAlign: 'left' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Package size={14} color="var(--color-secondary)" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.itemName}</div>
          <div style={{ fontSize: 10, color: 'var(--color-secondary)', marginTop: 4 }}>{formatFt(footprint.widthFt)} x {formatFt(footprint.depthFt)}</div>
        </div>
      </div>
    </button>
  );
}

function gridLines(max: number) {
  const lines = [];
  for (let line = 0; line <= max; line += 5) lines.push(line);
  return lines;
}

function containsPoint(rect: PlanRect, x: number, y: number) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.depth;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToQuarter(value: number) {
  return Math.round(value * 4) / 4;
}

function nullableNumber(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFt(value: number) {
  const rounded = Math.round(value * 4) / 4;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2).replace(/0$/, '')}'`;
}

function toBlueprintImageSrc(value?: string | null) {
  const source = value?.trim();
  if (!source) return null;

  const driveId = getGoogleDriveFileId(source);
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w4000`;

  if (source.startsWith('/') || /^https?:\/\//i.test(source)) return source;
  return null;
}

function getGoogleDriveFileId(value: string) {
  const fileMatch = value.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  try {
    const parsed = new URL(value);
    return parsed.searchParams.get('id');
  } catch {
    return null;
  }
}
