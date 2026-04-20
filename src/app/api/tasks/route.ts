import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('"orderIndex"', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks = (data ?? []).map(normalise);
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { data: last } = await supabase
    .from('tasks')
    .select('"orderIndex"')
    .order('"orderIndex"', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      title: body.title || 'New Task',
      description: body.description || null,
      status: body.status || 'Not Started',
      owner: body.owner || null,
      notes: body.notes || null,
      "orderIndex": (last?.orderIndex ?? -1) + 1,
      "categoryId": body.categoryId,
      "dueDate": body.dueDate || null,
      completed_at: body.completedAt || null,
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
  if ('description' in rest) update.description = rest.description;
  if ('status' in rest) update.status = rest.status;
  if ('owner' in rest) update.owner = rest.owner ?? null;
  if ('notes' in rest) update.notes = rest.notes;
  if ('dueDate' in rest) update['dueDate'] = rest.dueDate;
  if ('categoryId' in rest) update['categoryId'] = rest.categoryId;
  if ('completedAt' in rest) update.completed_at = rest.completedAt;

  const { data, error } = await supabase
    .from('tasks')
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

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    categoryId: row.categoryId ?? row.category_id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    owner: (row.owner as string | null) || null,
    dueDate: row.dueDate ?? row.due_date ?? null,
    completedAt: row.completed_at ?? null,
    notes: row.notes ?? null,
    orderIndex: row.orderIndex ?? row.order_index ?? 0,
  };
}
