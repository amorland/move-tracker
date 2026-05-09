import { getSupabaseServer } from '@/lib/supabase';
import type { Room, RoomGeometrySource } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('sort_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { data: last } = await supabase
    .from('rooms')
    .select('sort_index')
    .order('sort_index', { ascending: false })
    .limit(1)
    .single();

  const insert = {
    name: body.name || 'New Room',
    floor: body.floor || null,
    notes: body.notes || null,
    floor_plan_id: body.floorPlanId ?? null,
    plan_x_ft: body.planXFt ?? null,
    plan_y_ft: body.planYFt ?? null,
    plan_width_ft: body.planWidthFt ?? null,
    plan_depth_ft: body.planDepthFt ?? null,
    label_x_ft: body.labelXFt ?? null,
    label_y_ft: body.labelYFt ?? null,
    ceiling_height_ft: body.ceilingHeightFt ?? null,
    shape_points: normaliseShapePoints(body.shapePoints),
    geometry_source: normaliseRoomGeometrySource(body.geometrySource ?? (body.shapePoints ? 'custom' : 'unknown')),
    sort_index: (last?.sort_index ?? -1) + 1,
  };

  let { data, error } = await supabase
    .from('rooms')
    .insert([insert])
    .select()
    .single();

  if (error && isMissingMeasuredColumnError(error)) {
    const retry = await supabase
      .from('rooms')
      .insert([stripMeasuredRoomFields(insert)])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { id, ...rest } = body;

  const update: Record<string, unknown> = {};
  if ('name' in rest) update.name = rest.name;
  if ('floor' in rest) update.floor = rest.floor;
  if ('notes' in rest) update.notes = rest.notes;
  if ('floorPlanId' in rest) update.floor_plan_id = rest.floorPlanId;
  if ('planXFt' in rest) update.plan_x_ft = rest.planXFt;
  if ('planYFt' in rest) update.plan_y_ft = rest.planYFt;
  if ('planWidthFt' in rest) update.plan_width_ft = rest.planWidthFt;
  if ('planDepthFt' in rest) update.plan_depth_ft = rest.planDepthFt;
  if ('labelXFt' in rest) update.label_x_ft = rest.labelXFt;
  if ('labelYFt' in rest) update.label_y_ft = rest.labelYFt;
  if ('ceilingHeightFt' in rest) update.ceiling_height_ft = rest.ceilingHeightFt;
  if ('shapePoints' in rest) update.shape_points = normaliseShapePoints(rest.shapePoints);
  if ('geometrySource' in rest) update.geometry_source = normaliseRoomGeometrySource(rest.geometrySource);
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;

  let { data, error } = await supabase
    .from('rooms')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error && isMissingMeasuredColumnError(error)) {
    const legacyUpdate = stripMeasuredRoomFields(update);
    const retry = await supabase
      .from('rooms')
      .update(legacyUpdate)
      .eq('id', id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>): Room {
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

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function isMissingMeasuredColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /plan_|label_|floor_plan_id|shape_points|ceiling_height_ft|geometry_source/i.test(error.message ?? '');
}

function stripMeasuredRoomFields(update: Record<string, unknown>) {
  const legacyUpdate = { ...update };
  delete legacyUpdate.floor_plan_id;
  delete legacyUpdate.plan_x_ft;
  delete legacyUpdate.plan_y_ft;
  delete legacyUpdate.plan_width_ft;
  delete legacyUpdate.plan_depth_ft;
  delete legacyUpdate.label_x_ft;
  delete legacyUpdate.label_y_ft;
  delete legacyUpdate.ceiling_height_ft;
  delete legacyUpdate.shape_points;
  delete legacyUpdate.geometry_source;
  return legacyUpdate;
}

function normaliseRoomGeometrySource(value: unknown): RoomGeometrySource {
  const source = String(value ?? 'unknown');
  if (source === 'recommended' || source === 'custom') return source;
  return 'unknown';
}

function normaliseShapePoints(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? safeJsonParse(value) : value;
  if (!Array.isArray(parsed)) return null;

  const points = parsed
    .map(point => {
      if (!point || typeof point !== 'object') return null;
      const x = Number((point as { x?: unknown }).x);
      const y = Number((point as { y?: unknown }).y);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    })
    .filter((point): point is { x: number; y: number } => point !== null);

  return points.length >= 3 ? points : null;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
