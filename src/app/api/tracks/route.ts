import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

function normalise(row: Record<string, unknown>) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    color: row.color ?? null,
    icon: row.icon ?? null,
    orderIndex: row.order_index ?? row.orderIndex ?? 0,
  };
}
