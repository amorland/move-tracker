import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const mapToDB = (task: any) => ({
  category_id: task.categoryId,
  title: task.title,
  description: task.description,
  status: task.status,
  owner: task.owner,
  phase: task.phase,
  due_date: task.dueDate,
  completion_date: task.completionDate,
  scheduled_event_date: task.scheduledEventDate,
  scheduled_event_time_window: task.scheduledEventTimeWindow,
  notes: task.notes,
  order_index: task.orderIndex
});

const mapFromDB = (task: any) => ({
  id: task.id,
  categoryId: task.category_id,
  title: task.title,
  description: task.description,
  status: task.status,
  owner: task.owner,
  phase: task.phase,
  dueDate: task.due_date,
  completionDate: task.completion_date,
  scheduledEventDate: task.scheduled_event_date,
  scheduledEventTimeWindow: task.scheduled_event_time_window,
  notes: task.notes,
  orderIndex: task.order_index
});

export async function POST(request: Request) {
  const body = await request.json();
  const dbTask = mapToDB(body);
  
  const { data, error } = await supabase
    .from('tasks')
    .insert([dbTask])
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapFromDB(data));
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id } = body;
  const dbTask = mapToDB(body);
  
  const { data, error } = await supabase
    .from('tasks')
    .update(dbTask)
    .eq('id', id)
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
    .from('tasks')
    .delete()
    .eq('id', id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
