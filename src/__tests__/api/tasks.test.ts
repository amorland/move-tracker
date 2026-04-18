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

import { GET, POST, PATCH, DELETE } from '@/app/api/tasks/route';

const mockTask = {
  id: 1,
  categoryId: 2,
  title: 'Pack kitchen',
  description: null,
  status: 'Not Started',
  owner: 'Both',
  phase: 'Move Out',
  dueDate: '2026-07-01',
  completed_at: null,
  notes: null,
  orderIndex: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/tasks', () => {
  it('returns normalised task list', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockTask], error: null })) })),
    });
    const res = await GET();
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Pack kitchen');
    expect(body[0].completedAt).toBeNull();
  });

  it('returns 500 on error', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: null, error: { message: 'DB error' } })) })),
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/tasks', () => {
  it('creates task with correct fields', async () => {
    const mockOrderSingle = vi.fn().mockResolvedValue({ data: { orderIndex: 2 }, error: null });
    mockSingle.mockResolvedValueOnce({ data: mockTask, error: null });

    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: mockOrderSingle })) })) })),
      })
      .mockReturnValueOnce({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Pack kitchen', categoryId: 2, owner: 'Both', phase: 'Move Out' }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.title).toBe('Pack kitchen');
  });
});

describe('PATCH /api/tasks', () => {
  it('updates status and completedAt', async () => {
    const updated = { ...mockTask, status: 'Complete', completed_at: '2026-04-18' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/tasks', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, status: 'Complete', completedAt: '2026-04-18' }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(body.status).toBe('Complete');
  });

  it('does not use literal-quote keys for dueDate/categoryId', async () => {
    let capturedUpdate: Record<string, unknown> = {};
    mockUpdate.mockImplementationOnce((update: Record<string, unknown>) => {
      capturedUpdate = update;
      return { eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: mockTask, error: null }) })) })) };
    });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/tasks', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, dueDate: '2026-07-01', categoryId: 3 }),
    });
    await PATCH(req);

    expect(Object.keys(capturedUpdate)).toContain('dueDate');
    expect(Object.keys(capturedUpdate)).toContain('categoryId');
    expect(Object.keys(capturedUpdate)).not.toContain('"dueDate"');
    expect(Object.keys(capturedUpdate)).not.toContain('"categoryId"');
  });

  it('returns 500 on update error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const req = new Request('http://localhost/api/tasks', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, status: 'Complete' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/tasks', () => {
  it('deletes task by id', async () => {
    const mockEq = vi.fn(() => ({ error: null }));
    mockDelete.mockReturnValueOnce({ eq: mockEq });
    mockFrom.mockReturnValueOnce({ delete: mockDelete });

    const req = new Request('http://localhost/api/tasks?id=5', { method: 'DELETE' });
    const res = await DELETE(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockEq).toHaveBeenCalledWith('id', '5');
  });

  it('returns 400 when id missing', async () => {
    const req = new Request('http://localhost/api/tasks', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
