import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const mapToDB = (item: any) => ({
  room: item.room,
  item_name: item.itemName,
  action: item.action,
  status: item.status,
  notes: item.notes,
  priority: item.priority
});

const mapFromDB = (item: any) => ({
  id: item.id,
  room: item.room,
  itemName: item.item_name,
  action: item.action,
  status: item.status,
  notes: item.notes,
  priority: item.priority,
  createdAt: item.created_at
});

export async function GET() {
  const { data, error } = await supabase
    .from('packing_items')
    .select('*')
    .order('room', { ascending: true });
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(mapFromDB));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dbItem = mapToDB(body);
    
    const { data, error } = await supabase
      .from('packing_items')
      .insert([dbItem])
      .select()
      .single();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(mapFromDB(data));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    const dbItem = mapToDB(body);

    const { data, error } = await supabase
      .from('packing_items')
      .update(dbItem)
      .eq('id', id)
      .select()
      .single();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(mapFromDB(data));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('id', id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
