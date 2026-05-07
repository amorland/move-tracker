import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('orderIndex', { ascending: true });

  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .order('orderIndex', { ascending: true });

  if (catError || taskError) {
    return NextResponse.json({ error: catError?.message || taskError?.message }, { status: 500 });
  }

  return NextResponse.json({ categories, tasks: (tasks ?? []).map(normaliseTask) });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { name, orderIndex } = body;

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, orderIndex: orderIndex || 0 }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

function normaliseTask(row: Record<string, unknown>) {
  return {
    id: row.id,
    categoryId: row.categoryId ?? row.category_id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    owner: (row.owner as string | null) || null,
    dueDate: row.dueDate ?? row.due_date ?? null,
    completedAt: row.completed_at ?? row.completedAt ?? null,
    notes: row.notes ?? null,
    orderIndex: row.orderIndex ?? row.order_index ?? 0,
  };
}
