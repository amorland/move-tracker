import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { validateDates } from '@/lib/dateUtils';

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // FORCE SANITIZE: Fix existing bad data in DB
  let needsFix = false;
  const updates: any = {};
  if (data.isClosingDateConfirmed && !data.closingDate) { updates.isClosingDateConfirmed = false; needsFix = true; }
  if (data.isUpackDropoffConfirmed && !data.upackDropoffDate) { updates.isUpackDropoffConfirmed = false; needsFix = true; }
  if (data.isUpackPickupConfirmed && !data.upackPickupDate) { updates.isUpackPickupConfirmed = false; needsFix = true; }
  if (data.isDriveStartConfirmed && !data.driveStartDate) { updates.isDriveStartConfirmed = false; needsFix = true; }
  if (data.isArrivalConfirmed && !data.arrivalDate) { updates.isArrivalConfirmed = false; needsFix = true; }
  if (data.isUpackDeliveryConfirmed && !data.upackDeliveryDate) { updates.isUpackDeliveryConfirmed = false; needsFix = true; }
  if (data.isUpackFinalPickupConfirmed && !data.upackFinalPickupDate) { updates.isUpackFinalPickupConfirmed = false; needsFix = true; }

  if (needsFix) {
    await supabase.from('settings').update(updates).eq('id', 1);
    return NextResponse.json({ ...data, ...updates });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
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
