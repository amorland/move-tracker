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
    
    // Explicit mapping to ensure database consistency
    const insertData = {
      room: body.room,
      itemName: body.itemName,
      action: body.action,
      status: body.status || 'Unresolved',
      notes: body.notes,
      priority: body.priority || 'Medium',
      createdAt: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('packing_items')
      .insert([insertData])
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    // Explicitly handle fields to ensure casing and validity
    if (updateData.status) {
      updateData.status = updateData.status === 'Resolved' ? 'Resolved' : 'Unresolved';
    }
    if (updateData.priority) {
      const p = updateData.priority;
      updateData.priority = (p === 'Low' || p === 'Medium' || p === 'High') ? p : 'Medium';
    }

    const { data, error } = await supabase
      .from('packing_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Supabase patch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API patch error:', err);
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
