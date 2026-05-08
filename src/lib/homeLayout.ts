import { HomeFloorPlan, Room, RoomItem } from '@/lib/types';

export type PlanRect = {
  x: number;
  y: number;
  width: number;
  depth: number;
};

export const DEFAULT_HOME_FLOOR_PLANS: HomeFloorPlan[] = [
  {
    id: -1,
    name: 'Main Floor',
    label: 'First Floor',
    level: 1,
    widthFt: 40,
    depthFt: 40,
    ceilingHeightFt: null,
    blueprintDocumentId: null,
    blueprintPage: 1,
    blueprintImagePath: null,
    notes: 'Initial calibration from blueprint sheet A1, scale 1/8 inch = 1 foot.',
    sortIndex: 10,
  },
  {
    id: -2,
    name: 'Second Floor',
    label: 'Second Floor',
    level: 2,
    widthFt: 40,
    depthFt: 40,
    ceilingHeightFt: null,
    blueprintDocumentId: null,
    blueprintPage: 1,
    blueprintImagePath: null,
    notes: 'Initial calibration from blueprint sheet A1, scale 1/8 inch = 1 foot.',
    sortIndex: 20,
  },
  {
    id: -3,
    name: 'Third Floor',
    label: 'Third Floor',
    level: 3,
    widthFt: 40,
    depthFt: 22,
    ceilingHeightFt: null,
    blueprintDocumentId: null,
    blueprintPage: 2,
    blueprintImagePath: null,
    notes: 'Initial calibration from blueprint sheet A2, scale 1/8 inch = 1 foot.',
    sortIndex: 30,
  },
  {
    id: -4,
    name: 'Basement',
    label: 'Basement',
    level: 0,
    widthFt: 40,
    depthFt: 40,
    ceilingHeightFt: null,
    blueprintDocumentId: null,
    blueprintPage: null,
    blueprintImagePath: null,
    notes: 'Needs manual measurement; no basement floor-plan sheet was found in the provided blueprint set.',
    sortIndex: 0,
  },
  {
    id: -5,
    name: 'Exterior',
    label: 'Exterior',
    level: -1,
    widthFt: 80,
    depthFt: 80,
    ceilingHeightFt: null,
    blueprintDocumentId: null,
    blueprintPage: 6,
    blueprintImagePath: null,
    notes: 'Exterior planning area for garage, porch, and yard items.',
    sortIndex: 40,
  },
];

const DEFAULT_ROOM_RECTS: Record<string, PlanRect> = {
  'Basement / Yoga Room': { x: 2, y: 4, width: 36, depth: 28 },
  'Living Room': { x: 5, y: 3, width: 16, depth: 13 },
  Foyer: { x: 2, y: 3, width: 8, depth: 8 },
  'Dining Room': { x: 10, y: 16, width: 12, depth: 10 },
  'Study / Lounge': { x: 22, y: 16, width: 8, depth: 10 },
  Kitchen: { x: 18, y: 25, width: 14, depth: 11 },
  'Mud Room': { x: 8, y: 29, width: 9, depth: 8 },
  'Half Bath': { x: 8, y: 20, width: 6, depth: 6 },
  Office: { x: 3, y: 6, width: 9, depth: 10 },
  'Master Bedroom': { x: 17, y: 20, width: 18, depth: 13 },
  'Master Bathroom': { x: 28, y: 28, width: 8, depth: 8 },
  'Second Bathroom': { x: 24, y: 5, width: 9, depth: 8 },
  'Second Bedroom': { x: 16, y: 4, width: 16, depth: 12 },
  'Third Bedroom': { x: 3, y: 4, width: 12, depth: 13 },
  'Third Bathroom': { x: 16, y: 6, width: 7, depth: 8 },
  'Fourth Bedroom': { x: 25, y: 4, width: 12, depth: 13 },
  Garage: { x: 4, y: 6, width: 24, depth: 24 },
  'Outdoor / Yard': { x: 30, y: 6, width: 40, depth: 42 },
};

export function fallbackFloorPlansForRooms(rooms: Room[]) {
  const known = new Set(DEFAULT_HOME_FLOOR_PLANS.map(floor => floor.name));
  const extraFloors = [...new Set(rooms.map(room => room.floor).filter(Boolean) as string[])]
    .filter(floor => !known.has(floor));

  return [
    ...DEFAULT_HOME_FLOOR_PLANS,
    ...extraFloors.map((floor, index) => ({
      id: -100 - index,
      name: floor,
      label: floor,
      level: 100 + index,
      widthFt: 40,
      depthFt: 32,
      ceilingHeightFt: null,
      blueprintDocumentId: null,
      blueprintPage: null,
      blueprintImagePath: null,
      notes: null,
      sortIndex: 100 + index,
    })),
  ].sort((a, b) => a.sortIndex - b.sortIndex || a.level - b.level);
}

export function planRectForRoom(room: Room): PlanRect {
  if (
    isFiniteNumber(room.planXFt) &&
    isFiniteNumber(room.planYFt) &&
    isFiniteNumber(room.planWidthFt) &&
    isFiniteNumber(room.planDepthFt) &&
    room.planWidthFt > 0 &&
    room.planDepthFt > 0
  ) {
    return {
      x: room.planXFt,
      y: room.planYFt,
      width: room.planWidthFt,
      depth: room.planDepthFt,
    };
  }

  return DEFAULT_ROOM_RECTS[room.name] ?? { x: 4, y: 4, width: 14, depth: 10 };
}

export function itemFootprint(item: RoomItem) {
  const parsed = parseDimensions(item.dimensions);
  const widthIn = item.widthIn ?? parsed?.widthIn ?? estimateWidthIn(item);
  const depthIn = item.depthIn ?? parsed?.depthIn ?? estimateDepthIn(item);

  return {
    widthFt: Math.max(widthIn / 12, 1.5),
    depthFt: Math.max(depthIn / 12, 1.25),
  };
}

export function floorForRoom(room: Room, floorPlans: HomeFloorPlan[]) {
  if (room.floorPlanId) {
    const byId = floorPlans.find(floor => floor.id === room.floorPlanId);
    if (byId) return byId;
  }

  return floorPlans.find(floor => floor.name === (room.floor || '')) ??
    floorPlans.find(floor => floor.name === 'Main Floor') ??
    floorPlans[0];
}

function parseDimensions(dimensions?: string | null) {
  if (!dimensions) return null;
  const parts = dimensions.match(/(\d+(?:\.\d+)?)/g)?.map(Number) ?? [];
  if (parts.length < 2) return null;

  const lower = dimensions.toLowerCase();
  const multiplier = lower.includes('ft') || lower.includes("'") ? 12 : 1;
  return {
    widthIn: parts[0] * multiplier,
    depthIn: parts[1] * multiplier,
  };
}

function estimateWidthIn(item: RoomItem) {
  const label = item.itemName.toLowerCase();
  if (label.includes('sectional')) return 120;
  if (label.includes('sofa') || label.includes('couch')) return 84;
  if (label.includes('king')) return 80;
  if (label.includes('queen')) return 60;
  if (label.includes('crib')) return 54;
  if (label.includes('bed')) return 76;
  if (label.includes('dining') || label.includes('table')) return 72;
  if (label.includes('desk') || label.includes('dresser')) return 60;
  if (label.includes('shelves') || label.includes('bookcase')) return 48;
  if (label.includes('peloton') || label.includes('bike')) return 48;
  return 48;
}

function estimateDepthIn(item: RoomItem) {
  const label = item.itemName.toLowerCase();
  if (label.includes('sectional')) return 84;
  if (label.includes('sofa') || label.includes('couch')) return 38;
  if (label.includes('king') || label.includes('queen')) return 80;
  if (label.includes('crib')) return 30;
  if (label.includes('bed')) return 40;
  if (label.includes('dining') || label.includes('table')) return 42;
  if (label.includes('desk') || label.includes('dresser')) return 28;
  if (label.includes('shelves') || label.includes('bookcase')) return 16;
  if (label.includes('peloton') || label.includes('bike')) return 24;
  return 30;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
