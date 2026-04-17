import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('packing_items')
    .select('*')
    .order('room', { ascending: true });
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room, itemName, action, status, notes, priority } = body;
    
    console.log('API: Creating inventory item:', body);

    const { data, error } = await supabase
      .from('packing_items')
      .insert([{
        room,
        itemName: itemName, // Quoted internally by Supabase JS if using this key
        action: action || 'Bring',
        status: status || 'Unresolved',
        notes: notes || null,
        priority: priority || 'Medium',
        createdAt: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error creating item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API Error in POST /api/packing:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, room, itemName, action, status, notes, priority } = body;
    
    console.log('API: Updating inventory item:', id, body);

    const { data, error } = await supabase
      .from('packing_items')
      .update({
        room,
        itemName,
        action,
        status,
        notes,
        priority
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error updating item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API Error in PATCH /api/packing:', err);
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
