import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { validateDates } from '@/lib/dateUtils';

const mapToDB = (s: any) => ({
  earliest_move_date: s.earliestMoveDate,
  latest_move_date: s.latestMoveDate,
  closing_date: s.closingDate,
  is_closing_date_confirmed: s.isClosingDateConfirmed,
  upack_dropoff_date: s.upackDropoffDate,
  is_upack_dropoff_confirmed: s.isUpackDropoffConfirmed,
  upack_pickup_date: s.upackPickupDate,
  is_upack_pickup_confirmed: s.isUpackPickupConfirmed,
  drive_start_date: s.driveStartDate,
  is_drive_start_confirmed: s.isDriveStartConfirmed,
  arrival_date: s.arrivalDate,
  is_arrival_confirmed: s.isArrivalConfirmed,
  upack_delivery_date: s.upackDeliveryDate,
  is_upack_delivery_confirmed: s.isUpackDeliveryConfirmed,
  upack_final_pickup_date: s.upackFinalPickupDate,
  is_upack_final_pickup_confirmed: s.isUpackFinalPickupConfirmed
});

const mapFromDB = (s: any) => ({
  id: s.id,
  earliestMoveDate: s.earliest_move_date,
  latestMoveDate: s.latest_move_date,
  closingDate: s.closing_date,
  isClosingDateConfirmed: s.is_closing_date_confirmed,
  upackDropoffDate: s.upack_dropoff_date,
  isUpackDropoffConfirmed: s.is_upack_dropoff_confirmed,
  upackPickupDate: s.upack_pickup_date,
  isUpackPickupConfirmed: s.is_upack_pickup_confirmed,
  driveStartDate: s.drive_start_date,
  isDriveStartConfirmed: s.is_drive_start_confirmed,
  arrivalDate: s.arrival_date,
  isArrivalConfirmed: s.is_arrival_confirmed,
  upackDeliveryDate: s.upack_delivery_date,
  isUpackDeliveryConfirmed: s.is_upack_delivery_confirmed,
  upackFinalPickupDate: s.upack_final_pickup_date,
  isUpackFinalPickupConfirmed: s.is_upack_final_pickup_confirmed
});

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings = mapFromDB(data);

  // FORCE SANITIZE: Fix existing bad data in DB
  let needsFix = false;
  const updates: any = {};
  if (settings.isClosingDateConfirmed && !settings.closingDate) { updates.is_closing_date_confirmed = false; needsFix = true; }
  if (settings.isUpackDropoffConfirmed && !settings.upackDropoffDate) { updates.is_upack_dropoff_confirmed = false; needsFix = true; }
  if (settings.isUpackPickupConfirmed && !settings.upackPickupDate) { updates.is_upack_pickup_confirmed = false; needsFix = true; }
  if (settings.isDriveStartConfirmed && !settings.driveStartDate) { updates.is_drive_start_confirmed = false; needsFix = true; }
  if (settings.isArrivalConfirmed && !settings.arrivalDate) { updates.is_arrival_confirmed = false; needsFix = true; }
  if (settings.isUpackDeliveryConfirmed && !settings.upackDeliveryDate) { updates.is_upack_delivery_confirmed = false; needsFix = true; }
  if (settings.isUpackFinalPickupConfirmed && !settings.upackFinalPickupDate) { updates.is_upack_final_pickup_confirmed = false; needsFix = true; }

  if (needsFix) {
    await supabase.from('settings').update(updates).eq('id', 1);
    return NextResponse.json({ ...settings, ...mapFromDB(updates) });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  
  // Get current settings to validate combined state
  const { data: currentDB } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  const currentSettings = mapFromDB(currentDB);
  const mergedSettings = { ...currentSettings, ...body };
  
  const validationError = validateDates(mergedSettings);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const dbUpdate = mapToDB(body);
  const { data, error } = await supabase
    .from('settings')
    .update(dbUpdate)
    .eq('id', 1)
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapFromDB(data));
}
