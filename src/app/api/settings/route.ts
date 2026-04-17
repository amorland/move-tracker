import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { validateDates } from '@/lib/dateUtils';
import { MoveSettings } from '@/lib/types';

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  
  // Remove id from update if present
  const { id, ...updateData } = body;

  // Get current settings to validate combined state
  const { data: currentSettings } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  const mergedSettings = { ...currentSettings, ...updateData };
  const validationError = validateDates(mergedSettings);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('settings')
    .update(updateData)
    .eq('id', 1)
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
