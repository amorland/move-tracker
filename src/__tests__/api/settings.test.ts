import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockSingle, mockUpdate } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockUpdate = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle, mockUpdate };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

import { GET, PATCH } from '@/app/api/settings/route';

const BASE_SETTINGS = {
  id: 1,
  closingDate: null, isClosingDateConfirmed: false,
  upackDropoffDate: null, isUpackDropoffConfirmed: false,
  upackPickupDate: null, isUpackPickupConfirmed: false,
  driveStartDate: null, isDriveStartConfirmed: false,
  arrivalDate: null, isArrivalConfirmed: false,
  upackDeliveryDate: null, isUpackDeliveryConfirmed: false,
  upackFinalPickupDate: null, isUpackFinalPickupConfirmed: false,
};

const makeSelectChain = () => ({
  select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/settings', () => {
  it('returns settings data', async () => {
    mockSingle.mockResolvedValueOnce({ data: BASE_SETTINGS, error: null });
    mockFrom.mockReturnValueOnce(makeSelectChain());

    const res = await GET();
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.closingDate).toBeNull();
  });

  it('returns 500 on error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValueOnce(makeSelectChain());

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/settings', () => {
  it('saves valid date update', async () => {
    const updated = { ...BASE_SETTINGS, closingDate: '2026-07-15', isClosingDateConfirmed: true };
    mockSingle
      .mockResolvedValueOnce({ data: BASE_SETTINGS, error: null })
      .mockResolvedValueOnce({ data: updated, error: null });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });
    mockFrom
      .mockReturnValueOnce(makeSelectChain())
      .mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ closingDate: '2026-07-15', isClosingDateConfirmed: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it('rejects confirming a date without setting it', async () => {
    mockSingle.mockResolvedValueOnce({ data: BASE_SETTINGS, error: null });
    mockFrom.mockReturnValueOnce(makeSelectChain());

    const req = new Request('http://localhost/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ isClosingDateConfirmed: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/must be set/);
  });

  it('rejects dropoff/pickup with wrong gap', async () => {
    const currentSettings = {
      ...BASE_SETTINGS,
      upackDropoffDate: '2026-06-01',
      isUpackDropoffConfirmed: true,
    };
    mockSingle.mockResolvedValueOnce({ data: currentSettings, error: null });
    mockFrom.mockReturnValueOnce(makeSelectChain());

    const req = new Request('http://localhost/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ upackPickupDate: '2026-06-03', isUpackPickupConfirmed: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/3 days/);
  });

  it('rejects drive start after closing when both confirmed', async () => {
    const currentSettings = {
      ...BASE_SETTINGS,
      closingDate: '2026-07-15',
      isClosingDateConfirmed: true,
    };
    mockSingle.mockResolvedValueOnce({ data: currentSettings, error: null });
    mockFrom.mockReturnValueOnce(makeSelectChain());

    const req = new Request('http://localhost/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ driveStartDate: '2026-07-20', isDriveStartConfirmed: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/before house closing/);
  });
});
