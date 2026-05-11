'use client';

import HomeSubnav from '@/components/HomeSubnav';
import {
  fallbackFloorPlansForRooms,
  floorForRoom,
  itemFootprint,
} from '@/lib/homeLayout';
import { FURNITURE_TYPE_OPTIONS, normaliseFurnitureType } from '@/lib/furniture';
import { ArchitecturalElement, ArchitecturalElementType, FurnitureType, HomeFloorPlan, PlanPoint, Room, RoomItem, Wall } from '@/lib/types';
import { Armchair, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Eye, EyeOff, Grid3X3, Image as ImageIcon, Lock, Package, Plus, RotateCcw, RotateCw, Ruler, Save, SlidersHorizontal, Trash2, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MeasuredFloorPlan } from './MeasuredFloorPlan';
import { MeasuredFloorScene, type SceneCameraMode } from './MeasuredFloorScene';
import { useBlueprintImageUrl } from './useBlueprintImageUrl';
import { useBlueprintSnap } from './blueprintSnap';
import { useDerivedRoomShapes } from './useDerivedRoomShapes';
import { polygonContainsPoint } from './roomDerivation';
import { RoomAnchorControls, type RoomAnchorPlacement } from './RoomAnchorControls';
import {
  ARCHITECTURAL_ELEMENT_TYPES,
  ArchitecturalElementDraft,
  ArchitecturalElementUpdate,
  OverlayFit,
  RoomItemLayoutUpdate,
  SaveResult,
  architecturalDraftHasChanges,
  architecturalDraftToUpdate,
  clamp,
  clampArchitecturalElementPosition,
  clampItemPosition,
  defaultArchitecturalElementDimensions,
  formatFt,
  formatNumberInput,
  ftToIn,
  furnitureProfileForType,
  isWallAttachedType,
  itemPlacementForControls,
  labelForArchitecturalElementType,
  makeArchitecturalElementDraft,
  normaliseRotation,
  resolveElementGeometry,
  nullableNumber,
  nullableNumbersMatch,
  roundToHundredth,
  roundToQuarter,
  toBlueprintImageSrc,
} from './helpers';

export default function HomeLayoutPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [architecturalElements, setArchitecturalElements] = useState<ArchitecturalElement[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [floorPlans, setFloorPlans] = useState<HomeFloorPlan[]>([]);
  const [activeFloorName, setActiveFloorName] = useState<string | null>(null);
  const [wallEditMode, setWallEditMode] = useState(false);
  const [wallTraceStart, setWallTraceStart] = useState<PlanPoint | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [cameraMode, setCameraMode] = useState<SceneCameraMode>('top');
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [roomLabelsVisible, setRoomLabelsVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [overlayFit, setOverlayFit] = useState<OverlayFit>('contain');
  const [anchorPlacement, setAnchorPlacement] = useState<RoomAnchorPlacement | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [syncingItems, setSyncingItems] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [layoutMessage, setLayoutMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // When the Architectural Elements panel has a wall-attached type selected,
  // we surface wall IDs on the canvas (so the user can match dropdown
  // values to the actual walls) and highlight whichever wall is currently
  // picked in the dropdown. Both fields are bubbled up from the panel via
  // its onDraftPreview callback.
  const [elementDraftPreview, setElementDraftPreview] = useState<{ elementType: ArchitecturalElementType; wallId: number | null } | null>(null);

  const fetchAll = useCallback(async () => {
    const [roomsRes, itemsRes, elementsRes, floorPlansRes, wallsRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/room-items'),
      fetch('/api/architectural-elements'),
      fetch('/api/home-floor-plans'),
      fetch('/api/walls'),
    ]);
    const nextRooms: Room[] = await roomsRes.json();
    const nextItems: RoomItem[] = await itemsRes.json();
    const nextElements: ArchitecturalElement[] = elementsRes.ok ? await elementsRes.json() : [];
    const nextFloorPlans: HomeFloorPlan[] = floorPlansRes.ok ? await floorPlansRes.json() : [];
    const nextWalls: Wall[] = wallsRes.ok ? await wallsRes.json() : [];

    setRooms(nextRooms);
    setItems(nextItems);
    setArchitecturalElements(nextElements);
    setFloorPlans(nextFloorPlans);
    setWalls(nextWalls);
    setActiveFloorName(current => current ?? (nextFloorPlans[0]?.name ?? fallbackFloorPlansForRooms(nextRooms)[0]?.name ?? null));
    setLoading(false);
    return { rooms: nextRooms, items: nextItems, architecturalElements: nextElements, floorPlans: nextFloorPlans, walls: nextWalls };
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
  const activeFloorWalls = activeFloor ? walls.filter(wall => wall.floorPlanId === activeFloor.id) : [];
  const activeFloorElements = activeFloor
    ? architecturalElements
        .filter(element => element.floorPlanId === activeFloor.id)
        .map(element => resolveElementGeometry(element, activeFloorWalls))
    : [];
  const activeBlueprintUrl = useBlueprintImageUrl(activeFloor?.blueprintImagePath ?? null);
  const blueprintSnap = useBlueprintSnap(activeFloor ?? null, activeBlueprintUrl);
  const derivedRoomShapes = useDerivedRoomShapes(activeFloor ?? null, activeFloorRooms, activeFloorWalls);
  const selectedElement = architecturalElements.find(element => element.id === selectedElementId) ?? null;
  const selectedItemRoom = selectedItem?.roomId ? rooms.find(room => room.id === selectedItem.roomId) ?? null : null;
  const selectedItemFloor = selectedItem?.floorPlanId
    ? measuredFloors.find(floor => floor.id === selectedItem.floorPlanId) ?? null
    : selectedItemRoom
      ? floorForRoom(selectedItemRoom, measuredFloors)
      : null;

  const moveItem = async (item: RoomItem, floorPlanId: number, _roomId: number | null, planXFt: number, planYFt: number) => {
    void _roomId; // ignore caller-provided roomId — derived from anchor polygon
    setSelectedItemId(item.id);
    setSelectedElementId(null);
    setLayoutMessage('Saving item position...');
    // Re-derive the room assignment from the wall-bounded polygons.
    const point = { x: planXFt, y: planYFt };
    let derivedRoomId: number | null = null;
    for (const [roomIdCandidate, shape] of derivedRoomShapes) {
      if (shape.bounded && polygonContainsPoint(shape.polygon, point)) {
        derivedRoomId = roomIdCandidate;
        break;
      }
    }
    const res = await fetch('/api/room-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        floorPlanId: floorPlanId > 0 ? floorPlanId : null,
        roomId: derivedRoomId,
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

  const deleteRoomItem = async (itemId: number): Promise<SaveResult> => {
    const res = await fetch(`/api/room-items?id=${itemId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Delete failed with HTTP ${res.status}` };
    }
    setItems(current => current.filter(item => item.id !== itemId));
    if (selectedItemId === itemId) setSelectedItemId(null);
    return { ok: true };
  };

  const createWall = async (start: PlanPoint, end: PlanPoint): Promise<SaveResult> => {
    if (!activeFloor || activeFloor.id < 0) return { ok: false, message: 'Save this floor plan before tracing walls.' };
    const res = await fetch('/api/walls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorPlanId: activeFloor.id,
        startXFt: roundToHundredth(start.x),
        startYFt: roundToHundredth(start.y),
        endXFt: roundToHundredth(end.x),
        endYFt: roundToHundredth(end.y),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Wall create failed with HTTP ${res.status}` };
    }
    const saved: Wall = await res.json();
    setWalls(current => [...current, saved]);
    return { ok: true };
  };

  const toggleFloorLock = async (key: 'structureLocked' | 'elementsLocked') => {
    if (!activeFloor || activeFloor.id < 0) return;
    const next = !activeFloor[key];
    const res = await fetch('/api/home-floor-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeFloor.id, [key]: next }),
    });
    if (res.ok) {
      const saved: HomeFloorPlan = await res.json();
      setFloorPlans(current => current.map(f => f.id === saved.id ? saved : f));
    }
    if (next) {
      // Exit any edit modes the locked layer governed.
      if (key === 'structureLocked') {
        setWallEditMode(false);
        setWallTraceStart(null);
        setAnchorPlacement(null);
      }
    }
  };

  const deleteWall = async (wallId: number): Promise<SaveResult> => {
    const res = await fetch(`/api/walls?id=${wallId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Wall delete failed with HTTP ${res.status}` };
    }
    setWalls(current => current.filter(wall => wall.id !== wallId));
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

  const selectFloor = (floorName: string) => {
    setActiveFloorName(floorName);
    setAnchorPlacement(null);
    setWallTraceStart(null);
    setWallEditMode(false);
  };

  const placeRoomAnchor = async (point: PlanPoint) => {
    if (!anchorPlacement || !activeFloor) return;
    const placement = anchorPlacement;
    setAnchorPlacement(null);
    if (placement.pendingRoomId !== undefined) {
      // Move existing room's anchor.
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: placement.pendingRoomId,
          anchorXFt: roundToHundredth(point.x),
          anchorYFt: roundToHundredth(point.y),
          floor: activeFloor.name,
          floorPlanId: activeFloor.id > 0 ? activeFloor.id : null,
        }),
      });
      if (res.ok) {
        const saved: Room = await res.json();
        setRooms(current => current.map(room => room.id === saved.id ? saved : room));
      }
      return;
    }
    // Create a new room anchored at this point.
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: placement.pendingName,
        floor: activeFloor.name,
        floorPlanId: activeFloor.id > 0 ? activeFloor.id : null,
        anchorXFt: roundToHundredth(point.x),
        anchorYFt: roundToHundredth(point.y),
      }),
    });
    if (res.ok) {
      const saved: Room = await res.json();
      setRooms(current => [...current, saved]);
    }
  };

  const deleteRoom = async (roomId: number): Promise<SaveResult> => {
    const res = await fetch(`/api/rooms?id=${roomId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Delete failed with HTTP ${res.status}` };
    }
    setRooms(current => current.filter(room => room.id !== roomId));
    setItems(current => current.map(item => item.roomId === roomId ? { ...item, roomId: null } : item));
    return { ok: true };
  };

  const renameRoom = async (roomId: number, name: string): Promise<SaveResult> => {
    const res = await fetch('/api/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId, name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, message: body?.error || `Rename failed with HTTP ${res.status}` };
    }
    const saved: Room = await res.json();
    setRooms(current => current.map(room => room.id === saved.id ? saved : room));
    return { ok: true };
  };

  const syncItemsFromBelongings = async (): Promise<SaveResult> => {
    setSyncingItems(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/home-layout-sync', { method: 'POST' });
      const body = await res.json().catch(() => null) as { error?: string; layout?: { created?: number; updated?: number; removed?: number } } | null;
      if (!res.ok) {
        const message = body?.error || `Layout sync failed with HTTP ${res.status}`;
        setStatusMessage(message);
        return { ok: false, message };
      }
      const stats = body?.layout;
      setStatusMessage(`Items created ${stats?.created ?? 0}; updated ${stats?.updated ?? 0}; removed ${stats?.removed ?? 0}.`);
      await fetchAll();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Layout sync failed.';
      setStatusMessage(message);
      return { ok: false, message };
    } finally {
      setSyncingItems(false);
    }
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
            wallEditMode={wallEditMode}
            wallCount={activeFloorWalls.length}
            structureLocked={activeFloor.structureLocked}
            elementsLocked={activeFloor.elementsLocked}
            onToggleStructureLock={() => toggleFloorLock('structureLocked')}
            onToggleElementsLock={() => toggleFloorLock('elementsLocked')}
            viewMode={viewMode}
            onViewModeChange={mode => {
              setViewMode(mode);
              if (mode === '3d') {
                setWallEditMode(false);
                setWallTraceStart(null);
                setAnchorPlacement(null);
              }
            }}
            syncingItems={syncingItems}
            message={statusMessage}
            onToggleOverlay={() => setOverlayVisible(value => !value)}
            onToggleRoomLabels={() => setRoomLabelsVisible(value => !value)}
            onSnapChange={setSnapToGrid}
            onToggleWallEdit={() => {
              if (activeFloor.structureLocked) return;
              setWallEditMode(value => !value);
              setWallTraceStart(null);
              setAnchorPlacement(null);
            }}
            onSyncItems={syncItemsFromBelongings}
          />
          <div className="layout-workspace-grid">
            {viewMode === '2d' ? (
              <MeasuredFloorPlan
                floorPlan={activeFloor}
                floorPlans={measuredFloors}
                rooms={rooms}
                items={items}
                overlayVisible={overlayVisible}
                overlayUrl={activeBlueprintUrl}
                roomLabelsVisible={roomLabelsVisible}
                overlayOpacity={overlayOpacity}
                overlayFit={overlayFit}
                structureLocked={activeFloor.structureLocked}
                elementsLocked={activeFloor.elementsLocked}
                wallLabelMode={elementDraftPreview ? isWallAttachedType(elementDraftPreview.elementType) : false}
                highlightedWallId={elementDraftPreview && isWallAttachedType(elementDraftPreview.elementType) ? elementDraftPreview.wallId : null}
                derivedRoomShapes={derivedRoomShapes}
                anchorPlacement={anchorPlacement}
                onPlaceAnchor={placeRoomAnchor}
                onCancelAnchor={() => setAnchorPlacement(null)}
                blueprintSnap={blueprintSnap}
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
                walls={activeFloorWalls}
                wallEditMode={wallEditMode}
                wallTraceStart={wallTraceStart}
                onWallTraceStartChange={setWallTraceStart}
                onCreateWall={createWall}
                onDeleteWall={deleteWall}
                statusMessage={layoutMessage}
              />
            ) : (
              <MeasuredFloorScene
                floorPlan={activeFloor}
                rooms={rooms}
                items={items}
                walls={activeFloorWalls}
                architecturalElements={activeFloorElements}
                derivedRoomShapes={derivedRoomShapes}
                structureLocked={activeFloor.structureLocked}
                elementsLocked={activeFloor.elementsLocked}
                selectedItemId={selectedItemId}
                onSelectItem={itemId => {
                  setSelectedItemId(itemId);
                  setSelectedElementId(null);
                }}
                onMoveItem={moveItem}
                onSaveItem={saveItemLayout}
                onDeleteItem={deleteRoomItem}
                onMoveArchitecturalElement={saveArchitecturalElement}
                cameraMode={cameraMode}
                onCameraModeChange={setCameraMode}
                snapToGrid={snapToGrid}
                overlayVisible={overlayVisible}
                blueprintTextureUrl={activeBlueprintUrl}
                overlayOpacity={overlayOpacity}
                statusMessage={layoutMessage}
              />
            )}
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
              <RoomAnchorControls
                floorPlan={activeFloor}
                floorRooms={activeFloorRooms}
                derivedShapes={derivedRoomShapes}
                placementMode={anchorPlacement}
                locked={activeFloor.structureLocked}
                onStartPlacement={placement => {
                  if (activeFloor.structureLocked) return;
                  setAnchorPlacement(placement);
                  setWallEditMode(false);
                  setWallTraceStart(null);
                }}
                onCancelPlacement={() => setAnchorPlacement(null)}
                onDeleteRoom={deleteRoom}
                onRenameRoom={renameRoom}
              />
              <ArchitecturalElementControls
                key={selectedElement ? `${selectedElement.id}-${selectedElement.xFt}-${selectedElement.yFt}-${selectedElement.widthFt}-${selectedElement.depthFt}-${selectedElement.rotationDeg}-${selectedElement.wallId ?? 'free'}-${selectedElement.offsetAlongWallFt ?? 'na'}` : `new-${activeFloor.id}`}
                floorPlan={activeFloor}
                floorRooms={activeFloorRooms}
                floorWalls={activeFloorWalls}
                locked={activeFloor.elementsLocked}
                selectedElement={selectedElement?.floorPlanId === activeFloor.id ? selectedElement : null}
                onCreate={createArchitecturalElement}
                onSave={saveArchitecturalElement}
                onDelete={deleteArchitecturalElement}
                onClear={() => setSelectedElementId(null)}
                onDraftPreview={setElementDraftPreview}
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
  wallEditMode,
  wallCount,
  structureLocked,
  elementsLocked,
  onToggleStructureLock,
  onToggleElementsLock,
  viewMode,
  onViewModeChange,
  message,
  onToggleOverlay,
  onToggleRoomLabels,
  onSnapChange,
  onToggleWallEdit,
  syncingItems,
  onSyncItems,
}: {
  floorPlan: HomeFloorPlan;
  overlayVisible: boolean;
  roomLabelsVisible: boolean;
  snapToGrid: boolean;
  wallEditMode: boolean;
  wallCount: number;
  structureLocked: boolean;
  elementsLocked: boolean;
  onToggleStructureLock: () => void;
  onToggleElementsLock: () => void;
  viewMode: '2d' | '3d';
  onViewModeChange: (mode: '2d' | '3d') => void;
  syncingItems: boolean;
  message: string | null;
  onToggleOverlay: () => void;
  onToggleRoomLabels: () => void;
  onSnapChange: (value: boolean) => void;
  onToggleWallEdit: () => void;
  onSyncItems: () => Promise<SaveResult>;
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
          <div className="seg-control" aria-label="View mode">
            <button
              type="button"
              onClick={() => onViewModeChange('2d')}
              className={`seg-btn ${viewMode === '2d' ? 'seg-active' : ''}`}
            >
              2D
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('3d')}
              className={`seg-btn ${viewMode === '3d' ? 'seg-active' : ''}`}
            >
              3D
            </button>
          </div>
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
          <button
            type="button"
            className={`btn btn-${wallEditMode ? 'primary' : 'secondary'} btn-sm`}
            onClick={onToggleWallEdit}
            disabled={structureLocked}
            title={structureLocked ? 'Structure layer is locked. Unlock to edit walls.' : wallEditMode ? 'Click two points to add a wall. Walls auto-lock to the dominant axis (hold Shift for diagonal). Click × on a wall to delete.' : 'Trace walls by clicking two points on the canvas. Snaps to existing wall endpoints and blueprint lines. Holds the second click to the dominant axis by default.'}
          >
            <Ruler size={14} />
            {wallEditMode ? `Finish Walls (${wallCount})` : `Trace Walls (${wallCount})`}
          </button>
          <button
            type="button"
            className={`btn btn-${structureLocked ? 'primary' : 'secondary'} btn-sm`}
            onClick={onToggleStructureLock}
            title={structureLocked ? 'Structure (walls + rooms) is locked. Click to unlock.' : 'Lock walls + rooms so they can’t be edited.'}
          >
            {structureLocked ? <Lock size={14} /> : <Unlock size={14} />}
            Structure
          </button>
          <button
            type="button"
            className={`btn btn-${elementsLocked ? 'primary' : 'secondary'} btn-sm`}
            onClick={onToggleElementsLock}
            title={elementsLocked ? 'Architectural elements are locked. Click to unlock.' : 'Lock doors / windows / fixtures so they can’t be edited.'}
          >
            {elementsLocked ? <Lock size={14} /> : <Unlock size={14} />}
            Elements
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onSyncItems} disabled={syncingItems}>
            <RotateCw size={14} /> {syncingItems ? 'Syncing...' : 'Sync Items'}
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


function ArchitecturalElementControls({
  floorPlan,
  floorRooms,
  floorWalls,
  locked,
  selectedElement,
  onCreate,
  onSave,
  onDelete,
  onClear,
  onDraftPreview,
}: {
  floorPlan: HomeFloorPlan;
  floorRooms: Room[];
  floorWalls: Wall[];
  locked: boolean;
  selectedElement: ArchitecturalElement | null;
  onCreate: (draft: ArchitecturalElementDraft) => Promise<SaveResult>;
  onSave: (elementId: number, update: ArchitecturalElementUpdate) => Promise<SaveResult>;
  onDelete: (elementId: number) => Promise<SaveResult>;
  onClear: () => void;
  onDraftPreview?: (preview: { elementType: ArchitecturalElementType; wallId: number | null } | null) => void;
}) {
  const [draft, setDraft] = useState(() => makeArchitecturalElementDraft(selectedElement, floorPlan, floorRooms));
  const isWallAttached = isWallAttachedType(draft.elementType);
  const selectedWall = draft.wallId != null ? floorWalls.find(w => w.id === draft.wallId) ?? null : null;
  const selectedWallLength = selectedWall ? Math.hypot(selectedWall.endXFt - selectedWall.startXFt, selectedWall.endYFt - selectedWall.startYFt) : 0;
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const canPersist = floorPlan.id > 0 && !locked;
  const hasUnsavedElementChanges = selectedElement ? architecturalDraftHasChanges(selectedElement, draft) : false;

  useEffect(() => {
    void Promise.resolve().then(() => {
      setDraft(makeArchitecturalElementDraft(selectedElement, floorPlan, floorRooms));
      setSaveState('idle');
      setSaveMessage(null);
    });
  }, [floorPlan, floorRooms, selectedElement]);

  // Notify the parent of the current draft type + wallId so the canvas
  // can surface wall IDs / highlight the selected wall while a
  // wall-attached element type is selected.
  useEffect(() => {
    onDraftPreview?.({ elementType: draft.elementType, wallId: draft.wallId });
    return () => {
      onDraftPreview?.(null);
    };
  }, [draft.elementType, draft.wallId, onDraftPreview]);

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

        {isWallAttached ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'block' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Wall</span>
              <select
                value={draft.wallId ?? ''}
                onChange={event => {
                  const wallId = event.target.value ? Number(event.target.value) : null;
                  const wall = wallId !== null ? floorWalls.find(w => w.id === wallId) : null;
                  const length = wall ? Math.hypot(wall.endXFt - wall.startXFt, wall.endYFt - wall.startYFt) : 0;
                  setDraft(current => ({
                    ...current,
                    wallId,
                    offsetAlongWallFt: wallId === null ? null : (current.offsetAlongWallFt ?? length / 2),
                  }));
                }}
              >
                <option value="">No wall ({floorWalls.length} available)</option>
                {floorWalls.map(wall => {
                  const length = Math.hypot(wall.endXFt - wall.startXFt, wall.endYFt - wall.startYFt);
                  return (
                    <option key={wall.id} value={wall.id}>
                      Wall #{wall.id} ({length.toFixed(1)} ft)
                    </option>
                  );
                })}
              </select>
            </label>
            <GeometryNumberField
              label={`Offset ft${selectedWall ? ` (max ${selectedWallLength.toFixed(1)})` : ''}`}
              value={draft.offsetAlongWallFt}
              min={0}
              max={selectedWallLength || floorPlan.widthFt}
              nullable
              onChange={offset => setDraft(current => ({ ...current, offsetAlongWallFt: offset }))}
            />
            <GeometryNumberField
              label="Width ft"
              value={draft.widthFt}
              min={0.25}
              max={floorPlan.widthFt}
              onChange={widthFt => widthFt !== null && setDraft(current => ({ ...current, widthFt }))}
            />
          </div>
        ) : (
          <>
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
          </>
        )}

        {floorPlan.id < 0 && (
          <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Save this floor plan before adding architectural elements.</span>
        )}
        {locked && (
          <span style={{ fontSize: 12, color: 'var(--color-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={12} /> Elements layer locked. Click the Elements lock in the toolbar to edit.
          </span>
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
    // Center on the room's anchor point. The anchor sits inside the
    // wall-bounded region, so this lands the item somewhere sensible.
    if (room.anchorXFt === null || room.anchorYFt === null) return;
    const center = { x: room.anchorXFt, y: room.anchorYFt };
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
