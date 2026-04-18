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
    
    // Explicitly mapping to exact database column names
    // OMITTING status and priority to let the database DEFAULTs take over
    // This is the safest way to satisfy check constraints if they are out of sync
    const insertData: any = {
      room: body.room || 'Other',
      "itemName": body.itemName || 'Unnamed Item',
      action: body.action || 'Bring',
      status: 'Not Packed',
      priority: body.priority || 'Medium',
      notes: body.notes || '',
      "createdAt": new Date().toISOString()
    };
    
    console.log('Final insert attempt (letting DB handle status/priority):', insertData);
    
    const { data, error } = await supabase
      .from('packing_items')
      .insert([insertData])
      .select()
      .single();
      
    if (error) {
      console.error('CRITICAL: Supabase insert error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API POST catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    // Explicitly handle fields to ensure casing and validity
    if (updateData.status) {
      const s = String(updateData.status).toLowerCase();
      if (s === 'resolved' || s === 'packed') {
        updateData.status = 'Packed'; 
      } else {
        updateData.status = 'Not Packed';
      }
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
