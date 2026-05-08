import { getSupabaseServer } from '@/lib/supabase';
import { getDocumentUrlKey } from '@/features/documents/documentKeys';
import type { DocumentRecord } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const provider = searchParams.get('provider');
  const q = searchParams.get('q')?.trim().toLowerCase() || '';

  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (provider) query = query.eq('provider', provider);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = ((data ?? []) as Record<string, unknown>[])
    .map(normalise)
    .filter(document => {
      if (!q) return true;
      return document.title.toLowerCase().includes(q)
        || document.url.toLowerCase().includes(q)
        || (document.notes ?? '').toLowerCase().includes(q)
        || (document.urlKey ?? '').toLowerCase().includes(q);
    });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const title = String(body.title ?? '').trim();
  const url = String(body.url ?? '').trim();
  if (!title || !url) return NextResponse.json({ error: 'Title and URL are required.' }, { status: 400 });

  const urlKey = getDocumentUrlKey(url);
  const existing = await findExistingDocumentByUrlKey(supabase, urlKey);
  if (existing) return NextResponse.json(normalise(existing));

  const payload = {
    title,
    provider: body.provider || 'google_drive',
    url,
    url_key: urlKey || null,
    mime_type: body.mimeType || null,
    category: body.category || 'other',
    notes: body.notes || null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await insertDocument(supabase, payload);

  if (error && isUniqueViolation(error)) {
    const duplicate = await findExistingDocumentByUrlKey(supabase, urlKey);
    if (duplicate) return NextResponse.json(normalise(duplicate));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data as Record<string, unknown>));
}

async function insertDocument(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const result = await supabase
    .from('documents')
    .insert([payload])
    .select()
    .single();

  if (!result.error || !String(result.error.message).includes('url_key')) return result;

  const fallbackPayload = { ...payload };
  delete fallbackPayload.url_key;
  return supabase
    .from('documents')
    .insert([fallbackPayload])
    .select()
    .single();
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();
  const { id, ...rest } = body;

  const update: Record<string, unknown> = {};
  if ('title' in rest) update.title = rest.title;
  if ('provider' in rest) update.provider = rest.provider;
  if ('url' in rest) {
    const url = String(rest.url ?? '').trim();
    const urlKey = getDocumentUrlKey(url);
    const existing = await findExistingDocumentByUrlKey(supabase, urlKey, Number(id));
    if (existing) {
      return NextResponse.json({ error: 'A document with this URL already exists.' }, { status: 409 });
    }
    update.url = url;
    update.url_key = urlKey || null;
  }
  if ('mimeType' in rest) update.mime_type = rest.mimeType;
  if ('category' in rest) update.category = rest.category;
  if ('notes' in rest) update.notes = rest.notes;

  let result = await supabase
    .from('documents')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (result.error && String(result.error.message).includes('url_key')) {
    const fallbackUpdate = { ...update };
    delete fallbackUpdate.url_key;
    result = await supabase
      .from('documents')
      .update(fallbackUpdate)
      .eq('id', id)
      .select()
      .single();
  }

  const { data, error } = result;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalise(data));
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normalise(row: Record<string, unknown>): DocumentRecord {
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    provider: row.provider === 'manual_link' ? 'manual_link' : 'google_drive',
    url: String(row.url ?? ''),
    urlKey: String(row.url_key ?? row.urlKey ?? getDocumentUrlKey(String(row.url ?? ''))),
    mimeType: row.mime_type || row.mimeType ? String(row.mime_type ?? row.mimeType) : null,
    category: isDocumentCategory(row.category) ? row.category : 'other',
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
  };
}

async function findExistingDocumentByUrlKey(supabase: SupabaseClient, urlKey: string, excludeId?: number) {
  if (!urlKey) return null;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Record<string, unknown>[]).find(row => {
    if (excludeId && Number(row.id) === excludeId) return false;
    const storedKey = row.url_key || row.urlKey ? String(row.url_key ?? row.urlKey) : '';
    const computedKey = getDocumentUrlKey(String(row.url ?? ''));
    return storedKey === urlKey || computedKey === urlKey;
  }) ?? null;
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === '23505' || String(error.message ?? '').toLowerCase().includes('duplicate key');
}

function isDocumentCategory(value: unknown): value is DocumentRecord['category'] {
  return typeof value === 'string'
    && ['contract', 'disclosure', 'loan', 'inspection', 'receipt', 'floorplan', 'project', 'other'].includes(value);
}
