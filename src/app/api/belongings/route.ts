import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('belongings')
    .select('*')
    .order('room', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { data, error } = await supabase
    .from('belongings')
    .insert([{
      room: body.room || 'Other',
      "itemName": body.itemName || 'Unnamed Item',
      action: body.action || 'Bring',
      status: 'unresolved',
      notes: body.notes || null,
      "createdAt": new Date().toISOString(),
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
  if ('room' in rest) update.room = rest.room;
  if ('itemName' in rest) update['itemName'] = rest.itemName;
  if ('action' in rest) update.action = rest.action;
  if ('notes' in rest) update.notes = rest.notes;
  if ('status' in rest) {
    const s = String(rest.status).toLowerCase();
    update.status = (s === 'resolved') ? 'resolved' : 'unresolved';
  }

  const { data, error } = await supabase
    .from('belongings')
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

  const { error } = await supabase.from('belongings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    room: row.room,
    itemName: row.itemName ?? row.item_name ?? 'Unnamed Item',
    action: row.action,
    status: row.status as 'unresolved' | 'resolved',
    notes: row.notes ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}
