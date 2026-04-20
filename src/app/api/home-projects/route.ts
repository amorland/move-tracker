import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');

  let query = supabase
    .from('home_projects')
    .select('*')
    .order('target_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { data, error } = await supabase
    .from('home_projects')
    .insert([{
      title: body.title || 'New Project',
      area: body.area || null,
      status: body.status || 'idea',
      priority: body.priority || 'medium',
      target_date: body.targetDate || null,
      budget_notes: body.budgetNotes || null,
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
  if ('area' in rest) update.area = rest.area;
  if ('status' in rest) update.status = rest.status;
  if ('priority' in rest) update.priority = rest.priority;
  if ('targetDate' in rest) update.target_date = rest.targetDate;
  if ('budgetNotes' in rest) update.budget_notes = rest.budgetNotes;
  if ('notes' in rest) update.notes = rest.notes;

  const { data, error } = await supabase
    .from('home_projects')
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

  const { error } = await supabase.from('home_projects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    area: row.area ?? null,
    status: row.status ?? 'idea',
    priority: row.priority ?? 'medium',
    targetDate: row.target_date ?? row.targetDate ?? null,
    budgetNotes: row.budget_notes ?? row.budgetNotes ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at ?? row.createdAt ?? '',
  };
}
