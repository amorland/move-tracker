import { parseISO, isBefore, differenceInDays } from 'date-fns';
import { MoveSettings } from './types';

export const getStatus = (date: string | null, isConfirmed: boolean) => {
  if (!date) return 'unset';
  return isConfirmed ? 'confirmed' : 'estimated';
};

export interface Milestone {
  key: keyof MoveSettings;
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
    { key: 'upackFinalPickupDate', label: 'U-Pack Final Pickup (NY)', date: settings.upackFinalPickupDate, confirmed: settings.isUpackFinalPickupConfirmed, status: getStatus(settings.upackFinalPickupDate, settings.isUpackFinalPickupConfirmed) }
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

  // Rule: A date cannot be confirmed if it is not set.
  if (settings.isClosingDateConfirmed === true && !closingDate) return "House Closing date must be set before it can be confirmed.";
  if (settings.isUpackDropoffConfirmed === true && !upackDropoffDate) return "U-Pack Dropoff date must be set before it can be confirmed.";
  if (settings.isUpackPickupConfirmed === true && !upackPickupDate) return "U-Pack Pickup date must be set before it can be confirmed.";
  if (settings.isDriveStartConfirmed === true && !driveStartDate) return "Drive Start date must be set before it can be confirmed.";
  if (settings.isArrivalConfirmed === true && !arrivalDate) return "Arrival date must be set before it can be confirmed.";
  if (settings.isUpackDeliveryConfirmed === true && !upackDeliveryDate) return "U-Pack Delivery date must be set before it can be confirmed.";
  if (settings.isUpackFinalPickupConfirmed === true && !upackFinalPickupDate) return "U-Pack Final Pickup date must be set before it can be confirmed.";

  // TRANSITIVE RULES: Only enforced if BOTH sides are confirmed.
  
  // U-Pack rules
  if (settings.isUpackDropoffConfirmed === true && settings.isUpackPickupConfirmed === true && upackDropoffDate && upackPickupDate) {
    const dropoff = parseISO(upackDropoffDate);
    const pickup = parseISO(upackPickupDate);
    if (!isBefore(dropoff, pickup)) return "CONFIRMED ERROR: U-Pack dropoff must be before U-Pack pickup.";
    if (differenceInDays(pickup, dropoff) !== 3) return "CONFIRMED ERROR: U-Pack pickup must be exactly 3 days after U-Pack dropoff.";
  }

  // Drive & Closing rules
  if (settings.isDriveStartConfirmed === true && settings.isClosingDateConfirmed === true && driveStartDate && closingDate) {
    if (!isBefore(parseISO(driveStartDate), parseISO(closingDate))) return "CONFIRMED ERROR: Drive start must be before house closing.";
  }

  if (settings.isArrivalConfirmed === true && settings.isClosingDateConfirmed === true && arrivalDate && closingDate) {
    if (!isBefore(parseISO(arrivalDate), parseISO(closingDate))) return "CONFIRMED ERROR: Arrival must be before house closing.";
  }

  // Delivery rules
  if (settings.isUpackDeliveryConfirmed === true && settings.isClosingDateConfirmed === true && upackDeliveryDate && closingDate) {
    if (isBefore(parseISO(upackDeliveryDate), parseISO(closingDate))) return "CONFIRMED ERROR: U-Pack delivery must be after house closing.";
  }

  if (settings.isUpackFinalPickupConfirmed === true && settings.isUpackDeliveryConfirmed === true && upackFinalPickupDate && upackDeliveryDate) {
    const delivery = parseISO(upackDeliveryDate);
    const finalPickup = parseISO(upackFinalPickupDate);
    if (differenceInDays(finalPickup, delivery) !== 3) return "CONFIRMED ERROR: Final pickup must be exactly 3 days after U-Pack delivery.";
  }

  return null;
};
