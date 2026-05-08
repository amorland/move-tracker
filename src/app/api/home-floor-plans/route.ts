import { DEFAULT_HOME_FLOOR_PLANS } from '@/lib/homeLayout';
import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('home_floor_plans')
    .select('*')
    .order('sort_index', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return NextResponse.json(DEFAULT_HOME_FLOOR_PLANS);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const floorPlans = (data ?? []).map(normalise);
  return NextResponse.json(floorPlans.length > 0 ? floorPlans : DEFAULT_HOME_FLOOR_PLANS);
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { data: last } = await supabase
    .from('home_floor_plans')
    .select('sort_index')
    .order('sort_index', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('home_floor_plans')
    .insert([{
      name: body.name || 'New Floor',
      label: body.label || body.name || 'New Floor',
      level: body.level ?? 0,
      width_ft: body.widthFt ?? 40,
      depth_ft: body.depthFt ?? 32,
      ceiling_height_ft: body.ceilingHeightFt ?? null,
      blueprint_document_id: body.blueprintDocumentId ?? null,
      blueprint_page: body.blueprintPage ?? null,
      blueprint_image_path: body.blueprintImagePath ?? null,
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
  if ('label' in rest) update.label = rest.label;
  if ('level' in rest) update.level = rest.level;
  if ('widthFt' in rest) update.width_ft = rest.widthFt;
  if ('depthFt' in rest) update.depth_ft = rest.depthFt;
  if ('ceilingHeightFt' in rest) update.ceiling_height_ft = rest.ceilingHeightFt;
  if ('blueprintDocumentId' in rest) update.blueprint_document_id = rest.blueprintDocumentId;
  if ('blueprintPage' in rest) update.blueprint_page = rest.blueprintPage;
  if ('blueprintImagePath' in rest) update.blueprint_image_path = rest.blueprintImagePath;
  if ('notes' in rest) update.notes = rest.notes;
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;

  const { data, error } = await supabase
    .from('home_floor_plans')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

function normalise(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    name: String(row.name),
    label: String(row.label ?? row.name),
    level: Number(row.level ?? 0),
    widthFt: Number(row.width_ft ?? row.widthFt ?? 40),
    depthFt: Number(row.depth_ft ?? row.depthFt ?? 32),
    ceilingHeightFt: nullableNumber(row.ceiling_height_ft ?? row.ceilingHeightFt),
    blueprintDocumentId: nullableNumber(row.blueprint_document_id ?? row.blueprintDocumentId),
    blueprintPage: nullableNumber(row.blueprint_page ?? row.blueprintPage),
    blueprintImagePath: row.blueprint_image_path ?? row.blueprintImagePath ?? null,
    notes: row.notes ?? null,
    sortIndex: Number(row.sort_index ?? row.sortIndex ?? 0),
  };
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || /home_floor_plans/i.test(error.message ?? '') && /does not exist|not found/i.test(error.message ?? '');
}
