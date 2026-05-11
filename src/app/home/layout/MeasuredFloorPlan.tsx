'use client';

import { type PointerEvent, useRef, useState } from 'react';
import { AlertTriangle, Grid3X3, MapPin, MoveDiagonal } from 'lucide-react';
import {
  floorForRoom,
  itemFootprint,
  planLabelPointForRoom,
} from '@/lib/homeLayout';
import type {
  ArchitecturalElement,
  HomeFloorPlan,
  PlanPoint,
  Room,
  RoomItem,
  Wall,
} from '@/lib/types';
import {
  ArchitecturalElementUpdate,
  GeometryDragTarget,
  OverlayFit,
  SaveResult,
  architecturalElementStyle,
  clamp,
  clampArchitecturalElementPosition,
  clampItemPosition,
  formatFt,
  furnitureProfileForItem,
  type FurnitureProfile,
  gridLines,
  labelForArchitecturalElementType,
  pointsToSvg,
  snapPlanValue,
} from './helpers';
import type { BlueprintSnap } from './blueprintSnap';
import type { DerivedRoomShape } from './useDerivedRoomShapes';
import type { RoomAnchorPlacement } from './RoomAnchorControls';

const ROOM_TINTS = [
  'rgba(31,107,91,0.18)',
  'rgba(154,90,47,0.18)',
  'rgba(184,95,54,0.18)',
  'rgba(85,117,139,0.18)',
  'rgba(159,118,84,0.18)',
  'rgba(79,138,96,0.18)',
];
const ROOM_STROKES = [
  'rgba(31,107,91,0.78)',
  'rgba(154,90,47,0.78)',
  'rgba(184,95,54,0.78)',
  'rgba(85,117,139,0.78)',
  'rgba(159,118,84,0.78)',
  'rgba(79,138,96,0.78)',
];

export function MeasuredFloorPlan({
  floorPlan,
  floorPlans,
  rooms,
  items,
  architecturalElements,
  walls,
  overlayVisible,
  overlayUrl,
  roomLabelsVisible,
  overlayOpacity,
  overlayFit,
  structureLocked,
  elementsLocked,
  derivedRoomShapes,
  anchorPlacement,
  onPlaceAnchor,
  onCancelAnchor,
  blueprintSnap,
  selectedItemId,
  selectedElementId,
  onSelectItem,
  onSelectArchitecturalElement,
  onMoveArchitecturalElement,
  snapToGrid,
  onMoveItem,
  wallEditMode,
  wallTraceStart,
  onWallTraceStartChange,
  onCreateWall,
  onDeleteWall,
  statusMessage,
}: {
  floorPlan: HomeFloorPlan;
  floorPlans: HomeFloorPlan[];
  rooms: Room[];
  items: RoomItem[];
  architecturalElements: ArchitecturalElement[];
  walls: Wall[];
  overlayVisible: boolean;
  overlayUrl: string | null;
  roomLabelsVisible: boolean;
  overlayOpacity: number;
  overlayFit: OverlayFit;
  structureLocked: boolean;
  elementsLocked: boolean;
  derivedRoomShapes: Map<number, DerivedRoomShape>;
  anchorPlacement: RoomAnchorPlacement | null;
  onPlaceAnchor: (point: PlanPoint) => void;
  onCancelAnchor: () => void;
  blueprintSnap: BlueprintSnap;
  selectedItemId: number | null;
  selectedElementId: number | null;
  onSelectItem: (itemId: number) => void;
  onSelectArchitecturalElement: (elementId: number) => void;
  onMoveArchitecturalElement: (elementId: number, update: ArchitecturalElementUpdate) => Promise<SaveResult>;
  snapToGrid: boolean;
  onMoveItem: (item: RoomItem, floorPlanId: number, roomId: number | null, planXFt: number, planYFt: number) => void;
  wallEditMode: boolean;
  wallTraceStart: PlanPoint | null;
  onWallTraceStartChange: (point: PlanPoint | null) => void;
  onCreateWall: (start: PlanPoint, end: PlanPoint) => Promise<SaveResult>;
  onDeleteWall: (wallId: number) => Promise<SaveResult>;
  statusMessage: string | null;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [dragTarget, setDragTarget] = useState<GeometryDragTarget | null>(null);
  const [itemDragPreview, setItemDragPreview] = useState<{ itemId: number; xFt: number; yFt: number } | null>(null);
  const [architecturalDragPreview, setArchitecturalDragPreview] = useState<{ elementId: number; xFt: number; yFt: number } | null>(null);
  const [wallCursor, setWallCursor] = useState<PlanPoint | null>(null);

  const floorRooms = rooms.filter(room => floorForRoom(room, floorPlans)?.name === floorPlan.name);
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
  const overlaySrc = overlayUrl;
  const overlayRect = {
    x: floorPlan.overlayOffsetXFt ?? 0,
    y: floorPlan.overlayOffsetYFt ?? 0,
    width: floorPlan.overlayWidthFt ?? floorPlan.widthFt,
    depth: floorPlan.overlayDepthFt ?? floorPlan.depthFt,
  };

  const pointFromPointer = (event: { clientX: number; clientY: number }) => {
    if (!surfaceRef.current) return null;
    const bounds = surfaceRef.current.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * floorPlan.widthFt, 0, floorPlan.widthFt),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * floorPlan.depthFt, 0, floorPlan.depthFt),
    };
  };

  const snapForWallTrace = (point: PlanPoint, axisLockTo: PlanPoint | null): PlanPoint => {
    // If we're laying the second point of a wall (axisLockTo is the start
    // point) and the user is NOT holding Shift, constrain the cursor to
    // the dominant axis from the start point. This keeps walls orthogonal
    // by default — the typical case — while Shift lets you go diagonal.
    let working = point;
    if (axisLockTo) {
      const dx = Math.abs(point.x - axisLockTo.x);
      const dy = Math.abs(point.y - axisLockTo.y);
      working = dx >= dy
        ? { x: point.x, y: axisLockTo.y }
        : { x: axisLockTo.x, y: point.y };
    }

    // Priority 1: snap to an existing wall endpoint within 1 ft.
    const endpoints: PlanPoint[] = walls.flatMap(wall => [
      { x: wall.startXFt, y: wall.startYFt },
      { x: wall.endXFt, y: wall.endYFt },
    ]);
    const nearestEndpoint = endpoints.reduce<{ point: PlanPoint; distance: number } | null>((best, candidate) => {
      const distance = Math.hypot(candidate.x - working.x, candidate.y - working.y);
      if (distance > 1) return best;
      if (!best || distance < best.distance) return { point: candidate, distance };
      return best;
    }, null);
    if (nearestEndpoint) return nearestEndpoint.point;

    // Priority 2: snap to a blueprint pixel within 0.5 ft.
    if (blueprintSnap.hasImage) {
      const snapped = blueprintSnap.snap(working, 0.5);
      if (snapped) {
        return {
          x: Math.round(snapped.x * 100) / 100,
          y: Math.round(snapped.y * 100) / 100,
        };
      }
    }

    // Priority 3: grid snap.
    return {
      x: snapPlanValue(working.x, snapToGrid),
      y: snapPlanValue(working.y, snapToGrid),
    };
  };

  const snapForAnchor = (point: PlanPoint): PlanPoint => ({
    x: snapPlanValue(point.x, snapToGrid),
    y: snapPlanValue(point.y, snapToGrid),
  });

  const updateDraftFromPointer = (event: PointerEvent<HTMLElement>) => {
    if (wallEditMode) {
      const point = pointFromPointer(event);
      if (point) {
        const axisLock = wallTraceStart && !event.shiftKey ? wallTraceStart : null;
        setWallCursor(snapForWallTrace(point, axisLock));
      }
      return;
    }
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
  };

  const finishPointerDrag = async () => {
    const target = dragTarget;
    const itemPreview = itemDragPreview;
    const preview = architecturalDragPreview;
    setDragTarget(null);
    setItemDragPreview(null);
    setArchitecturalDragPreview(null);

    if (target?.type === 'item' && itemPreview?.itemId === target.item.id) {
      onMoveItem(target.item, floorPlan.id, null, itemPreview.xFt, itemPreview.yFt);
      return;
    }

    if (target?.type !== 'architecturalElement' || preview?.elementId !== target.element.id) return;
    await onMoveArchitecturalElement(target.element.id, {
      xFt: preview.xFt,
      yFt: preview.yFt,
      floorPlanId: floorPlan.id,
    });
  };

  const interactionMode: 'wall' | 'anchor' | 'idle' = wallEditMode
    ? 'wall'
    : anchorPlacement
      ? 'anchor'
      : 'idle';

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
        {interactionMode === 'anchor' && anchorPlacement && (
          <div style={{
            marginBottom: 10,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px dashed var(--color-accent)',
            background: 'var(--color-accent-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <MapPin size={14} color="var(--color-accent-dark)" />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--color-accent-dark)' }}>
              {anchorPlacement.pendingRoomId
                ? `Click inside the room to move "${anchorPlacement.pendingName}".`
                : `Click inside a wall-bounded area to anchor "${anchorPlacement.pendingName}".`}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelAnchor}>Cancel</button>
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
            onMoveItem(item, floorPlan.id, null, planXFt, planYFt);
          }}
          onPointerMove={updateDraftFromPointer}
          onPointerUp={() => { void finishPointerDrag(); }}
          onPointerCancel={() => {
            setDragTarget(null);
            setItemDragPreview(null);
            setArchitecturalDragPreview(null);
          }}
          onPointerLeave={() => {
            if (wallEditMode) setWallCursor(null);
          }}
          onClick={async (event) => {
            const target = event.target as HTMLElement;
            if (target.closest('[data-layout-control="true"]')) return;
            const raw = pointFromPointer(event);
            if (!raw) return;

            if (interactionMode === 'wall') {
              // First click: no axis lock (we're choosing the anchor).
              // Second click: lock to dominant axis from the start unless Shift is held.
              const axisLock = wallTraceStart && !event.shiftKey ? wallTraceStart : null;
              const snapped = snapForWallTrace(raw, axisLock);
              if (!wallTraceStart) {
                onWallTraceStartChange(snapped);
                return;
              }
              const dx = snapped.x - wallTraceStart.x;
              const dy = snapped.y - wallTraceStart.y;
              if (Math.hypot(dx, dy) < 0.25) {
                onWallTraceStartChange(null);
                return;
              }
              const result = await onCreateWall(wallTraceStart, snapped);
              if (result.ok) {
                onWallTraceStartChange(null);
                setWallCursor(null);
              }
              return;
            }

            if (interactionMode === 'anchor') {
              const snapped = snapForAnchor(raw);
              onPlaceAnchor(snapped);
              return;
            }
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
            cursor: interactionMode === 'wall' ? 'crosshair' : interactionMode === 'anchor' ? 'crosshair' : 'default',
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
                pointerEvents: 'none',
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
                pointerEvents: 'none',
              }}
            />
          ))}
          {/* Derived room polygons (translucent fills) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
          >
            {floorRooms.map((room, index) => {
              const shape = derivedRoomShapes.get(room.id);
              if (!shape || shape.polygon.length < 3) return null;
              const fill = shape.bounded ? ROOM_TINTS[index % ROOM_TINTS.length] : 'rgba(180,83,9,0.12)';
              const stroke = shape.bounded ? ROOM_STROKES[index % ROOM_STROKES.length] : '#b45309';
              return (
                <polygon
                  key={room.id}
                  points={pointsToSvg(shape.polygon, floorPlan)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.4}
                  strokeDasharray={shape.bounded ? undefined : '1.5 1'}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          {/* Walls */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
          >
            {walls.map(wall => (
              <line
                key={wall.id}
                x1={(wall.startXFt / floorPlan.widthFt) * 100}
                y1={(wall.startYFt / floorPlan.depthFt) * 100}
                x2={(wall.endXFt / floorPlan.widthFt) * 100}
                y2={(wall.endYFt / floorPlan.depthFt) * 100}
                stroke={structureLocked ? '#5a7691' : '#3f3a34'}
                strokeWidth={0.6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {wallEditMode && wallTraceStart && wallCursor && (
              <line
                x1={(wallTraceStart.x / floorPlan.widthFt) * 100}
                y1={(wallTraceStart.y / floorPlan.depthFt) * 100}
                x2={(wallCursor.x / floorPlan.widthFt) * 100}
                y2={(wallCursor.y / floorPlan.depthFt) * 100}
                stroke="#1f6b5b"
                strokeWidth={0.5}
                strokeDasharray="2 1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {/* Wall delete buttons (only in edit mode, never when locked) */}
          {wallEditMode && !structureLocked && walls.map(wall => (
            <button
              key={`wall-handle-${wall.id}`}
              type="button"
              data-layout-control="true"
              aria-label={`Delete wall ${wall.id}`}
              title="Click to delete this wall"
              onClick={async (event) => {
                event.stopPropagation();
                await onDeleteWall(wall.id);
              }}
              style={{
                position: 'absolute',
                left: `${(((wall.startXFt + wall.endXFt) / 2) / floorPlan.widthFt) * 100}%`,
                top: `${(((wall.startYFt + wall.endYFt) / 2) / floorPlan.depthFt) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 6,
                width: 18,
                height: 18,
                borderRadius: 999,
                border: '2px solid #b91c1c',
                background: 'rgba(255,250,243,0.96)',
                color: '#b91c1c',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >×</button>
          ))}
          {wallEditMode && wallTraceStart && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${(wallTraceStart.x / floorPlan.widthFt) * 100}%`,
                top: `${(wallTraceStart.y / floorPlan.depthFt) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                width: 12,
                height: 12,
                borderRadius: 999,
                border: '2px solid #1f6b5b',
                background: '#fffaf3',
                pointerEvents: 'none',
              }}
            />
          )}
          {wallEditMode && wallCursor && !wallTraceStart && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${(wallCursor.x / floorPlan.widthFt) * 100}%`,
                top: `${(wallCursor.y / floorPlan.depthFt) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                width: 10,
                height: 10,
                borderRadius: 999,
                border: '1px dashed rgba(31,107,91,0.66)',
                background: 'transparent',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Room name labels at anchor points */}
          {roomLabelsVisible && floorRooms.map(room => {
            if (room.anchorXFt === null || room.anchorYFt === null) return null;
            const shape = derivedRoomShapes.get(room.id);
            const bounded = shape?.bounded ?? false;
            return (
              <div
                key={`label-${room.id}`}
                style={{
                  position: 'absolute',
                  left: `${(room.anchorXFt / floorPlan.widthFt) * 100}%`,
                  top: `${(room.anchorYFt / floorPlan.depthFt) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'rgba(255,250,243,0.92)',
                  border: `1px solid ${bounded ? 'rgba(31,107,91,0.42)' : 'rgba(180,83,9,0.66)'}`,
                  color: bounded ? 'rgba(28,25,23,0.78)' : '#b45309',
                  fontSize: 9,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 1px 3px rgba(28,25,23,0.05)',
                }}
              >
                {!bounded && <AlertTriangle size={9} />}
                {room.name}
              </div>
            );
          })}
          {displayedArchitecturalElements.map(element => (
            <ArchitecturalElementMarker
              key={element.id}
              element={element}
              floorPlan={floorPlan}
              selected={element.id === selectedElementId}
              dimmed={elementsLocked}
              onSelect={() => onSelectArchitecturalElement(element.id)}
              onStartDrag={event => {
                if (elementsLocked) {
                  // Selection still allowed; drag is suppressed.
                  return;
                }
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
          {floorRooms.length === 0 && walls.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--color-secondary)', textAlign: 'center', padding: 24 }}>
              <div>
                <Grid3X3 size={28} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 13 }}>Trace walls first, then anchor rooms inside them.</div>
              </div>
            </div>
          )}
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
        zIndex: selected ? 8 : 7,
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
  dimmed,
  onSelect,
  onStartDrag,
}: {
  element: ArchitecturalElement;
  floorPlan: HomeFloorPlan;
  selected: boolean;
  dimmed: boolean;
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
        cursor: dimmed ? 'pointer' : 'grab',
        opacity: dimmed ? 0.6 : 1,
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
    return <span aria-hidden="true" style={{ position: 'absolute', inset: '35% 4px', borderTop: '2px solid #356c89', borderBottom: '2px solid #356c89' }} />;
  }
  if (element.elementType === 'stairs') {
    return (
      <span aria-hidden="true" style={{ position: 'absolute', inset: 4, display: 'grid', gridTemplateRows: 'repeat(6, 1fr)', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, index) => <span key={index} style={{ borderTop: '1px solid rgba(85,117,139,0.72)' }} />)}
      </span>
    );
  }
  if (element.elementType === 'closet' || element.elementType === 'storage') {
    return <span aria-hidden="true" style={{ position: 'absolute', inset: 5, border: '1px dashed rgba(125,116,103,0.58)', borderRadius: 3, background: 'rgba(255,252,247,0.28)' }} />;
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
  return <span aria-hidden="true" style={{ position: 'absolute', inset: 4, border: '1px solid rgba(92,86,72,0.24)', background: 'rgba(255,255,255,0.24)', borderRadius: 4 }} />;
}

export function FurnitureGlyph({ profile }: { profile: FurnitureProfile }) {
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
    return <div aria-hidden="true" style={{ position: 'absolute', inset: '18%', borderRadius: 999, background: 'rgba(31,107,91,0.28)', border: '1px solid rgba(31,107,91,0.26)', boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.22)' }} />;
  }
  if (kind === 'dining_table' || kind === 'outdoor_table' || kind === 'coffee_table' || kind === 'side_table') {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: kind === 'side_table' ? '18%' : '22% 18%', borderRadius: kind === 'dining_table' || kind === 'outdoor_table' ? 999 : 7, border: '1px solid rgba(184,95,54,0.48)', background: 'rgba(255,252,247,0.56)' }}>
        <span style={{ position: 'absolute', left: 5, top: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
        <span style={{ position: 'absolute', right: 5, top: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
        <span style={{ position: 'absolute', left: 5, bottom: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
        <span style={{ position: 'absolute', right: 5, bottom: 5, width: 5, height: 5, borderRadius: 999, background: 'rgba(184,95,54,0.38)' }} />
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
