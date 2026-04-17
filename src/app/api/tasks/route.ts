import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { categoryId, title, description, status, owner, phase, dueDate, completionDate, scheduledEventDate, scheduledEventTimeWindow, notes, orderIndex } = body;
  
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      categoryId,
      title,
      description: description || null,
      status: status || 'Not Started',
      owner: owner || 'Both',
      phase: phase || 'Both',
      dueDate: dueDate || null,
      completionDate: completionDate || null,
      scheduledEventDate: scheduledEventDate || null,
      scheduledEventTimeWindow: scheduledEventTimeWindow || null,
      notes: notes || null,
      orderIndex: orderIndex || 0
    }])
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, categoryId, title, description, status, owner, phase, dueDate, completionDate, scheduledEventDate, scheduledEventTimeWindow, notes, orderIndex } = body;
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      categoryId,
      title,
      description,
      status,
      owner,
      phase,
      dueDate,
      completionDate,
      scheduledEventDate,
      scheduledEventTimeWindow,
      notes,
      orderIndex
    })
    .eq('id', id)
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
