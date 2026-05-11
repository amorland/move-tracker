import type {
  ArchitecturalElement,
  ArchitecturalElementType,
  FurnitureType,
  HomeFloorPlan,
  PlanPoint,
  Room,
  RoomItem,
} from '@/lib/types';
import {
  planLabelPointForRoom,
  planPointsForRoom,
  planRectForRoom,
  PlanRect,
} from '@/lib/homeLayout';
import { furnitureTypeLabel, normaliseFurnitureType } from '@/lib/furniture';

export type OverlayFit = 'contain' | 'cover' | 'stretch';
export type SaveResult = { ok: true } | { ok: false; message: string };

export type RoomGeometryDraft = {
  roomId: number;
  shapePoints: PlanPoint[] | null;
  labelXFt: number | null;
  labelYFt: number | null;
};

export type GeometryDragTarget =
  | { type: 'point'; index: number }
  | { type: 'edge'; index: number; points: PlanPoint[]; start: PlanPoint }
  | { type: 'label' }
  | { type: 'room'; start: PlanPoint; points: PlanPoint[] }
  | { type: 'item'; item: RoomItem; start: PlanPoint; xFt: number; yFt: number; widthFt: number; depthFt: number }
  | { type: 'architecturalElement'; element: ArchitecturalElement; start: PlanPoint; xFt: number; yFt: number };

export type RoomItemLayoutUpdate = {
  furnitureType?: FurnitureType;
  widthIn?: number | null;
  depthIn?: number | null;
  rotationDeg?: number | null;
  planXFt?: number | null;
  planYFt?: number | null;
};

export type ArchitecturalElementUpdate = {
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
  wallId?: number | null;
  offsetAlongWallFt?: number | null;
};

export type ArchitecturalElementDraft = {
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
  wallId: number | null;
  offsetAlongWallFt: number | null;
};

export const WALL_ATTACHED_ELEMENT_TYPES = new Set<ArchitecturalElementType>(['door', 'window', 'opening']);

export function isWallAttachedType(type: ArchitecturalElementType): boolean {
  return WALL_ATTACHED_ELEMENT_TYPES.has(type);
}

export const ARCHITECTURAL_ELEMENT_TYPES: ArchitecturalElementType[] = [
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

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function roundToQuarter(value: number) {
  return Math.round(value * 4) / 4;
}

export function roundToHundredth(value: number) {
  return Math.round(value * 100) / 100;
}

export function snapPlanValue(value: number, snapToGrid: boolean) {
  return snapToGrid ? roundToQuarter(value) : roundToHundredth(value);
}

export function nullableNumber(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ftToIn(value: number) {
  return Math.round(value * 48) / 4;
}

export function normaliseRotation(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

export function gridLines(max: number) {
  const lines: number[] = [];
  for (let line = 0; line <= max; line += 5) lines.push(line);
  return lines;
}

export function formatFt(value: number) {
  const rounded = Math.round(value * 4) / 4;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2).replace(/0$/, '')}'`;
}

export function formatNumberInput(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

export function nullableNumbersMatch(first: number | null | undefined, second: number | null | undefined) {
  if (first === null || first === undefined || second === null || second === undefined) return first === second;
  return Math.abs(first - second) < 0.01;
}

export function pointsMatch(first: PlanPoint[], second: PlanPoint[]) {
  if (first.length !== second.length) return false;
  return first.every((point, index) =>
    nullableNumbersMatch(point.x, second[index].x) &&
    nullableNumbersMatch(point.y, second[index].y)
  );
}

export function roundPlanPoint(point: PlanPoint): PlanPoint {
  return {
    x: roundToQuarter(point.x),
    y: roundToQuarter(point.y),
  };
}

export function pointBounds(points: PlanPoint[]) {
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

export function averagePoint(points: PlanPoint[]) {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function rectToPoints(rect: PlanRect): PlanPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.depth },
    { x: rect.x, y: rect.y + rect.depth },
  ];
}

export function newRoomRectForFloor(floorPlan: HomeFloorPlan, roomCount: number): PlanRect {
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

export function pointsToSvg(points: PlanPoint[], floorPlan: HomeFloorPlan) {
  return points
    .map(point => `${(point.x / floorPlan.widthFt) * 100},${(point.y / floorPlan.depthFt) * 100}`)
    .join(' ');
}

export function translatePointsWithinFloor(points: PlanPoint[], dx: number, dy: number, floorPlan: HomeFloorPlan) {
  if (points.length === 0) return points;
  const bounds = pointBounds(points);
  const clampedDx = clamp(dx, -bounds.minX, floorPlan.widthFt - bounds.maxX);
  const clampedDy = clamp(dy, -bounds.minY, floorPlan.depthFt - bounds.maxY);

  return points.map(point => roundPlanPoint({
    x: point.x + clampedDx,
    y: point.y + clampedDy,
  }));
}

export function translateEdgeWithinFloor(
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

export function edgeResizeCursor(startPoint: PlanPoint, endPoint: PlanPoint) {
  const orientation = edgeOrientation(startPoint, endPoint);
  if (orientation === 'vertical') return 'ew-resize';
  if (orientation === 'horizontal') return 'ns-resize';
  return 'move';
}

export function edgeOrientation(startPoint: PlanPoint, endPoint: PlanPoint) {
  const dx = Math.abs(endPoint.x - startPoint.x);
  const dy = Math.abs(endPoint.y - startPoint.y);
  if (dx > dy * 1.2) return 'horizontal';
  if (dy > dx * 1.2) return 'vertical';
  return 'diagonal';
}

export function makeRoomGeometryDraft(room: Room): RoomGeometryDraft {
  return {
    roomId: room.id,
    shapePoints: normaliseDraftPoints(room.shapePoints),
    labelXFt: room.labelXFt,
    labelYFt: room.labelYFt,
  };
}

export function normaliseDraftPoints(points: PlanPoint[] | null | undefined) {
  if (!Array.isArray(points)) return null;
  const nextPoints = points
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map(roundPlanPoint);
  return nextPoints.length >= 3 ? nextPoints : null;
}

export function roomEditorPoints(room: Room, draft: RoomGeometryDraft) {
  return draft.shapePoints && draft.shapePoints.length >= 3 ? draft.shapePoints : planPointsForRoom(room);
}

export function displayPointsForRoom(room: Room, draft: RoomGeometryDraft | null) {
  return draft?.roomId === room.id ? roomEditorPoints(room, draft) : planPointsForRoom(room);
}

export function displayLabelPointForRoom(room: Room, draft: RoomGeometryDraft | null) {
  if (draft?.roomId === room.id) {
    if (Number.isFinite(draft.labelXFt) && Number.isFinite(draft.labelYFt)) {
      return { x: draft.labelXFt as number, y: draft.labelYFt as number };
    }
    return averagePoint(displayPointsForRoom(room, draft));
  }

  return planLabelPointForRoom(room);
}

export function roomDraftHasChanges(room: Room, draft: RoomGeometryDraft) {
  const basePoints = normaliseDraftPoints(room.shapePoints) ?? planPointsForRoom(room);
  const draftPoints = normaliseDraftPoints(draft.shapePoints) ?? basePoints;
  return !pointsMatch(basePoints, draftPoints) ||
    !nullableNumbersMatch(room.labelXFt, draft.labelXFt) ||
    !nullableNumbersMatch(room.labelYFt, draft.labelYFt);
}

export function roomGeometryStatus(room: Room) {
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

export function roomOutlineStyle(room: Room, selected: boolean) {
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

export function clampItemPosition(x: number, y: number, widthFt: number, depthFt: number, floorPlan: HomeFloorPlan) {
  return {
    planXFt: roundToHundredth(clamp(x, 0, Math.max(0, floorPlan.widthFt - widthFt))),
    planYFt: roundToHundredth(clamp(y, 0, Math.max(0, floorPlan.depthFt - depthFt))),
  };
}

export function clampArchitecturalElementPosition(xFt: number, yFt: number, widthFt: number, depthFt: number, floorPlan: HomeFloorPlan) {
  return {
    xFt: roundToHundredth(clamp(xFt, 0, Math.max(0, floorPlan.widthFt - widthFt))),
    yFt: roundToHundredth(clamp(yFt, 0, Math.max(0, floorPlan.depthFt - depthFt))),
  };
}

export function itemPlacementForControls(item: RoomItem, room: Room | null, floorPlan: HomeFloorPlan, footprint: { widthFt: number; depthFt: number }) {
  const fallbackCenter = room ? averagePoint(planPointsForRoom(room)) : { x: floorPlan.widthFt / 2, y: floorPlan.depthFt / 2 };
  return clampItemPosition(
    item.planXFt ?? fallbackCenter.x - footprint.widthFt / 2,
    item.planYFt ?? fallbackCenter.y - footprint.depthFt / 2,
    footprint.widthFt,
    footprint.depthFt,
    floorPlan,
  );
}

export type FurnitureProfile = {
  kind: FurnitureType;
  label: string;
  background: string;
  border: string;
  borderRadius: number;
};

export function furnitureProfileForItem(item: RoomItem): FurnitureProfile {
  return furnitureProfileForType(normaliseFurnitureType(item.furnitureType, item.itemName), item);
}

export function furnitureProfileForType(type: FurnitureType, item: RoomItem): FurnitureProfile {
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

export function makeArchitecturalElementDraft(
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
      wallId: element.wallId ?? null,
      offsetAlongWallFt: element.offsetAlongWallFt ?? null,
    };
  }

  // Default to a floor-positioned type so the canvas's wall ID badges
  // stay hidden until the user explicitly picks a wall-attached type
  // (door / window / opening). 'Fixture' is the most neutral catch-all
  // and doesn't pre-commit the user to a specific category.
  const defaultType: ArchitecturalElementType = 'fixture';
  const dimensions = defaultArchitecturalElementDimensions(defaultType);
  const firstRoomCenter = floorRooms[0]?.anchorXFt != null && floorRooms[0]?.anchorYFt != null
    ? { x: floorRooms[0].anchorXFt, y: floorRooms[0].anchorYFt }
    : floorRooms[0] ? planLabelPointForRoom(floorRooms[0]) : { x: floorPlan.widthFt / 2, y: floorPlan.depthFt / 2 };
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
    wallId: null,
    offsetAlongWallFt: null,
  };
}

export function architecturalDraftToUpdate(draft: ArchitecturalElementDraft): ArchitecturalElementUpdate {
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
    wallId: draft.wallId,
    offsetAlongWallFt: draft.offsetAlongWallFt === null ? null : roundToHundredth(draft.offsetAlongWallFt),
  };
}

export function architecturalDraftHasChanges(element: ArchitecturalElement, draft: ArchitecturalElementDraft) {
  return element.roomId !== draft.roomId ||
    element.elementType !== draft.elementType ||
    element.label !== draft.label ||
    !nullableNumbersMatch(element.xFt, draft.xFt) ||
    !nullableNumbersMatch(element.yFt, draft.yFt) ||
    !nullableNumbersMatch(element.widthFt, draft.widthFt) ||
    !nullableNumbersMatch(element.depthFt, draft.depthFt) ||
    !nullableNumbersMatch(element.rotationDeg, normaliseRotation(draft.rotationDeg)) ||
    (element.notes ?? '') !== draft.notes.trim() ||
    (element.wallId ?? null) !== (draft.wallId ?? null) ||
    !nullableNumbersMatch(element.offsetAlongWallFt, draft.offsetAlongWallFt);
}

/**
 * For wall-attached elements, compute the effective x/y/rotation from
 * the wall's geometry + the offset along the wall. Returns the element
 * with overridden xFt/yFt/rotationDeg if wallId is set and the wall is
 * available; otherwise returns the element unchanged.
 */
export function resolveElementGeometry(element: ArchitecturalElement, walls: { id: number; startXFt: number; startYFt: number; endXFt: number; endYFt: number; thicknessIn: number }[]): ArchitecturalElement {
  if (element.wallId === null || element.offsetAlongWallFt === null) return element;
  const wall = walls.find(w => w.id === element.wallId);
  if (!wall) return element;
  const dx = wall.endXFt - wall.startXFt;
  const dy = wall.endYFt - wall.startYFt;
  const length = Math.hypot(dx, dy);
  if (length < 0.01) return element;
  const t = clamp(element.offsetAlongWallFt, 0, length) / length;
  // Position the element's TOP-LEFT corner so its center lands on the wall.
  // Element width is along the wall, depth is perpendicular (matches wall thickness).
  const angleRad = Math.atan2(dy, dx);
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const wallThicknessFt = (wall.thicknessIn ?? 5) / 12;
  const widthFt = element.widthFt;
  const depthFt = Math.max(wallThicknessFt, 0.2);
  // Effective center on the wall
  const centerX = wall.startXFt + t * dx;
  const centerY = wall.startYFt + t * dy;
  // Element box rotates around its center. Compute top-left from center.
  const xFt = centerX - widthFt / 2 * cosA + depthFt / 2 * sinA;
  const yFt = centerY - widthFt / 2 * sinA - depthFt / 2 * cosA;
  const rotationDeg = (angleRad * 180 / Math.PI + 360) % 360;
  return {
    ...element,
    xFt: roundToHundredth(xFt),
    yFt: roundToHundredth(yFt),
    depthFt: roundToHundredth(depthFt),
    rotationDeg: Math.round(rotationDeg * 100) / 100,
  };
}

export function defaultArchitecturalElementDimensions(type: ArchitecturalElementType) {
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

export function labelForArchitecturalElementType(type: ArchitecturalElementType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function architecturalElementStyle(type: ArchitecturalElementType) {
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

export function toBlueprintImageSrc(value?: string | null) {
  const source = value?.trim();
  if (!source) return null;

  const driveId = getGoogleDriveFileId(source);
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w4000`;

  if (source.startsWith('/') || /^https?:\/\//i.test(source)) return source;
  return null;
}

export function getGoogleDriveFileId(value: string) {
  const fileMatch = value.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  try {
    const parsed = new URL(value);
    return parsed.searchParams.get('id');
  } catch {
    return null;
  }
}

export { planRectForRoom };
