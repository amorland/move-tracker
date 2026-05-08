import { getSupabaseServer } from '@/lib/supabase';
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
    ceiling_height_ft: body.ceilingHeightFt ?? null,
    shape_points: body.shapePoints ?? null,
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
  if ('ceilingHeightFt' in rest) update.ceiling_height_ft = rest.ceilingHeightFt;
  if ('shapePoints' in rest) update.shape_points = rest.shapePoints;
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

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    floor: row.floor ?? null,
    notes: row.notes ?? null,
    floorPlanId: nullableNumber(row.floor_plan_id ?? row.floorPlanId),
    planXFt: nullableNumber(row.plan_x_ft ?? row.planXFt),
    planYFt: nullableNumber(row.plan_y_ft ?? row.planYFt),
    planWidthFt: nullableNumber(row.plan_width_ft ?? row.planWidthFt),
    planDepthFt: nullableNumber(row.plan_depth_ft ?? row.planDepthFt),
    ceilingHeightFt: nullableNumber(row.ceiling_height_ft ?? row.ceilingHeightFt),
    shapePoints: row.shape_points ?? row.shapePoints ?? null,
    sortIndex: row.sort_index ?? row.sortIndex ?? 0,
  };
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMissingMeasuredColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /plan_|floor_plan_id|shape_points|ceiling_height_ft/i.test(error.message ?? '');
}

function stripMeasuredRoomFields(update: Record<string, unknown>) {
  const legacyUpdate = { ...update };
  delete legacyUpdate.floor_plan_id;
  delete legacyUpdate.plan_x_ft;
  delete legacyUpdate.plan_y_ft;
  delete legacyUpdate.plan_width_ft;
  delete legacyUpdate.plan_depth_ft;
  delete legacyUpdate.ceiling_height_ft;
  delete legacyUpdate.shape_points;
  return legacyUpdate;
}
