import { getSupabaseServer } from '@/lib/supabase';
import type { ArchitecturalElement, ArchitecturalElementSource, ArchitecturalElementType } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const floorPlanId = searchParams.get('floorPlanId');
  const roomId = searchParams.get('roomId');

  let query = supabase
    .from('architectural_elements')
    .select('*')
    .order('sort_index', { ascending: true })
    .order('id', { ascending: true });

  if (floorPlanId) query = query.eq('floor_plan_id', Number(floorPlanId));
  if (roomId) query = query.eq('room_id', Number(roomId));

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

  const { data: last } = await supabase
    .from('architectural_elements')
    .select('sort_index')
    .order('sort_index', { ascending: false })
    .limit(1)
    .single();

  const elementType = normaliseElementType(body.elementType);
  const defaults = defaultDimensionsForType(elementType);
  const insert = {
    floor_plan_id: body.floorPlanId,
    room_id: body.roomId ?? null,
    element_type: elementType,
    label: body.label || defaultLabelForType(elementType),
    x_ft: body.xFt ?? 1,
    y_ft: body.yFt ?? 1,
    width_ft: body.widthFt ?? defaults.widthFt,
    depth_ft: body.depthFt ?? defaults.depthFt,
    rotation_deg: body.rotationDeg ?? 0,
    source: normaliseElementSource(body.source),
    source_key: nullableString(body.sourceKey),
    notes: body.notes || null,
    sort_index: body.sortIndex ?? (last?.sort_index ?? -1) + 1,
  };

  let { data, error } = await supabase
    .from('architectural_elements')
    .insert([insert])
    .select()
    .single();

  if (error && isMissingSourceColumnError(error)) {
    const retry = await supabase
      .from('architectural_elements')
      .insert([stripArchitecturalSourceFields(insert)])
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
  if ('floorPlanId' in rest) update.floor_plan_id = rest.floorPlanId;
  if ('roomId' in rest) update.room_id = rest.roomId;
  if ('elementType' in rest) update.element_type = normaliseElementType(rest.elementType);
  if ('label' in rest) update.label = rest.label;
  if ('xFt' in rest) update.x_ft = rest.xFt;
  if ('yFt' in rest) update.y_ft = rest.yFt;
  if ('widthFt' in rest) update.width_ft = rest.widthFt;
  if ('depthFt' in rest) update.depth_ft = rest.depthFt;
  if ('rotationDeg' in rest) update.rotation_deg = rest.rotationDeg;
  if ('source' in rest) update.source = normaliseElementSource(rest.source);
  if ('sourceKey' in rest) update.source_key = nullableString(rest.sourceKey);
  if ('notes' in rest) update.notes = rest.notes;
  if ('sortIndex' in rest) update.sort_index = rest.sortIndex;
  if ('wallId' in rest) update.wall_id = rest.wallId === null ? null : Number(rest.wallId);
  if ('offsetAlongWallFt' in rest) update.offset_along_wall_ft = nullableNumber(rest.offsetAlongWallFt);

  let { data, error } = await supabase
    .from('architectural_elements')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error && isMissingSourceColumnError(error)) {
    const retry = await supabase
      .from('architectural_elements')
      .update(stripArchitecturalSourceFields(update))
      .eq('id', id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('architectural_elements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>): ArchitecturalElement {
  return {
    id: Number(row.id),
    floorPlanId: Number(row.floor_plan_id ?? row.floorPlanId),
    roomId: nullableNumber(row.room_id ?? row.roomId),
    elementType: normaliseElementType(row.element_type ?? row.elementType),
    label: String(row.label ?? defaultLabelForType(normaliseElementType(row.element_type ?? row.elementType))),
    xFt: nullableNumber(row.x_ft ?? row.xFt) ?? 0,
    yFt: nullableNumber(row.y_ft ?? row.yFt) ?? 0,
    widthFt: nullableNumber(row.width_ft ?? row.widthFt) ?? 1,
    depthFt: nullableNumber(row.depth_ft ?? row.depthFt) ?? 0.25,
    rotationDeg: nullableNumber(row.rotation_deg ?? row.rotationDeg) ?? 0,
    source: normaliseElementSource(row.source),
    sourceKey: nullableString(row.source_key ?? row.sourceKey),
    notes: nullableString(row.notes),
    sortIndex: nullableNumber(row.sort_index ?? row.sortIndex) ?? 0,
    wallId: nullableNumber(row.wall_id ?? row.wallId),
    offsetAlongWallFt: nullableNumber(row.offset_along_wall_ft ?? row.offsetAlongWallFt),
  };
}

function normaliseElementType(value: unknown): ArchitecturalElementType {
  const type = String(value ?? 'fixture');
  if (
    type === 'door' ||
    type === 'window' ||
    type === 'opening' ||
    type === 'wall' ||
    type === 'stairs' ||
    type === 'closet' ||
    type === 'laundry' ||
    type === 'porch' ||
    type === 'storage' ||
    type === 'counter' ||
    type === 'cabinet' ||
    type === 'sink' ||
    type === 'toilet' ||
    type === 'shower' ||
    type === 'tub' ||
    type === 'appliance' ||
    type === 'fixture'
  ) {
    return type;
  }
  return 'fixture';
}

function normaliseElementSource(value: unknown): ArchitecturalElementSource {
  return String(value ?? 'manual') === 'recommended' ? 'recommended' : 'manual';
}

function defaultLabelForType(type: ArchitecturalElementType) {
  return type.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function defaultDimensionsForType(type: ArchitecturalElementType) {
  if (type === 'wall') return { widthFt: 8, depthFt: 0.25 };
  if (type === 'door' || type === 'opening') return { widthFt: 3, depthFt: 0.25 };
  if (type === 'window') return { widthFt: 4, depthFt: 0.2 };
  if (type === 'stairs') return { widthFt: 6, depthFt: 10 };
  if (type === 'closet') return { widthFt: 4, depthFt: 2.5 };
  if (type === 'laundry') return { widthFt: 5, depthFt: 3 };
  if (type === 'porch') return { widthFt: 12, depthFt: 6 };
  if (type === 'storage') return { widthFt: 5, depthFt: 5 };
  if (type === 'counter' || type === 'cabinet') return { widthFt: 6, depthFt: 2 };
  if (type === 'sink' || type === 'toilet') return { widthFt: 2.5, depthFt: 2 };
  if (type === 'shower') return { widthFt: 3, depthFt: 3 };
  if (type === 'tub') return { widthFt: 5, depthFt: 2.5 };
  if (type === 'appliance') return { widthFt: 3, depthFt: 2.5 };
  return { widthFt: 2, depthFt: 2 };
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || /architectural_elements/i.test(error.message ?? '') && /does not exist|not found/i.test(error.message ?? '');
}

function isMissingSourceColumnError(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /source_key|source/i.test(error.message ?? '');
}

function stripArchitecturalSourceFields(update: Record<string, unknown>) {
  const legacyUpdate = { ...update };
  delete legacyUpdate.source;
  delete legacyUpdate.source_key;
  return legacyUpdate;
}
