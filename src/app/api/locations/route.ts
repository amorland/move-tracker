import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const mapToDB = (loc: any) => ({
  name: loc.name,
  address: loc.address,
  notes: loc.notes,
  category: loc.category,
  lat: loc.lat,
  lng: loc.lng
});

const mapFromDB = (loc: any) => ({
  id: loc.id,
  name: loc.name,
  address: loc.address,
  notes: loc.notes,
  category: loc.category,
  lat: loc.lat,
  lng: loc.lng,
  createdAt: loc.created_at
});

export async function GET() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('id', { ascending: true });
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(mapFromDB));
}

export async function POST(request: Request) {
  const body = await request.json();
  const dbLoc = mapToDB(body);
  
  const { data, error } = await supabase
    .from('locations')
    .insert([dbLoc])
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapFromDB(data));
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id } = body;
  const dbLoc = mapToDB(body);
  
  const { data, error } = await supabase
    .from('locations')
    .update(dbLoc)
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
    .from('locations')
    .delete()
    .eq('id', id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
