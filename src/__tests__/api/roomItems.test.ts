import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/room-items/route';

const mockRoomItem = {
  id: 7,
  room_id: 1,
  belonging_id: 2,
  item_name: 'Sectional Sofa',
  item_source: 'existing_belonging',
  status: 'planned',
  dimensions: null,
  notes: null,
  sort_index: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/room-items', () => {
  it('returns normalized room items', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockRoomItem], error: null })) })),
    });
    const res = await GET(new Request('http://localhost/api/room-items'));
    const body = await res.json();
    expect(body[0].itemName).toBe('Sectional Sofa');
  });
});

describe('POST /api/room-items', () => {
  it('creates a room item', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { sort_index: 0 }, error: null }) })) })) })),
      })
      .mockReturnValueOnce({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockRoomItem, error: null });

    const res = await POST(new Request('http://localhost/api/room-items', {
      method: 'POST',
      body: JSON.stringify({ roomId: 1, itemName: 'Sectional Sofa' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(7);
  });
});

describe('PATCH /api/room-items', () => {
  it('updates a room item', async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })),
    });
    mockSingle.mockResolvedValueOnce({ data: mockRoomItem, error: null });

    const res = await PATCH(new Request('http://localhost/api/room-items', {
      method: 'PATCH',
      body: JSON.stringify({ id: 7, status: 'placed' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(7);
  });
});

describe('DELETE /api/room-items', () => {
  it('deletes by id', async () => {
    mockFrom.mockReturnValueOnce({
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    });
    const res = await DELETE(new Request('http://localhost/api/room-items?id=7', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
