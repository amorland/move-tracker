import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const provider = searchParams.get('provider');

  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (provider) query = query.eq('provider', provider);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { data, error } = await supabase
    .from('documents')
    .insert([{
      title: body.title,
      provider: body.provider || 'google_drive',
      url: body.url,
      mime_type: body.mimeType || null,
      category: body.category || 'other',
      notes: body.notes || null,
      created_at: new Date().toISOString(),
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
  if ('title' in rest) update.title = rest.title;
  if ('provider' in rest) update.provider = rest.provider;
  if ('url' in rest) update.url = rest.url;
  if ('mimeType' in rest) update.mime_type = rest.mimeType;
  if ('category' in rest) update.category = rest.category;
  if ('notes' in rest) update.notes = rest.notes;

  const { data, error } = await supabase
    .from('documents')
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

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider ?? 'google_drive',
    url: row.url,
    mimeType: row.mime_type ?? row.mimeType ?? null,
    category: row.category ?? 'other',
    notes: row.notes ?? null,
    createdAt: row.created_at ?? row.createdAt ?? '',
  };
}
