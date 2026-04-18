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

import { GET, POST, PATCH, DELETE } from '@/app/api/belongings/route';

const mockItem = {
  id: 1,
  room: 'Kitchen',
  itemName: 'Coffee maker',
  action: 'Bring',
  status: 'unresolved',
  notes: null,
  createdAt: '2026-04-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/belongings', () => {
  it('returns normalised items', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockItem], error: null })) })),
    });
    const res = await GET();
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].itemName).toBe('Coffee maker');
    expect(body[0].status).toBe('unresolved');
  });

  it('returns 500 on supabase error', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: null, error: { message: 'DB error' } })) })),
    });
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});

describe('POST /api/belongings', () => {
  it('creates item and returns normalised data', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockItem, error: null });
    mockInsert.mockReturnValueOnce({ select: vi.fn(() => ({ single: mockSingle })) });
    mockFrom.mockReturnValueOnce({ insert: mockInsert });

    const req = new Request('http://localhost/api/belongings', {
      method: 'POST',
      body: JSON.stringify({ itemName: 'Coffee maker', room: 'Kitchen', action: 'Bring' }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.itemName).toBe('Coffee maker');
    expect(body.action).toBe('Bring');
  });

  it('returns 500 on insert error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
    mockInsert.mockReturnValueOnce({ select: vi.fn(() => ({ single: mockSingle })) });
    mockFrom.mockReturnValueOnce({ insert: mockInsert });

    const req = new Request('http://localhost/api/belongings', {
      method: 'POST',
      body: JSON.stringify({ itemName: 'Table' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/belongings', () => {
  it('updates status and returns normalised data', async () => {
    const updated = { ...mockItem, status: 'resolved' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });
    const mockEq = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
    mockUpdate.mockReturnValueOnce({ eq: mockEq });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/belongings', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, status: 'resolved' }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(body.status).toBe('resolved');
  });

  it('does not include literal-quote key in update object for itemName', async () => {
    let capturedUpdate: Record<string, unknown> = {};
    mockUpdate.mockImplementationOnce((update: Record<string, unknown>) => {
      capturedUpdate = update;
      return { eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: mockItem, error: null }) })) })) };
    });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/belongings', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, itemName: 'New name' }),
    });
    await PATCH(req);

    expect(Object.keys(capturedUpdate)).toContain('itemName');
    expect(Object.keys(capturedUpdate)).not.toContain('"itemName"');
  });

  it('returns 500 on update error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/belongings', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, status: 'resolved' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/belongings', () => {
  it('deletes item by id', async () => {
    const mockEq = vi.fn(() => ({ error: null }));
    mockDelete.mockReturnValueOnce({ eq: mockEq });
    mockFrom.mockReturnValueOnce({ delete: mockDelete });

    const req = new Request('http://localhost/api/belongings?id=1', { method: 'DELETE' });
    const res = await DELETE(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockEq).toHaveBeenCalledWith('id', '1');
  });

  it('returns 400 when id missing', async () => {
    const req = new Request('http://localhost/api/belongings', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
