import { getSupabaseServer } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const documentId = searchParams.get('documentId');

  let query = supabase
    .from('document_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', Number(entityId));
  if (documentId) query = query.eq('document_id', Number(documentId));

  const { data: links, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (links ?? []) as Record<string, unknown>[];
  const ids = [...new Set(rows.map(row => Number(row.document_id ?? row.documentId)).filter(Boolean))];
  if (!ids.length) return NextResponse.json([]);

  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('*')
    .in('id', ids);

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  const docsById = new Map(((documents ?? []) as Record<string, unknown>[]).map(doc => [Number(doc.id), normaliseDocument(doc)]));
  return NextResponse.json(rows.map(row => normaliseLink(row, docsById.get(Number(row.document_id ?? row.documentId)))));
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const documentId = Number(body.documentId);
  const entityType = String(body.entityType ?? '');
  const entityId = Number(body.entityId);
  if (!documentId || !entityType || !entityId) {
    return NextResponse.json({ error: 'documentId, entityType, and entityId are required.' }, { status: 400 });
  }

  const existing = await findExistingLink(supabase, documentId, entityType, entityId);
  if (existing) return NextResponse.json(normaliseLink(existing));

  const { data, error } = await supabase
    .from('document_links')
    .insert([{
      document_id: documentId,
      entity_type: entityType,
      entity_id: entityId,
      label: body.label || null,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error && isUniqueViolation(error)) {
    const duplicate = await findExistingLink(supabase, documentId, entityType, entityId);
    if (duplicate) return NextResponse.json(normaliseLink(duplicate));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normaliseLink(data));
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('document_links').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function normaliseLink(row: Record<string, unknown>, document?: Record<string, unknown>) {
  return {
    id: row.id,
    documentId: row.document_id ?? row.documentId,
    entityType: row.entity_type ?? row.entityType,
    entityId: row.entity_id ?? row.entityId,
    label: row.label ?? null,
    createdAt: row.created_at ?? row.createdAt ?? '',
    ...(document ? { document } : {}),
  };
}

function normaliseDocument(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider ?? 'google_drive',
    url: row.url,
    urlKey: row.url_key ?? row.urlKey ?? null,
    mimeType: row.mime_type ?? row.mimeType ?? null,
    category: row.category ?? 'other',
    notes: row.notes ?? null,
    createdAt: row.created_at ?? row.createdAt ?? '',
  };
}

async function findExistingLink(supabase: SupabaseClient, documentId: number, entityType: string, entityId: number) {
  const { data, error } = await supabase
    .from('document_links')
    .select('*')
    .eq('document_id', documentId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .limit(1);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows[0] ?? null;
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === '23505' || String(error.message ?? '').toLowerCase().includes('duplicate key');
}
