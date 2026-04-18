import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockSingle, mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle, mockInsert, mockUpdate, mockDelete };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import { GET, POST, PATCH, DELETE } from '@/app/api/events/route';

const mockEvent = {
  id: 1,
  title: 'Call movers',
  date: '2026-07-01',
  time: '10:00',
  is_confirmed: false,
  notes: null,
  created_at: '2026-04-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/events', () => {
  it('returns events ordered by date', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockEvent], error: null })) })),
    });
    const res = await GET();
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Call movers');
  });

  it('returns 500 on error', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: null, error: { message: 'DB error' } })) })),
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/events', () => {
  it('creates event with correct fields', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockEvent, error: null });
    mockInsert.mockReturnValueOnce({ select: vi.fn(() => ({ single: mockSingle })) });
    mockFrom.mockReturnValueOnce({ insert: mockInsert });

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ title: 'Call movers', date: '2026-07-01', time: '10:00', is_confirmed: false }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.title).toBe('Call movers');
    expect(body.is_confirmed).toBe(false);
  });

  it('returns 500 on insert error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
    mockInsert.mockReturnValueOnce({ select: vi.fn(() => ({ single: mockSingle })) });
    mockFrom.mockReturnValueOnce({ insert: mockInsert });

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test event', date: '2026-07-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/events', () => {
  it('updates event fields', async () => {
    const updated = { ...mockEvent, is_confirmed: true };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/events', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, is_confirmed: true }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(body.is_confirmed).toBe(true);
  });

  it('returns 500 on update error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/events', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, is_confirmed: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/events', () => {
  it('deletes event by id', async () => {
    const mockEq = vi.fn(() => ({ error: null }));
    mockDelete.mockReturnValueOnce({ eq: mockEq });
    mockFrom.mockReturnValueOnce({ delete: mockDelete });

    const req = new Request('http://localhost/api/events?id=1', { method: 'DELETE' });
    const res = await DELETE(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 when id missing', async () => {
    const req = new Request('http://localhost/api/events', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
