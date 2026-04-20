import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/rooms/route';

const mockRoom = {
  id: 1,
  name: 'Living Room',
  floor: 'Main',
  notes: null,
  sort_index: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/rooms', () => {
  it('returns normalized rooms', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockRoom], error: null })) })),
    });
    const res = await GET();
    const body = await res.json();
    expect(body[0].name).toBe('Living Room');
  });
});

describe('POST /api/rooms', () => {
  it('creates a room', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { sort_index: 1 }, error: null }) })) })) })),
      })
      .mockReturnValueOnce({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockRoom, error: null });

    const res = await POST(new Request('http://localhost/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name: 'Living Room' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(1);
  });
});

describe('PATCH /api/rooms', () => {
  it('updates a room', async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })),
    });
    mockSingle.mockResolvedValueOnce({ data: mockRoom, error: null });

    const res = await PATCH(new Request('http://localhost/api/rooms', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, floor: 'Second' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(1);
  });
});

describe('DELETE /api/rooms', () => {
  it('deletes by id', async () => {
    mockFrom.mockReturnValueOnce({
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    });
    const res = await DELETE(new Request('http://localhost/api/rooms?id=1', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
