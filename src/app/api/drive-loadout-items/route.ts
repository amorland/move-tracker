import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const assignedVehicleId = searchParams.get('assignedVehicleId');

  let query = supabase
    .from('drive_loadout_items')
    .select('*')
    .order('order_index', { ascending: true });

  if (assignedVehicleId) {
    query = assignedVehicleId === 'unassigned'
      ? query.is('assigned_vehicle_id', null)
      : query.eq('assigned_vehicle_id', Number(assignedVehicleId));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { data: last } = await supabase
    .from('drive_loadout_items')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('drive_loadout_items')
    .insert([{
      label: body.label || 'New Item',
      item_type: body.itemType || 'gear',
      assigned_vehicle_id: body.assignedVehicleId || null,
      placement: body.placement || null,
      required: body.required ?? true,
      notes: body.notes || null,
      order_index: (last?.order_index ?? -1) + 1,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { id, ...rest } = body;

  const update: Record<string, unknown> = {};
  if ('label' in rest) update.label = rest.label;
  if ('itemType' in rest) update.item_type = rest.itemType;
  if ('assignedVehicleId' in rest) update.assigned_vehicle_id = rest.assignedVehicleId;
  if ('placement' in rest) update.placement = rest.placement;
  if ('required' in rest) update.required = rest.required;
  if ('notes' in rest) update.notes = rest.notes;
  if ('orderIndex' in rest) update.order_index = rest.orderIndex;

  const { data, error } = await supabase
    .from('drive_loadout_items')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('drive_loadout_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    label: row.label,
    itemType: row.item_type ?? row.itemType ?? 'gear',
    assignedVehicleId: row.assigned_vehicle_id ?? row.assignedVehicleId ?? null,
    placement: row.placement ?? null,
    required: row.required ?? true,
    notes: row.notes ?? null,
    orderIndex: row.order_index ?? row.orderIndex ?? 0,
  };
}
