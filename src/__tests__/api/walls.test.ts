import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/walls/route';

const mockWall = {
  id: 12,
  floor_plan_id: 3,
  start_x_ft: 4,
  start_y_ft: 5,
  end_x_ft: 14,
  end_y_ft: 5,
  thickness_in: 5,
  height_ft: 9,
  notes: null,
  sort_index: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/walls', () => {
  it('defaults isVirtual to false when the column is absent', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockWall], error: null })) })) })),
    });
    const res = await GET(new Request('http://localhost/api/walls'));
    const body = await res.json();
    expect(body[0].isVirtual).toBe(false);
  });

  it('returns normalized walls', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockWall], error: null })) })) })),
    });
    const res = await GET(new Request('http://localhost/api/walls'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(12);
    expect(body[0].startXFt).toBe(4);
    expect(body[0].startYFt).toBe(5);
    expect(body[0].endXFt).toBe(14);
    expect(body[0].thicknessIn).toBe(5);
    expect(body[0].floorPlanId).toBe(3);
  });

  it('filters by floorPlanId', async () => {
    const eq = vi.fn(() => ({ data: [mockWall], error: null }));
    const orderInner = vi.fn(() => ({ eq }));
    const orderOuter = vi.fn(() => ({ order: orderInner }));
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: orderOuter })),
    });
    const res = await GET(new Request('http://localhost/api/walls?floorPlanId=3'));
    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('floor_plan_id', 3);
  });

  it('returns empty array when walls table is missing', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ order: vi.fn(() => ({ data: null, error: { code: '42P01', message: 'relation "walls" does not exist' } })) })) })),
    });
    const res = await GET(new Request('http://localhost/api/walls'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });
});

describe('POST /api/walls', () => {
  it('creates a wall and assigns sort index', async () => {
    let capturedInsert: Record<string, unknown> = {};
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { sort_index: 4 }, error: null }) })) })) })),
      })
      .mockReturnValueOnce({
        insert: vi.fn((rows: Record<string, unknown>[]) => {
          capturedInsert = rows[0];
          return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { ...mockWall, ...rows[0] }, error: null }) })) };
        }),
      });

    const req = new Request('http://localhost/api/walls', {
      method: 'POST',
      body: JSON.stringify({
        floorPlanId: 3,
        startXFt: 1.5,
        startYFt: 2,
        endXFt: 9,
        endYFt: 2,
        thicknessIn: 4.5,
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(capturedInsert.sort_index).toBe(5);
    expect(capturedInsert.floor_plan_id).toBe(3);
    expect(capturedInsert.start_x_ft).toBe(1.5);
    expect(capturedInsert.thickness_in).toBe(4.5);
    expect(body.startXFt).toBe(1.5);
  });

  it('rejects requests without floorPlanId', async () => {
    const req = new Request('http://localhost/api/walls', {
      method: 'POST',
      body: JSON.stringify({ startXFt: 0, startYFt: 0, endXFt: 5, endYFt: 0 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/walls', () => {
  it('updates allowed fields', async () => {
    let capturedUpdate: Record<string, unknown> = {};
    mockFrom.mockReturnValueOnce({
      update: vi.fn((update: Record<string, unknown>) => {
        capturedUpdate = update;
        return { eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { ...mockWall, ...update }, error: null }) })) })) };
      }),
    });

    const req = new Request('http://localhost/api/walls', {
      method: 'PATCH',
      body: JSON.stringify({ id: 12, endXFt: 18.5, thicknessIn: 6 }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(capturedUpdate.end_x_ft).toBe(18.5);
    expect(capturedUpdate.thickness_in).toBe(6);
    expect(body.id).toBe(12);
  });

  it('rejects requests without id', async () => {
    const req = new Request('http://localhost/api/walls', {
      method: 'PATCH',
      body: JSON.stringify({ startXFt: 0 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/walls', () => {
  it('deletes a wall by id', async () => {
    const eq = vi.fn(() => ({ error: null }));
    mockFrom.mockReturnValueOnce({ delete: vi.fn(() => ({ eq })) });

    const req = new Request('http://localhost/api/walls?id=12', { method: 'DELETE' });
    const res = await DELETE(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(eq).toHaveBeenCalledWith('id', 12);
  });

  it('rejects requests without id', async () => {
    const req = new Request('http://localhost/api/walls', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
