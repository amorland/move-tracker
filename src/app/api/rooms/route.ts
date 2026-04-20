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

  const { data, error } = await supabase
    .from('rooms')
    .insert([{
      name: body.name || 'New Room',
      floor: body.floor || null,
      notes: body.notes || null,
      sort_index: (last?.sort_index ?? -1) + 1,
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
  if ('name' in rest) update.name = rest.name;
  if ('floor' in rest) update.floor = rest.floor;
  if ('notes' in rest) update.notes = rest.notes;
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;

  const { data, error } = await supabase
    .from('rooms')
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
    sortIndex: row.sort_index ?? row.sortIndex ?? 0,
  };
}
