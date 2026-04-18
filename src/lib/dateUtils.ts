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

export const getMilestones = (settings: MoveSettings): Milestone[] => [
  { key: 'upackDropoffDate', label: 'U-Pack Dropoff (FL)', date: settings.upackDropoffDate, confirmed: settings.isUpackDropoffConfirmed, status: getStatus(settings.upackDropoffDate, settings.isUpackDropoffConfirmed) },
  { key: 'upackPickupDate', label: 'U-Pack Pickup (FL)', date: settings.upackPickupDate, confirmed: settings.isUpackPickupConfirmed, status: getStatus(settings.upackPickupDate, settings.isUpackPickupConfirmed) },
  { key: 'driveStartDate', label: 'Drive Start', date: settings.driveStartDate, confirmed: settings.isDriveStartConfirmed, status: getStatus(settings.driveStartDate, settings.isDriveStartConfirmed) },
  { key: 'arrivalDate', label: 'Arrival (NY)', date: settings.arrivalDate, confirmed: settings.isArrivalConfirmed, status: getStatus(settings.arrivalDate, settings.isArrivalConfirmed) },
  { key: 'closingDate', label: 'House Closing', date: settings.closingDate, confirmed: settings.isClosingDateConfirmed, status: getStatus(settings.closingDate, settings.isClosingDateConfirmed) },
  { key: 'upackDeliveryDate', label: 'U-Pack Delivery (NY)', date: settings.upackDeliveryDate, confirmed: settings.isUpackDeliveryConfirmed, status: getStatus(settings.upackDeliveryDate, settings.isUpackDeliveryConfirmed) },
  { key: 'upackFinalPickupDate', label: 'U-Pack Final Pickup (NY)', date: settings.upackFinalPickupDate, confirmed: settings.isUpackFinalPickupConfirmed, status: getStatus(settings.upackFinalPickupDate, settings.isUpackFinalPickupConfirmed) },
];

export const validateDates = (settings: Partial<MoveSettings>): string | null => {
  const { closingDate, upackDropoffDate, upackPickupDate, driveStartDate, arrivalDate, upackDeliveryDate, upackFinalPickupDate } = settings;

  if (settings.isClosingDateConfirmed && !closingDate) return 'House Closing date must be set before it can be confirmed.';
  if (settings.isUpackDropoffConfirmed && !upackDropoffDate) return 'U-Pack Dropoff date must be set before it can be confirmed.';
  if (settings.isUpackPickupConfirmed && !upackPickupDate) return 'U-Pack Pickup date must be set before it can be confirmed.';
  if (settings.isDriveStartConfirmed && !driveStartDate) return 'Drive Start date must be set before it can be confirmed.';
  if (settings.isArrivalConfirmed && !arrivalDate) return 'Arrival date must be set before it can be confirmed.';
  if (settings.isUpackDeliveryConfirmed && !upackDeliveryDate) return 'U-Pack Delivery date must be set before it can be confirmed.';
  if (settings.isUpackFinalPickupConfirmed && !upackFinalPickupDate) return 'U-Pack Final Pickup date must be set before it can be confirmed.';

  if (settings.isUpackDropoffConfirmed && settings.isUpackPickupConfirmed && upackDropoffDate && upackPickupDate) {
    const dropoff = parseISO(upackDropoffDate);
    const pickup = parseISO(upackPickupDate);
    if (!isBefore(dropoff, pickup)) return 'CONFIRMED ERROR: U-Pack dropoff must be before U-Pack pickup.';
    if (differenceInDays(pickup, dropoff) !== 3) return 'CONFIRMED ERROR: U-Pack pickup must be exactly 3 days after U-Pack dropoff.';
  }

  if (settings.isDriveStartConfirmed && settings.isClosingDateConfirmed && driveStartDate && closingDate) {
    if (!isBefore(parseISO(driveStartDate), parseISO(closingDate))) return 'CONFIRMED ERROR: Drive start must be before house closing.';
  }

  if (settings.isArrivalConfirmed && settings.isClosingDateConfirmed && arrivalDate && closingDate) {
    if (!isBefore(parseISO(arrivalDate), parseISO(closingDate))) return 'CONFIRMED ERROR: Arrival must be before house closing.';
  }

  if (settings.isUpackDeliveryConfirmed && settings.isClosingDateConfirmed && upackDeliveryDate && closingDate) {
    if (isBefore(parseISO(upackDeliveryDate), parseISO(closingDate))) return 'CONFIRMED ERROR: U-Pack delivery must be after house closing.';
  }

  if (settings.isUpackFinalPickupConfirmed && settings.isUpackDeliveryConfirmed && upackFinalPickupDate && upackDeliveryDate) {
    if (differenceInDays(parseISO(upackFinalPickupDate), parseISO(upackDeliveryDate)) !== 3) return 'CONFIRMED ERROR: Final pickup must be exactly 3 days after U-Pack delivery.';
  }

  return null;
};
