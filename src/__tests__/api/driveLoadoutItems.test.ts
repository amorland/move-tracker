import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/drive-loadout-items/route';

const mockItem = {
  id: 9,
  label: 'Winston',
  item_type: 'pet',
  assigned_vehicle_id: 2,
  placement: 'back seat',
  required: true,
  notes: 'Needs easy access during stops',
  order_index: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/drive-loadout-items', () => {
  it('returns normalized loadout items', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockItem], error: null })) })),
    });
    const res = await GET(new Request('http://localhost/api/drive-loadout-items'));
    const body = await res.json();
    expect(body[0].itemType).toBe('pet');
  });
});

describe('POST /api/drive-loadout-items', () => {
  it('creates a loadout item', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { order_index: 0 }, error: null }) })) })) })),
      })
      .mockReturnValueOnce({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockItem, error: null });

    const res = await POST(new Request('http://localhost/api/drive-loadout-items', {
      method: 'POST',
      body: JSON.stringify({ label: 'Winston', itemType: 'pet' }),
    }));
    const body = await res.json();
    expect(body.label).toBe('Winston');
  });
});

describe('PATCH /api/drive-loadout-items', () => {
  it('updates a loadout item', async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })),
    });
    mockSingle.mockResolvedValueOnce({ data: mockItem, error: null });

    const res = await PATCH(new Request('http://localhost/api/drive-loadout-items', {
      method: 'PATCH',
      body: JSON.stringify({ id: 9, assignedVehicleId: null }),
    }));
    const body = await res.json();
    expect(body.id).toBe(9);
  });
});

describe('DELETE /api/drive-loadout-items', () => {
  it('deletes by id', async () => {
    mockFrom.mockReturnValueOnce({
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    });
    const res = await DELETE(new Request('http://localhost/api/drive-loadout-items?id=9', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
