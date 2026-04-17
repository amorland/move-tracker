import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const mapToDB = (doc: any) => ({
  task_id: doc.taskId,
  category_id: doc.categoryId,
  name: doc.name,
  url: doc.url,
  is_link: doc.isLink
});

const mapFromDB = (doc: any) => ({
  id: doc.id,
  taskId: doc.task_id,
  categoryId: doc.category_id,
  name: doc.name,
  url: doc.url,
  isLink: doc.is_link,
  createdAt: doc.created_at
});

export async function GET() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('id', { ascending: true });
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(mapFromDB));
}

export async function POST(request: Request) {
  const body = await request.json();
  const dbDoc = mapToDB(body);
  
  const { data, error } = await supabase
    .from('documents')
    .insert([dbDoc])
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapFromDB(data));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
