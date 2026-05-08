import { DEFAULT_HOME_FLOOR_PLANS, LOCAL_BLUEPRINT_ASSET_PATHS } from '@/lib/homeLayout';
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

  const insert = {
    name: body.name || 'New Floor',
    label: body.label || body.name || 'New Floor',
    level: body.level ?? 0,
    width_ft: body.widthFt ?? defaultCanvasWidth(body.name),
    depth_ft: body.depthFt ?? defaultCanvasDepth(body.name),
    ceiling_height_ft: body.ceilingHeightFt ?? null,
    blueprint_document_id: body.blueprintDocumentId ?? null,
    blueprint_page: body.blueprintPage ?? null,
    blueprint_image_path: body.blueprintImagePath ?? defaultBlueprintImagePath(body.name),
    overlay_offset_x_ft: body.overlayOffsetXFt ?? 0,
    overlay_offset_y_ft: body.overlayOffsetYFt ?? 0,
    overlay_width_ft: body.overlayWidthFt ?? body.widthFt ?? defaultCanvasWidth(body.name),
    overlay_depth_ft: body.overlayDepthFt ?? body.depthFt ?? defaultCanvasDepth(body.name),
    notes: body.notes || null,
    sort_index: body.sortIndex ?? (last?.sort_index ?? -1) + 1,
  };

  let { data, error } = await supabase
    .from('home_floor_plans')
    .upsert([insert], { onConflict: 'name' })
    .select()
    .single();

  if (error && isMissingOverlayColumnError(error)) {
    const retry = await supabase
      .from('home_floor_plans')
      .upsert([stripOverlayFields(insert)], { onConflict: 'name' })
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

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
  if ('overlayOffsetXFt' in rest) update.overlay_offset_x_ft = rest.overlayOffsetXFt;
  if ('overlayOffsetYFt' in rest) update.overlay_offset_y_ft = rest.overlayOffsetYFt;
  if ('overlayWidthFt' in rest) update.overlay_width_ft = rest.overlayWidthFt;
  if ('overlayDepthFt' in rest) update.overlay_depth_ft = rest.overlayDepthFt;
  if ('notes' in rest) update.notes = rest.notes;
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;

  let { data, error } = await supabase
    .from('home_floor_plans')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error && isMissingOverlayColumnError(error)) {
    const retry = await supabase
      .from('home_floor_plans')
      .update(stripOverlayFields(update))
      .eq('id', id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

function normalise(row: Record<string, unknown>) {
  const name = String(row.name);
  const widthFt = Number(row.width_ft ?? row.widthFt ?? defaultCanvasWidth(name));
  const depthFt = Number(row.depth_ft ?? row.depthFt ?? defaultCanvasDepth(name));

  return {
    id: Number(row.id),
    name,
    label: String(row.label ?? row.name),
    level: Number(row.level ?? 0),
    widthFt: knownFloorNames().has(name) ? Math.max(widthFt, 50) : widthFt,
    depthFt: knownFloorNames().has(name) ? Math.max(depthFt, 50) : depthFt,
    ceilingHeightFt: nullableNumber(row.ceiling_height_ft ?? row.ceilingHeightFt),
    blueprintDocumentId: nullableNumber(row.blueprint_document_id ?? row.blueprintDocumentId),
    blueprintPage: nullableNumber(row.blueprint_page ?? row.blueprintPage),
    blueprintImagePath: nullableString(row.blueprint_image_path ?? row.blueprintImagePath) ?? defaultBlueprintImagePath(name),
    overlayOffsetXFt: nullableNumber(row.overlay_offset_x_ft ?? row.overlayOffsetXFt) ?? 0,
    overlayOffsetYFt: nullableNumber(row.overlay_offset_y_ft ?? row.overlayOffsetYFt) ?? 0,
    overlayWidthFt: nullableNumber(row.overlay_width_ft ?? row.overlayWidthFt) ?? Math.max(widthFt, defaultCanvasWidth(name)),
    overlayDepthFt: nullableNumber(row.overlay_depth_ft ?? row.overlayDepthFt) ?? Math.max(depthFt, defaultCanvasDepth(name)),
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

function nullableString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isMissingOverlayColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /blueprint_document_id|blueprint_image_path|overlay_/i.test(error.message ?? '');
}

function stripOverlayFields(update: Record<string, unknown>) {
  const next = { ...update };
  delete next.blueprint_document_id;
  delete next.blueprint_image_path;
  delete next.overlay_offset_x_ft;
  delete next.overlay_offset_y_ft;
  delete next.overlay_width_ft;
  delete next.overlay_depth_ft;
  return next;
}

function defaultBlueprintImagePath(name: unknown) {
  if (typeof name !== 'string') return null;
  return LOCAL_BLUEPRINT_ASSET_PATHS[name] ?? null;
}

function defaultCanvasWidth(name: unknown) {
  return typeof name === 'string' && name === 'Exterior' ? 80 : 50;
}

function defaultCanvasDepth(name: unknown) {
  return typeof name === 'string' && name === 'Exterior' ? 80 : 50;
}

function knownFloorNames() {
  return new Set(['Basement', 'Main Floor', 'Second Floor', 'Third Floor']);
}
