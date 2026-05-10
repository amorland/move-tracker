import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ArchitecturalElement,
  ArchitecturalElementSource,
  ArchitecturalElementType,
  Belonging,
  BelongingAction,
  BelongingSizeClass,
  HomeFloorPlan,
  PlanPoint,
  Room,
  RoomGeometrySource,
  RoomItem,
} from '@/lib/types';
import { inferFurnitureType, normaliseFurnitureType } from '@/lib/furniture';

export type LayoutSyncStats = {
  created: number;
  updated: number;
  removed: number;
  deduped: number;
  skipped: number;
  unmatched: number;
  errors: string[];
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

type LayoutContext = {
  rooms: Room[];
  floorPlans: HomeFloorPlan[];
  roomItems: RoomItem[];
  architecturalElements: ArchitecturalElement[];
};

/**
 * Promote a single "Bring" + floor-plan-item belonging to a room_items row.
 * Items are created unplaced — no room, floor, or coordinates assigned. The
 * user drags them onto the canvas once walls + rooms are defined.
 *
 * If the belonging is no longer eligible (action != Bring, or sizeClass ==
 * boxed), any existing room_items rows referencing it are deleted.
 */
export async function syncBelongingLayoutItem(
  supabase: SupabaseClient,
  belonging: Belonging,
): Promise<LayoutSyncStats> {
  const stats = freshStats();
  if (belonging.action !== 'Bring' || belonging.sizeClass !== 'floorplan_item') {
    const removal = await removeBelongingLayoutItems(supabase, belonging.id);
    mergeStats(stats, removal);
    return stats;
  }

  const context = await loadLayoutContext(supabase);
  if (context.errors.length > 0) return { ...stats, errors: context.errors };

  await syncOneBelonging(supabase, belonging, context.value, stats);
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

/**
 * Bulk-promote all eligible belongings (action='Bring' & sizeClass='floorplan_item')
 * to room_items rows. Removes room_items for any belongings that are no longer
 * eligible.
 */
export async function syncBringItemsToLayout(
  supabase: SupabaseClient,
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
  const eligibleIds = new Set(
    belongings
      .filter(b => b.action === 'Bring' && b.sizeClass === 'floorplan_item')
      .map(b => b.id),
  );

  const staleItems = context.value.roomItems.filter(item =>
    item.itemSource === 'existing_belonging' &&
    item.belongingId !== null &&
    !eligibleIds.has(item.belongingId),
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

  for (const belonging of belongings) {
    if (belonging.action !== 'Bring' || belonging.sizeClass !== 'floorplan_item') {
      stats.skipped += 1;
      continue;
    }
    await syncOneBelonging(supabase, belonging, context.value, stats);
  }

  return stats;
}

async function syncOneBelonging(
  supabase: SupabaseClient,
  belonging: Belonging,
  context: LayoutContext,
  stats: LayoutSyncStats,
) {
  const existingResult = await supabase
    .from('room_items')
    .select('*')
    .eq('belonging_id', belonging.id);

  if (existingResult.error) {
    stats.errors.push(existingResult.error.message);
    return;
  }

  const existingItems = (existingResult.data ?? []).map(row => normaliseRoomItem(row as Record<string, unknown>));

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
  const sharedPayload = {
    belonging_id: belonging.id,
    item_name: belonging.itemName,
    furniture_type: existing?.furnitureType ?? inferFurnitureType(belonging.itemName),
    item_source: 'existing_belonging' as const,
    width_in: existing?.widthIn ?? belonging.widthIn ?? null,
    depth_in: existing?.depthIn ?? belonging.depthIn ?? null,
    height_in: existing?.heightIn ?? belonging.heightIn ?? null,
  };

  if (existing) {
    const { error } = await updateRoomItemWithFallback(supabase, existing.id, sharedPayload);
    if (error) {
      stats.errors.push(error.message);
      return;
    }
    stats.updated += 1;
    return;
  }

  const { error } = await insertRoomItemWithFallback(supabase, {
    ...sharedPayload,
    room_id: null,
    floor_plan_id: null,
    status: 'undecided' as const,
    dimensions: null,
    notes: `Imported from Stuff room: ${belonging.room}`,
    layout_x: null,
    layout_y: null,
    layout_w: null,
    layout_h: null,
    plan_x_ft: null,
    plan_y_ft: null,
    rotation_deg: 0,
    sort_index: context.roomItems.length + stats.created,
  });

  if (error) {
    stats.errors.push(error.message);
    return;
  }

  stats.created += 1;
  stats.unmatched += 1;
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

function normaliseBelonging(row: Record<string, unknown>): Belonging {
  return {
    id: Number(row.id),
    room: String(row.room ?? 'Other'),
    itemName: String(row.itemName ?? row.item_name ?? 'Unnamed Item'),
    action: normaliseBelongingAction(row.action),
    status: String(row.status ?? 'unresolved') === 'resolved' ? 'resolved' : 'unresolved',
    sizeClass: normaliseBelongingSizeClass(row.size_class),
    widthIn: nullableNumber(row.width_in),
    depthIn: nullableNumber(row.depth_in),
    heightIn: nullableNumber(row.height_in),
    notes: nullableString(row.notes),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

function normaliseBelongingSizeClass(value: unknown): BelongingSizeClass {
  if (value === undefined || value === null) return 'floorplan_item';
  return String(value) === 'floorplan_item' ? 'floorplan_item' : 'boxed';
}

function normaliseRoom(row: Record<string, unknown>): Room {
  return {
    id: Number(row.id),
    name: String(row.name ?? 'Unnamed Room'),
    floor: nullableString(row.floor),
    notes: nullableString(row.notes),
    floorPlanId: nullableNumber(row.floor_plan_id ?? row.floorPlanId),
    ceilingHeightFt: nullableNumber(row.ceiling_height_ft ?? row.ceilingHeightFt),
    anchorXFt: nullableNumber(row.anchor_x_ft ?? row.anchorXFt),
    anchorYFt: nullableNumber(row.anchor_y_ft ?? row.anchorYFt),
    sortIndex: nullableNumber(row.sort_index ?? row.sortIndex) ?? 0,
    planXFt: nullableNumber(row.plan_x_ft ?? row.planXFt),
    planYFt: nullableNumber(row.plan_y_ft ?? row.planYFt),
    planWidthFt: nullableNumber(row.plan_width_ft ?? row.planWidthFt),
    planDepthFt: nullableNumber(row.plan_depth_ft ?? row.planDepthFt),
    labelXFt: nullableNumber(row.label_x_ft ?? row.labelXFt),
    labelYFt: nullableNumber(row.label_y_ft ?? row.labelYFt),
    shapePoints: normaliseShapePoints(row.shape_points ?? row.shapePoints),
    geometrySource: normaliseRoomGeometrySource(row.geometry_source ?? row.geometrySource),
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
    structureLocked: Boolean(row.structure_locked ?? row.structureLocked ?? false),
    elementsLocked: Boolean(row.elements_locked ?? row.elementsLocked ?? false),
  };
}

function normaliseRoomItem(row: Record<string, unknown>): RoomItem {
  return {
    id: Number(row.id),
    roomId: nullableNumber(row.room_id ?? row.roomId),
    floorPlanId: nullableNumber(row.floor_plan_id ?? row.floorPlanId),
    belongingId: nullableNumber(row.belonging_id ?? row.belongingId),
    itemName: String(row.item_name ?? row.itemName ?? 'New Item'),
    furnitureType: normaliseFurnitureType(row.furniture_type ?? row.furnitureType, String(row.item_name ?? row.itemName ?? 'New Item')),
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
    wallId: nullableNumber(row.wall_id ?? row.wallId),
    offsetAlongWallFt: nullableNumber(row.offset_along_wall_ft ?? row.offsetAlongWallFt),
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
    type === 'door' || type === 'window' || type === 'opening' || type === 'wall' ||
    type === 'stairs' || type === 'closet' || type === 'laundry' || type === 'porch' ||
    type === 'storage' || type === 'counter' || type === 'cabinet' || type === 'sink' ||
    type === 'toilet' || type === 'shower' || type === 'tub' || type === 'appliance' ||
    type === 'fixture'
  ) {
    return type;
  }
  return 'fixture';
}

function normaliseShapePoints(value: unknown): PlanPoint[] | null {
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

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length > 0 ? text : null;
}

function isMissingArchitecturalElementsTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || (/architectural_elements/i.test(error.message ?? '') && /does not exist|not found/i.test(error.message ?? ''));
}

async function updateRoomItemWithFallback(supabase: SupabaseClient, id: number, update: Record<string, unknown>) {
  const result = await supabase.from('room_items').update(update).eq('id', id);
  if (!result.error || !isMissingFurnitureTypeColumnError(result.error)) return result;
  return supabase.from('room_items').update(stripRoomItemFurnitureType(update)).eq('id', id);
}

async function insertRoomItemWithFallback(supabase: SupabaseClient, insert: Record<string, unknown>) {
  const result = await supabase.from('room_items').insert([insert]);
  if (!result.error || !isMissingFurnitureTypeColumnError(result.error)) return result;
  return supabase.from('room_items').insert([stripRoomItemFurnitureType(insert)]);
}

function isMissingFurnitureTypeColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /furniture_type/i.test(error.message ?? '');
}

function stripRoomItemFurnitureType(update: Record<string, unknown>) {
  const next = { ...update };
  delete next.furniture_type;
  return next;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function freshStats(): LayoutSyncStats {
  return { ...EMPTY_STATS, errors: [] };
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
