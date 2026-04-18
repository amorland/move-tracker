import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('orderIndex', { ascending: true });
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Include column names in a custom header for debugging
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const response = NextResponse.json(data);
  response.headers.set('x-debug-columns', columns.join(','));
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data: lastTask } = await supabase
      .from('tasks')
      .select('orderIndex')
      .order('orderIndex', { ascending: false })
      .limit(1)
      .single();
    
    const nextOrderIndex = (lastTask?.orderIndex ?? -1) + 1;
    
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

    if (body.dueDate) insertData.dueDate = body.dueDate;
    if (body.completionDate) insertData.completionDate = body.completionDate;
    if (body.scheduledEventDate) insertData.scheduledEventDate = body.scheduledEventDate;
    if (body.scheduledEventTimeWindow) insertData.scheduledEventTimeWindow = body.scheduledEventTimeWindow;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([insertData])
      .select()
      .single();
      
    if (error) {
      // If we fail, try to fetch one row just to see the columns
      const { data: sample } = await supabase.from('tasks').select('*').limit(1);
      const actualColumns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
      
      console.error('Task POST error. Expected columns vs Actual:', { 
        attempted: Object.keys(insertData), 
        actual: actualColumns 
      });

      return NextResponse.json({ 
        error: error.message, 
        debug_expected: Object.keys(insertData),
        debug_actual: actualColumns,
        detail: error 
      }, { status: 500 });
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
