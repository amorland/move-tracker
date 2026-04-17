import { parseISO, addDays, isBefore, isEqual, differenceInDays } from 'date-fns';
import { MoveSettings } from './types';

export const getStatus = (date: string | null, isConfirmed: boolean) => {
  if (!date) return 'unset';
  return isConfirmed ? 'confirmed' : 'estimated';
};

export interface Milestone {
  key: keyof MoveSettings | 'confirmedMoveDate';
  label: string;
  date: string | null;
  confirmed: boolean;
  status: 'confirmed' | 'estimated' | 'unset';
}

export const getMilestones = (settings: MoveSettings): Milestone[] => {
  const milestones: Milestone[] = [
    { key: 'upackDropoffDate', label: 'U-Pack Dropoff (FL)', date: settings.upackDropoffDate, confirmed: settings.isUpackDropoffConfirmed, status: getStatus(settings.upackDropoffDate, settings.isUpackDropoffConfirmed) },
    { key: 'upackPickupDate', label: 'U-Pack Pickup (FL)', date: settings.upackPickupDate, confirmed: settings.isUpackPickupConfirmed, status: getStatus(settings.upackPickupDate, settings.isUpackPickupConfirmed) },
    { key: 'driveStartDate', label: 'Drive Start', date: settings.driveStartDate, confirmed: settings.isDriveStartConfirmed, status: getStatus(settings.driveStartDate, settings.isDriveStartConfirmed) },
    { key: 'closingDate', label: 'House Closing', date: settings.closingDate, confirmed: settings.isClosingDateConfirmed, status: getStatus(settings.closingDate, settings.isClosingDateConfirmed) },
    { key: 'arrivalDate', label: 'Arrival (NY)', date: settings.arrivalDate, confirmed: settings.isArrivalConfirmed, status: getStatus(settings.arrivalDate, settings.isArrivalConfirmed) },
    { key: 'upackDeliveryDate', label: 'U-Pack Delivery (NY)', date: settings.upackDeliveryDate, confirmed: settings.isUpackDeliveryConfirmed, status: getStatus(settings.upackDeliveryDate, settings.isUpackDeliveryConfirmed) },
    { key: 'upackFinalPickupDate', label: 'Final Pickup (NY)', date: settings.upackFinalPickupDate, confirmed: settings.isUpackFinalPickupConfirmed, status: getStatus(settings.upackFinalPickupDate, settings.isUpackFinalPickupConfirmed) },
    { key: 'confirmedMoveDate', label: 'Final Move Date', date: settings.confirmedMoveDate, confirmed: !!settings.confirmedMoveDate, status: settings.confirmedMoveDate ? 'confirmed' : 'unset' }
  ];

  return milestones.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return parseISO(a.date).getTime() - parseISO(b.date).getTime();
  });
};

export const validateDates = (settings: Partial<MoveSettings>): string | null => {
  const upackDropoffDate = settings.upackDropoffDate || null;
  const upackPickupDate = settings.upackPickupDate || null;
  const driveStartDate = settings.driveStartDate || null;
  const closingDate = settings.closingDate || null;
  const arrivalDate = settings.arrivalDate || null;
  const upackDeliveryDate = settings.upackDeliveryDate || null;
  const upackFinalPickupDate = settings.upackFinalPickupDate || null;
  const confirmedMoveDate = settings.confirmedMoveDate || null;

  // Rule: A date cannot be confirmed if it is not set.
  if (settings.isClosingDateConfirmed && !closingDate) return "House Closing date must be set before it can be confirmed.";
  if (settings.isUpackDropoffConfirmed && !upackDropoffDate) return "U-Pack Dropoff date must be set before it can be confirmed.";
  if (settings.isUpackPickupConfirmed && !upackPickupDate) return "U-Pack Pickup date must be set before it can be confirmed.";
  if (settings.isDriveStartConfirmed && !driveStartDate) return "Drive Start date must be set before it can be confirmed.";
  if (settings.isArrivalConfirmed && !arrivalDate) return "Arrival date must be set before it can be confirmed.";
  if (settings.isUpackDeliveryConfirmed && !upackDeliveryDate) return "U-Pack Delivery date must be set before it can be confirmed.";
  if (settings.isUpackFinalPickupConfirmed && !upackFinalPickupDate) return "Final Pickup date must be set before it can be confirmed.";

  // U-Pack rules
  if (upackDropoffDate && upackPickupDate) {
    const dropoff = parseISO(upackDropoffDate);
    const pickup = parseISO(upackPickupDate);
    
    // Rule: U-Pack dropoff must be before U-Pack pickup.
    if (!isBefore(dropoff, pickup)) return "U-Pack dropoff must be before U-Pack pickup.";
    
    // Rule: U-Pack pickup must be 3 days after U-Pack dropoff.
    if (differenceInDays(pickup, dropoff) !== 3) return "U-Pack pickup must be exactly 3 days after U-Pack dropoff.";
  }

  // Drive & Closing rules
  if (driveStartDate && closingDate) {
    // Rule: Drive start must be before house closing.
    if (!isBefore(parseISO(driveStartDate), parseISO(closingDate))) return "Drive start must be before house closing.";
  }

  if (arrivalDate && closingDate) {
    // Rule: Arrival must be before house closing.
    if (!isBefore(parseISO(arrivalDate), parseISO(closingDate))) return "Arrival must be before house closing.";
  }

  // Delivery rules
  if (upackDeliveryDate && closingDate) {
    // Rule: U-Pack delivery must be after house closing.
    if (!isBefore(parseISO(closingDate), parseISO(upackDeliveryDate)) && !isEqual(parseISO(closingDate), parseISO(upackDeliveryDate))) {
       // Allow same day? Prompt says "after", usually means strictly after or same day is okay? 
       // "U-Pack delivery must be after house closing" - usually means closing first.
    }
    if (isBefore(parseISO(upackDeliveryDate), parseISO(closingDate))) return "U-Pack delivery must be after house closing.";
  }

  if (upackFinalPickupDate && upackDeliveryDate) {
    const delivery = parseISO(upackDeliveryDate);
    const finalPickup = parseISO(upackFinalPickupDate);
    
    // Rule: Final pickup must be 3 days after U-Pack delivery (NY).
    if (differenceInDays(finalPickup, delivery) !== 3) return "Final pickup must be exactly 3 days after U-Pack delivery.";
  }

  return null;
};
