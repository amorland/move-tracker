import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('createdAt', { ascending: true });
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, address, notes, category, lat, lng } = body;
  
  const { data, error } = await supabase
    .from('locations')
    .insert([{
      name,
      address,
      notes: notes || null,
      category,
      lat: lat || null,
      lng: lng || null,
      createdAt: new Date().toISOString()
    }])
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, name, address, notes, category, lat, lng } = body;
  
  const { data, error } = await supabase
    .from('locations')
    .update({
      name,
      address,
      notes,
      category,
      lat,
      lng
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
    .from('locations')
    .delete()
    .eq('id', id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
