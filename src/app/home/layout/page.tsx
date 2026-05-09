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
import { FURNITURE_TYPE_OPTIONS, furnitureTypeLabel, normaliseFurnitureType } from '@/lib/furniture';
import { ArchitecturalElement, ArchitecturalElementType, FurnitureType, HomeFloorPlan, PlanPoint, Room, RoomItem } from '@/lib/types';
import { Armchair, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Edit3, Eye, EyeOff, Grid3X3, Image as ImageIcon, MousePointer2, MoveDiagonal, Package, Plus, RotateCcw, RotateCw, Ruler, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type OverlayFit = 'contain' | 'cover' | 'stretch';
type SaveResult = { ok: true } | { ok: false; message: string };
type RoomGeometryDraft = {
  roomId: number;
  shapePoints: PlanPoint[] | null;
  labelXFt: number | null;
  labelYFt: number | null;
};
type GeometryDragTarget =
  | { type: 'point'; index: number }
  | { type: 'edge'; index: number; points: PlanPoint[]; start: PlanPoint }
  | { type: 'label' }
  | { type: 'room'; start: PlanPoint; points: PlanPoint[] }
  | { type: 'item'; item: RoomItem; start: PlanPoint; xFt: number; yFt: number; widthFt: number; depthFt: number }
  | { type: 'architecturalElement'; element: ArchitecturalElement; start: PlanPoint; xFt: number; yFt: number };
type RoomItemLayoutUpdate = {
  furnitureType?: FurnitureType;
  widthIn?: number | null;
  depthIn?: number | null;
  rotationDeg?: number | null;
  planXFt?: number | null;
  planYFt?: number | null;
};
type ArchitecturalElementUpdate = {
  floorPlanId?: number;
  roomId?: number | null;
  elementType?: ArchitecturalElementType;
  label?: string;
  xFt?: number;
  yFt?: number;
  widthFt?: number;
  depthFt?: number;
  rotationDeg?: number;
  source?: ArchitecturalElement['source'];
  sourceKey?: string | null;
  notes?: string | null;
};
type ArchitecturalElementDraft = {
  floorPlanId: number;
  roomId: number | null;
  elementType: ArchitecturalElementType;
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  depthFt: number;
  rotationDeg: number;
  notes: string;
};
type LayoutAutomationMode = 'items' | 'rooms' | 'floorRooms' | 'reflow' | 'architecture' | 'architectureReset';
type LayoutAutomationStats = {
  layout?: {
    created?: number;
    updated?: number;
    removed?: number;
    deduped?: number;
    unmatched?: number;
  };
  roomSeeds?: {
    updated?: number;
    skipped?: number;
    missing?: number;
    custom?: number;
    recommended?: number;
  } | null;
  architectural?: {
    created?: number;
    updated?: number;
    removed?: number;
    skipped?: number;
    missing?: number;
  } | null;
  error?: string;
};

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

function MeasuredFloorPlan({
  floorPlan,
  floorPlans,
  rooms,
  items,
  architecturalElements,
  overlayVisible,
  roomLabelsVisible,
  overlayOpacity,
  overlayFit,
  roomEditMode,
  editingRoomId,
  roomDraft,
  onSelectRoom,
  onRoomDraftChange,
  selectedItemId,
  selectedElementId,
  onSelectItem,
  onSelectArchitecturalElement,
  onMoveArchitecturalElement,
  snapToGrid,
  onMoveItem,
  statusMessage,
}: {
  floorPlan: HomeFloorPlan;
  floorPlans: HomeFloorPlan[];
  rooms: Room[];
  items: RoomItem[];
  architecturalElements: ArchitecturalElement[];
  overlayVisible: boolean;
  roomLabelsVisible: boolean;
  overlayOpacity: number;
  overlayFit: OverlayFit;
  roomEditMode: boolean;
  editingRoomId: number | null;
  roomDraft: RoomGeometryDraft | null;
  onSelectRoom: (roomId: number | null) => void;
  onRoomDraftChange: (draft: RoomGeometryDraft | null) => void;
  selectedItemId: number | null;
  selectedElementId: number | null;
  onSelectItem: (itemId: number) => void;
  onSelectArchitecturalElement: (elementId: number) => void;
  onMoveArchitecturalElement: (elementId: number, update: ArchitecturalElementUpdate) => Promise<SaveResult>;
  snapToGrid: boolean;
  onMoveItem: (item: RoomItem, floorPlanId: number, roomId: number | null, planXFt: number, planYFt: number) => void;
  statusMessage: string | null;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [dragTarget, setDragTarget] = useState<GeometryDragTarget | null>(null);
  const [itemDragPreview, setItemDragPreview] = useState<{ itemId: number; xFt: number; yFt: number } | null>(null);
  const [architecturalDragPreview, setArchitecturalDragPreview] = useState<{ elementId: number; xFt: number; yFt: number } | null>(null);
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
  const floorArchitecturalElements = architecturalElements.filter(element => element.floorPlanId === floorPlan.id);
  const displayedArchitecturalElements = floorArchitecturalElements.map(element => {
    if (architecturalDragPreview?.elementId !== element.id) return element;
    return { ...element, xFt: architecturalDragPreview.xFt, yFt: architecturalDragPreview.yFt };
  });
  const displayedFloorItems = floorItems.map(item => {
    if (itemDragPreview?.itemId !== item.id) return item;
    return { ...item, planXFt: itemDragPreview.xFt, planYFt: itemDragPreview.yFt };
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

  const pointFromPointer = (event: PointerEvent<Element>) => {
    if (!surfaceRef.current) return null;
    const bounds = surfaceRef.current.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * floorPlan.widthFt, 0, floorPlan.widthFt),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * floorPlan.depthFt, 0, floorPlan.depthFt),
    };
  };

  const updateDraftFromPointer = (event: PointerEvent<HTMLElement>) => {
    if (!dragTarget) return;
    const point = pointFromPointer(event);
    if (!point) return;

    if (dragTarget.type === 'item') {
      const dx = point.x - dragTarget.start.x;
      const dy = point.y - dragTarget.start.y;
      const next = clampItemPosition(
        snapPlanValue(dragTarget.xFt + dx, snapToGrid),
        snapPlanValue(dragTarget.yFt + dy, snapToGrid),
        dragTarget.widthFt,
        dragTarget.depthFt,
        floorPlan,
      );
      setItemDragPreview({ itemId: dragTarget.item.id, xFt: next.planXFt, yFt: next.planYFt });
      return;
    }

    if (dragTarget.type === 'architecturalElement') {
      const dx = point.x - dragTarget.start.x;
      const dy = point.y - dragTarget.start.y;
      const next = clampArchitecturalElementPosition(
        snapPlanValue(dragTarget.xFt + dx, snapToGrid),
        snapPlanValue(dragTarget.yFt + dy, snapToGrid),
        dragTarget.element.widthFt,
        dragTarget.element.depthFt,
        floorPlan,
      );
      setArchitecturalDragPreview({ elementId: dragTarget.element.id, xFt: next.xFt, yFt: next.yFt });
      return;
    }

    if (!roomEditMode || !roomDraft) return;
    const roundedPoint = roundPlanPoint(point);

    if (dragTarget.type === 'label') {
      onRoomDraftChange({ ...roomDraft, labelXFt: roundedPoint.x, labelYFt: roundedPoint.y });
      return;
    }

    if (dragTarget.type === 'room') {
      const dx = point.x - dragTarget.start.x;
      const dy = point.y - dragTarget.start.y;
      onRoomDraftChange({
        ...roomDraft,
        shapePoints: translatePointsWithinFloor(dragTarget.points, dx, dy, floorPlan),
      });
      return;
    }

    if (dragTarget.type === 'edge') {
      const dx = point.x - dragTarget.start.x;
      const dy = point.y - dragTarget.start.y;
      onRoomDraftChange({
        ...roomDraft,
        shapePoints: translateEdgeWithinFloor(dragTarget.points, dragTarget.index, dx, dy, floorPlan, snapToGrid),
      });
      return;
    }

    const selectedRoom = floorRooms.find(room => room.id === roomDraft.roomId);
    if (!selectedRoom) return;
    const points = roomEditorPoints(selectedRoom, roomDraft);
    const nextPoints = points.map((entry, index) => index === dragTarget.index ? roundedPoint : entry);
    onRoomDraftChange({ ...roomDraft, shapePoints: nextPoints });
  };

  const finishPointerDrag = async () => {
    const target = dragTarget;
    const itemPreview = itemDragPreview;
    const preview = architecturalDragPreview;
    setDragTarget(null);
    setItemDragPreview(null);
    setArchitecturalDragPreview(null);

    if (target?.type === 'item' && itemPreview?.itemId === target.item.id) {
      const centerXFt = itemPreview.xFt + target.widthFt / 2;
      const centerYFt = itemPreview.yFt + target.depthFt / 2;
      const targetRoom = roomShapes.find(({ points }) => containsPlanPoint(points, centerXFt, centerYFt));
      onMoveItem(target.item, floorPlan.id, targetRoom?.room.id ?? null, itemPreview.xFt, itemPreview.yFt);
      return;
    }

    if (target?.type !== 'architecturalElement' || preview?.elementId !== target.element.id) return;
    await onMoveArchitecturalElement(target.element.id, {
      xFt: preview.xFt,
      yFt: preview.yFt,
      floorPlanId: floorPlan.id,
    });
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
          <span className="badge badge-neutral">{floorArchitecturalElements.length} architectural</span>
          <span className="badge badge-neutral">{floorItems.length} placed items</span>
        </div>
      </div>
      <div className="card-body">
        {statusMessage && (
          <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 800, color: statusMessage.toLowerCase().includes('failed') ? '#b91c1c' : 'var(--color-secondary)' }}>
            {statusMessage}
          </div>
        )}
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
            const snappedXFt = snapPlanValue(rawXFt, snapToGrid);
            const snappedYFt = snapPlanValue(rawYFt, snapToGrid);
            const planXFt = clamp(snappedXFt, 0, Math.max(0, floorPlan.widthFt - footprint.widthFt));
            const planYFt = clamp(snappedYFt, 0, Math.max(0, floorPlan.depthFt - footprint.depthFt));
            const centerXFt = planXFt + footprint.widthFt / 2;
            const centerYFt = planYFt + footprint.depthFt / 2;
            const target = roomShapes.find(({ points }) => containsPlanPoint(points, centerXFt, centerYFt));
            onMoveItem(item, floorPlan.id, target?.room.id ?? null, planXFt, planYFt);
          }}
          onPointerMove={updateDraftFromPointer}
          onPointerUp={() => { void finishPointerDrag(); }}
          onPointerCancel={() => {
            setDragTarget(null);
            setItemDragPreview(null);
            setArchitecturalDragPreview(null);
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
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: roomEditMode ? 'auto' : 'none' }}
          >
            {roomShapes.map(({ room, points, selected }) => {
              const outline = roomOutlineStyle(room, selected);
              return (
                <polygon
                  key={room.id}
                  points={pointsToSvg(points, floorPlan)}
                  fill={outline.fill}
                  stroke={outline.stroke}
                  strokeWidth={outline.strokeWidth}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: roomEditMode && selected ? 'move' : roomEditMode ? 'pointer' : 'default' }}
                  onPointerDown={event => {
                    if (!roomEditMode) return;
                    event.preventDefault();
                    event.stopPropagation();

                    if (!selected) {
                      onSelectRoom(room.id);
                      return;
                    }

                    if (!roomDraft || roomDraft.roomId !== room.id) return;
                    const start = pointFromPointer(event);
                    if (!start) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragTarget({ type: 'room', start, points });
                  }}
                  onClick={event => {
                    if (!roomEditMode) return;
                    event.stopPropagation();
                    if (!selected) onSelectRoom(room.id);
                  }}
                />
              );
            })}
          </svg>
          {roomLabelsVisible && roomShapes.map(({ room, label, selected }) => {
            const status = roomGeometryStatus(room);
            return (
              <button
                key={`label-${room.id}`}
                type="button"
                data-layout-control="true"
                aria-label={`Select ${room.name}`}
                onClick={event => {
                  if (!roomEditMode) return;
                  event.stopPropagation();
                  if (!selected) onSelectRoom(room.id);
                }}
                disabled={!roomEditMode}
                title={`${room.name} - ${status.label}`}
                style={{
                  position: 'absolute',
                  left: `${(label.x / floorPlan.widthFt) * 100}%`,
                  top: `${(label.y / floorPlan.depthFt) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                  maxWidth: 96,
                  border: selected ? '1px solid rgba(31,107,91,0.42)' : `1px solid ${status.border}`,
                  borderRadius: 999,
                  background: selected ? 'rgba(226,243,235,0.74)' : status.background,
                  color: selected ? 'rgba(28,25,23,0.78)' : 'rgba(28,25,23,0.58)',
                  padding: '2px 6px',
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0,
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: selected ? 0.86 : 0.68,
                  pointerEvents: roomEditMode ? 'auto' : 'none',
                  cursor: roomEditMode ? 'pointer' : 'default',
                  boxShadow: selected ? '0 2px 6px rgba(31,107,91,0.12)' : '0 1px 3px rgba(28,25,23,0.05)',
                }}
              >
                {room.name}
              </button>
            );
          })}
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
          {roomEditMode && roomDraft && editingRoom && editingPoints.map((point, index) => {
            const nextPoint = editingPoints[(index + 1) % editingPoints.length];
            const midpoint = {
              x: (point.x + nextPoint.x) / 2,
              y: (point.y + nextPoint.y) / 2,
            };
            const cursor = edgeResizeCursor(point, nextPoint);
            return (
              <button
                key={`edge-${roomDraft.roomId}-${index}`}
                type="button"
                data-layout-control="true"
                aria-label={`Move room side ${index + 1}`}
                title="Drag this side to resize the room"
                onPointerDown={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  const start = pointFromPointer(event);
                  if (!start) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragTarget({ type: 'edge', index, points: editingPoints, start });
                }}
                style={{
                  position: 'absolute',
                  left: `${(midpoint.x / floorPlan.widthFt) * 100}%`,
                  top: `${(midpoint.y / floorPlan.depthFt) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 5,
                  width: cursor === 'ew-resize' ? 12 : 24,
                  height: cursor === 'ns-resize' ? 12 : 24,
                  borderRadius: 999,
                  border: '2px solid #9a5a2f',
                  background: 'rgba(255,250,243,0.96)',
                  boxShadow: '0 2px 8px rgba(28,25,23,0.16)',
                  cursor,
                  padding: 0,
                  touchAction: 'none',
                }}
              />
            );
          })}
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
          {displayedArchitecturalElements.map(element => (
            <ArchitecturalElementMarker
              key={element.id}
              element={element}
              floorPlan={floorPlan}
              selected={element.id === selectedElementId}
              onSelect={() => onSelectArchitecturalElement(element.id)}
              onStartDrag={event => {
                const start = pointFromPointer(event);
                if (!start) return;
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                onSelectArchitecturalElement(element.id);
                setDragTarget({ type: 'architecturalElement', element, start, xFt: element.xFt, yFt: element.yFt });
              }}
            />
          ))}
          {displayedFloorItems.map((item, index) => {
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
                selected={item.id === selectedItemId}
                onSelect={() => onSelectItem(item.id)}
                onStartDrag={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  const start = pointFromPointer(event);
                  if (!start) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  onSelectItem(item.id);
                  setDragTarget({ type: 'item', item, start, xFt: x, yFt: y, widthFt: footprint.widthFt, depthFt: footprint.depthFt });
                }}
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

function roomDraftHasChanges(room: Room, draft: RoomGeometryDraft) {
  const basePoints = normaliseDraftPoints(room.shapePoints) ?? planPointsForRoom(room);
  const draftPoints = normaliseDraftPoints(draft.shapePoints) ?? basePoints;
  return !pointsMatch(basePoints, draftPoints) ||
    !nullableNumbersMatch(room.labelXFt, draft.labelXFt) ||
    !nullableNumbersMatch(room.labelYFt, draft.labelYFt);
}

function pointsMatch(first: PlanPoint[], second: PlanPoint[]) {
  if (first.length !== second.length) return false;
  return first.every((point, index) =>
    nullableNumbersMatch(point.x, second[index].x) &&
    nullableNumbersMatch(point.y, second[index].y)
  );
}

function nullableNumbersMatch(first: number | null | undefined, second: number | null | undefined) {
  if (first === null || first === undefined || second === null || second === undefined) return first === second;
  return Math.abs(first - second) < 0.01;
}

function roomGeometryStatus(room: Room) {
  if (room.geometrySource === 'recommended') {
    return {
      label: 'Recommended',
      color: '#1f6b5b',
      border: 'rgba(31,107,91,0.28)',
      background: 'rgba(226,243,235,0.56)',
    };
  }

  if (room.geometrySource === 'custom') {
    return {
      label: 'Custom',
      color: '#9a5a2f',
      border: 'rgba(154,90,47,0.32)',
      background: 'rgba(246,224,205,0.56)',
    };
  }

  return {
    label: 'Unknown',
    color: 'var(--color-secondary)',
    border: 'rgba(92,86,72,0.22)',
    background: 'rgba(255,252,247,0.5)',
  };
}

function roomOutlineStyle(room: Room, selected: boolean) {
  if (selected) {
    return {
      fill: 'rgba(31,107,91,0.24)',
      stroke: '#1f6b5b',
      strokeWidth: 0.68,
    };
  }

  if (room.geometrySource === 'recommended') {
    return {
      fill: 'rgba(226,243,235,0.24)',
      stroke: 'rgba(31,107,91,0.74)',
      strokeWidth: 0.48,
    };
  }

  if (room.geometrySource === 'custom') {
    return {
      fill: 'rgba(246,224,205,0.24)',
      stroke: 'rgba(154,90,47,0.78)',
      strokeWidth: 0.5,
    };
  }

  return {
    fill: 'rgba(255,252,247,0.2)',
    stroke: 'rgba(92,86,72,0.58)',
    strokeWidth: 0.42,
  };
}

function rectToPoints(rect: PlanRect): PlanPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.depth },
    { x: rect.x, y: rect.y + rect.depth },
  ];
}

function newRoomRectForFloor(floorPlan: HomeFloorPlan, roomCount: number): PlanRect {
  const width = roundToQuarter(Math.min(10, Math.max(6, floorPlan.widthFt * 0.18)));
  const depth = roundToQuarter(Math.min(8, Math.max(5, floorPlan.depthFt * 0.14)));
  const gap = 1;
  const columns = Math.max(1, Math.floor(Math.max(1, floorPlan.widthFt - gap) / (width + gap)));
  const column = roomCount % columns;
  const row = Math.floor(roomCount / columns);
  return {
    x: roundToQuarter(clamp(gap + column * (width + gap), 0, Math.max(0, floorPlan.widthFt - width))),
    y: roundToQuarter(clamp(floorPlan.depthFt - depth - gap - row * (depth + gap), 0, Math.max(0, floorPlan.depthFt - depth))),
    width,
    depth,
  };
}

function pointsToSvg(points: PlanPoint[], floorPlan: HomeFloorPlan) {
  return points
    .map(point => `${(point.x / floorPlan.widthFt) * 100},${(point.y / floorPlan.depthFt) * 100}`)
    .join(' ');
}

function translatePointsWithinFloor(points: PlanPoint[], dx: number, dy: number, floorPlan: HomeFloorPlan) {
  if (points.length === 0) return points;
  const bounds = pointBounds(points);
  const clampedDx = clamp(dx, -bounds.minX, floorPlan.widthFt - bounds.maxX);
  const clampedDy = clamp(dy, -bounds.minY, floorPlan.depthFt - bounds.maxY);

  return points.map(point => roundPlanPoint({
    x: point.x + clampedDx,
    y: point.y + clampedDy,
  }));
}

function translateEdgeWithinFloor(
  points: PlanPoint[],
  edgeIndex: number,
  dx: number,
  dy: number,
  floorPlan: HomeFloorPlan,
  snapToGrid: boolean,
) {
  if (points.length < 3) return points;
  const startIndex = edgeIndex;
  const endIndex = (edgeIndex + 1) % points.length;
  const startPoint = points[startIndex];
  const endPoint = points[endIndex];
  const orientation = edgeOrientation(startPoint, endPoint);
  const requestedDx = orientation === 'vertical' ? dx : orientation === 'horizontal' ? 0 : dx;
  const requestedDy = orientation === 'horizontal' ? dy : orientation === 'vertical' ? 0 : dy;
  const movingPoints = [startPoint, endPoint];
  const movingBounds = pointBounds(movingPoints);
  const clampedDx = clamp(requestedDx, -movingBounds.minX, floorPlan.widthFt - movingBounds.maxX);
  const clampedDy = clamp(requestedDy, -movingBounds.minY, floorPlan.depthFt - movingBounds.maxY);

  return points.map((point, index) => {
    if (index !== startIndex && index !== endIndex) return point;
    const next = {
      x: point.x + clampedDx,
      y: point.y + clampedDy,
    };
    return snapToGrid ? roundPlanPoint(next) : { x: roundToHundredth(next.x), y: roundToHundredth(next.y) };
  });
}

function edgeResizeCursor(startPoint: PlanPoint, endPoint: PlanPoint) {
  const orientation = edgeOrientation(startPoint, endPoint);
  if (orientation === 'vertical') return 'ew-resize';
  if (orientation === 'horizontal') return 'ns-resize';
  return 'move';
}

function edgeOrientation(startPoint: PlanPoint, endPoint: PlanPoint) {
  const dx = Math.abs(endPoint.x - startPoint.x);
  const dy = Math.abs(endPoint.y - startPoint.y);
  if (dx > dy * 1.2) return 'horizontal';
  if (dy > dx * 1.2) return 'vertical';
  return 'diagonal';
}

function pointBounds(points: PlanPoint[]) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );
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

function itemPlacementForControls(item: RoomItem, room: Room | null, floorPlan: HomeFloorPlan, footprint: { widthFt: number; depthFt: number }) {
  const fallbackCenter = room ? averagePoint(planPointsForRoom(room)) : { x: floorPlan.widthFt / 2, y: floorPlan.depthFt / 2 };
  return clampItemPosition(
    item.planXFt ?? fallbackCenter.x - footprint.widthFt / 2,
    item.planYFt ?? fallbackCenter.y - footprint.depthFt / 2,
    footprint.widthFt,
    footprint.depthFt,
    floorPlan,
  );
}

function clampItemPosition(x: number, y: number, widthFt: number, depthFt: number, floorPlan: HomeFloorPlan) {
  return {
    planXFt: roundToHundredth(clamp(x, 0, Math.max(0, floorPlan.widthFt - widthFt))),
    planYFt: roundToHundredth(clamp(y, 0, Math.max(0, floorPlan.depthFt - depthFt))),
  };
}

function ftToIn(value: number) {
  return Math.round(value * 48) / 4;
}

function normaliseRotation(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

type FurnitureProfile = {
  kind: FurnitureType;
  label: string;
  background: string;
  border: string;
  borderRadius: number;
};

function furnitureProfileForItem(item: RoomItem): FurnitureProfile {
  return furnitureProfileForType(normaliseFurnitureType(item.furnitureType, item.itemName), item);
}

function furnitureProfileForType(type: FurnitureType, item: RoomItem): FurnitureProfile {
  if (type === 'crib' || type === 'bed') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(244,232,215,0.96)', '#9f7654', 7);
  if (type === 'sectional' || type === 'sofa') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(226,243,235,0.96)', '#1f6b5b', 10);
  if (type === 'chair' || type === 'patio_chair' || type === 'bench' || type === 'ottoman') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(226,243,235,0.96)', '#1f6b5b', type === 'chair' || type === 'patio_chair' ? 999 : 8);
  if (type === 'dining_table' || type === 'outdoor_table' || type === 'coffee_table' || type === 'side_table') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(246,224,205,0.96)', '#b85f36', type === 'dining_table' || type === 'outdoor_table' ? 999 : 8);
  if (type === 'desk') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(231,237,241,0.96)', '#55758b', 6);
  if (type === 'dresser' || type === 'bookcase' || type === 'tv_stand' || type === 'storage') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(239,233,221,0.96)', '#7d7467', 5);
  if (type === 'rug') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(255,252,247,0.78)', '#b99b68', 8);
  if (type === 'lamp') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(250,239,202,0.96)', '#b99b68', 999);
  if (type === 'plant') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(226,243,235,0.96)', '#4f8a60', 999);
  if (type === 'grill') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(232,234,231,0.96)', '#5f625b', 8);
  if (type === 'mirror') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(231,237,241,0.96)', '#55758b', 999);
  if (type === 'appliance') return furnitureProfile(type, furnitureTypeLabel(type), 'rgba(231,237,241,0.96)', '#55758b', 6);
  return furnitureProfile(
    'box',
    furnitureTypeLabel(type),
    item.itemSource === 'existing_belonging' ? 'rgba(246,224,205,0.96)' : 'rgba(226,243,235,0.96)',
    item.itemSource === 'existing_belonging' ? 'var(--color-accent)' : '#1f6b5b',
    6,
  );
}

function furnitureProfile(kind: FurnitureType, label: string, background: string, border: string, borderRadius: number): FurnitureProfile {
  return { kind, label, background, border, borderRadius };
}

function FurnitureGlyph({ profile }: { profile: FurnitureProfile }) {
  const kind = profile.kind;
  if (kind === 'bed' || kind === 'crib') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 4, border: '1px solid rgba(159,118,84,0.42)', borderRadius: 6, background: 'rgba(255,252,247,0.18)' }}>
        <div style={{ position: 'absolute', top: 4, left: 5, width: '40%', height: '22%', borderRadius: 4, background: 'rgba(255,252,247,0.82)', border: '1px solid rgba(159,118,84,0.18)' }} />
        <div style={{ position: 'absolute', top: 4, right: 5, width: '40%', height: '22%', borderRadius: 4, background: 'rgba(255,252,247,0.82)', border: '1px solid rgba(159,118,84,0.18)' }} />
        <div style={{ position: 'absolute', left: 5, right: 5, top: '36%', bottom: 5, borderRadius: 5, background: 'repeating-linear-gradient(90deg, rgba(159,118,84,0.08) 0 1px, transparent 1px 8px)' }} />
        {kind === 'crib' && (
          <div style={{ position: 'absolute', left: 3, right: 3, bottom: 3, top: '42%', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, opacity: 0.58 }}>
            {Array.from({ length: 6 }).map((_, index) => <span key={index} style={{ borderLeft: '1px solid #9f7654' }} />)}
          </div>
        )}
      </div>
    );
  }

  if (kind === 'sofa') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '26%', borderRadius: 6, background: 'rgba(31,107,91,0.48)' }} />
        <div style={{ position: 'absolute', left: 0, top: '18%', bottom: 0, width: '15%', borderRadius: 6, background: 'rgba(31,107,91,0.4)' }} />
        <div style={{ position: 'absolute', right: 0, top: '18%', bottom: 0, width: '15%', borderRadius: 6, background: 'rgba(31,107,91,0.4)' }} />
        <div style={{ position: 'absolute', left: '18%', right: '18%', top: '36%', bottom: '8%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {Array.from({ length: 3 }).map((_, index) => <span key={index} style={{ borderRadius: 5, background: 'rgba(31,107,91,0.28)', border: '1px solid rgba(31,107,91,0.16)' }} />)}
        </div>
      </div>
    );
  }

  if (kind === 'sectional') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5 }}>
        <div style={{ position: 'absolute', left: 0, right: '15%', top: 0, height: '34%', borderRadius: 6, background: 'rgba(31,107,91,0.48)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '28%', borderRadius: 6, background: 'rgba(31,107,91,0.4)' }} />
        <div style={{ position: 'absolute', left: '33%', right: '10%', top: '44%', bottom: '8%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
          {Array.from({ length: 2 }).map((_, index) => <span key={index} style={{ borderRadius: 5, background: 'rgba(31,107,91,0.28)', border: '1px solid rgba(31,107,91,0.16)' }} />)}
        </div>
      </div>
    );
  }

  if (kind === 'chair' || kind === 'patio_chair') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5 }}>
        <div style={{ position: 'absolute', left: '14%', right: '14%', top: 0, height: '26%', borderRadius: 5, background: 'rgba(31,107,91,0.45)' }} />
        <div style={{ position: 'absolute', inset: '30% 18% 12%', borderRadius: kind === 'patio_chair' ? 6 : 999, background: 'rgba(31,107,91,0.28)', border: '1px solid rgba(31,107,91,0.2)' }} />
        <div style={{ position: 'absolute', left: 0, top: '38%', bottom: '18%', width: '14%', borderRadius: 999, background: 'rgba(31,107,91,0.26)' }} />
        <div style={{ position: 'absolute', right: 0, top: '38%', bottom: '18%', width: '14%', borderRadius: 999, background: 'rgba(31,107,91,0.26)' }} />
      </div>
    );
  }

  if (kind === 'bench') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '18%', height: '24%', borderRadius: 5, background: 'rgba(31,107,91,0.42)' }} />
        <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: '18%', height: '26%', borderRadius: 5, background: 'rgba(31,107,91,0.28)' }} />
        <span style={{ position: 'absolute', left: '18%', bottom: 2, height: '24%', borderLeft: '2px solid rgba(31,107,91,0.34)' }} />
        <span style={{ position: 'absolute', right: '18%', bottom: 2, height: '24%', borderLeft: '2px solid rgba(31,107,91,0.34)' }} />
      </div>
    );
  }

  if (kind === 'ottoman') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: '18%', borderRadius: 999, background: 'rgba(31,107,91,0.28)', border: '1px solid rgba(31,107,91,0.26)', boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.22)' }} />
    );
  }

  if (kind === 'dining_table' || kind === 'outdoor_table' || kind === 'coffee_table' || kind === 'side_table') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: kind === 'side_table' ? '18%' : '22% 18%', borderRadius: kind === 'dining_table' || kind === 'outdoor_table' ? 999 : 7, border: '1px solid rgba(184,95,54,0.48)', background: 'rgba(255,252,247,0.56)' }}>
        <span style={{ position: 'absolute', left: 5, top: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
        <span style={{ position: 'absolute', right: 5, top: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
        <span style={{ position: 'absolute', left: 5, bottom: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
        <span style={{ position: 'absolute', right: 5, bottom: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
        {(kind === 'dining_table' || kind === 'outdoor_table') && (
          <>
            <span style={{ position: 'absolute', left: '46%', top: -8, width: 8, height: 8, borderRadius: 999, border: '1px solid rgba(184,95,54,0.32)' }} />
            <span style={{ position: 'absolute', left: '46%', bottom: -8, width: 8, height: 8, borderRadius: 999, border: '1px solid rgba(184,95,54,0.32)' }} />
            <span style={{ position: 'absolute', left: -8, top: '42%', width: 8, height: 8, borderRadius: 999, border: '1px solid rgba(184,95,54,0.32)' }} />
            <span style={{ position: 'absolute', right: -8, top: '42%', width: 8, height: 8, borderRadius: 999, border: '1px solid rgba(184,95,54,0.32)' }} />
          </>
        )}
      </div>
    );
  }

  if (kind === 'desk') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '30%', borderRadius: 4, background: 'rgba(85,117,139,0.34)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: '12%', width: '22%', borderRadius: 4, borderLeft: '2px solid rgba(85,117,139,0.34)' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: '12%', width: '22%', borderRadius: 4, borderRight: '2px solid rgba(85,117,139,0.34)' }} />
        <div style={{ position: 'absolute', left: '38%', right: '38%', bottom: 0, height: '34%', borderRadius: 999, border: '1px solid rgba(85,117,139,0.32)' }} />
      </div>
    );
  }

  if (kind === 'dresser') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5, display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, index) => <span key={index} style={{ borderTop: '1px solid rgba(125,116,103,0.52)', position: 'relative' }}><span style={{ position: 'absolute', left: '48%', top: 2, width: 4, height: 3, borderRadius: 999, background: 'rgba(125,116,103,0.42)' }} /></span>)}
      </div>
    );
  }

  if (kind === 'bookcase' || kind === 'storage') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5, display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} style={{ borderTop: '1px solid rgba(125,116,103,0.46)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {Array.from({ length: 4 }).map((__, subIndex) => <span key={subIndex} style={{ background: 'rgba(125,116,103,0.16)', borderRadius: 2 }} />)}
          </span>
        ))}
      </div>
    );
  }

  if (kind === 'tv_stand') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 5 }}>
        <div style={{ position: 'absolute', left: '14%', right: '14%', top: 0, height: '26%', borderRadius: 3, border: '1px solid rgba(125,116,103,0.42)', background: 'rgba(125,116,103,0.16)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '48%', borderTop: '3px solid rgba(125,116,103,0.42)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, paddingTop: 5 }}>
          {Array.from({ length: 3 }).map((_, index) => <span key={index} style={{ border: '1px solid rgba(125,116,103,0.3)', borderRadius: 3 }} />)}
        </div>
      </div>
    );
  }

  if (kind === 'rug') return <div aria-hidden="true" style={{ position: 'absolute', inset: 5, borderRadius: 8, border: '1px dashed rgba(185,155,104,0.78)', background: 'repeating-linear-gradient(45deg, rgba(185,155,104,0.14) 0 2px, transparent 2px 7px)' }} />;
  if (kind === 'lamp') return <div aria-hidden="true" style={{ position: 'absolute', inset: '20%', borderRadius: 999, border: '1px solid rgba(185,155,104,0.48)' }}><span style={{ position: 'absolute', inset: '28%', borderRadius: 999, background: 'rgba(185,155,104,0.42)' }} /></div>;
  if (kind === 'plant') return <div aria-hidden="true" style={{ position: 'absolute', inset: '18%', borderRadius: 999, border: '1px solid rgba(79,138,96,0.36)' }}><span style={{ position: 'absolute', left: '18%', top: '38%', width: '64%', height: '24%', borderRadius: '50%', background: 'rgba(79,138,96,0.36)', transform: 'rotate(35deg)' }} /><span style={{ position: 'absolute', left: '18%', top: '38%', width: '64%', height: '24%', borderRadius: '50%', background: 'rgba(79,138,96,0.36)', transform: 'rotate(-35deg)' }} /></div>;
  if (kind === 'grill') return <div aria-hidden="true" style={{ position: 'absolute', inset: 6, borderRadius: 8, border: '1px solid rgba(95,98,91,0.54)', background: 'rgba(255,255,255,0.24)' }}><span style={{ position: 'absolute', left: 4, right: 4, top: '40%', borderTop: '2px solid rgba(95,98,91,0.42)' }} /><span style={{ position: 'absolute', left: '20%', top: '16%', width: 5, height: 5, borderRadius: 999, background: 'rgba(95,98,91,0.38)' }} /><span style={{ position: 'absolute', right: '20%', top: '16%', width: 5, height: 5, borderRadius: 999, background: 'rgba(95,98,91,0.38)' }} /></div>;
  if (kind === 'mirror') return <div aria-hidden="true" style={{ position: 'absolute', inset: '12%', borderRadius: 999, border: '1px solid rgba(85,117,139,0.48)', background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(85,117,139,0.14))' }} />;
  if (kind === 'appliance') return <div aria-hidden="true" style={{ position: 'absolute', inset: 5, borderRadius: 5, border: '1px solid rgba(85,117,139,0.42)', background: 'rgba(255,255,255,0.24)' }}><span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px solid rgba(85,117,139,0.28)' }} /><span style={{ position: 'absolute', left: '56%', top: '22%', height: '26%', borderLeft: '2px solid rgba(85,117,139,0.38)' }} /></div>;
  return <div aria-hidden="true" style={{ position: 'absolute', inset: 5, borderRadius: 5, border: '1px solid rgba(92,86,72,0.28)', background: 'repeating-linear-gradient(135deg, rgba(92,86,72,0.08) 0 2px, transparent 2px 7px)' }} />;
}

function PlacedItem({
  item,
  x,
  y,
  width,
  depth,
  floorPlan,
  selected,
  onSelect,
  onStartDrag,
}: {
  item: RoomItem;
  x: number;
  y: number;
  width: number;
  depth: number;
  floorPlan: HomeFloorPlan;
  selected: boolean;
  onSelect: () => void;
  onStartDrag: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const profile = furnitureProfileForItem(item);
  return (
    <button
      data-layout-control="true"
      type="button"
      onPointerDown={onStartDrag}
      onClick={event => {
        event.stopPropagation();
        onSelect();
      }}
      title={`${item.itemName} · ${profile.label} · ${formatFt(width)} x ${formatFt(depth)}`}
      style={{
        position: 'absolute',
        left: `${(x / floorPlan.widthFt) * 100}%`,
        top: `${(y / floorPlan.depthFt) * 100}%`,
        width: `${(width / floorPlan.widthFt) * 100}%`,
        height: `${(depth / floorPlan.depthFt) * 100}%`,
        minWidth: 52,
        minHeight: 34,
        borderRadius: profile.borderRadius,
        border: selected ? '2px solid #1f6b5b' : `1px solid ${profile.border}`,
        background: profile.background,
        color: 'var(--color-foreground)',
        padding: 6,
        textAlign: 'left',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px rgba(31,107,91,0.18), var(--shadow-sm)' : 'var(--shadow-sm)',
        cursor: 'grab',
        touchAction: 'none',
        transform: `rotate(${item.rotationDeg ?? 0}deg)`,
        transformOrigin: 'center',
        zIndex: selected ? 4 : 3,
      }}
    >
      <FurnitureGlyph profile={profile} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.itemName}</div>
        <MoveDiagonal size={11} color="var(--color-secondary)" />
      </div>
      <div style={{ position: 'relative', zIndex: 1, fontSize: 9, color: 'var(--color-secondary)', marginTop: 4, whiteSpace: 'nowrap' }}>
        {formatFt(width)} x {formatFt(depth)}
      </div>
    </button>
  );
}

function ArchitecturalElementMarker({
  element,
  floorPlan,
  selected,
  onSelect,
  onStartDrag,
}: {
  element: ArchitecturalElement;
  floorPlan: HomeFloorPlan;
  selected: boolean;
  onSelect: () => void;
  onStartDrag: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const style = architecturalElementStyle(element.elementType);
  const showLabel = selected || ['stairs', 'closet', 'laundry', 'porch', 'storage'].includes(element.elementType);
  return (
    <button
      type="button"
      data-layout-control="true"
      onPointerDown={onStartDrag}
      onClick={event => {
        event.stopPropagation();
        onSelect();
      }}
      title={`${element.label} · ${labelForArchitecturalElementType(element.elementType)}`}
      style={{
        position: 'absolute',
        left: `${(element.xFt / floorPlan.widthFt) * 100}%`,
        top: `${(element.yFt / floorPlan.depthFt) * 100}%`,
        width: `${(element.widthFt / floorPlan.widthFt) * 100}%`,
        height: `${(element.depthFt / floorPlan.depthFt) * 100}%`,
        minWidth: style.minWidth,
        minHeight: style.minHeight,
        borderRadius: style.borderRadius,
        border: selected ? '2px solid #1f6b5b' : style.border,
        background: style.background,
        color: style.color,
        padding: 3,
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px rgba(31,107,91,0.18), var(--shadow-sm)' : 'var(--shadow-sm)',
        cursor: 'grab',
        transform: `rotate(${element.rotationDeg}deg)`,
        transformOrigin: 'center',
        zIndex: selected ? 7 : 4,
      }}
    >
      <ArchitecturalElementGlyph element={element} />
      {showLabel && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 4,
            right: 4,
            bottom: 3,
            color: style.color,
            fontSize: 8,
            fontWeight: 900,
            lineHeight: 1,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {element.label}
        </span>
      )}
    </button>
  );
}

function ArchitecturalElementGlyph({ element }: { element: ArchitecturalElement }) {
  if (element.elementType === 'wall') {
    return <span aria-hidden="true" style={{ position: 'absolute', inset: '35% 2px', background: 'rgba(255,250,243,0.22)' }} />;
  }

  if (element.elementType === 'door') {
    return (
      <>
        <span aria-hidden="true" style={{ position: 'absolute', left: 2, top: 2, bottom: 2, borderLeft: '2px solid #7a553a' }} />
        <span aria-hidden="true" style={{ position: 'absolute', left: 2, top: 2, width: '72%', height: '72%', border: '1px solid rgba(122,85,58,0.42)', borderLeft: 'none', borderBottom: 'none', borderRadius: '0 999px 0 0' }} />
      </>
    );
  }

  if (element.elementType === 'window') {
    return (
      <span aria-hidden="true" style={{ position: 'absolute', inset: '35% 4px', borderTop: '2px solid #356c89', borderBottom: '2px solid #356c89' }} />
    );
  }

  if (element.elementType === 'stairs') {
    return (
      <span aria-hidden="true" style={{ position: 'absolute', inset: 4, display: 'grid', gridTemplateRows: 'repeat(6, 1fr)', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, index) => <span key={index} style={{ borderTop: '1px solid rgba(85,117,139,0.72)' }} />)}
      </span>
    );
  }

  if (element.elementType === 'closet' || element.elementType === 'storage') {
    return (
      <span aria-hidden="true" style={{ position: 'absolute', inset: 5, border: '1px dashed rgba(125,116,103,0.58)', borderRadius: 3, background: 'rgba(255,252,247,0.28)' }} />
    );
  }

  if (element.elementType === 'laundry') {
    return (
      <span aria-hidden="true" style={{ position: 'absolute', inset: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <span style={{ borderRadius: 999, border: '1px solid rgba(85,117,139,0.58)', background: 'rgba(255,255,255,0.42)' }} />
        <span style={{ borderRadius: 999, border: '1px solid rgba(85,117,139,0.58)', background: 'rgba(255,255,255,0.42)' }} />
      </span>
    );
  }

  if (element.elementType === 'porch') {
    return <span aria-hidden="true" style={{ position: 'absolute', inset: 5, border: '1px dashed rgba(122,85,58,0.5)', backgroundImage: 'repeating-linear-gradient(90deg, rgba(122,85,58,0.14) 0 1px, transparent 1px 6px)' }} />;
  }

  if (element.elementType === 'sink' || element.elementType === 'toilet') {
    return <span aria-hidden="true" style={{ position: 'absolute', inset: '20%', border: '1px solid rgba(53,108,137,0.55)', borderRadius: element.elementType === 'toilet' ? '50% 50% 42% 42%' : 999, background: 'rgba(255,255,255,0.52)' }} />;
  }

  if (element.elementType === 'shower' || element.elementType === 'tub') {
    return <span aria-hidden="true" style={{ position: 'absolute', inset: 4, border: '1px solid rgba(53,108,137,0.52)', borderRadius: element.elementType === 'tub' ? 999 : 4, background: 'rgba(255,255,255,0.28)' }} />;
  }

  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 4, border: '1px solid rgba(92,86,72,0.24)', background: 'rgba(255,255,255,0.24)', borderRadius: 4 }} />
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

const ARCHITECTURAL_ELEMENT_TYPES: ArchitecturalElementType[] = [
  'door',
  'window',
  'opening',
  'wall',
  'stairs',
  'closet',
  'laundry',
  'porch',
  'storage',
  'counter',
  'cabinet',
  'sink',
  'toilet',
  'shower',
  'tub',
  'appliance',
  'fixture',
];

function makeArchitecturalElementDraft(
  element: ArchitecturalElement | null,
  floorPlan: HomeFloorPlan,
  floorRooms: Room[],
): ArchitecturalElementDraft {
  if (element) {
    return {
      floorPlanId: element.floorPlanId,
      roomId: element.roomId,
      elementType: element.elementType,
      label: element.label,
      xFt: element.xFt,
      yFt: element.yFt,
      widthFt: element.widthFt,
      depthFt: element.depthFt,
      rotationDeg: element.rotationDeg,
      notes: element.notes ?? '',
    };
  }

  const defaultType: ArchitecturalElementType = 'door';
  const dimensions = defaultArchitecturalElementDimensions(defaultType);
  const firstRoomCenter = floorRooms[0] ? planLabelPointForRoom(floorRooms[0]) : { x: floorPlan.widthFt / 2, y: floorPlan.depthFt / 2 };
  const position = clampArchitecturalElementPosition(
    firstRoomCenter.x - dimensions.widthFt / 2,
    firstRoomCenter.y - dimensions.depthFt / 2,
    dimensions.widthFt,
    dimensions.depthFt,
    floorPlan,
  );

  return {
    floorPlanId: floorPlan.id,
    roomId: floorRooms[0]?.id ?? null,
    elementType: defaultType,
    label: labelForArchitecturalElementType(defaultType),
    xFt: position.xFt,
    yFt: position.yFt,
    widthFt: dimensions.widthFt,
    depthFt: dimensions.depthFt,
    rotationDeg: 0,
    notes: '',
  };
}

function architecturalDraftToUpdate(draft: ArchitecturalElementDraft): ArchitecturalElementUpdate {
  return {
    floorPlanId: draft.floorPlanId,
    roomId: draft.roomId,
    elementType: draft.elementType,
    label: draft.label.trim() || labelForArchitecturalElementType(draft.elementType),
    xFt: roundToHundredth(draft.xFt),
    yFt: roundToHundredth(draft.yFt),
    widthFt: roundToHundredth(draft.widthFt),
    depthFt: roundToHundredth(draft.depthFt),
    rotationDeg: normaliseRotation(draft.rotationDeg),
    notes: draft.notes.trim() || null,
  };
}

function architecturalDraftHasChanges(element: ArchitecturalElement, draft: ArchitecturalElementDraft) {
  return element.roomId !== draft.roomId ||
    element.elementType !== draft.elementType ||
    element.label !== draft.label ||
    !nullableNumbersMatch(element.xFt, draft.xFt) ||
    !nullableNumbersMatch(element.yFt, draft.yFt) ||
    !nullableNumbersMatch(element.widthFt, draft.widthFt) ||
    !nullableNumbersMatch(element.depthFt, draft.depthFt) ||
    !nullableNumbersMatch(element.rotationDeg, normaliseRotation(draft.rotationDeg)) ||
    (element.notes ?? '') !== draft.notes.trim();
}

function defaultArchitecturalElementDimensions(type: ArchitecturalElementType) {
  if (type === 'wall') return { widthFt: 8, depthFt: 0.25 };
  if (type === 'door' || type === 'opening') return { widthFt: 3, depthFt: 0.25 };
  if (type === 'window') return { widthFt: 4, depthFt: 0.2 };
  if (type === 'stairs') return { widthFt: 6, depthFt: 10 };
  if (type === 'closet') return { widthFt: 4, depthFt: 2.5 };
  if (type === 'laundry') return { widthFt: 5, depthFt: 3 };
  if (type === 'porch') return { widthFt: 12, depthFt: 6 };
  if (type === 'storage') return { widthFt: 5, depthFt: 5 };
  if (type === 'counter' || type === 'cabinet') return { widthFt: 6, depthFt: 2 };
  if (type === 'sink' || type === 'toilet') return { widthFt: 2.5, depthFt: 2 };
  if (type === 'shower') return { widthFt: 3, depthFt: 3 };
  if (type === 'tub') return { widthFt: 5, depthFt: 2.5 };
  if (type === 'appliance') return { widthFt: 3, depthFt: 2.5 };
  return { widthFt: 2, depthFt: 2 };
}

function labelForArchitecturalElementType(type: ArchitecturalElementType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function clampArchitecturalElementPosition(xFt: number, yFt: number, widthFt: number, depthFt: number, floorPlan: HomeFloorPlan) {
  return {
    xFt: roundToHundredth(clamp(xFt, 0, Math.max(0, floorPlan.widthFt - widthFt))),
    yFt: roundToHundredth(clamp(yFt, 0, Math.max(0, floorPlan.depthFt - depthFt))),
  };
}

function architecturalElementStyle(type: ArchitecturalElementType) {
  if (type === 'wall') {
    return { minWidth: 52, minHeight: 12, borderRadius: 1, border: '1px solid #3f3a34', background: 'rgba(63,58,52,0.78)', color: '#fffaf3' };
  }
  if (type === 'door' || type === 'opening') {
    return { minWidth: 34, minHeight: 18, borderRadius: 2, border: '1px solid #7a553a', background: 'rgba(255,252,247,0.72)', color: '#7a553a' };
  }
  if (type === 'window') {
    return { minWidth: 44, minHeight: 14, borderRadius: 2, border: '1px solid #356c89', background: 'rgba(230,237,242,0.82)', color: '#356c89' };
  }
  if (type === 'stairs') {
    return { minWidth: 52, minHeight: 52, borderRadius: 4, border: '1px solid #55758b', background: 'rgba(231,237,241,0.82)', color: '#55758b' };
  }
  if (type === 'closet' || type === 'storage') {
    return { minWidth: 44, minHeight: 34, borderRadius: 4, border: '1px dashed #7d7467', background: 'rgba(255,252,247,0.76)', color: '#7d7467' };
  }
  if (type === 'laundry') {
    return { minWidth: 46, minHeight: 34, borderRadius: 5, border: '1px solid #55758b', background: 'rgba(231,237,241,0.86)', color: '#55758b' };
  }
  if (type === 'porch') {
    return { minWidth: 58, minHeight: 38, borderRadius: 4, border: '1px dashed #9f7654', background: 'rgba(244,232,215,0.46)', color: '#7a553a' };
  }
  if (type === 'counter' || type === 'cabinet' || type === 'appliance') {
    return { minWidth: 42, minHeight: 28, borderRadius: 4, border: '1px solid #7d7467', background: 'rgba(239,233,221,0.9)', color: '#7d7467' };
  }
  if (type === 'sink' || type === 'toilet' || type === 'shower' || type === 'tub') {
    return { minWidth: 32, minHeight: 28, borderRadius: 5, border: '1px solid #356c89', background: 'rgba(230,237,242,0.86)', color: '#356c89' };
  }
  return { minWidth: 30, minHeight: 30, borderRadius: 5, border: '1px solid var(--color-border-strong)', background: 'rgba(255,252,247,0.86)', color: 'var(--color-secondary)' };
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

function roundToHundredth(value: number) {
  return Math.round(value * 100) / 100;
}

function snapPlanValue(value: number, snapToGrid: boolean) {
  return snapToGrid ? roundToQuarter(value) : roundToHundredth(value);
}

function nullableNumber(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAutomationMessage(mode: LayoutAutomationMode, body: LayoutAutomationStats | null) {
  if (mode === 'rooms' || mode === 'floorRooms') {
    const seeds = body?.roomSeeds;
    return `Outlines updated ${seeds?.updated ?? 0}; skipped ${seeds?.skipped ?? 0}; custom preserved ${seeds?.custom ?? 0}.`;
  }

  if (mode === 'architecture' || mode === 'architectureReset') {
    const architectural = body?.architectural;
    return `Details added ${architectural?.created ?? 0}; updated ${architectural?.updated ?? 0}; removed ${architectural?.removed ?? 0}.`;
  }

  const layout = body?.layout;
  if (mode === 'reflow') return `Items reflowed ${layout?.updated ?? 0}; created ${layout?.created ?? 0}.`;
  return `Items created ${layout?.created ?? 0}; updated ${layout?.updated ?? 0}; removed ${layout?.removed ?? 0}.`;
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
