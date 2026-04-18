import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Helper to map frontend camelCase keys to actual database column names
async function getMappedData(tableName: string, inputData: any) {
  const { data: sample } = await supabase.from(tableName).select('*').limit(1);
  if (!sample || sample.length === 0) {
    // If no data, we can't easily probe, so return as is or try to probe with a fake query
    return inputData;
  }
  
  const actualColumns = Object.keys(sample[0]);
  const mappedData: any = {};
  
  for (const [key, value] of Object.entries(inputData)) {
    // 1. Try exact match
    if (actualColumns.includes(key)) {
      mappedData[key] = value;
      continue;
    }
    
    // 2. Try lowercase match (Postgres default)
    const lowerKey = key.toLowerCase();
    if (actualColumns.includes(lowerKey)) {
      mappedData[lowerKey] = value;
      continue;
    }
    
    // 3. Try snake_case match (common mapping)
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (actualColumns.includes(snakeKey)) {
      mappedData[snakeKey] = value;
      continue;
    }
    
    // Fallback: keep as is if no match found
    mappedData[key] = value;
  }
  
  return mappedData;
}

export async function GET() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('orderIndex', { ascending: true });
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
    
    const rawData: any = {
      title: body.title || 'New Task',
      description: body.description || '',
      status: body.status || 'Not Started',
      owner: body.owner || 'Both',
      phase: body.phase || 'Both',
      notes: body.notes || '',
      orderIndex: nextOrderIndex,
      categoryId: body.categoryId
    };

    if (body.dueDate) rawData.dueDate = body.dueDate;
    if (body.completionDate) rawData.completionDate = body.completionDate;
    if (body.scheduledEventDate) rawData.scheduledEventDate = body.scheduledEventDate;
    if (body.scheduledEventTimeWindow) rawData.scheduledEventTimeWindow = body.scheduledEventTimeWindow;
    
    // Discover actual columns and map them
    const insertData = await getMappedData('tasks', rawData);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([insertData])
      .select()
      .single();
      
    if (error) {
      console.error('Task POST error:', error);
      return NextResponse.json({ error: error.message, detail: error }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateDataRaw } = body;
    
    const updateData = await getMappedData('tasks', updateDataRaw);
    
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
