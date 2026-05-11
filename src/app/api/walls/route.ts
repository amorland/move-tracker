import { getSupabaseServer } from '@/lib/supabase';
import type { Wall } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const floorPlanId = searchParams.get('floorPlanId');

  let query = supabase
    .from('walls')
    .select('*')
    .order('sort_index', { ascending: true })
    .order('id', { ascending: true });

  if (floorPlanId) query = query.eq('floor_plan_id', Number(floorPlanId));

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(row => normalise(row as Record<string, unknown>)));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  if (!Number.isFinite(Number(body.floorPlanId))) {
    return NextResponse.json({ error: 'floorPlanId is required' }, { status: 400 });
  }

  const { data: last } = await supabase
    .from('walls')
    .select('sort_index')
    .order('sort_index', { ascending: false })
    .limit(1)
    .single();

  const insert = {
    floor_plan_id: Number(body.floorPlanId),
    start_x_ft: numberOrZero(body.startXFt),
    start_y_ft: numberOrZero(body.startYFt),
    end_x_ft: numberOrZero(body.endXFt),
    end_y_ft: numberOrZero(body.endYFt),
    thickness_in: numberOrDefault(body.thicknessIn, 5),
    height_ft: nullableNumber(body.heightFt),
    notes: nullableString(body.notes),
    sort_index: Number.isFinite(Number(body.sortIndex)) ? Number(body.sortIndex) : (last?.sort_index ?? -1) + 1,
    is_virtual: Boolean(body.isVirtual),
  };

  const { data, error } = await supabase
    .from('walls')
    .insert([insert])
    .select()
    .single();

  if (error && isMissingVirtualColumnError(error)) {
    const retry = await supabase
      .from('walls')
      .insert([stripVirtualField(insert)])
      .select()
      .single();
    if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
    return NextResponse.json(normalise(retry.data));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { id, ...rest } = body;

  if (!Number.isFinite(Number(id))) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ('floorPlanId' in rest) update.floor_plan_id = Number(rest.floorPlanId);
  if ('startXFt' in rest) update.start_x_ft = numberOrZero(rest.startXFt);
  if ('startYFt' in rest) update.start_y_ft = numberOrZero(rest.startYFt);
  if ('endXFt' in rest) update.end_x_ft = numberOrZero(rest.endXFt);
  if ('endYFt' in rest) update.end_y_ft = numberOrZero(rest.endYFt);
  if ('thicknessIn' in rest) update.thickness_in = numberOrDefault(rest.thicknessIn, 5);
  if ('heightFt' in rest) update.height_ft = nullableNumber(rest.heightFt);
  if ('notes' in rest) update.notes = nullableString(rest.notes);
  if ('sortIndex' in rest) update.sort_index = Number(rest.sortIndex);
  if ('isVirtual' in rest) update.is_virtual = Boolean(rest.isVirtual);

  const { data, error } = await supabase
    .from('walls')
    .update(update)
    .eq('id', Number(id))
    .select()
    .single();

  if (error && isMissingVirtualColumnError(error)) {
    const retry = await supabase
      .from('walls')
      .update(stripVirtualField(update))
      .eq('id', Number(id))
      .select()
      .single();
    if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
    return NextResponse.json(normalise(retry.data));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('walls').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>): Wall {
  return {
    id: Number(row.id),
    floorPlanId: Number(row.floor_plan_id ?? row.floorPlanId),
    startXFt: numberOrZero(row.start_x_ft ?? row.startXFt),
    startYFt: numberOrZero(row.start_y_ft ?? row.startYFt),
    endXFt: numberOrZero(row.end_x_ft ?? row.endXFt),
    endYFt: numberOrZero(row.end_y_ft ?? row.endYFt),
    thicknessIn: numberOrDefault(row.thickness_in ?? row.thicknessIn, 5),
    heightFt: nullableNumber(row.height_ft ?? row.heightFt),
    notes: nullableString(row.notes),
    sortIndex: Number.isFinite(Number(row.sort_index ?? row.sortIndex)) ? Number(row.sort_index ?? row.sortIndex) : 0,
    isVirtual: Boolean(row.is_virtual ?? row.isVirtual ?? false),
  };
}

function isMissingVirtualColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /is_virtual/i.test(error.message ?? '');
}

function stripVirtualField(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.is_virtual;
  return next;
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrDefault(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || (/walls/i.test(error.message ?? '') && /does not exist|not found/i.test(error.message ?? ''));
}
