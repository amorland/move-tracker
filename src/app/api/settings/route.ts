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
  
  // Remove id from update if present
  const { id, ...updateData } = body;

  // Get current settings to validate combined state
  const { data: currentSettings } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  const mergedSettings = { ...currentSettings, ...updateData };
  
  // EMERGENCY CLEANUP: If ANY field is confirmed but has no date, unconfirm it automatically to unblock the user
  if (mergedSettings.isClosingDateConfirmed && !mergedSettings.closingDate) mergedSettings.isClosingDateConfirmed = false;
  if (mergedSettings.isUpackDropoffConfirmed && !mergedSettings.upackDropoffDate) mergedSettings.isUpackDropoffConfirmed = false;
  if (mergedSettings.isUpackPickupConfirmed && !mergedSettings.upackPickupDate) mergedSettings.isUpackPickupConfirmed = false;
  if (mergedSettings.isDriveStartConfirmed && !mergedSettings.driveStartDate) mergedSettings.isDriveStartConfirmed = false;
  if (mergedSettings.isArrivalConfirmed && !mergedSettings.arrivalDate) mergedSettings.isArrivalConfirmed = false;
  if (mergedSettings.isUpackDeliveryConfirmed && !mergedSettings.upackDeliveryDate) mergedSettings.isUpackDeliveryConfirmed = false;
  if (mergedSettings.isUpackFinalPickupConfirmed && !mergedSettings.upackFinalPickupDate) mergedSettings.isUpackFinalPickupConfirmed = false;

  const validationError = validateDates(mergedSettings);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Update updateData to include any cleanup we did
  const finalUpdateData = { ...updateData };
  if (!mergedSettings.isClosingDateConfirmed && currentSettings.isClosingDateConfirmed) finalUpdateData.isClosingDateConfirmed = false;
  if (!mergedSettings.isUpackDropoffConfirmed && currentSettings.isUpackDropoffConfirmed) finalUpdateData.isUpackDropoffConfirmed = false;
  if (!mergedSettings.isUpackPickupConfirmed && currentSettings.isUpackPickupConfirmed) finalUpdateData.isUpackPickupConfirmed = false;
  if (!mergedSettings.isDriveStartConfirmed && currentSettings.isDriveStartConfirmed) finalUpdateData.isDriveStartConfirmed = false;
  if (!mergedSettings.isArrivalConfirmed && currentSettings.isArrivalConfirmed) finalUpdateData.isArrivalConfirmed = false;
  if (!mergedSettings.isUpackDeliveryConfirmed && currentSettings.isUpackDeliveryConfirmed) finalUpdateData.isUpackDeliveryConfirmed = false;
  if (!mergedSettings.isUpackFinalPickupConfirmed && currentSettings.isUpackFinalPickupConfirmed) finalUpdateData.isUpackFinalPickupConfirmed = false;

  const { data, error } = await supabase
    .from('settings')
    .update(finalUpdateData)
    .eq('id', 1)
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
