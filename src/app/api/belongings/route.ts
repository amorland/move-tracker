import { getSupabaseServer } from '@/lib/supabase';
import { removeBelongingLayoutItems, syncBelongingLayoutItem } from '@/lib/server/homeLayoutSync';
import type { Belonging, BelongingAction, BelongingSizeClass } from '@/lib/types';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('belongings')
    .select('*')
    .order('room', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalise));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const insert = stripPlacementFieldsForLegacy({
    room: body.room || 'Other',
    "itemName": body.itemName || 'Unnamed Item',
    action: body.action || 'Bring',
    status: 'unresolved',
    notes: body.notes || null,
    "createdAt": new Date().toISOString(),
    size_class: normaliseSizeClassInput(body.sizeClass),
    width_in: nullableNumberInput(body.widthIn),
    depth_in: nullableNumberInput(body.depthIn),
    height_in: nullableNumberInput(body.heightIn),
  });

  const { data, error } = await insertBelongingWithFallback(supabase, insert);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const saved = normalise(data);
  const sync = await syncBelongingLayoutItem(supabase, saved);
  if (sync.errors.length > 0) console.error('Belonging layout sync failed', sync.errors);
  return NextResponse.json(saved);
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { id, ...rest } = body;

  const update: Record<string, unknown> = {};
  if ('room' in rest) update.room = rest.room;
  if ('itemName' in rest) update['itemName'] = rest.itemName;
  if ('action' in rest) update.action = rest.action;
  if ('notes' in rest) update.notes = rest.notes;
  if ('status' in rest) {
    const s = String(rest.status).toLowerCase();
    update.status = (s === 'resolved') ? 'resolved' : 'unresolved';
  }
  if ('sizeClass' in rest) update.size_class = normaliseSizeClassInput(rest.sizeClass);
  if ('widthIn' in rest) update.width_in = nullableNumberInput(rest.widthIn);
  if ('depthIn' in rest) update.depth_in = nullableNumberInput(rest.depthIn);
  if ('heightIn' in rest) update.height_in = nullableNumberInput(rest.heightIn);

  const { data, error } = await updateBelongingWithFallback(supabase, Number(id), update);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const saved = normalise(data);
  const sync = await syncBelongingLayoutItem(supabase, saved);
  if (sync.errors.length > 0) console.error('Belonging layout sync failed', sync.errors);
  return NextResponse.json(saved);
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sync = await removeBelongingLayoutItems(supabase, Number(id));
  if (sync.errors.length > 0) return NextResponse.json({ error: sync.errors.join('; ') }, { status: 500 });

  const { error } = await supabase.from('belongings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>): Belonging {
  return {
    id: Number(row.id),
    room: String(row.room ?? 'Other'),
    itemName: String(row.itemName ?? row.item_name ?? 'Unnamed Item'),
    action: normaliseAction(row.action),
    status: String(row.status ?? 'unresolved') === 'resolved' ? 'resolved' : 'unresolved',
    sizeClass: normaliseSizeClass(row.size_class),
    widthIn: nullableNumber(row.width_in),
    depthIn: nullableNumber(row.depth_in),
    heightIn: nullableNumber(row.height_in),
    notes: row.notes === null || row.notes === undefined ? null : String(row.notes),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

function normaliseAction(value: unknown): BelongingAction {
  const action = String(value ?? 'Bring');
  return action === 'Sell' || action === 'Donate' || action === 'Trash' ? action : 'Bring';
}

function normaliseSizeClass(value: unknown): BelongingSizeClass {
  // Default to floorplan_item when the column is missing entirely (legacy DB)
  // so we don't silently strip every belonging from the layout. After the
  // migration runs, every row has a non-null value.
  if (value === undefined || value === null) return 'floorplan_item';
  return String(value) === 'floorplan_item' ? 'floorplan_item' : 'boxed';
}

function normaliseSizeClassInput(value: unknown): BelongingSizeClass {
  if (value === undefined || value === null) return 'boxed';
  return String(value) === 'floorplan_item' ? 'floorplan_item' : 'boxed';
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableNumberInput(value: unknown): number | null {
  return nullableNumber(value);
}

function isMissingPlacementColumnError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  return /size_class|width_in|depth_in|height_in/i.test(error.message ?? '');
}

function stripPlacementFieldsForLegacy(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.size_class;
  delete next.width_in;
  delete next.depth_in;
  delete next.height_in;
  return next;
}

async function insertBelongingWithFallback(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  const initial = await supabase
    .from('belongings')
    .insert([payload])
    .select()
    .single();

  if (!initial.error || !isMissingPlacementColumnError(initial.error)) return initial;

  return supabase
    .from('belongings')
    .insert([stripPlacementFieldsForLegacy(payload)])
    .select()
    .single();
}

async function updateBelongingWithFallback(
  supabase: SupabaseClient,
  id: number,
  update: Record<string, unknown>,
) {
  const initial = await supabase
    .from('belongings')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (!initial.error || !isMissingPlacementColumnError(initial.error)) return initial;

  return supabase
    .from('belongings')
    .update(stripPlacementFieldsForLegacy(update))
    .eq('id', id)
    .select()
    .single();
}
