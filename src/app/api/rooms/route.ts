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

  const insert: Record<string, unknown> = {
    name: body.name || 'New Room',
    floor: body.floor || null,
    notes: body.notes || null,
    floor_plan_id: body.floorPlanId ?? null,
    ceiling_height_ft: body.ceilingHeightFt ?? null,
    anchor_x_ft: nullableNumber(body.anchorXFt),
    anchor_y_ft: nullableNumber(body.anchorYFt),
    sort_index: (last?.sort_index ?? -1) + 1,
  };
  // Legacy polygon inputs are ignored on write — geometry is derived
  // from walls + anchor in Phase 4+. We don't error on them so older
  // clients sending shapePoints / planXFt etc. still create the room.

  let { data, error } = await supabase
    .from('rooms')
    .insert([insert])
    .select()
    .single();

  if (error && isMissingAnchorColumnError(error)) {
    const retry = await supabase
      .from('rooms')
      .insert([stripAnchorFields(insert)])
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
  if ('ceilingHeightFt' in rest) update.ceiling_height_ft = rest.ceilingHeightFt;
  if ('anchorXFt' in rest) update.anchor_x_ft = nullableNumber(rest.anchorXFt);
  if ('anchorYFt' in rest) update.anchor_y_ft = nullableNumber(rest.anchorYFt);
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;
  // Legacy polygon update fields (shapePoints, planXFt, labelXFt etc.) are
  // intentionally ignored — geometry derives from walls + anchor.

  let { data, error } = await supabase
    .from('rooms')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error && isMissingAnchorColumnError(error)) {
    const retry = await supabase
      .from('rooms')
      .update(stripAnchorFields(update))
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
    ceilingHeightFt: nullableNumber(row.ceiling_height_ft ?? row.ceilingHeightFt),
    anchorXFt: nullableNumber(row.anchor_x_ft ?? row.anchorXFt),
    anchorYFt: nullableNumber(row.anchor_y_ft ?? row.anchorYFt),
    sortIndex: nullableNumber(row.sort_index ?? row.sortIndex) ?? 0,
    // Legacy fields kept on the type for the Phase 4 transition; always
    // null/'unknown' after supabase-phase-4-reset.sql has run.
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

function isMissingAnchorColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /anchor_/i.test(error.message ?? '');
}

function stripAnchorFields(update: Record<string, unknown>) {
  const legacyUpdate = { ...update };
  delete legacyUpdate.anchor_x_ft;
  delete legacyUpdate.anchor_y_ft;
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
