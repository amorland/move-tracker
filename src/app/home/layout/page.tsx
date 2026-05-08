'use client';

import HomeSubnav from '@/components/HomeSubnav';
import {
  containsPlanPoint,
  fallbackFloorPlansForRooms,
  floorForRoom,
  itemFootprint,
  planLabelPointForRoom,
  planPointsForRoom,
  planRectForRoom,
  PlanRect,
} from '@/lib/homeLayout';
import { HomeFloorPlan, PlanPoint, Room, RoomItem } from '@/lib/types';
import { Edit3, Eye, EyeOff, Grid3X3, Image as ImageIcon, MousePointer2, MoveDiagonal, Package, Plus, Ruler, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type MouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type OverlayFit = 'contain' | 'cover' | 'stretch';
type SaveResult = { ok: true } | { ok: false; message: string };
type RoomGeometryDraft = {
  roomId: number;
  shapePoints: PlanPoint[] | null;
  labelXFt: number | null;
  labelYFt: number | null;
};
type GeometryDragTarget = { type: 'point'; index: number } | { type: 'label' };

export default function HomeLayoutPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [floorPlans, setFloorPlans] = useState<HomeFloorPlan[]>([]);
  const [activeFloorName, setActiveFloorName] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [overlayFit, setOverlayFit] = useState<OverlayFit>('contain');
  const [roomEditMode, setRoomEditMode] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomDraft, setRoomDraft] = useState<RoomGeometryDraft | null>(null);
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
  const activeFloorRooms = useMemo(() => {
    if (!activeFloor) return [];
    return rooms.filter(room => floorForRoom(room, measuredFloors)?.name === activeFloor.name);
  }, [activeFloor, measuredFloors, rooms]);
  const unplacedItems = items.filter(item => item.roomId === null && item.floorPlanId === null);

  const moveItem = async (item: RoomItem, floorPlanId: number, roomId: number | null, planXFt: number, planYFt: number) => {
    await fetch('/api/room-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        floorPlanId: floorPlanId > 0 ? floorPlanId : null,
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

  const selectRoomForEditing = (roomId: number | null) => {
    setEditingRoomId(roomId);
    const room = roomId ? rooms.find(entry => entry.id === roomId) : null;
    setRoomDraft(room ? makeRoomGeometryDraft(room) : null);
  };

  const toggleRoomEditMode = () => {
    if (roomEditMode) {
      setRoomEditMode(false);
      return;
    }

    const room = activeFloorRooms.find(entry => entry.id === editingRoomId) ?? activeFloorRooms[0] ?? null;
    setEditingRoomId(room?.id ?? null);
    setRoomDraft(room ? makeRoomGeometryDraft(room) : null);
    setRoomEditMode(true);
  };

  const selectFloor = (floorName: string) => {
    setActiveFloorName(floorName);
    if (!roomEditMode) return;

    const nextFloor = measuredFloors.find(floor => floor.name === floorName);
    const nextRooms = nextFloor ? rooms.filter(room => floorForRoom(room, measuredFloors)?.name === nextFloor.name) : [];
    const nextRoom = nextRooms[0] ?? null;
    setEditingRoomId(nextRoom?.id ?? null);
    setRoomDraft(nextRoom ? makeRoomGeometryDraft(nextRoom) : null);
  };

  const saveRoomGeometry = async (draft: RoomGeometryDraft): Promise<SaveResult> => {
    const res = await fetch('/api/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: draft.roomId,
        labelXFt: draft.labelXFt,
        labelYFt: draft.labelYFt,
        shapePoints: normaliseDraftPoints(draft.shapePoints),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Save failed with HTTP ${res.status}` };
    }

    const saved: Room = await res.json();
    setRooms(current => current.map(room => room.id === saved.id ? saved : room));
    setRoomDraft(makeRoomGeometryDraft(saved));
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
            onClick={() => selectFloor(floor.name)}
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
          <RoomGeometryControls
            floorPlan={activeFloor}
            floorRooms={activeFloorRooms}
            editMode={roomEditMode}
            editingRoomId={editingRoomId}
            roomDraft={roomDraft}
            onToggleEditMode={toggleRoomEditMode}
            onSelectRoom={selectRoomForEditing}
            onDraftChange={setRoomDraft}
            onSave={saveRoomGeometry}
          />
          <MeasuredFloorPlan
            floorPlan={activeFloor}
            floorPlans={measuredFloors}
            rooms={rooms}
            items={items}
            overlayVisible={overlayVisible}
            overlayOpacity={overlayOpacity}
            overlayFit={overlayFit}
            roomEditMode={roomEditMode}
            editingRoomId={editingRoomId}
            roomDraft={roomDraft}
            onSelectRoom={selectRoomForEditing}
            onRoomDraftChange={setRoomDraft}
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

function RoomGeometryControls({
  floorPlan,
  floorRooms,
  editMode,
  editingRoomId,
  roomDraft,
  onToggleEditMode,
  onSelectRoom,
  onDraftChange,
  onSave,
}: {
  floorPlan: HomeFloorPlan;
  floorRooms: Room[];
  editMode: boolean;
  editingRoomId: number | null;
  roomDraft: RoomGeometryDraft | null;
  onToggleEditMode: () => void;
  onSelectRoom: (roomId: number | null) => void;
  onDraftChange: (draft: RoomGeometryDraft | null) => void;
  onSave: (draft: RoomGeometryDraft) => Promise<SaveResult>;
}) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const selectedRoom = floorRooms.find(room => room.id === editingRoomId) ?? null;
  const editorPoints = selectedRoom && roomDraft ? roomEditorPoints(selectedRoom, roomDraft) : [];

  const updateDraft = (next: Partial<RoomGeometryDraft>) => {
    if (!roomDraft) return;
    onDraftChange({ ...roomDraft, ...next });
  };

  const save = async () => {
    if (!roomDraft) return;
    setSaveState('saving');
    setSaveMessage(null);
    const result = await onSave(roomDraft);
    if (result.ok) {
      setSaveState('saved');
      setSaveMessage('Room outline saved.');
      window.setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    setSaveState('error');
    setSaveMessage(result.message);
  };

  const setPoint = (index: number, point: PlanPoint) => {
    if (!selectedRoom || !roomDraft) return;
    const nextPoints = roomEditorPoints(selectedRoom, roomDraft).map((entry, pointIndex) => pointIndex === index ? point : entry);
    updateDraft({ shapePoints: nextPoints });
  };

  const useRectangle = () => {
    if (!selectedRoom) return;
    updateDraft({ shapePoints: rectToPoints(planRectForRoom(selectedRoom)) });
  };

  const addPoint = () => {
    if (!selectedRoom || !roomDraft) return;
    const points = roomEditorPoints(selectedRoom, roomDraft);
    const first = points[0] ?? { x: 0, y: 0 };
    const last = points[points.length - 1] ?? first;
    const nextPoint = {
      x: roundToQuarter((first.x + last.x) / 2),
      y: roundToQuarter((first.y + last.y) / 2),
    };
    updateDraft({ shapePoints: [...points, nextPoint] });
  };

  const removePoint = () => {
    if (!selectedRoom || !roomDraft) return;
    const points = roomEditorPoints(selectedRoom, roomDraft);
    if (points.length <= 3) return;
    updateDraft({ shapePoints: points.slice(0, -1) });
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Edit3 size={17} color="var(--color-accent-dark)" />
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Room outlines</div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>
                Shape and label rooms against the blueprint canvas.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onToggleEditMode} disabled={floorRooms.length === 0}>
              <MousePointer2 size={14} />
              {editMode ? 'Finish Editing' : 'Edit Rooms'}
            </button>
            {editMode && (
              <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!roomDraft || saveState === 'saving'}>
                <Save size={14} /> {saveState === 'saving' ? 'Saving...' : 'Save Room'}
              </button>
            )}
          </div>
        </div>

        {editMode && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.4fr) repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
              <label style={{ display: 'block' }}>
                <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Room</span>
                <select value={editingRoomId ?? ''} onChange={event => onSelectRoom(event.target.value ? Number(event.target.value) : null)}>
                  {floorRooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </label>
              <GeometryNumberField
                label="Label X ft"
                value={roomDraft?.labelXFt ?? null}
                min={0}
                max={floorPlan.widthFt}
                nullable
                onChange={value => updateDraft({ labelXFt: value })}
              />
              <GeometryNumberField
                label="Label Y ft"
                value={roomDraft?.labelYFt ?? null}
                min={0}
                max={floorPlan.depthFt}
                nullable
                onChange={value => updateDraft({ labelYFt: value })}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={useRectangle} disabled={!selectedRoom}>
                  <Grid3X3 size={14} /> Use Rectangle
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addPoint} disabled={!selectedRoom}>
                  <Plus size={14} /> Add Point
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={removePoint} disabled={!selectedRoom || editorPoints.length <= 3}>
                  <Trash2 size={14} /> Remove Point
                </button>
              </div>
            </div>

            {selectedRoom && roomDraft && (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div className="section-label" style={{ fontSize: 10, marginBottom: 10 }}>Polygon points</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  {editorPoints.map((point, index) => (
                    <div key={`${selectedRoom.id}-${index}`} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 8, alignItems: 'end' }}>
                      <div style={{ height: 38, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: 11, fontWeight: 800 }}>
                        {index + 1}
                      </div>
                      <GeometryNumberField
                        label="X ft"
                        value={point.x}
                        min={0}
                        max={floorPlan.widthFt}
                        onChange={value => value !== null && setPoint(index, { ...point, x: value })}
                      />
                      <GeometryNumberField
                        label="Y ft"
                        value={point.y}
                        min={0}
                        max={floorPlan.depthFt}
                        onChange={value => value !== null && setPoint(index, { ...point, y: value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {saveMessage && (
              <span style={{ fontSize: 12, color: saveState === 'error' ? '#b91c1c' : '#1f6b5b', fontWeight: 700 }}>
                {saveMessage}
              </span>
            )}
          </>
        )}
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
  roomEditMode,
  editingRoomId,
  roomDraft,
  onSelectRoom,
  onRoomDraftChange,
  onMoveItem,
}: {
  floorPlan: HomeFloorPlan;
  floorPlans: HomeFloorPlan[];
  rooms: Room[];
  items: RoomItem[];
  overlayVisible: boolean;
  overlayOpacity: number;
  overlayFit: OverlayFit;
  roomEditMode: boolean;
  editingRoomId: number | null;
  roomDraft: RoomGeometryDraft | null;
  onSelectRoom: (roomId: number | null) => void;
  onRoomDraftChange: (draft: RoomGeometryDraft | null) => void;
  onMoveItem: (item: RoomItem, floorPlanId: number, roomId: number | null, planXFt: number, planYFt: number) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [dragTarget, setDragTarget] = useState<GeometryDragTarget | null>(null);
  const floorRooms = rooms.filter(room => floorForRoom(room, floorPlans)?.name === floorPlan.name);
  const roomShapes = floorRooms.map(room => ({
    room,
    points: displayPointsForRoom(room, roomDraft),
    label: displayLabelPointForRoom(room, roomDraft),
    selected: room.id === editingRoomId,
  }));
  const editingRoom = roomDraft ? floorRooms.find(room => room.id === roomDraft.roomId) ?? null : null;
  const editingPoints = editingRoom && roomDraft ? roomEditorPoints(editingRoom, roomDraft) : [];
  const editingLabel = editingRoom && roomDraft ? displayLabelPointForRoom(editingRoom, roomDraft) : null;
  const floorItems = items.filter(item => {
    if (item.floorPlanId === floorPlan.id) return true;
    return item.floorPlanId === null && item.roomId !== null && floorRooms.some(room => room.id === item.roomId);
  });
  const gridLinesX = gridLines(floorPlan.widthFt);
  const gridLinesY = gridLines(floorPlan.depthFt);
  const overlaySrc = toBlueprintImageSrc(floorPlan.blueprintImagePath);
  const overlayRect = {
    x: floorPlan.overlayOffsetXFt ?? 0,
    y: floorPlan.overlayOffsetYFt ?? 0,
    width: floorPlan.overlayWidthFt ?? floorPlan.widthFt,
    depth: floorPlan.overlayDepthFt ?? floorPlan.depthFt,
  };

  const pointFromPointer = (event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) => {
    if (!surfaceRef.current) return null;
    const bounds = surfaceRef.current.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * floorPlan.widthFt, 0, floorPlan.widthFt),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * floorPlan.depthFt, 0, floorPlan.depthFt),
    };
  };

  const updateDraftFromPointer = (event: PointerEvent<HTMLElement>) => {
    if (!roomEditMode || !roomDraft || !dragTarget) return;
    const point = pointFromPointer(event);
    if (!point) return;
    const roundedPoint = roundPlanPoint(point);

    if (dragTarget.type === 'label') {
      onRoomDraftChange({ ...roomDraft, labelXFt: roundedPoint.x, labelYFt: roundedPoint.y });
      return;
    }

    const selectedRoom = floorRooms.find(room => room.id === roomDraft.roomId);
    if (!selectedRoom) return;
    const points = roomEditorPoints(selectedRoom, roomDraft);
    const nextPoints = points.map((entry, index) => index === dragTarget.index ? roundedPoint : entry);
    onRoomDraftChange({ ...roomDraft, shapePoints: nextPoints });
  };

  const setLabelFromClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!roomEditMode || !roomDraft || dragTarget) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-layout-control="true"]')) return;
    const point = pointFromPointer(event);
    if (!point) return;
    const roundedPoint = roundPlanPoint(point);
    onRoomDraftChange({ ...roomDraft, labelXFt: roundedPoint.x, labelYFt: roundedPoint.y });
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
          ref={surfaceRef}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            const itemId = Number(event.dataTransfer.getData('text/plain'));
            const item = items.find(entry => entry.id === itemId);
            if (!item) return;

            const bounds = event.currentTarget.getBoundingClientRect();
            const footprint = itemFootprint(item);
            const rawXFt = ((event.clientX - bounds.left) / bounds.width) * floorPlan.widthFt;
            const rawYFt = ((event.clientY - bounds.top) / bounds.height) * floorPlan.depthFt;
            const planXFt = clamp(rawXFt, 0, Math.max(0, floorPlan.widthFt - footprint.widthFt));
            const planYFt = clamp(rawYFt, 0, Math.max(0, floorPlan.depthFt - footprint.depthFt));
            const centerXFt = planXFt + footprint.widthFt / 2;
            const centerYFt = planYFt + footprint.depthFt / 2;
            const target = roomShapes.find(({ points }) => containsPlanPoint(points, centerXFt, centerYFt));
            onMoveItem(item, floorPlan.id, target?.room.id ?? null, planXFt, planYFt);
          }}
          onPointerMove={updateDraftFromPointer}
          onPointerUp={() => setDragTarget(null)}
          onPointerCancel={() => setDragTarget(null)}
          onClick={setLabelFromClick}
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
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: roomEditMode ? 'auto' : 'none' }}
          >
            {roomShapes.map(({ room, points, selected }) => (
              <polygon
                key={room.id}
                points={pointsToSvg(points, floorPlan)}
                fill={selected ? 'rgba(31,107,91,0.14)' : 'rgba(255,255,255,0.12)'}
                stroke={selected ? '#1f6b5b' : 'rgba(92,86,72,0.54)'}
                strokeWidth={selected ? 0.55 : 0.32}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: roomEditMode ? 'pointer' : 'default' }}
                onClick={event => {
                  if (!roomEditMode) return;
                  event.stopPropagation();
                  onSelectRoom(room.id);
                }}
              />
            ))}
          </svg>
          {roomShapes.map(({ room, label, selected }) => (
            <button
              key={`label-${room.id}`}
              type="button"
              data-layout-control="true"
              aria-label={`Select ${room.name}`}
              onClick={event => {
                if (!roomEditMode) return;
                event.stopPropagation();
                onSelectRoom(room.id);
              }}
              disabled={!roomEditMode}
              style={{
                position: 'absolute',
                left: `${(label.x / floorPlan.widthFt) * 100}%`,
                top: `${(label.y / floorPlan.depthFt) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                maxWidth: 142,
                border: selected ? '1px solid #1f6b5b' : '1px solid rgba(92,86,72,0.22)',
                borderRadius: 999,
                background: selected ? 'rgba(226,243,235,0.96)' : 'rgba(255,252,247,0.88)',
                color: 'var(--color-foreground)',
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pointerEvents: roomEditMode ? 'auto' : 'none',
                cursor: roomEditMode ? 'pointer' : 'default',
                boxShadow: selected ? '0 2px 8px rgba(31,107,91,0.18)' : '0 1px 4px rgba(28,25,23,0.08)',
              }}
            >
              {room.name}
            </button>
          ))}
          {roomEditMode && roomDraft && editingRoom && editingPoints.map((point, index) => (
            <button
              key={`handle-${roomDraft.roomId}-${index}`}
              type="button"
              data-layout-control="true"
              aria-label={`Move room point ${index + 1}`}
              onPointerDown={event => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragTarget({ type: 'point', index });
              }}
              style={{
                position: 'absolute',
                left: `${(point.x / floorPlan.widthFt) * 100}%`,
                top: `${(point.y / floorPlan.depthFt) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                width: 16,
                height: 16,
                borderRadius: 999,
                border: '2px solid #1f6b5b',
                background: '#fffaf3',
                boxShadow: '0 2px 8px rgba(28,25,23,0.18)',
                cursor: 'grab',
                padding: 0,
              }}
            />
          ))}
          {roomEditMode && roomDraft && editingLabel && (
            <button
              type="button"
              data-layout-control="true"
              aria-label="Move room label"
              onPointerDown={event => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragTarget({ type: 'label' });
              }}
              style={{
                position: 'absolute',
                left: `${(editingLabel.x / floorPlan.widthFt) * 100}%`,
                top: `${(editingLabel.y / floorPlan.depthFt) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 6,
                width: 22,
                height: 22,
                borderRadius: 999,
                border: '2px solid #1f6b5b',
                background: 'rgba(255,250,243,0.94)',
                boxShadow: '0 2px 8px rgba(28,25,23,0.18)',
                cursor: 'grab',
                padding: 0,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <MousePointer2 size={12} color="#1f6b5b" />
            </button>
          )}
          {floorItems.map((item, index) => {
            const room = floorRooms.find(entry => entry.id === item.roomId);
            const defaultPoint = room ? planLabelPointForRoom(room) : null;
            const footprint = itemFootprint(item);
            const defaultX = defaultPoint
              ? defaultPoint.x - footprint.widthFt / 2 + (index % 2) * Math.min(footprint.widthFt + 1, 3)
              : 2 + (index % 4) * 3;
            const defaultY = defaultPoint
              ? defaultPoint.y - footprint.depthFt / 2 + Math.floor(index / 2) * Math.min(footprint.depthFt + 1, 3)
              : 2 + Math.floor(index / 4) * 3;
            const x = clamp(item.planXFt ?? defaultX, 0, Math.max(0, floorPlan.widthFt - footprint.widthFt));
            const y = clamp(item.planYFt ?? defaultY, 0, Math.max(0, floorPlan.depthFt - footprint.depthFt));
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

function GeometryNumberField({
  label,
  value,
  min,
  max,
  nullable = false,
  onChange,
}: {
  label: string;
  value: number | null;
  min?: number;
  max?: number;
  nullable?: boolean;
  onChange: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(formatNumberInput(value));

  useEffect(() => {
    setDraft(formatNumberInput(value));
  }, [value]);

  const commit = () => {
    const parsed = nullableNumber(draft);
    if (parsed === null) {
      if (nullable) {
        onChange(null);
        setDraft('');
        return;
      }
      setDraft(formatNumberInput(value));
      return;
    }

    const next = roundToQuarter(clamp(parsed, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY));
    onChange(next);
    setDraft(formatNumberInput(next));
  };

  return (
    <label style={{ display: 'block' }}>
      <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>{label}</span>
      <input
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        type="number"
        min={min}
        max={max}
        step="0.25"
      />
    </label>
  );
}

function makeRoomGeometryDraft(room: Room): RoomGeometryDraft {
  return {
    roomId: room.id,
    shapePoints: normaliseDraftPoints(room.shapePoints),
    labelXFt: room.labelXFt,
    labelYFt: room.labelYFt,
  };
}

function normaliseDraftPoints(points: PlanPoint[] | null | undefined) {
  if (!Array.isArray(points)) return null;
  const nextPoints = points
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map(roundPlanPoint);
  return nextPoints.length >= 3 ? nextPoints : null;
}

function roomEditorPoints(room: Room, draft: RoomGeometryDraft) {
  return draft.shapePoints && draft.shapePoints.length >= 3 ? draft.shapePoints : planPointsForRoom(room);
}

function displayPointsForRoom(room: Room, draft: RoomGeometryDraft | null) {
  return draft?.roomId === room.id ? roomEditorPoints(room, draft) : planPointsForRoom(room);
}

function displayLabelPointForRoom(room: Room, draft: RoomGeometryDraft | null) {
  if (draft?.roomId === room.id) {
    if (Number.isFinite(draft.labelXFt) && Number.isFinite(draft.labelYFt)) {
      return { x: draft.labelXFt as number, y: draft.labelYFt as number };
    }
    return averagePoint(displayPointsForRoom(room, draft));
  }

  return planLabelPointForRoom(room);
}

function rectToPoints(rect: PlanRect): PlanPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.depth },
    { x: rect.x, y: rect.y + rect.depth },
  ];
}

function pointsToSvg(points: PlanPoint[], floorPlan: HomeFloorPlan) {
  return points
    .map(point => `${(point.x / floorPlan.widthFt) * 100},${(point.y / floorPlan.depthFt) * 100}`)
    .join(' ');
}

function averagePoint(points: PlanPoint[]) {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function roundPlanPoint(point: PlanPoint): PlanPoint {
  return {
    x: roundToQuarter(point.x),
    y: roundToQuarter(point.y),
  };
}

function formatNumberInput(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
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
      data-layout-control="true"
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
