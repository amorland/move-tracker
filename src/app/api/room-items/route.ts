import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  let query = supabase
    .from('room_items')
    .select('*')
    .order('sort_index', { ascending: true });

  if (roomId) query = query.eq('room_id', Number(roomId));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { data: last } = await supabase
    .from('room_items')
    .select('sort_index')
    .order('sort_index', { ascending: false })
    .limit(1)
    .single();

  const insert = {
    room_id: body.roomId || null,
    floor_plan_id: body.floorPlanId ?? null,
    belonging_id: body.belongingId || null,
    item_name: body.itemName || 'New Item',
    item_source: body.itemSource || 'planned_purchase',
    status: body.status || 'planned',
    dimensions: body.dimensions || null,
    notes: body.notes || null,
    layout_x: body.layoutX ?? null,
    layout_y: body.layoutY ?? null,
    layout_w: body.layoutW ?? null,
    layout_h: body.layoutH ?? null,
    width_in: body.widthIn ?? null,
    depth_in: body.depthIn ?? null,
    height_in: body.heightIn ?? null,
    plan_x_ft: body.planXFt ?? null,
    plan_y_ft: body.planYFt ?? null,
    rotation_deg: body.rotationDeg ?? null,
    sort_index: (last?.sort_index ?? -1) + 1,
  };

  let { data, error } = await supabase
    .from('room_items')
    .insert([insert])
    .select()
    .single();

  if (error && isMissingMeasuredColumnError(error)) {
    const retry = await supabase
      .from('room_items')
      .insert([stripMeasuredItemFields(insert)])
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
  if ('roomId' in rest) update.room_id = rest.roomId;
  if ('floorPlanId' in rest) update.floor_plan_id = rest.floorPlanId;
  if ('belongingId' in rest) update.belonging_id = rest.belongingId;
  if ('itemName' in rest) update.item_name = rest.itemName;
  if ('itemSource' in rest) update.item_source = rest.itemSource;
  if ('status' in rest) update.status = rest.status;
  if ('dimensions' in rest) update.dimensions = rest.dimensions;
  if ('notes' in rest) update.notes = rest.notes;
  if ('layoutX' in rest) update.layout_x = rest.layoutX;
  if ('layoutY' in rest) update.layout_y = rest.layoutY;
  if ('layoutW' in rest) update.layout_w = rest.layoutW;
  if ('layoutH' in rest) update.layout_h = rest.layoutH;
  if ('widthIn' in rest) update.width_in = rest.widthIn;
  if ('depthIn' in rest) update.depth_in = rest.depthIn;
  if ('heightIn' in rest) update.height_in = rest.heightIn;
  if ('planXFt' in rest) update.plan_x_ft = rest.planXFt;
  if ('planYFt' in rest) update.plan_y_ft = rest.planYFt;
  if ('rotationDeg' in rest) update.rotation_deg = rest.rotationDeg;
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;

  let { data, error } = await supabase
    .from('room_items')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error && isMissingMeasuredColumnError(error)) {
    const retry = await supabase
      .from('room_items')
      .update(stripMeasuredItemFields(update))
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

  const { error } = await supabase.from('room_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    roomId: row.room_id ?? row.roomId ?? null,
    floorPlanId: row.floor_plan_id ?? row.floorPlanId ?? null,
    belongingId: row.belonging_id ?? row.belongingId ?? null,
    itemName: row.item_name ?? row.itemName,
    itemSource: row.item_source ?? row.itemSource ?? 'planned_purchase',
    status: row.status ?? 'planned',
    dimensions: row.dimensions ?? null,
    notes: row.notes ?? null,
    layoutX: row.layout_x ?? row.layoutX ?? null,
    layoutY: row.layout_y ?? row.layoutY ?? null,
    layoutW: row.layout_w ?? row.layoutW ?? null,
    layoutH: row.layout_h ?? row.layoutH ?? null,
    widthIn: nullableNumber(row.width_in ?? row.widthIn),
    depthIn: nullableNumber(row.depth_in ?? row.depthIn),
    heightIn: nullableNumber(row.height_in ?? row.heightIn),
    planXFt: nullableNumber(row.plan_x_ft ?? row.planXFt),
    planYFt: nullableNumber(row.plan_y_ft ?? row.planYFt),
    rotationDeg: nullableNumber(row.rotation_deg ?? row.rotationDeg),
    sortIndex: row.sort_index ?? row.sortIndex ?? 0,
  };
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMissingMeasuredColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /floor_plan_id|width_in|depth_in|height_in|plan_|rotation_deg/i.test(error.message ?? '');
}

function stripMeasuredItemFields(update: Record<string, unknown>) {
  const legacyUpdate = { ...update };
  delete legacyUpdate.floor_plan_id;
  delete legacyUpdate.width_in;
  delete legacyUpdate.depth_in;
  delete legacyUpdate.height_in;
  delete legacyUpdate.plan_x_ft;
  delete legacyUpdate.plan_y_ft;
  delete legacyUpdate.rotation_deg;
  return legacyUpdate;
}
