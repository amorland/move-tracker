import { describe, it, expect } from 'vitest';
import { validateDates, getMilestones, getStatus } from '@/lib/dateUtils';
import type { MoveSettings } from '@/lib/types';

const BASE: MoveSettings = {
  id: 1,
  closingDate: null, isClosingDateConfirmed: false,
  upackDropoffDate: null, isUpackDropoffConfirmed: false,
  upackPickupDate: null, isUpackPickupConfirmed: false,
  driveStartDate: null, isDriveStartConfirmed: false,
  arrivalDate: null, isArrivalConfirmed: false,
  upackDeliveryDate: null, isUpackDeliveryConfirmed: false,
  upackFinalPickupDate: null, isUpackFinalPickupConfirmed: false,
};

describe('getStatus', () => {
  it('returns unset when date is null', () => {
    expect(getStatus(null, false)).toBe('unset');
    expect(getStatus(null, true)).toBe('unset');
  });
  it('returns confirmed when date set and confirmed', () => {
    expect(getStatus('2026-07-01', true)).toBe('confirmed');
  });
  it('returns estimated when date set but not confirmed', () => {
    expect(getStatus('2026-07-01', false)).toBe('estimated');
  });
});

describe('getMilestones', () => {
  it('returns 7 milestones in correct order', () => {
    const ms = getMilestones(BASE);
    expect(ms).toHaveLength(7);
    expect(ms[0].label).toBe('U-Pack Dropoff (FL)');
    expect(ms[6].label).toBe('U-Pack Final Pickup (NY)');
  });

  it('reflects date and confirmation state', () => {
    const settings: MoveSettings = {
      ...BASE,
      closingDate: '2026-07-15',
      isClosingDateConfirmed: true,
    };
    const ms = getMilestones(settings);
    const closing = ms.find(m => m.label === 'House Closing')!;
    expect(closing.date).toBe('2026-07-15');
    expect(closing.confirmed).toBe(true);
    expect(closing.status).toBe('confirmed');
  });
});

describe('validateDates', () => {
  it('passes with no dates set', () => {
    expect(validateDates(BASE)).toBeNull();
  });

  it('rejects confirming a date that is not set', () => {
    expect(validateDates({ ...BASE, isClosingDateConfirmed: true })).toMatch(/must be set/);
    expect(validateDates({ ...BASE, isUpackDropoffConfirmed: true })).toMatch(/must be set/);
  });

  it('requires dropoff→pickup gap of exactly 3 days when both confirmed', () => {
    const good = {
      ...BASE,
      upackDropoffDate: '2026-06-01',
      isUpackDropoffConfirmed: true,
      upackPickupDate: '2026-06-04',
      isUpackPickupConfirmed: true,
    };
    expect(validateDates(good)).toBeNull();

    const badGap = { ...good, upackPickupDate: '2026-06-03' };
    expect(validateDates(badGap)).toMatch(/3 days/);

    const sameDay = { ...good, upackPickupDate: '2026-06-01' };
    expect(validateDates(sameDay)).toMatch(/before/);
  });

  it('requires drive start before closing when both confirmed', () => {
    const good = {
      ...BASE,
      driveStartDate: '2026-07-10',
      isDriveStartConfirmed: true,
      closingDate: '2026-07-15',
      isClosingDateConfirmed: true,
    };
    expect(validateDates(good)).toBeNull();

    const bad = { ...good, driveStartDate: '2026-07-16' };
    expect(validateDates(bad)).toMatch(/before house closing/);
  });

  it('requires arrival before closing when both confirmed', () => {
    const good = {
      ...BASE,
      arrivalDate: '2026-07-14',
      isArrivalConfirmed: true,
      closingDate: '2026-07-15',
      isClosingDateConfirmed: true,
    };
    expect(validateDates(good)).toBeNull();

    const bad = { ...good, arrivalDate: '2026-07-16' };
    expect(validateDates(bad)).toMatch(/before house closing/);
  });

  it('requires delivery after closing when both confirmed', () => {
    const good = {
      ...BASE,
      upackDeliveryDate: '2026-07-16',
      isUpackDeliveryConfirmed: true,
      closingDate: '2026-07-15',
      isClosingDateConfirmed: true,
    };
    expect(validateDates(good)).toBeNull();

    const bad = { ...good, upackDeliveryDate: '2026-07-14' };
    expect(validateDates(bad)).toMatch(/after house closing/);
  });

  it('requires final pickup exactly 3 days after delivery when both confirmed', () => {
    const good = {
      ...BASE,
      upackDeliveryDate: '2026-07-16',
      isUpackDeliveryConfirmed: true,
      upackFinalPickupDate: '2026-07-19',
      isUpackFinalPickupConfirmed: true,
    };
    expect(validateDates(good)).toBeNull();

    const bad = { ...good, upackFinalPickupDate: '2026-07-20' };
    expect(validateDates(bad)).toMatch(/3 days/);
  });

  it('does not enforce rules when dates are not confirmed', () => {
    const settings = {
      ...BASE,
      driveStartDate: '2026-07-20',
      isDriveStartConfirmed: false,
      closingDate: '2026-07-15',
      isClosingDateConfirmed: false,
    };
    expect(validateDates(settings)).toBeNull();
  });
});
