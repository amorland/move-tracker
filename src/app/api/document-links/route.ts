import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

  const rows = links ?? [];
  const ids = [...new Set(rows.map((row: any) => Number(row.document_id)).filter(Boolean))];
  if (!ids.length) return NextResponse.json([]);

  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('*')
    .in('id', ids);

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  const docsById = new Map((documents ?? []).map((doc: any) => [Number(doc.id), normaliseDocument(doc)]));
  return NextResponse.json(rows.map((row: any) => normaliseLink(row, docsById.get(Number(row.document_id)))));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await supabase
    .from('document_links')
    .insert([{
      document_id: body.documentId,
      entity_type: body.entityType,
      entity_id: body.entityId,
      label: body.label || null,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normaliseLink(data));
}

export async function DELETE(request: Request) {
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
    mimeType: row.mime_type ?? row.mimeType ?? null,
    category: row.category ?? 'other',
    notes: row.notes ?? null,
    createdAt: row.created_at ?? row.createdAt ?? '',
  };
}
