'use client';

import HomeSubnav from '@/components/HomeSubnav';
import {
  fallbackFloorPlansForRooms,
  floorForRoom,
  itemFootprint,
  planPointsForRoom,
} from '@/lib/homeLayout';
import { FURNITURE_TYPE_OPTIONS, normaliseFurnitureType } from '@/lib/furniture';
import { ArchitecturalElement, ArchitecturalElementType, FurnitureType, HomeFloorPlan, PlanPoint, Room, RoomItem } from '@/lib/types';
import { Armchair, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Edit3, Eye, EyeOff, Grid3X3, Image as ImageIcon, MousePointer2, MoveDiagonal, Package, Plus, RotateCcw, RotateCw, Ruler, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MeasuredFloorPlan } from './MeasuredFloorPlan';
import {
  ARCHITECTURAL_ELEMENT_TYPES,
  ArchitecturalElementDraft,
  ArchitecturalElementUpdate,
  LayoutAutomationMode,
  LayoutAutomationStats,
  OverlayFit,
  RoomGeometryDraft,
  RoomItemLayoutUpdate,
  SaveResult,
  architecturalDraftHasChanges,
  architecturalDraftToUpdate,
  averagePoint,
  clamp,
  clampArchitecturalElementPosition,
  clampItemPosition,
  defaultArchitecturalElementDimensions,
  formatAutomationMessage,
  formatFt,
  formatNumberInput,
  ftToIn,
  furnitureProfileForType,
  itemPlacementForControls,
  labelForArchitecturalElementType,
  makeArchitecturalElementDraft,
  makeRoomGeometryDraft,
  newRoomRectForFloor,
  normaliseDraftPoints,
  normaliseRotation,
  nullableNumber,
  nullableNumbersMatch,
  rectToPoints,
  roomDraftHasChanges,
  roomEditorPoints,
  roomGeometryStatus,
  roundToHundredth,
  roundToQuarter,
  toBlueprintImageSrc,
} from './helpers';
import { planRectForRoom } from '@/lib/homeLayout';

export default function HomeLayoutPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [architecturalElements, setArchitecturalElements] = useState<ArchitecturalElement[]>([]);
  const [floorPlans, setFloorPlans] = useState<HomeFloorPlan[]>([]);
  const [activeFloorName, setActiveFloorName] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [roomLabelsVisible, setRoomLabelsVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [overlayFit, setOverlayFit] = useState<OverlayFit>('contain');
  const [roomEditMode, setRoomEditMode] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomDraft, setRoomDraft] = useState<RoomGeometryDraft | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [automationBusy, setAutomationBusy] = useState<LayoutAutomationMode | null>(null);
  const [automationMessage, setAutomationMessage] = useState<string | null>(null);
  const [layoutMessage, setLayoutMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [roomsRes, itemsRes, elementsRes, floorPlansRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/room-items'),
      fetch('/api/architectural-elements'),
      fetch('/api/home-floor-plans'),
    ]);
    const nextRooms: Room[] = await roomsRes.json();
    const nextItems: RoomItem[] = await itemsRes.json();
    const nextElements: ArchitecturalElement[] = elementsRes.ok ? await elementsRes.json() : [];
    const nextFloorPlans: HomeFloorPlan[] = floorPlansRes.ok ? await floorPlansRes.json() : [];

    setRooms(nextRooms);
    setItems(nextItems);
    setArchitecturalElements(nextElements);
    setFloorPlans(nextFloorPlans);
    setActiveFloorName(current => current ?? (nextFloorPlans[0]?.name ?? fallbackFloorPlansForRooms(nextRooms)[0]?.name ?? null));
    setLoading(false);
    return { rooms: nextRooms, items: nextItems, architecturalElements: nextElements, floorPlans: nextFloorPlans };
  }, []);

  useEffect(() => {
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
  const selectedItem = items.find(item => item.id === selectedItemId) ?? null;
  const activeFloorElements = activeFloor ? architecturalElements.filter(element => element.floorPlanId === activeFloor.id) : [];
  const selectedElement = architecturalElements.find(element => element.id === selectedElementId) ?? null;
  const selectedItemRoom = selectedItem?.roomId ? rooms.find(room => room.id === selectedItem.roomId) ?? null : null;
  const selectedItemFloor = selectedItem?.floorPlanId
    ? measuredFloors.find(floor => floor.id === selectedItem.floorPlanId) ?? null
    : selectedItemRoom
      ? floorForRoom(selectedItemRoom, measuredFloors)
      : null;

  const moveItem = async (item: RoomItem, floorPlanId: number, roomId: number | null, planXFt: number, planYFt: number) => {
    setSelectedItemId(item.id);
    setSelectedElementId(null);
    setLayoutMessage('Saving item position...');
    const res = await fetch('/api/room-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        floorPlanId: floorPlanId > 0 ? floorPlanId : null,
        roomId,
        planXFt: roundToHundredth(planXFt),
        planYFt: roundToHundredth(planYFt),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      setLayoutMessage(body?.error || 'Item position failed to save.');
      return;
    }

    setLayoutMessage('Item position saved.');
    window.setTimeout(() => setLayoutMessage(null), 1800);
    fetchAll();
  };

  const saveItemLayout = async (itemId: number, update: RoomItemLayoutUpdate): Promise<SaveResult> => {
    const res = await fetch('/api/room-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, ...update }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Save failed with HTTP ${res.status}` };
    }

    const saved: RoomItem = await res.json();
    setItems(current => current.map(item => item.id === saved.id ? saved : item));
    return { ok: true };
  };

  const createArchitecturalElement = async (draft: ArchitecturalElementDraft): Promise<SaveResult> => {
    const res = await fetch('/api/architectural-elements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, notes: draft.notes.trim() || null }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Create failed with HTTP ${res.status}` };
    }

    const saved: ArchitecturalElement = await res.json();
    setArchitecturalElements(current => [...current, saved]);
    setSelectedElementId(saved.id);
    return { ok: true };
  };

  const saveArchitecturalElement = async (elementId: number, update: ArchitecturalElementUpdate): Promise<SaveResult> => {
    const res = await fetch('/api/architectural-elements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: elementId, ...update }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Save failed with HTTP ${res.status}` };
    }

    const saved: ArchitecturalElement = await res.json();
    setArchitecturalElements(current => current.map(element => element.id === saved.id ? saved : element));
    return { ok: true };
  };

  const deleteArchitecturalElement = async (elementId: number): Promise<SaveResult> => {
    const res = await fetch(`/api/architectural-elements?id=${elementId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Delete failed with HTTP ${res.status}` };
    }

    setArchitecturalElements(current => current.filter(element => element.id !== elementId));
    setSelectedElementId(null);
    return { ok: true };
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
        geometrySource: 'custom',
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

  const createLayoutRoom = async (name: string): Promise<SaveResult> => {
    if (!activeFloor) return { ok: false, message: 'Select a floor before adding a room.' };
    const roomName = name.trim();
    if (!roomName) return { ok: false, message: 'Enter a room name.' };

    const rect = newRoomRectForFloor(activeFloor, activeFloorRooms.length);
    const shapePoints = rectToPoints(rect);
    const label = averagePoint(shapePoints);
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: roomName,
        floor: activeFloor.name,
        floorPlanId: activeFloor.id > 0 ? activeFloor.id : null,
        notes: null,
        planXFt: rect.x,
        planYFt: rect.y,
        planWidthFt: rect.width,
        planDepthFt: rect.depth,
        labelXFt: label.x,
        labelYFt: label.y,
        shapePoints,
        geometrySource: 'custom',
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Create failed with HTTP ${res.status}` };
    }

    const saved: Room = await res.json();
    setRooms(current => [...current, saved]);
    setEditingRoomId(saved.id);
    setRoomDraft(makeRoomGeometryDraft(saved));
    setRoomEditMode(true);
    return { ok: true };
  };

  const runLayoutAutomation = async (mode: LayoutAutomationMode): Promise<SaveResult> => {
    const requiresSavedFloor = mode === 'floorRooms' || mode === 'architecture' || mode === 'architectureReset';
    if (requiresSavedFloor && (!activeFloor || activeFloor.id < 0)) {
      const message = 'Save this floor plan before running floor-specific automation.';
      setAutomationMessage(message);
      return { ok: false, message };
    }

    setAutomationBusy(mode);
    setAutomationMessage(null);
    try {
      const floorPlanId = activeFloor && activeFloor.id > 0 ? activeFloor.id : undefined;
      const res = await fetch('/api/home-layout-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeRoomSeeds: mode === 'rooms' || mode === 'floorRooms',
          overwriteRoomSeeds: mode === 'floorRooms',
          floorPlanId,
          reflowItems: mode === 'reflow',
          includeArchitecturalSeeds: mode === 'architecture' || mode === 'architectureReset',
          resetArchitecturalFloor: mode === 'architectureReset',
        }),
      });
      const body = await res.json().catch(() => null) as LayoutAutomationStats | null;

      if (!res.ok) {
        const message = body?.error || `Layout sync failed with HTTP ${res.status}`;
        setAutomationMessage(message);
        return { ok: false, message };
      }

      setAutomationMessage(formatAutomationMessage(mode, body));
      await fetchAll();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Layout sync failed.';
      setAutomationBusy(null);
      setAutomationMessage(message);
      return { ok: false, message };
    } finally {
      setAutomationBusy(null);
    }
  };

  const resetRoomToSuggestedOutline = async (roomId: number): Promise<SaveResult> => {
    const res = await fetch('/api/home-layout-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeRoomSeeds: true, overwriteRoomSeeds: true, roomId }),
    });
    const body = await res.json().catch(() => null) as LayoutAutomationStats | null;

    if (!res.ok) {
      return { ok: false, message: body?.error || `Reset failed with HTTP ${res.status}` };
    }

    const next = await fetchAll();
    const resetRoom = next.rooms.find(room => room.id === roomId);
    if (resetRoom) setRoomDraft(makeRoomGeometryDraft(resetRoom));
    return { ok: true };
  };

  const resetFloorToSuggestedOutlines = async (): Promise<SaveResult> => {
    const result = await runLayoutAutomation('floorRooms');
    if (result.ok && editingRoomId) {
      const room = rooms.find(entry => entry.id === editingRoomId);
      if (room) setRoomDraft(makeRoomGeometryDraft(room));
    }
    return result;
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
          <LayoutToolbar
            floorPlan={activeFloor}
            overlayVisible={overlayVisible}
            roomLabelsVisible={roomLabelsVisible}
            snapToGrid={snapToGrid}
            roomEditMode={roomEditMode}
            busy={automationBusy}
            message={automationMessage}
            onToggleOverlay={() => setOverlayVisible(value => !value)}
            onToggleRoomLabels={() => setRoomLabelsVisible(value => !value)}
            onSnapChange={setSnapToGrid}
            onToggleRoomEdit={toggleRoomEditMode}
            onSyncItems={() => runLayoutAutomation('items')}
            onReflowItems={() => runLayoutAutomation('reflow')}
            onSeedRooms={() => runLayoutAutomation('rooms')}
            onResetFloorRooms={resetFloorToSuggestedOutlines}
            onSeedArchitecture={() => runLayoutAutomation('architecture')}
            onResetArchitecture={() => runLayoutAutomation('architectureReset')}
          />
          <div className="layout-workspace-grid">
            <MeasuredFloorPlan
              floorPlan={activeFloor}
              floorPlans={measuredFloors}
              rooms={rooms}
              items={items}
              overlayVisible={overlayVisible}
              roomLabelsVisible={roomLabelsVisible}
              overlayOpacity={overlayOpacity}
              overlayFit={overlayFit}
              roomEditMode={roomEditMode}
              editingRoomId={editingRoomId}
              roomDraft={roomDraft}
              onSelectRoom={selectRoomForEditing}
              onRoomDraftChange={setRoomDraft}
              selectedItemId={selectedItemId}
              selectedElementId={selectedElementId}
              onSelectItem={itemId => {
                setSelectedItemId(itemId);
                setSelectedElementId(null);
              }}
              architecturalElements={activeFloorElements}
              onSelectArchitecturalElement={elementId => {
                setSelectedElementId(elementId);
                setSelectedItemId(null);
              }}
              onMoveArchitecturalElement={saveArchitecturalElement}
              snapToGrid={snapToGrid}
              onMoveItem={moveItem}
              statusMessage={layoutMessage}
            />
            <div className="layout-inspector-stack">
              <SelectedItemControls
                key={selectedItem ? `${selectedItem.id}-${selectedItem.furnitureType ?? 'type'}-${selectedItem.planXFt ?? 'x'}-${selectedItem.planYFt ?? 'y'}-${selectedItem.widthIn ?? 'w'}-${selectedItem.depthIn ?? 'd'}-${selectedItem.rotationDeg ?? 'r'}` : 'empty'}
                item={selectedItem}
                room={selectedItemRoom}
                floorPlan={selectedItemFloor}
                snapToGrid={snapToGrid}
                onSave={saveItemLayout}
                onSnapChange={setSnapToGrid}
                onClear={() => setSelectedItemId(null)}
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
                onCreateRoom={createLayoutRoom}
                onSave={saveRoomGeometry}
                onResetSuggested={resetRoomToSuggestedOutline}
                onResetFloorSuggested={resetFloorToSuggestedOutlines}
              />
              <ArchitecturalElementControls
                key={selectedElement ? `${selectedElement.id}-${selectedElement.xFt}-${selectedElement.yFt}-${selectedElement.widthFt}-${selectedElement.depthFt}-${selectedElement.rotationDeg}` : `new-${activeFloor.id}`}
                floorPlan={activeFloor}
                floorRooms={activeFloorRooms}
                selectedElement={selectedElement?.floorPlanId === activeFloor.id ? selectedElement : null}
                onCreate={createArchitecturalElement}
                onSave={saveArchitecturalElement}
                onDelete={deleteArchitecturalElement}
                onClear={() => setSelectedElementId(null)}
              />
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
            </div>
          </div>
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
              {unplacedItems.map(item => (
                <LayoutChip
                  key={item.id}
                  item={item}
                  selected={item.id === selectedItemId}
                  onSelect={() => setSelectedItemId(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LayoutToolbar({
  floorPlan,
  overlayVisible,
  roomLabelsVisible,
  snapToGrid,
  roomEditMode,
  busy,
  message,
  onToggleOverlay,
  onToggleRoomLabels,
  onSnapChange,
  onToggleRoomEdit,
  onSyncItems,
  onReflowItems,
  onSeedRooms,
  onResetFloorRooms,
  onSeedArchitecture,
  onResetArchitecture,
}: {
  floorPlan: HomeFloorPlan;
  overlayVisible: boolean;
  roomLabelsVisible: boolean;
  snapToGrid: boolean;
  roomEditMode: boolean;
  busy: LayoutAutomationMode | null;
  message: string | null;
  onToggleOverlay: () => void;
  onToggleRoomLabels: () => void;
  onSnapChange: (value: boolean) => void;
  onToggleRoomEdit: () => void;
  onSyncItems: () => Promise<SaveResult>;
  onReflowItems: () => Promise<SaveResult>;
  onSeedRooms: () => Promise<SaveResult>;
  onResetFloorRooms: () => Promise<SaveResult>;
  onSeedArchitecture: () => Promise<SaveResult>;
  onResetArchitecture: () => Promise<SaveResult>;
}) {
  return (
    <div
      className="card layout-toolbar"
      style={{
        marginBottom: 18,
        boxShadow: '0 10px 30px rgba(28,25,23,0.08)',
      }}
    >
      <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Ruler size={17} color="var(--color-accent-dark)" />
          <div style={{ minWidth: 0 }}>
            <div className="section-label" style={{ marginBottom: 4 }}>Layout workspace</div>
            <div style={{ fontSize: 12, color: 'var(--color-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {floorPlan.label} · {floorPlan.widthFt} ft x {floorPlan.depthFt} ft
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {message && (
            <span style={{ fontSize: 12, color: message.toLowerCase().includes('failed') ? '#b91c1c' : 'var(--color-secondary)', fontWeight: 800 }}>
              {message}
            </span>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={onToggleOverlay}>
            {overlayVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            {overlayVisible ? 'Hide Blueprint' : 'Show Blueprint'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onToggleRoomLabels}>
            {roomLabelsVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            {roomLabelsVisible ? 'Hide Names' : 'Show Names'}
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={snapToGrid} onChange={event => onSnapChange(event.target.checked)} style={{ width: 14, height: 14 }} />
            Snap
          </label>
          <button type="button" className={`btn btn-${roomEditMode ? 'primary' : 'secondary'} btn-sm`} onClick={onToggleRoomEdit}>
            <Edit3 size={14} />
            {roomEditMode ? 'Finish Rooms' : 'Edit Rooms'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onSyncItems} disabled={busy !== null}>
            <RotateCw size={14} /> {busy === 'items' ? 'Syncing...' : 'Sync Items'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onReflowItems} disabled={busy !== null}>
            <MoveDiagonal size={14} /> {busy === 'reflow' ? 'Reflowing...' : 'Reflow'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onSeedRooms} disabled={busy !== null}>
            <Ruler size={14} /> {busy === 'rooms' ? 'Applying...' : 'Suggested Rooms'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onResetFloorRooms} disabled={busy !== null}>
            <RotateCcw size={14} /> {busy === 'floorRooms' ? 'Resetting...' : 'Reset Rooms'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onSeedArchitecture} disabled={busy !== null}>
            <Grid3X3 size={14} /> {busy === 'architecture' ? 'Adding...' : 'Add Details'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onResetArchitecture} disabled={busy !== null}>
            <RotateCcw size={14} /> {busy === 'architectureReset' ? 'Resetting...' : 'Reset Details'}
          </button>
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
  onCreateRoom,
  onSave,
  onResetSuggested,
  onResetFloorSuggested,
}: {
  floorPlan: HomeFloorPlan;
  floorRooms: Room[];
  editMode: boolean;
  editingRoomId: number | null;
  roomDraft: RoomGeometryDraft | null;
  onToggleEditMode: () => void;
  onSelectRoom: (roomId: number | null) => void;
  onDraftChange: (draft: RoomGeometryDraft | null) => void;
  onCreateRoom: (name: string) => Promise<SaveResult>;
  onSave: (draft: RoomGeometryDraft) => Promise<SaveResult>;
  onResetSuggested: (roomId: number) => Promise<SaveResult>;
  onResetFloorSuggested: () => Promise<SaveResult>;
}) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const selectedRoom = floorRooms.find(room => room.id === editingRoomId) ?? null;
  const editorPoints = selectedRoom && roomDraft ? roomEditorPoints(selectedRoom, roomDraft) : [];
  const selectedSource = selectedRoom ? roomGeometryStatus(selectedRoom) : null;
  const hasUnsavedRoomChanges = selectedRoom && roomDraft ? roomDraftHasChanges(selectedRoom, roomDraft) : false;

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

  const resetSuggested = async () => {
    if (!selectedRoom) return;
    setSaveState('saving');
    setSaveMessage(null);
    const result = await onResetSuggested(selectedRoom.id);
    if (result.ok) {
      setSaveState('saved');
      setSaveMessage('Suggested outline applied.');
      window.setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    setSaveState('error');
    setSaveMessage(result.message);
  };

  const resetFloorSuggested = async () => {
    setSaveState('saving');
    setSaveMessage(null);
    const result = await onResetFloorSuggested();
    if (result.ok) {
      setSaveState('saved');
      setSaveMessage('Floor reset to recommended outlines.');
      window.setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    setSaveState('error');
    setSaveMessage(result.message);
  };

  const createRoom = async () => {
    setSaveState('saving');
    setSaveMessage(null);
    const result = await onCreateRoom(newRoomName);
    if (result.ok) {
      setNewRoomName('');
      setSaveState('saved');
      setSaveMessage('Room added. Drag or resize it into place, then save if needed.');
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
            <Edit3 size={17} color="var(--color-accent-dark)" />
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Room outlines</div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>
                Shape and label rooms against the blueprint canvas.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onToggleEditMode}>
              <MousePointer2 size={14} />
              {editMode ? 'Finish Editing' : 'Edit Rooms'}
            </button>
            {editMode && (
              <>
                {hasUnsavedRoomChanges && (
                  <span className="badge badge-neutral" style={{ alignSelf: 'center', color: '#9a5a2f', borderColor: 'rgba(154,90,47,0.44)' }}>
                    Unsaved outline
                  </span>
                )}
              <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!roomDraft || saveState === 'saving'}>
                <Save size={14} /> {saveState === 'saving' ? 'Saving...' : 'Save Room'}
              </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) auto', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>New room</span>
            <input
              value={newRoomName}
              onChange={event => setNewRoomName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void createRoom();
                }
              }}
              placeholder="e.g. Porch"
            />
          </label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={createRoom} disabled={saveState === 'saving'}>
            <Plus size={14} /> Add Room
          </button>
        </div>

        {editMode && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.4fr) repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
              <label style={{ display: 'block' }}>
                <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Room</span>
                <select value={editingRoomId ?? ''} onChange={event => onSelectRoom(event.target.value ? Number(event.target.value) : null)}>
                  <option value="">Select room</option>
                  {floorRooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name} - {roomGeometryStatus(room).label}</option>
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
                  <Grid3X3 size={14} /> Reset Rectangle
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetSuggested} disabled={!selectedRoom || saveState === 'saving'}>
                  <RotateCcw size={14} /> Reset to Suggested
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetFloorSuggested} disabled={saveState === 'saving'}>
                  <RotateCcw size={14} /> Reset Floor
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div className="section-label" style={{ fontSize: 10 }}>Polygon points</div>
                  {selectedSource && (
                    <span className="badge badge-neutral" style={{ borderColor: selectedSource.color, color: selectedSource.color }}>
                      {selectedSource.label}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>
                    Corner handles move points; side handles move a whole wall. Save Room applies changes.
                  </span>
                </div>
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

function ArchitecturalElementControls({
  floorPlan,
  floorRooms,
  selectedElement,
  onCreate,
  onSave,
  onDelete,
  onClear,
}: {
  floorPlan: HomeFloorPlan;
  floorRooms: Room[];
  selectedElement: ArchitecturalElement | null;
  onCreate: (draft: ArchitecturalElementDraft) => Promise<SaveResult>;
  onSave: (elementId: number, update: ArchitecturalElementUpdate) => Promise<SaveResult>;
  onDelete: (elementId: number) => Promise<SaveResult>;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(() => makeArchitecturalElementDraft(selectedElement, floorPlan, floorRooms));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const canPersist = floorPlan.id > 0;
  const hasUnsavedElementChanges = selectedElement ? architecturalDraftHasChanges(selectedElement, draft) : false;

  useEffect(() => {
    void Promise.resolve().then(() => {
      setDraft(makeArchitecturalElementDraft(selectedElement, floorPlan, floorRooms));
      setSaveState('idle');
      setSaveMessage(null);
    });
  }, [floorPlan, floorRooms, selectedElement]);

  const updateType = (elementType: ArchitecturalElementType) => {
    const dimensions = defaultArchitecturalElementDimensions(elementType);
    setDraft(current => ({
      ...current,
      elementType,
      label: selectedElement ? current.label : labelForArchitecturalElementType(elementType),
      widthFt: dimensions.widthFt,
      depthFt: dimensions.depthFt,
    }));
  };

  const persist = async (nextDraft = draft, message = selectedElement ? 'Architectural element saved.' : 'Architectural element added.') => {
    if (!canPersist) return;
    setSaveState('saving');
    setSaveMessage(null);
    const result = selectedElement
      ? await onSave(selectedElement.id, architecturalDraftToUpdate(nextDraft))
      : await onCreate(nextDraft);

    if (result.ok) {
      setSaveState('saved');
      setSaveMessage(message);
      window.setTimeout(() => setSaveState('idle'), 1800);
      return;
    }

    setSaveState('error');
    setSaveMessage(result.message);
  };

  const moveBy = (dx: number, dy: number) => {
    const nextDraft = {
      ...draft,
      ...clampArchitecturalElementPosition(draft.xFt + dx, draft.yFt + dy, draft.widthFt, draft.depthFt, floorPlan),
    };
    setDraft(nextDraft);
    if (selectedElement) persist(nextDraft, 'Architectural element moved.');
  };

  const deleteSelected = async () => {
    if (!selectedElement) return;
    setSaveState('saving');
    setSaveMessage(null);
    const result = await onDelete(selectedElement.id);
    if (result.ok) {
      setSaveState('idle');
      setSaveMessage(null);
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
            <Grid3X3 size={17} color="var(--color-accent-dark)" />
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Architectural elements</div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>
                Doors, windows, stairs, counters, cabinets, and fixtures.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedElement && (
              <span className="badge badge-neutral" style={{ alignSelf: 'center' }}>
                {selectedElement.source === 'recommended' ? 'Recommended detail' : 'Manual detail'}
              </span>
            )}
            {hasUnsavedElementChanges && (
              <span className="badge badge-neutral" style={{ alignSelf: 'center', color: '#9a5a2f', borderColor: 'rgba(154,90,47,0.44)' }}>
                Unsaved detail
              </span>
            )}
            {selectedElement && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClear}>
                <Plus size={14} /> New Element
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => persist()} disabled={!canPersist || saveState === 'saving'}>
              <Save size={14} /> {selectedElement ? 'Save Element' : 'Add Element'}
            </button>
            {selectedElement && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={deleteSelected} disabled={saveState === 'saving'} style={{ color: '#b91c1c' }}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Type</span>
            <select value={draft.elementType} onChange={event => updateType(event.target.value as ArchitecturalElementType)}>
              {ARCHITECTURAL_ELEMENT_TYPES.map(type => (
                <option key={type} value={type}>{labelForArchitecturalElementType(type)}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Room</span>
            <select value={draft.roomId ?? ''} onChange={event => setDraft(current => ({ ...current, roomId: event.target.value ? Number(event.target.value) : null }))}>
              <option value="">No room</option>
              {floorRooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'block', gridColumn: 'span 2' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Label</span>
            <input value={draft.label} onChange={event => setDraft(current => ({ ...current, label: event.target.value }))} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
          <GeometryNumberField label="X ft" value={draft.xFt} min={0} max={Math.max(0, floorPlan.widthFt - draft.widthFt)} onChange={xFt => xFt !== null && setDraft(current => ({ ...current, xFt }))} />
          <GeometryNumberField label="Y ft" value={draft.yFt} min={0} max={Math.max(0, floorPlan.depthFt - draft.depthFt)} onChange={yFt => yFt !== null && setDraft(current => ({ ...current, yFt }))} />
          <GeometryNumberField label="Width ft" value={draft.widthFt} min={0.25} max={floorPlan.widthFt} onChange={widthFt => widthFt !== null && setDraft(current => ({ ...current, widthFt }))} />
          <GeometryNumberField label="Depth ft" value={draft.depthFt} min={0.1} max={floorPlan.depthFt} onChange={depthFt => depthFt !== null && setDraft(current => ({ ...current, depthFt }))} />
          <GeometryNumberField label="Rotation" value={draft.rotationDeg} min={0} max={359} onChange={rotationDeg => rotationDeg !== null && setDraft(current => ({ ...current, rotationDeg: normaliseRotation(rotationDeg) }))} />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <NudgePad label="0.25 ft" disabled={!selectedElement || saveState === 'saving'} onMove={(dx, dy) => moveBy(dx * 0.25, dy * 0.25)} />
          <NudgePad label="1 ft" disabled={!selectedElement || saveState === 'saving'} onMove={(dx, dy) => moveBy(dx, dy)} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft(current => ({ ...current, rotationDeg: normaliseRotation(current.rotationDeg - 15) }))}>
              <RotateCcw size={14} /> 15
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft(current => ({ ...current, rotationDeg: normaliseRotation(current.rotationDeg + 15) }))}>
              <RotateCw size={14} /> 15
            </button>
          </div>
        </div>

        {!canPersist && (
          <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Save this floor plan before adding architectural elements.</span>
        )}
        {saveMessage && (
          <span style={{ fontSize: 12, color: saveState === 'error' ? '#b91c1c' : '#1f6b5b', fontWeight: 700 }}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectedItemControls({
  item,
  room,
  floorPlan,
  snapToGrid,
  onSave,
  onSnapChange,
  onClear,
}: {
  item: RoomItem | null;
  room: Room | null;
  floorPlan: HomeFloorPlan | null;
  snapToGrid: boolean;
  onSave: (itemId: number, update: RoomItemLayoutUpdate) => Promise<SaveResult>;
  onSnapChange: (value: boolean) => void;
  onClear: () => void;
}) {
  const footprint = item ? itemFootprint(item) : null;
  const initialPlacement = item && footprint && floorPlan ? itemPlacementForControls(item, room, floorPlan, footprint) : null;
  const initialFurnitureType: FurnitureType = item ? normaliseFurnitureType(item.furnitureType, item.itemName) : 'box';
  const [draft, setDraft] = useState({
    furnitureType: initialFurnitureType,
    widthFt: footprint ? roundToQuarter(footprint.widthFt) : null,
    depthFt: footprint ? roundToQuarter(footprint.depthFt) : null,
    rotationDeg: item?.rotationDeg ?? 0,
    planXFt: initialPlacement?.planXFt ?? null,
    planYFt: initialPlacement?.planYFt ?? null,
  });
  const profile = item ? furnitureProfileForType(draft.furnitureType, item) : null;
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const hasUnsavedItemChanges = Boolean(item && (
    draft.furnitureType !== initialFurnitureType ||
    !nullableNumbersMatch(draft.widthFt, footprint ? roundToQuarter(footprint.widthFt) : null) ||
    !nullableNumbersMatch(draft.depthFt, footprint ? roundToQuarter(footprint.depthFt) : null) ||
    !nullableNumbersMatch(draft.rotationDeg ?? 0, item.rotationDeg ?? 0) ||
    !nullableNumbersMatch(draft.planXFt, initialPlacement?.planXFt ?? null) ||
    !nullableNumbersMatch(draft.planYFt, initialPlacement?.planYFt ?? null)
  ));

  const save = async (nextDraft = draft, successMessage = 'Item layout saved.') => {
    if (!item || nextDraft.widthFt === null || nextDraft.depthFt === null) return;
    setSaveState('saving');
    setSaveMessage(null);
    const result = await onSave(item.id, {
      furnitureType: nextDraft.furnitureType,
      widthIn: ftToIn(nextDraft.widthFt),
      depthIn: ftToIn(nextDraft.depthFt),
      rotationDeg: normaliseRotation(nextDraft.rotationDeg ?? 0),
      planXFt: nextDraft.planXFt === null ? undefined : roundToHundredth(nextDraft.planXFt),
      planYFt: nextDraft.planYFt === null ? undefined : roundToHundredth(nextDraft.planYFt),
    });
    if (result.ok) {
      setSaveState('saved');
      setSaveMessage(successMessage);
      window.setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    setSaveState('error');
    setSaveMessage(result.message);
  };

  const rotateBy = (degrees: number) => {
    setDraft(current => ({ ...current, rotationDeg: normaliseRotation((current.rotationDeg ?? 0) + degrees) }));
  };

  const moveBy = (dx: number, dy: number) => {
    if (!floorPlan || draft.widthFt === null || draft.depthFt === null || draft.planXFt === null || draft.planYFt === null) return;
    const nextDraft = {
      ...draft,
      ...clampItemPosition(draft.planXFt + dx, draft.planYFt + dy, draft.widthFt, draft.depthFt, floorPlan),
    };
    setDraft(nextDraft);
    save(nextDraft, 'Item moved.');
  };

  const centerInRoom = () => {
    if (!room || !floorPlan || draft.widthFt === null || draft.depthFt === null) return;
    const center = averagePoint(planPointsForRoom(room));
    const nextDraft = {
      ...draft,
      ...clampItemPosition(center.x - draft.widthFt / 2, center.y - draft.depthFt / 2, draft.widthFt, draft.depthFt, floorPlan),
    };
    setDraft(nextDraft);
    save(nextDraft, 'Item centered.');
  };

  const canPosition = Boolean(item && floorPlan && draft.planXFt !== null && draft.planYFt !== null && draft.widthFt !== null && draft.depthFt !== null);

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Armchair size={17} color="var(--color-accent-dark)" />
            <div style={{ minWidth: 0 }}>
              <div className="section-label" style={{ marginBottom: 4 }}>Item layout</div>
              <div style={{ fontSize: 13, color: item ? 'var(--color-foreground)' : 'var(--color-secondary)', fontWeight: item ? 800 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item ? item.itemName : 'Select a room item'}
              </div>
            </div>
          </div>
          {item && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-neutral">{room?.name ?? 'No room'}</span>
              <span className="badge badge-neutral">{floorPlan?.label ?? 'No floor'}</span>
              {profile && <span className="badge badge-neutral">{profile.label}</span>}
              {hasUnsavedItemChanges && (
                <span className="badge badge-neutral" style={{ color: '#9a5a2f', borderColor: 'rgba(154,90,47,0.44)' }}>Unsaved</span>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClear}>Clear</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => save()} disabled={saveState === 'saving' || draft.widthFt === null || draft.depthFt === null}>
                <Save size={14} /> {saveState === 'saving' ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          )}
        </div>

        {item && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
              <label style={{ display: 'block' }}>
                <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Shape</span>
                <select
                  value={draft.furnitureType}
                  onChange={event => setDraft(current => ({ ...current, furnitureType: event.target.value as FurnitureType }))}
                >
                  {FURNITURE_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <GeometryNumberField
                label="Width ft"
                value={draft.widthFt}
                min={0.5}
                max={30}
                onChange={widthFt => setDraft(current => ({ ...current, widthFt }))}
              />
              <GeometryNumberField
                label="Depth ft"
                value={draft.depthFt}
                min={0.5}
                max={30}
                onChange={depthFt => setDraft(current => ({ ...current, depthFt }))}
              />
              <GeometryNumberField
                label="Rotation deg"
                value={draft.rotationDeg}
                min={0}
                max={359}
                onChange={rotationDeg => setDraft(current => ({ ...current, rotationDeg: rotationDeg === null ? 0 : normaliseRotation(rotationDeg) }))}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => rotateBy(-15)}>
                  <RotateCcw size={14} /> 15
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => rotateBy(15)}>
                  <RotateCw size={14} /> 15
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => rotateBy(90)}>
                  <RotateCw size={14} /> 90
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
              <GeometryNumberField
                label="X ft"
                value={draft.planXFt}
                min={0}
                max={floorPlan ? Math.max(0, floorPlan.widthFt - (draft.widthFt ?? 0)) : undefined}
                nullable
                onChange={planXFt => setDraft(current => ({
                  ...current,
                  planXFt: planXFt === null || !floorPlan || current.widthFt === null || current.depthFt === null
                    ? planXFt
                    : clampItemPosition(planXFt, current.planYFt ?? 0, current.widthFt, current.depthFt, floorPlan).planXFt,
                }))}
              />
              <GeometryNumberField
                label="Y ft"
                value={draft.planYFt}
                min={0}
                max={floorPlan ? Math.max(0, floorPlan.depthFt - (draft.depthFt ?? 0)) : undefined}
                nullable
                onChange={planYFt => setDraft(current => ({
                  ...current,
                  planYFt: planYFt === null || !floorPlan || current.widthFt === null || current.depthFt === null
                    ? planYFt
                    : clampItemPosition(current.planXFt ?? 0, planYFt, current.widthFt, current.depthFt, floorPlan).planYFt,
                }))}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 38, paddingTop: 16 }}>
                <input type="checkbox" checked={snapToGrid} onChange={event => onSnapChange(event.target.checked)} style={{ width: 16, height: 16 }} />
                <span className="section-label" style={{ margin: 0, fontSize: 10 }}>Snap 0.25 ft</span>
              </label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={centerInRoom} disabled={!room || !canPosition || saveState === 'saving'}>
                <Crosshair size={14} /> Center in Room
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <NudgePad label="0.25 ft" disabled={!canPosition || saveState === 'saving'} onMove={(dx, dy) => moveBy(dx * 0.25, dy * 0.25)} />
              <NudgePad label="1 ft" disabled={!canPosition || saveState === 'saving'} onMove={(dx, dy) => moveBy(dx, dy)} />
            </div>
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

function NudgePad({
  label,
  disabled,
  onMove,
}: {
  label: string;
  disabled: boolean;
  onMove: (dx: number, dy: number) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 32px 32px', gridTemplateRows: '24px 24px 24px', gap: 4, alignItems: 'center' }}>
      <div style={{ gridColumn: '1 / 4', fontSize: 10, fontWeight: 800, color: 'var(--color-secondary)', textAlign: 'center' }}>{label}</div>
      <span />
      <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move up ${label}`} onClick={() => onMove(0, -1)} disabled={disabled} style={{ width: 32, minWidth: 32, padding: 0 }}>
        <ArrowUp size={14} />
      </button>
      <span />
      <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move left ${label}`} onClick={() => onMove(-1, 0)} disabled={disabled} style={{ width: 32, minWidth: 32, padding: 0 }}>
        <ArrowLeft size={14} />
      </button>
      <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move down ${label}`} onClick={() => onMove(0, 1)} disabled={disabled} style={{ width: 32, minWidth: 32, padding: 0 }}>
        <ArrowDown size={14} />
      </button>
      <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move right ${label}`} onClick={() => onMove(1, 0)} disabled={disabled} style={{ width: 32, minWidth: 32, padding: 0 }}>
        <ArrowRight size={14} />
      </button>
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

function LayoutChip({ item, selected, onSelect }: { item: RoomItem; selected: boolean; onSelect: () => void }) {
  const footprint = itemFootprint(item);
  return (
    <button
      draggable
      onDragStart={event => event.dataTransfer.setData('text/plain', String(item.id))}
      onClick={onSelect}
      style={{
        border: selected ? '2px solid #1f6b5b' : '1px solid var(--color-border)',
        background: selected ? 'rgba(226,243,235,0.96)' : 'var(--color-surface)',
        borderRadius: 8,
        padding: selected ? '9px 11px' : '10px 12px',
        cursor: 'grab',
        minWidth: 132,
        textAlign: 'left',
      }}
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
