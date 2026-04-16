import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('orderIndex', { ascending: true });
    
  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .order('orderIndex', { ascending: true });

  if (catError || taskError) {
    return NextResponse.json({ error: catError?.message || taskError?.message }, { status: 500 });
  }

  return NextResponse.json({ categories, tasks });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, orderIndex } = body;
  
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, orderIndex: orderIndex || 0 }])
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
