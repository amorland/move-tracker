import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ArchitecturalElement,
  ArchitecturalElementSource,
  ArchitecturalElementType,
  Belonging,
  BelongingAction,
  HomeFloorPlan,
  PlanPoint,
  Room,
  RoomGeometrySource,
  RoomItem,
} from '@/lib/types';

export type LayoutSyncStats = {
  created: number;
  updated: number;
  removed: number;
  deduped: number;
  skipped: number;
  unmatched: number;
  errors: string[];
};

export type RoomSeedStats = {
  updated: number;
  skipped: number;
  missing: number;
  custom: number;
  recommended: number;
  errors: string[];
};

type RoomGeometrySeedOptions = {
  overwrite?: boolean;
  roomId?: number | null;
  floorPlanId?: number | null;
};

export type ArchitecturalSeedStats = {
  created: number;
  updated: number;
  removed: number;
  skipped: number;
  missing: number;
  errors: string[];
};

type LayoutSyncOptions = {
  reflowExisting?: boolean;
};

type LayoutContext = {
  rooms: Room[];
  floorPlans: HomeFloorPlan[];
  roomItems: RoomItem[];
  architecturalElements: ArchitecturalElement[];
};

type PlacementPlan = {
  room: Room | null;
  floorPlan: HomeFloorPlan | null;
  planXFt: number | null;
  planYFt: number | null;
  widthIn: number;
  depthIn: number;
};

type RoomGeometrySeed = {
  floorName: string;
  shapePoints: PlanPoint[];
  label: PlanPoint;
};

type ArchitecturalElementSeed = {
  sourceKey: string;
  floorName: string;
  roomName?: string;
  elementType: ArchitecturalElementType;
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  depthFt: number;
  rotationDeg?: number;
  sortIndex: number;
};

const EMPTY_STATS: LayoutSyncStats = {
  created: 0,
  updated: 0,
  removed: 0,
  deduped: 0,
  skipped: 0,
  unmatched: 0,
  errors: [],
};

const SOURCE_ROOM_DESTINATIONS: Record<string, string[]> = {
  kitchen: ['Kitchen'],
  'living room': ['Living Room'],
  'family room': ['Study / Lounge', 'Living Room'],
  'dining room': ['Dining Room'],
  foyer: ['Foyer'],
  'front hall': ['Foyer'],
  office: ['Office', 'Study / Lounge'],
  study: ['Study / Lounge', 'Office'],
  'study lounge': ['Study / Lounge', 'Office'],
  bathroom: ['Second Bathroom', 'Master Bathroom', 'Half Bath'],
  bath: ['Second Bathroom', 'Master Bathroom', 'Half Bath'],
  'half bath': ['Half Bath'],
  garage: ['Garage'],
  storage: ['Garage', 'Mud Room'],
  mudroom: ['Mud Room'],
  'mud room': ['Mud Room'],
  'master bedroom': ['Master Bedroom'],
  master: ['Master Bedroom'],
  'primary bedroom': ['Master Bedroom'],
  bedroom: ['Second Bedroom', 'Third Bedroom', 'Fourth Bedroom', 'Master Bedroom'],
  'bedroom 1': ['Master Bedroom'],
  'bedroom 2': ['Second Bedroom'],
  'bedroom 3': ['Third Bedroom'],
  'bedroom 4': ['Fourth Bedroom'],
  nursery: ['Second Bedroom', 'Third Bedroom'],
  basement: ['Basement / Yoga Room'],
  yoga: ['Basement / Yoga Room'],
  patio: ['Outdoor / Yard'],
  outdoor: ['Outdoor / Yard'],
  'outdoor patio': ['Outdoor / Yard'],
  yard: ['Outdoor / Yard'],
  other: [],
};

export const SUGGESTED_ROOM_GEOMETRIES: Record<string, RoomGeometrySeed> = {
  'Living Room': {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 12, y: 34 },
      { x: 35, y: 34 },
      { x: 35, y: 46 },
      { x: 12, y: 46 },
    ],
    label: { x: 23.5, y: 40 },
  },
  Foyer: {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 7, y: 36 },
      { x: 12, y: 36 },
      { x: 12, y: 46 },
      { x: 7, y: 46 },
    ],
    label: { x: 9.5, y: 41 },
  },
  'Dining Room': {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 12, y: 22 },
      { x: 35, y: 22 },
      { x: 35, y: 34 },
      { x: 12, y: 34 },
    ],
    label: { x: 23.5, y: 28 },
  },
  Kitchen: {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 19, y: 7 },
      { x: 34, y: 7 },
      { x: 34, y: 21 },
      { x: 19, y: 21 },
    ],
    label: { x: 26.5, y: 14 },
  },
  'Mud Room': {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 7, y: 7 },
      { x: 19, y: 7 },
      { x: 19, y: 18 },
      { x: 7, y: 18 },
    ],
    label: { x: 13, y: 12.5 },
  },
  'Half Bath': {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 7, y: 18 },
      { x: 16, y: 18 },
      { x: 16, y: 23 },
      { x: 7, y: 23 },
    ],
    label: { x: 11.5, y: 20.5 },
  },
  'Study / Lounge': {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 34, y: 9 },
      { x: 48, y: 9 },
      { x: 48, y: 22 },
      { x: 34, y: 22 },
    ],
    label: { x: 41, y: 15.5 },
  },
  Office: {
    floorName: 'Main Floor',
    shapePoints: [
      { x: 34, y: 9 },
      { x: 48, y: 9 },
      { x: 48, y: 22 },
      { x: 34, y: 22 },
    ],
    label: { x: 41, y: 15.5 },
  },
  'Master Bedroom': {
    floorName: 'Second Floor',
    shapePoints: [
      { x: 8, y: 4 },
      { x: 31, y: 4 },
      { x: 31, y: 21 },
      { x: 8, y: 21 },
    ],
    label: { x: 19.5, y: 12.5 },
  },
  'Master Bathroom': {
    floorName: 'Second Floor',
    shapePoints: [
      { x: 32, y: 7 },
      { x: 48, y: 7 },
      { x: 48, y: 21 },
      { x: 32, y: 21 },
    ],
    label: { x: 40, y: 14 },
  },
  'Second Bathroom': {
    floorName: 'Second Floor',
    shapePoints: [
      { x: 24, y: 24 },
      { x: 37, y: 24 },
      { x: 37, y: 31 },
      { x: 24, y: 31 },
    ],
    label: { x: 30.5, y: 27.5 },
  },
  'Second Bedroom': {
    floorName: 'Second Floor',
    shapePoints: [
      { x: 19, y: 32 },
      { x: 37, y: 32 },
      { x: 37, y: 46 },
      { x: 19, y: 46 },
    ],
    label: { x: 28, y: 39 },
  },
  'Third Bathroom': {
    floorName: 'Third Floor',
    shapePoints: [
      { x: 31, y: 5 },
      { x: 43, y: 5 },
      { x: 43, y: 17 },
      { x: 31, y: 17 },
    ],
    label: { x: 37, y: 11 },
  },
  'Third Bedroom': {
    floorName: 'Third Floor',
    shapePoints: [
      { x: 16, y: 5 },
      { x: 31, y: 5 },
      { x: 31, y: 20 },
      { x: 16, y: 20 },
    ],
    label: { x: 23.5, y: 12.5 },
  },
  'Fourth Bedroom': {
    floorName: 'Third Floor',
    shapePoints: [
      { x: 16, y: 30 },
      { x: 31, y: 30 },
      { x: 31, y: 46 },
      { x: 16, y: 46 },
    ],
    label: { x: 23.5, y: 38 },
  },
  Garage: {
    floorName: 'Exterior',
    shapePoints: [
      { x: 5, y: 8 },
      { x: 29, y: 8 },
      { x: 29, y: 32 },
      { x: 5, y: 32 },
    ],
    label: { x: 17, y: 20 },
  },
  'Outdoor / Yard': {
    floorName: 'Exterior',
    shapePoints: [
      { x: 32, y: 8 },
      { x: 74, y: 8 },
      { x: 74, y: 54 },
      { x: 32, y: 54 },
    ],
    label: { x: 53, y: 31 },
  },
  'Basement / Yoga Room': {
    floorName: 'Basement',
    shapePoints: [
      { x: 4, y: 6 },
      { x: 40, y: 6 },
      { x: 40, y: 34 },
      { x: 4, y: 34 },
    ],
    label: { x: 22, y: 20 },
  },
};

const RECOMMENDED_ARCHITECTURAL_ELEMENTS: ArchitecturalElementSeed[] = [
  { sourceKey: 'main-front-entry-door', floorName: 'Main Floor', roomName: 'Foyer', elementType: 'door', label: 'Front Entry Door', xFt: 8.25, yFt: 45.5, widthFt: 3.25, depthFt: 0.25, rotationDeg: 0, sortIndex: 10 },
  { sourceKey: 'main-foyer-stairs', floorName: 'Main Floor', roomName: 'Foyer', elementType: 'stairs', label: 'Main Stair', xFt: 7.25, yFt: 24, widthFt: 6.25, depthFt: 10, rotationDeg: 0, sortIndex: 20 },
  { sourceKey: 'main-living-front-windows', floorName: 'Main Floor', roomName: 'Living Room', elementType: 'window', label: 'Living Room Front Windows', xFt: 16, yFt: 45.7, widthFt: 12, depthFt: 0.2, rotationDeg: 0, sortIndex: 30 },
  { sourceKey: 'main-living-side-window', floorName: 'Main Floor', roomName: 'Living Room', elementType: 'window', label: 'Living Room Side Window', xFt: 34.75, yFt: 37, widthFt: 0.2, depthFt: 5, rotationDeg: 0, sortIndex: 40 },
  { sourceKey: 'main-dining-window', floorName: 'Main Floor', roomName: 'Dining Room', elementType: 'window', label: 'Dining Room Window', xFt: 34.75, yFt: 25.5, widthFt: 0.2, depthFt: 5.5, rotationDeg: 0, sortIndex: 50 },
  { sourceKey: 'main-kitchen-counter', floorName: 'Main Floor', roomName: 'Kitchen', elementType: 'counter', label: 'Kitchen Counter Run', xFt: 20, yFt: 7.5, widthFt: 13, depthFt: 2.25, rotationDeg: 0, sortIndex: 60 },
  { sourceKey: 'main-kitchen-sink', floorName: 'Main Floor', roomName: 'Kitchen', elementType: 'sink', label: 'Kitchen Sink', xFt: 26, yFt: 8.25, widthFt: 2.5, depthFt: 1.5, rotationDeg: 0, sortIndex: 70 },
  { sourceKey: 'main-kitchen-range', floorName: 'Main Floor', roomName: 'Kitchen', elementType: 'appliance', label: 'Range', xFt: 31, yFt: 12, widthFt: 2.5, depthFt: 2.5, rotationDeg: 0, sortIndex: 80 },
  { sourceKey: 'main-kitchen-fridge', floorName: 'Main Floor', roomName: 'Kitchen', elementType: 'appliance', label: 'Refrigerator', xFt: 19.5, yFt: 17.5, widthFt: 3, depthFt: 2.5, rotationDeg: 0, sortIndex: 90 },
  { sourceKey: 'main-mudroom-door', floorName: 'Main Floor', roomName: 'Mud Room', elementType: 'door', label: 'Mud Room Exterior Door', xFt: 7.5, yFt: 8.5, widthFt: 0.25, depthFt: 3, rotationDeg: 0, sortIndex: 100 },
  { sourceKey: 'main-half-bath-toilet', floorName: 'Main Floor', roomName: 'Half Bath', elementType: 'toilet', label: 'Half Bath Toilet', xFt: 8.25, yFt: 19, widthFt: 2.25, depthFt: 2.5, rotationDeg: 0, sortIndex: 110 },
  { sourceKey: 'main-half-bath-sink', floorName: 'Main Floor', roomName: 'Half Bath', elementType: 'sink', label: 'Half Bath Sink', xFt: 12.5, yFt: 18.5, widthFt: 2.25, depthFt: 1.5, rotationDeg: 0, sortIndex: 120 },
  { sourceKey: 'second-stair-opening', floorName: 'Second Floor', elementType: 'stairs', label: 'Second Floor Stair', xFt: 7.5, yFt: 22, widthFt: 6.5, depthFt: 9.5, rotationDeg: 0, sortIndex: 200 },
  { sourceKey: 'second-master-bed-windows', floorName: 'Second Floor', roomName: 'Master Bedroom', elementType: 'window', label: 'Primary Bedroom Rear Windows', xFt: 12, yFt: 4.1, widthFt: 12, depthFt: 0.2, rotationDeg: 0, sortIndex: 210 },
  { sourceKey: 'second-master-bath-shower', floorName: 'Second Floor', roomName: 'Master Bathroom', elementType: 'shower', label: 'Primary Shower', xFt: 33, yFt: 8, widthFt: 4, depthFt: 4, rotationDeg: 0, sortIndex: 220 },
  { sourceKey: 'second-master-bath-tub', floorName: 'Second Floor', roomName: 'Master Bathroom', elementType: 'tub', label: 'Primary Tub', xFt: 42, yFt: 8, widthFt: 5, depthFt: 2.5, rotationDeg: 0, sortIndex: 230 },
  { sourceKey: 'second-master-bath-vanity', floorName: 'Second Floor', roomName: 'Master Bathroom', elementType: 'sink', label: 'Primary Vanity', xFt: 40, yFt: 17, widthFt: 6, depthFt: 2, rotationDeg: 0, sortIndex: 240 },
  { sourceKey: 'second-master-bath-toilet', floorName: 'Second Floor', roomName: 'Master Bathroom', elementType: 'toilet', label: 'Primary Toilet', xFt: 33, yFt: 16.5, widthFt: 2.5, depthFt: 2.5, rotationDeg: 0, sortIndex: 250 },
  { sourceKey: 'second-hall-bath-tub', floorName: 'Second Floor', roomName: 'Second Bathroom', elementType: 'tub', label: 'Hall Bath Tub', xFt: 25, yFt: 24.5, widthFt: 5, depthFt: 2.5, rotationDeg: 0, sortIndex: 260 },
  { sourceKey: 'second-hall-bath-vanity', floorName: 'Second Floor', roomName: 'Second Bathroom', elementType: 'sink', label: 'Hall Bath Vanity', xFt: 32.5, yFt: 24.5, widthFt: 3, depthFt: 2, rotationDeg: 0, sortIndex: 270 },
  { sourceKey: 'second-hall-bath-toilet', floorName: 'Second Floor', roomName: 'Second Bathroom', elementType: 'toilet', label: 'Hall Bath Toilet', xFt: 33, yFt: 28, widthFt: 2.5, depthFt: 2.5, rotationDeg: 0, sortIndex: 280 },
  { sourceKey: 'second-bedroom-window', floorName: 'Second Floor', roomName: 'Second Bedroom', elementType: 'window', label: 'Second Bedroom Window', xFt: 24, yFt: 45.7, widthFt: 7, depthFt: 0.2, rotationDeg: 0, sortIndex: 290 },
  { sourceKey: 'third-stair-opening', floorName: 'Third Floor', elementType: 'stairs', label: 'Third Floor Stair', xFt: 7.5, yFt: 22, widthFt: 6.5, depthFt: 9.5, rotationDeg: 0, sortIndex: 300 },
  { sourceKey: 'third-bedroom-window', floorName: 'Third Floor', roomName: 'Third Bedroom', elementType: 'window', label: 'Third Bedroom Window', xFt: 18, yFt: 5.1, widthFt: 8, depthFt: 0.2, rotationDeg: 0, sortIndex: 310 },
  { sourceKey: 'third-fourth-bedroom-window', floorName: 'Third Floor', roomName: 'Fourth Bedroom', elementType: 'window', label: 'Fourth Bedroom Window', xFt: 18, yFt: 45.7, widthFt: 8, depthFt: 0.2, rotationDeg: 0, sortIndex: 320 },
  { sourceKey: 'third-bath-vanity', floorName: 'Third Floor', roomName: 'Third Bathroom', elementType: 'sink', label: 'Third Floor Bath Vanity', xFt: 34, yFt: 5.75, widthFt: 4, depthFt: 2, rotationDeg: 0, sortIndex: 330 },
  { sourceKey: 'third-bath-toilet', floorName: 'Third Floor', roomName: 'Third Bathroom', elementType: 'toilet', label: 'Third Floor Bath Toilet', xFt: 40, yFt: 7, widthFt: 2.5, depthFt: 2.5, rotationDeg: 0, sortIndex: 340 },
  { sourceKey: 'third-attic-access', floorName: 'Third Floor', elementType: 'opening', label: 'Attic Access', xFt: 35, yFt: 24, widthFt: 4, depthFt: 3, rotationDeg: 0, sortIndex: 350 },
];

export async function syncBelongingLayoutItem(
  supabase: SupabaseClient,
  belonging: Belonging,
): Promise<LayoutSyncStats> {
  const context = await loadLayoutContext(supabase);
  if (context.errors.length > 0) return { ...EMPTY_STATS, errors: context.errors };

  const stats = freshStats();
  await syncOneBelonging(supabase, belonging, context.value, makePlacementIndex(context.value.roomItems), stats);
  return stats;
}

export async function removeBelongingLayoutItems(
  supabase: SupabaseClient,
  belongingId: number,
): Promise<LayoutSyncStats> {
  const stats = freshStats();
  const { error } = await supabase
    .from('room_items')
    .delete()
    .eq('belonging_id', belongingId);

  if (error) {
    stats.errors.push(error.message);
    return stats;
  }

  stats.removed += 1;
  return stats;
}

export async function syncBringItemsToLayout(
  supabase: SupabaseClient,
  options: LayoutSyncOptions = {},
): Promise<LayoutSyncStats> {
  const stats = freshStats();
  const belongingsResult = await supabase
    .from('belongings')
    .select('*')
    .order('room', { ascending: true });

  if (belongingsResult.error) {
    stats.errors.push(belongingsResult.error.message);
    return stats;
  }

  const context = await loadLayoutContext(supabase);
  if (context.errors.length > 0) {
    stats.errors.push(...context.errors);
    return stats;
  }

  const belongings = (belongingsResult.data ?? []).map(row => normaliseBelonging(row as Record<string, unknown>));
  const bringBelongingIds = new Set(
    belongings
      .filter(belonging => belonging.action === 'Bring')
      .map(belonging => belonging.id),
  );

  const staleItems = context.value.roomItems.filter(item =>
    item.itemSource === 'existing_belonging' &&
    item.belongingId !== null &&
    !bringBelongingIds.has(item.belongingId)
  );

  if (staleItems.length > 0) {
    const { error } = await supabase
      .from('room_items')
      .delete()
      .in('id', staleItems.map(item => item.id));

    if (error) {
      stats.errors.push(error.message);
      return stats;
    }
    stats.removed += staleItems.length;
  }

  const placementIndexSourceItems = context.value.roomItems
    .filter(item => !staleItems.some(stale => stale.id === item.id))
    .filter(item => !options.reflowExisting || item.itemSource !== 'existing_belonging');
  const placementIndexByRoom = makePlacementIndex(placementIndexSourceItems);
  for (const belonging of belongings) {
    if (belonging.action !== 'Bring') {
      stats.skipped += 1;
      continue;
    }
    await syncOneBelonging(supabase, belonging, context.value, placementIndexByRoom, stats, options);
  }

  return stats;
}

export async function applySuggestedRoomGeometries(
  supabase: SupabaseClient,
  options: RoomGeometrySeedOptions = {},
): Promise<RoomSeedStats> {
  const overwrite = Boolean(options.overwrite);
  const stats: RoomSeedStats = { updated: 0, skipped: 0, missing: 0, custom: 0, recommended: 0, errors: [] };
  const context = await loadLayoutContext(supabase);
  if (context.errors.length > 0) return { ...stats, errors: context.errors };

  const targetFloor = options.floorPlanId
    ? context.value.floorPlans.find(floor => floor.id === options.floorPlanId) ?? null
    : null;
  const candidateRooms = options.roomId
    ? context.value.rooms.filter(room => room.id === options.roomId)
    : context.value.rooms.filter(room => {
      if (!targetFloor) return true;
      const roomFloor = resolveFloorPlan(room, context.value.floorPlans);
      return roomFloor?.id === targetFloor.id;
    });
  const roomsToSeed = candidateRooms.filter(room => suggestedSeedForRoom(room));

  if (roomsToSeed.length === 0) {
    stats.missing += 1;
    return stats;
  }

  for (const room of roomsToSeed) {
    const seed = suggestedSeedForRoom(room);
    if (!room) {
      stats.missing += 1;
      continue;
    }
    if (!seed) {
      stats.missing += 1;
      continue;
    }

    if (hasCustomGeometry(room) && !overwrite) {
      stats.custom += 1;
      stats.skipped += 1;
      continue;
    }

    if (room.geometrySource === 'recommended' && !overwrite) {
      stats.recommended += 1;
      stats.skipped += 1;
      continue;
    }

    const floorPlan = context.value.floorPlans.find(floor => floor.name === seed.floorName) ?? null;
    const bounds = boundsForPoints(seed.shapePoints);
    const { error } = await supabase
      .from('rooms')
      .update({
        floor: seed.floorName,
        floor_plan_id: floorPlan?.id ?? room.floorPlanId,
        plan_x_ft: bounds.x,
        plan_y_ft: bounds.y,
        plan_width_ft: bounds.width,
        plan_depth_ft: bounds.depth,
        label_x_ft: seed.label.x,
        label_y_ft: seed.label.y,
        shape_points: seed.shapePoints,
        geometry_source: 'recommended',
      })
      .eq('id', room.id);

    if (error && isMissingGeometrySourceColumnError(error)) {
      const retry = await supabase
        .from('rooms')
        .update(stripRoomGeometrySource({
          floor: seed.floorName,
          floor_plan_id: floorPlan?.id ?? room.floorPlanId,
          plan_x_ft: bounds.x,
          plan_y_ft: bounds.y,
          plan_width_ft: bounds.width,
          plan_depth_ft: bounds.depth,
          label_x_ft: seed.label.x,
          label_y_ft: seed.label.y,
          shape_points: seed.shapePoints,
          geometry_source: 'recommended',
        }))
        .eq('id', room.id);
      if (retry.error) {
        stats.errors.push(retry.error.message);
        continue;
      }
    } else if (error) {
      stats.errors.push(error.message);
      continue;
    }

    stats.recommended += 1;
    stats.updated += 1;
  }

  return stats;
}

export async function syncRecommendedArchitecturalElements(
  supabase: SupabaseClient,
  options: { floorPlanId?: number | null; resetFloor?: boolean } = {},
): Promise<ArchitecturalSeedStats> {
  const stats: ArchitecturalSeedStats = { created: 0, updated: 0, removed: 0, skipped: 0, missing: 0, errors: [] };
  const context = await loadLayoutContext(supabase);
  if (context.errors.length > 0) return { ...stats, errors: context.errors };

  const targetFloor = options.floorPlanId
    ? context.value.floorPlans.find(floor => floor.id === options.floorPlanId) ?? null
    : null;
  const seeds = RECOMMENDED_ARCHITECTURAL_ELEMENTS.filter(seed => !targetFloor || seed.floorName === targetFloor.name);

  if (seeds.length === 0) {
    stats.missing += 1;
    return stats;
  }

  if (options.resetFloor && targetFloor) {
    const recommendedIds = context.value.architecturalElements
      .filter(element => element.floorPlanId === targetFloor.id && element.source === 'recommended')
      .map(element => element.id);

    if (recommendedIds.length > 0) {
      const { error } = await supabase
        .from('architectural_elements')
        .delete()
        .in('id', recommendedIds);

      if (error) {
        stats.errors.push(error.message);
        return stats;
      }
      stats.removed += recommendedIds.length;
      context.value.architecturalElements = context.value.architecturalElements.filter(element => !recommendedIds.includes(element.id));
    }
  }

  for (const seed of seeds) {
    const floorPlan = context.value.floorPlans.find(floor => floor.name === seed.floorName) ?? null;
    if (!floorPlan) {
      stats.missing += 1;
      continue;
    }
    const room = seed.roomName
      ? context.value.rooms.find(entry => normaliseName(entry.name) === normaliseName(seed.roomName ?? '') && resolveFloorPlan(entry, context.value.floorPlans)?.id === floorPlan.id) ?? null
      : null;
    const existing = context.value.architecturalElements.find(element => element.sourceKey === seed.sourceKey) ?? null;
    const payload = {
      floor_plan_id: floorPlan.id,
      room_id: room?.id ?? null,
      element_type: seed.elementType,
      label: seed.label,
      x_ft: seed.xFt,
      y_ft: seed.yFt,
      width_ft: seed.widthFt,
      depth_ft: seed.depthFt,
      rotation_deg: seed.rotationDeg ?? 0,
      source: 'recommended',
      source_key: seed.sourceKey,
      notes: 'Recommended from the current blueprint interpretation. Adjust as needed.',
      sort_index: seed.sortIndex,
    };

    if (existing) {
      if (!options.resetFloor) {
        stats.skipped += 1;
        continue;
      }
      const { error } = await supabase
        .from('architectural_elements')
        .update(payload)
        .eq('id', existing.id);

      if (error) {
        stats.errors.push(error.message);
        continue;
      }
      stats.updated += 1;
      continue;
    }

    const { error } = await supabase
      .from('architectural_elements')
      .insert([payload]);

    if (error) {
      stats.errors.push(error.message);
      continue;
    }

    stats.created += 1;
  }

  return stats;
}

async function syncOneBelonging(
  supabase: SupabaseClient,
  belonging: Belonging,
  context: LayoutContext,
  placementIndexByRoom: Map<number, number>,
  stats: LayoutSyncStats,
  options: LayoutSyncOptions = {},
) {
  if (belonging.action !== 'Bring') {
    const removal = await removeBelongingLayoutItems(supabase, belonging.id);
    mergeStats(stats, removal);
    return;
  }

  const existingResult = await supabase
    .from('room_items')
    .select('*')
    .eq('belonging_id', belonging.id);

  if (existingResult.error) {
    stats.errors.push(existingResult.error.message);
    return;
  }

  const existingItems = (existingResult.data ?? []).map(row => normaliseRoomItem(row as Record<string, unknown>));
  const placement = makePlacementPlan(belonging, context, placementIndexByRoom);
  if (!placement.room) stats.unmatched += 1;

  if (existingItems.length > 1) {
    const duplicateIds = existingItems.slice(1).map(item => item.id);
    const { error } = await supabase.from('room_items').delete().in('id', duplicateIds);
    if (error) {
      stats.errors.push(error.message);
      return;
    }
    stats.deduped += duplicateIds.length;
  }

  const existing = existingItems[0] ?? null;
  const shouldKeepPosition = !options.reflowExisting && existing &&
    existing.planXFt !== null &&
    existing.planYFt !== null &&
    existing.roomId === (placement.room?.id ?? null) &&
    existing.floorPlanId === (placement.floorPlan?.id ?? null);

  const sharedPayload = {
    room_id: placement.room?.id ?? null,
    floor_plan_id: placement.floorPlan?.id ?? null,
    belonging_id: belonging.id,
    item_name: belonging.itemName,
    item_source: 'existing_belonging',
    status: placement.room ? 'placed' : 'undecided',
    width_in: existing?.widthIn ?? placement.widthIn,
    depth_in: existing?.depthIn ?? placement.depthIn,
  };

  if (existing) {
    const { error } = await supabase
      .from('room_items')
      .update({
        ...sharedPayload,
        plan_x_ft: shouldKeepPosition ? existing.planXFt : placement.planXFt,
        plan_y_ft: shouldKeepPosition ? existing.planYFt : placement.planYFt,
      })
      .eq('id', existing.id);

    if (error) {
      stats.errors.push(error.message);
      return;
    }

    stats.updated += 1;
    return;
  }

  const { error } = await supabase
    .from('room_items')
    .insert([{
      ...sharedPayload,
      dimensions: null,
      notes: `Imported from Stuff room: ${belonging.room}`,
      layout_x: null,
      layout_y: null,
      layout_w: null,
      layout_h: null,
      height_in: null,
      plan_x_ft: placement.planXFt,
      plan_y_ft: placement.planYFt,
      rotation_deg: 0,
      sort_index: context.roomItems.length + stats.created,
    }]);

  if (error) {
    stats.errors.push(error.message);
    return;
  }

  stats.created += 1;
}

async function loadLayoutContext(supabase: SupabaseClient): Promise<{ value: LayoutContext; errors: string[] }> {
  const [roomsResult, floorPlansResult, roomItemsResult, architecturalElementsResult] = await Promise.all([
    supabase.from('rooms').select('*').order('sort_index', { ascending: true }),
    supabase.from('home_floor_plans').select('*').order('sort_index', { ascending: true }),
    supabase.from('room_items').select('*').order('sort_index', { ascending: true }),
    supabase.from('architectural_elements').select('*').order('sort_index', { ascending: true }),
  ]);

  const errors = [
    roomsResult.error?.message,
    floorPlansResult.error?.message,
    roomItemsResult.error?.message,
    architecturalElementsResult.error && !isMissingArchitecturalElementsTableError(architecturalElementsResult.error)
      ? architecturalElementsResult.error.message
      : null,
  ].filter((message): message is string => Boolean(message));

  return {
    errors,
    value: {
      rooms: (roomsResult.data ?? []).map(row => normaliseRoom(row as Record<string, unknown>)),
      floorPlans: (floorPlansResult.data ?? []).map(row => normaliseFloorPlan(row as Record<string, unknown>)),
      roomItems: (roomItemsResult.data ?? []).map(row => normaliseRoomItem(row as Record<string, unknown>)),
      architecturalElements: architecturalElementsResult.error
        ? []
        : (architecturalElementsResult.data ?? []).map(row => normaliseArchitecturalElement(row as Record<string, unknown>)),
    },
  };
}

function makePlacementPlan(
  belonging: Belonging,
  context: LayoutContext,
  placementIndexByRoom: Map<number, number>,
): PlacementPlan {
  const room = resolveDestinationRoom(belonging.room, context.rooms);
  const floorPlan = room ? resolveFloorPlan(room, context.floorPlans) : null;
  const footprint = estimateItemFootprint(belonging.itemName);

  if (!room || !floorPlan) {
    return {
      room,
      floorPlan,
      planXFt: null,
      planYFt: null,
      widthIn: footprint.widthIn,
      depthIn: footprint.depthIn,
    };
  }

  const index = placementIndexByRoom.get(room.id) ?? 0;
  placementIndexByRoom.set(room.id, index + 1);
  const points = pointsForRoom(room);
  const widthFt = footprint.widthIn / 12;
  const depthFt = footprint.depthIn / 12;
  const placement = chooseRoomPlacement(points, floorPlan, widthFt, depthFt, index);

  return {
    room,
    floorPlan,
    planXFt: placement.x,
    planYFt: placement.y,
    widthIn: footprint.widthIn,
    depthIn: footprint.depthIn,
  };
}

function resolveDestinationRoom(sourceRoom: string, rooms: Room[]) {
  const normalizedSource = normaliseName(sourceRoom);
  const exact = rooms.find(room => normaliseName(room.name) === normalizedSource);
  if (exact) return exact;

  const destinationNames = SOURCE_ROOM_DESTINATIONS[normalizedSource] ?? [];
  return destinationNames
    .map(name => rooms.find(room => normaliseName(room.name) === normaliseName(name)))
    .find((room): room is Room => Boolean(room)) ?? null;
}

function resolveFloorPlan(room: Room, floorPlans: HomeFloorPlan[]) {
  if (room.floorPlanId !== null) {
    const byId = floorPlans.find(floor => floor.id === room.floorPlanId);
    if (byId) return byId;
  }

  return floorPlans.find(floor => room.floor === floor.name) ??
    floorPlans.find(floor => floor.name === 'Main Floor') ??
    floorPlans[0] ??
    null;
}

function makePlacementIndex(roomItems: RoomItem[]) {
  const counts = new Map<number, number>();
  roomItems.forEach(item => {
    if (item.roomId === null) return;
    counts.set(item.roomId, (counts.get(item.roomId) ?? 0) + 1);
  });
  return counts;
}

function estimateItemFootprint(itemName: string) {
  const label = itemName.toLowerCase();
  if (label.includes('sectional')) return { widthIn: 120, depthIn: 84 };
  if (label.includes('sofa') || label.includes('couch')) return { widthIn: 84, depthIn: 38 };
  if (label.includes('king')) return { widthIn: 80, depthIn: 80 };
  if (label.includes('queen')) return { widthIn: 60, depthIn: 80 };
  if (label.includes('crib')) return { widthIn: 54, depthIn: 30 };
  if (label.includes('bed')) return { widthIn: 76, depthIn: 40 };
  if (label.includes('dining') || label.includes('table')) return { widthIn: 72, depthIn: 42 };
  if (label.includes('desk') || label.includes('dresser')) return { widthIn: 60, depthIn: 28 };
  if (label.includes('shelves') || label.includes('bookcase')) return { widthIn: 48, depthIn: 16 };
  if (label.includes('peloton') || label.includes('bike')) return { widthIn: 48, depthIn: 24 };
  if (label.includes('chair')) return { widthIn: 32, depthIn: 32 };
  return { widthIn: 48, depthIn: 30 };
}

function chooseRoomPlacement(
  points: PlanPoint[],
  floorPlan: HomeFloorPlan,
  widthFt: number,
  depthFt: number,
  index: number,
) {
  const bounds = boundsForPoints(points);
  const margin = 0.5;
  const step = 1.25;
  const candidates: PlanPoint[] = [];
  const startX = bounds.x + margin;
  const startY = bounds.y + margin;
  const maxX = bounds.x + bounds.width - widthFt - margin;
  const maxY = bounds.y + bounds.depth - depthFt - margin;

  for (let y = startY; y <= maxY; y += step) {
    const rowCandidates: PlanPoint[] = [];
    for (let x = startX; x <= maxX; x += step) {
      const candidate = { x: roundToHundredth(x), y: roundToHundredth(y) };
      if (isItemInsideRoom(points, candidate.x, candidate.y, widthFt, depthFt)) {
        rowCandidates.push(candidate);
      }
    }
    candidates.push(...(Math.floor((y - startY) / step) % 2 === 0 ? rowCandidates : rowCandidates.reverse()));
  }

  if (candidates.length > 0) {
    const selected = candidates[index % candidates.length];
    return {
      x: roundToHundredth(clamp(selected.x, 0, Math.max(floorPlan.widthFt - widthFt, 0))),
      y: roundToHundredth(clamp(selected.y, 0, Math.max(floorPlan.depthFt - depthFt, 0))),
    };
  }

  const center = centroid(points);
  return {
    x: roundToHundredth(clamp(center.x - widthFt / 2, 0, Math.max(floorPlan.widthFt - widthFt, 0))),
    y: roundToHundredth(clamp(center.y - depthFt / 2, 0, Math.max(floorPlan.depthFt - depthFt, 0))),
  };
}

function isItemInsideRoom(points: PlanPoint[], x: number, y: number, widthFt: number, depthFt: number) {
  const inset = Math.min(0.2, widthFt / 4, depthFt / 4);
  return [
    { x: x + inset, y: y + inset },
    { x: x + widthFt - inset, y: y + inset },
    { x: x + widthFt - inset, y: y + depthFt - inset },
    { x: x + inset, y: y + depthFt - inset },
    { x: x + widthFt / 2, y: y + depthFt / 2 },
  ].every(point => containsPoint(points, point));
}

function pointsForRoom(room: Room) {
  const points = Array.isArray(room.shapePoints) ? room.shapePoints.filter(isPlanPoint) : [];
  if (points.length >= 3) return points;

  const rect = {
    x: room.planXFt ?? 4,
    y: room.planYFt ?? 4,
    width: room.planWidthFt ?? 12,
    depth: room.planDepthFt ?? 10,
  };

  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.depth },
    { x: rect.x, y: rect.y + rect.depth },
  ];
}

function boundsForPoints(points: PlanPoint[]) {
  const xValues = points.map(point => point.x);
  const yValues = points.map(point => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    depth: maxY - minY,
  };
}

function suggestedSeedForRoom(room: Room) {
  return Object.entries(SUGGESTED_ROOM_GEOMETRIES)
    .find(([roomName]) => normaliseName(roomName) === normaliseName(room.name))?.[1] ?? null;
}

function hasCustomGeometry(room: Room) {
  if (room.geometrySource === 'custom') return true;
  if (room.geometrySource === 'recommended') return false;
  return Array.isArray(room.shapePoints) && room.shapePoints.length >= 3;
}

function centroid(points: PlanPoint[]) {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}

function containsPoint(points: PlanPoint[], point: PlanPoint) {
  if (points.length < 3) return false;

  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function normaliseBelonging(row: Record<string, unknown>): Belonging {
  return {
    id: Number(row.id),
    room: String(row.room ?? 'Other'),
    itemName: String(row.itemName ?? row.item_name ?? 'Unnamed Item'),
    action: normaliseBelongingAction(row.action),
    status: String(row.status ?? 'unresolved') === 'resolved' ? 'resolved' : 'unresolved',
    notes: nullableString(row.notes),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

function normaliseRoom(row: Record<string, unknown>): Room {
  return {
    id: Number(row.id),
    name: String(row.name ?? 'Unnamed Room'),
    floor: nullableString(row.floor),
    notes: nullableString(row.notes),
    floorPlanId: nullableNumber(row.floor_plan_id ?? row.floorPlanId),
    planXFt: nullableNumber(row.plan_x_ft ?? row.planXFt),
    planYFt: nullableNumber(row.plan_y_ft ?? row.planYFt),
    planWidthFt: nullableNumber(row.plan_width_ft ?? row.planWidthFt),
    planDepthFt: nullableNumber(row.plan_depth_ft ?? row.planDepthFt),
    labelXFt: nullableNumber(row.label_x_ft ?? row.labelXFt),
    labelYFt: nullableNumber(row.label_y_ft ?? row.labelYFt),
    ceilingHeightFt: nullableNumber(row.ceiling_height_ft ?? row.ceilingHeightFt),
    shapePoints: normaliseShapePoints(row.shape_points ?? row.shapePoints),
    geometrySource: normaliseRoomGeometrySource(row.geometry_source ?? row.geometrySource),
    sortIndex: nullableNumber(row.sort_index ?? row.sortIndex) ?? 0,
  };
}

function normaliseFloorPlan(row: Record<string, unknown>): HomeFloorPlan {
  return {
    id: Number(row.id),
    name: String(row.name ?? 'Floor Plan'),
    label: String(row.label ?? row.name ?? 'Floor Plan'),
    level: nullableNumber(row.level) ?? 0,
    widthFt: nullableNumber(row.width_ft ?? row.widthFt) ?? 50,
    depthFt: nullableNumber(row.depth_ft ?? row.depthFt) ?? 50,
    ceilingHeightFt: nullableNumber(row.ceiling_height_ft ?? row.ceilingHeightFt),
    blueprintDocumentId: nullableNumber(row.blueprint_document_id ?? row.blueprintDocumentId),
    blueprintPage: nullableNumber(row.blueprint_page ?? row.blueprintPage),
    blueprintImagePath: nullableString(row.blueprint_image_path ?? row.blueprintImagePath),
    overlayOffsetXFt: nullableNumber(row.overlay_offset_x_ft ?? row.overlayOffsetXFt),
    overlayOffsetYFt: nullableNumber(row.overlay_offset_y_ft ?? row.overlayOffsetYFt),
    overlayWidthFt: nullableNumber(row.overlay_width_ft ?? row.overlayWidthFt),
    overlayDepthFt: nullableNumber(row.overlay_depth_ft ?? row.overlayDepthFt),
    notes: nullableString(row.notes),
    sortIndex: nullableNumber(row.sort_index ?? row.sortIndex) ?? 0,
  };
}

function normaliseRoomItem(row: Record<string, unknown>): RoomItem {
  return {
    id: Number(row.id),
    roomId: nullableNumber(row.room_id ?? row.roomId),
    floorPlanId: nullableNumber(row.floor_plan_id ?? row.floorPlanId),
    belongingId: nullableNumber(row.belonging_id ?? row.belongingId),
    itemName: String(row.item_name ?? row.itemName ?? 'New Item'),
    itemSource: String(row.item_source ?? row.itemSource) === 'existing_belonging' ? 'existing_belonging' : 'planned_purchase',
    status: normaliseRoomItemStatus(row.status),
    dimensions: nullableString(row.dimensions),
    notes: nullableString(row.notes),
    layoutX: nullableNumber(row.layout_x ?? row.layoutX),
    layoutY: nullableNumber(row.layout_y ?? row.layoutY),
    layoutW: nullableNumber(row.layout_w ?? row.layoutW),
    layoutH: nullableNumber(row.layout_h ?? row.layoutH),
    widthIn: nullableNumber(row.width_in ?? row.widthIn),
    depthIn: nullableNumber(row.depth_in ?? row.depthIn),
    heightIn: nullableNumber(row.height_in ?? row.heightIn),
    planXFt: nullableNumber(row.plan_x_ft ?? row.planXFt),
    planYFt: nullableNumber(row.plan_y_ft ?? row.planYFt),
    rotationDeg: nullableNumber(row.rotation_deg ?? row.rotationDeg),
    sortIndex: nullableNumber(row.sort_index ?? row.sortIndex) ?? 0,
  };
}

function normaliseArchitecturalElement(row: Record<string, unknown>): ArchitecturalElement {
  return {
    id: Number(row.id),
    floorPlanId: nullableNumber(row.floor_plan_id ?? row.floorPlanId) ?? 0,
    roomId: nullableNumber(row.room_id ?? row.roomId),
    elementType: normaliseArchitecturalElementType(row.element_type ?? row.elementType),
    label: String(row.label ?? 'Fixture'),
    xFt: nullableNumber(row.x_ft ?? row.xFt) ?? 0,
    yFt: nullableNumber(row.y_ft ?? row.yFt) ?? 0,
    widthFt: nullableNumber(row.width_ft ?? row.widthFt) ?? 1,
    depthFt: nullableNumber(row.depth_ft ?? row.depthFt) ?? 1,
    rotationDeg: nullableNumber(row.rotation_deg ?? row.rotationDeg) ?? 0,
    source: normaliseArchitecturalElementSource(row.source),
    sourceKey: nullableString(row.source_key ?? row.sourceKey),
    notes: nullableString(row.notes),
    sortIndex: nullableNumber(row.sort_index ?? row.sortIndex) ?? 0,
  };
}

function normaliseBelongingAction(value: unknown): BelongingAction {
  const action = String(value ?? 'Bring');
  return action === 'Sell' || action === 'Donate' || action === 'Trash' ? action : 'Bring';
}

function normaliseRoomItemStatus(value: unknown): RoomItem['status'] {
  const status = String(value ?? 'planned');
  return status === 'placed' || status === 'undecided' ? status : 'planned';
}

function normaliseRoomGeometrySource(value: unknown): RoomGeometrySource {
  const source = String(value ?? 'unknown');
  if (source === 'recommended' || source === 'custom') return source;
  return 'unknown';
}

function normaliseArchitecturalElementSource(value: unknown): ArchitecturalElementSource {
  return String(value ?? 'manual') === 'recommended' ? 'recommended' : 'manual';
}

function normaliseArchitecturalElementType(value: unknown): ArchitecturalElementType {
  const type = String(value ?? 'fixture');
  if (
    type === 'door' ||
    type === 'window' ||
    type === 'opening' ||
    type === 'stairs' ||
    type === 'counter' ||
    type === 'cabinet' ||
    type === 'sink' ||
    type === 'toilet' ||
    type === 'shower' ||
    type === 'tub' ||
    type === 'appliance' ||
    type === 'fixture'
  ) {
    return type;
  }
  return 'fixture';
}

function normaliseShapePoints(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? safeJsonParse(value) : value;
  if (!Array.isArray(parsed)) return null;

  const points = parsed
    .map(point => {
      if (!point || typeof point !== 'object') return null;
      const record = point as Record<string, unknown>;
      const x = Number(record.x);
      const y = Number(record.y);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    })
    .filter((point): point is PlanPoint => point !== null);

  return points.length >= 3 ? points : null;
}

function normaliseName(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isPlanPoint(value: unknown): value is PlanPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as PlanPoint;
  return typeof point.x === 'number' && Number.isFinite(point.x) &&
    typeof point.y === 'number' && Number.isFinite(point.y);
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length > 0 ? text : null;
}

function isMissingGeometrySourceColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /geometry_source/i.test(error.message ?? '');
}

function isMissingArchitecturalElementsTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || /architectural_elements/i.test(error.message ?? '') && /does not exist|not found/i.test(error.message ?? '');
}

function stripRoomGeometrySource(update: Record<string, unknown>) {
  const legacyUpdate = { ...update };
  delete legacyUpdate.geometry_source;
  return legacyUpdate;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function freshStats(): LayoutSyncStats {
  return {
    created: 0,
    updated: 0,
    removed: 0,
    deduped: 0,
    skipped: 0,
    unmatched: 0,
    errors: [],
  };
}

function mergeStats(target: LayoutSyncStats, source: LayoutSyncStats) {
  target.created += source.created;
  target.updated += source.updated;
  target.removed += source.removed;
  target.deduped += source.deduped;
  target.skipped += source.skipped;
  target.unmatched += source.unmatched;
  target.errors.push(...source.errors);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToHundredth(value: number) {
  return Math.round(value * 100) / 100;
}
