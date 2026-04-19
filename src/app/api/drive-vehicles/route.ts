import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('drive_vehicles')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data: last } = await supabase
    .from('drive_vehicles')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('drive_vehicles')
    .insert([{
      name: body.name || 'New Vehicle',
      vehicle_type: body.vehicleType || 'car',
      seats: body.seats ?? 4,
      cargo_summary: body.cargoSummary || null,
      driver_name: body.driverName || null,
      order_index: (last?.order_index ?? -1) + 1,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...rest } = body;

  const update: Record<string, unknown> = {};
  if ('name' in rest) update.name = rest.name;
  if ('vehicleType' in rest) update.vehicle_type = rest.vehicleType;
  if ('seats' in rest) update.seats = rest.seats;
  if ('cargoSummary' in rest) update.cargo_summary = rest.cargoSummary;
  if ('driverName' in rest) update.driver_name = rest.driverName;
  if ('orderIndex' in rest) update.order_index = rest.orderIndex;

  const { data, error } = await supabase
    .from('drive_vehicles')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('drive_vehicles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    vehicleType: row.vehicle_type ?? row.vehicleType ?? 'car',
    seats: row.seats ?? 4,
    cargoSummary: row.cargo_summary ?? row.cargoSummary ?? null,
    driverName: row.driver_name ?? row.driverName ?? null,
    orderIndex: row.order_index ?? row.orderIndex ?? 0,
  };
}
