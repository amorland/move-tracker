import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/drive-vehicles/route';

const mockVehicle = {
  id: 3,
  name: '2024 Mazda CX-50',
  vehicle_type: 'car',
  seats: 5,
  cargo_summary: 'Primary family car',
  driver_name: 'Andrew',
  order_index: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/drive-vehicles', () => {
  it('returns normalized vehicles', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockVehicle], error: null })) })),
    });
    const res = await GET();
    const body = await res.json();
    expect(body[0].vehicleType).toBe('car');
  });
});

describe('POST /api/drive-vehicles', () => {
  it('creates a vehicle', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { order_index: 0 }, error: null }) })) })) })),
      })
      .mockReturnValueOnce({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockVehicle, error: null });

    const res = await POST(new Request('http://localhost/api/drive-vehicles', {
      method: 'POST',
      body: JSON.stringify({ name: '2024 Mazda CX-50' }),
    }));
    const body = await res.json();
    expect(body.name).toBe('2024 Mazda CX-50');
  });
});

describe('PATCH /api/drive-vehicles', () => {
  it('updates a vehicle', async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })),
    });
    mockSingle.mockResolvedValueOnce({ data: mockVehicle, error: null });

    const res = await PATCH(new Request('http://localhost/api/drive-vehicles', {
      method: 'PATCH',
      body: JSON.stringify({ id: 3, driverName: 'Tory' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(3);
  });
});

describe('DELETE /api/drive-vehicles', () => {
  it('deletes by id', async () => {
    mockFrom.mockReturnValueOnce({
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    });
    const res = await DELETE(new Request('http://localhost/api/drive-vehicles?id=3', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
