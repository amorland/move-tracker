import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('orderIndex', { ascending: true });
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ...insertData } = body;
    
    // Ensure orderIndex is present as it's NOT NULL in DB
    if (insertData.orderIndex === undefined) {
      const { data: lastTask } = await supabase
        .from('tasks')
        .select('orderIndex')
        .order('orderIndex', { ascending: false })
        .limit(1)
        .single();
        
      insertData.orderIndex = (lastTask?.orderIndex ?? -1) + 1;
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([insertData])
      .select()
      .single();
      
    if (error) {
      console.error('Task POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Task PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
