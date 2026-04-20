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
  const section = searchParams.get('section');
  const status = searchParams.get('status');

  const trackMap = await getTrackMap(supabase);
  const selectedTrackIds = track
    ? [...trackMap.values()].filter((item: any) => item.key === track).map((item: any) => Number(item.id))
    : [];

  let query = supabase
    .from('planning_tasks')
    .select('*')
    .order('sort_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (selectedTrackIds.length === 1) query = query.eq('track_id', selectedTrackIds[0]);
  if (section) query = query.eq('section', section);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map((row: any) => normalise(row, trackMap.get(Number(row.track_id)))));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { data: last } = await supabase
    .from('planning_tasks')
    .select('sort_index')
    .order('sort_index', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('planning_tasks')
    .insert([{
      track_id: body.trackId,
      section: body.section || 'purchase',
      title: body.title || 'New Task',
      description: body.description || null,
      status: body.status || 'Not Started',
      owner: body.owner || null,
      due_date: body.dueDate || null,
      completed_at: body.completedAt || null,
      notes: body.notes || null,
      sort_index: (last?.sort_index ?? -1) + 1,
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
  if ('section' in rest) update.section = rest.section;
  if ('title' in rest) update.title = rest.title;
  if ('description' in rest) update.description = rest.description;
  if ('status' in rest) update.status = rest.status;
  if ('owner' in rest) update.owner = rest.owner ?? null;
  if ('dueDate' in rest) update.due_date = rest.dueDate;
  if ('completedAt' in rest) update.completed_at = rest.completedAt;
  if ('notes' in rest) update.notes = rest.notes;
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;

  const { data, error } = await supabase
    .from('planning_tasks')
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

  const { error } = await supabase.from('planning_tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>, track?: { key: string; name: string }) {
  return {
    id: row.id,
    trackId: row.track_id ?? row.trackId,
    trackKey: track?.key,
    trackName: track?.name,
    section: row.section ?? 'purchase',
    title: row.title,
    description: row.description ?? null,
    status: row.status ?? 'Not Started',
    owner: row.owner ?? null,
    dueDate: row.due_date ?? row.dueDate ?? null,
    completedAt: row.completed_at ?? row.completedAt ?? null,
    notes: row.notes ?? null,
    sortIndex: row.sort_index ?? row.sortIndex ?? 0,
    createdAt: row.created_at ?? row.createdAt ?? '',
  };
}
