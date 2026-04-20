import { getSupabaseServer } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function getTrackMap(supabase: SupabaseClient) {
  const { data: tracks, error } = await supabase.from('tracks').select('*');
  if (error) throw new Error(error.message);
  return new Map((tracks ?? []).map((track: any) => [Number(track.id), {
    id: track.id,
    key: track.key,
    name: track.name,
  }]));
}

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const track = searchParams.get('track');
  const limit = searchParams.get('limit');

  const trackMap = await getTrackMap(supabase);
  const selectedTrackIds = track
    ? [...trackMap.values()].filter((item: any) => item.key === track).map((item: any) => Number(item.id))
    : [];

  let query = supabase
    .from('timeline_entries')
    .select('*')
    .order('date', { ascending: true })
    .order('sort_index', { ascending: true });

  if (selectedTrackIds.length === 1) {
    query = query.eq('track_id', selectedTrackIds[0]);
  } else if (selectedTrackIds.length > 1) {
    query = query.in('track_id', selectedTrackIds);
  }

  if (limit) query = query.limit(Number(limit));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map((row: any) => normalise(row, trackMap.get(Number(row.track_id)))));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { data, error } = await supabase
    .from('timeline_entries')
    .insert([{
      track_id: body.trackId,
      title: body.title,
      entry_type: body.entryType || 'event',
      status: body.status || 'estimated',
      date: body.date,
      time: body.time || null,
      notes: body.notes || null,
      sort_index: body.sortIndex || 0,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const trackMap = await getTrackMap(supabase);
  return NextResponse.json(normalise(data, trackMap.get(Number(data.track_id))));
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { id, ...rest } = body;

  const update: Record<string, unknown> = {};
  if ('trackId' in rest) update.track_id = rest.trackId;
  if ('title' in rest) update.title = rest.title;
  if ('entryType' in rest) update.entry_type = rest.entryType;
  if ('status' in rest) update.status = rest.status;
  if ('date' in rest) update.date = rest.date;
  if ('time' in rest) update.time = rest.time;
  if ('notes' in rest) update.notes = rest.notes;
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;

  const { data, error } = await supabase
    .from('timeline_entries')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const trackMap = await getTrackMap(supabase);
  return NextResponse.json(normalise(data, trackMap.get(Number(data.track_id))));
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('timeline_entries').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>, track?: { key: string; name: string }) {
  return {
    id: row.id,
    trackId: row.track_id ?? row.trackId,
    trackKey: track?.key,
    trackName: track?.name,
    title: row.title,
    entryType: row.entry_type ?? row.entryType ?? 'event',
    status: row.status ?? 'estimated',
    date: row.date,
    time: row.time ?? null,
    notes: row.notes ?? null,
    sortIndex: row.sort_index ?? row.sortIndex ?? 0,
    createdAt: row.created_at ?? row.createdAt ?? '',
  };
}
