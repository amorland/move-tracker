import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('orderIndex', { ascending: true });
    
  if (data && data.length > 0) {
    console.log('DEBUG: Actual Task columns from DB:', Object.keys(data[0]));
  }
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Explicitly fetch the current max orderIndex to avoid NOT NULL constraint errors
    const { data: lastTask } = await supabase
      .from('tasks')
      .select('orderIndex')
      .order('orderIndex', { ascending: false })
      .limit(1)
      .single();
    
    const nextOrderIndex = (lastTask?.orderIndex ?? -1) + 1;
    
    // Explicitly map all columns to match the database exactly
    const insertData: any = {
      title: body.title || 'New Task',
      description: body.description || '',
      status: body.status || 'Not Started',
      owner: body.owner || 'Both',
      phase: body.phase || 'Both',
      notes: body.notes || '',
      orderIndex: nextOrderIndex,
      categoryId: body.categoryId
    };

    // Only add date fields if they have a truthy value to avoid potential column-not-found issues with nulls if PostgREST cache is stale
    if (body.dueDate) insertData.dueDate = body.dueDate;
    if (body.completionDate) insertData.completionDate = body.completionDate;
    if (body.scheduledEventDate) insertData.scheduledEventDate = body.scheduledEventDate;
    if (body.scheduledEventTimeWindow) insertData.scheduledEventTimeWindow = body.scheduledEventTimeWindow;
    
    console.log('Final task insertData:', insertData);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([insertData])
      .select()
      .single();
      
    if (error) {
      console.error('Task POST error detail:', error);
      return NextResponse.json({ error: error.message, detail: error }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Task POST catch error:', err);
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
