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
  
  // EMERGENCY CLEANUP: If ANY field is confirmed but has no date, unconfirm it automatically to unblock the user
  if (mergedSettings.isClosingDateConfirmed && !mergedSettings.closingDate) mergedSettings.isClosingDateConfirmed = false;
  if (mergedSettings.isUpackDropoffConfirmed && !mergedSettings.upackDropoffDate) mergedSettings.isUpackDropoffConfirmed = false;
  if (mergedSettings.isUpackPickupConfirmed && !mergedSettings.upackPickupDate) mergedSettings.isUpackPickupConfirmed = false;
  if (mergedSettings.isDriveStartConfirmed && !mergedSettings.driveStartDate) mergedSettings.isDriveStartConfirmed = false;
  if (mergedSettings.isArrivalConfirmed && !mergedSettings.arrivalDate) mergedSettings.isArrivalConfirmed = false;
  if (mergedSettings.isUpackDeliveryConfirmed && !mergedSettings.upackDeliveryDate) mergedSettings.isUpackDeliveryConfirmed = false;
  if (mergedSettings.isUpackFinalPickupConfirmed && !mergedSettings.upackFinalPickupDate) mergedSettings.isUpackFinalPickupConfirmed = false;

  console.log('Validating settings:', JSON.stringify(mergedSettings, null, 2));
  const validationError = validateDates(mergedSettings);
  if (validationError) {
    console.error('Validation failed:', validationError);
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
