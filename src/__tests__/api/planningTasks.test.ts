import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/planning-tasks/route';

const mockTrack = { id: 3, key: 'home_purchase', name: 'Home Purchase' };
const mockTask = {
  id: 10,
  track_id: 3,
  section: 'purchase',
  title: 'Upload signed contract',
  description: null,
  status: 'Not Started',
  owner: null,
  due_date: '2026-05-01',
  completed_at: null,
  notes: null,
  sort_index: 0,
  created_at: '2026-04-19T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/planning-tasks', () => {
  it('returns normalized tasks', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => Promise.resolve({ data: [mockTrack], error: null })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({ data: [mockTask], error: null })),
          })),
        })),
      });

    const res = await GET(new Request('http://localhost/api/planning-tasks'));
    const body = await res.json();
    expect(body[0].trackName).toBe('Home Purchase');
  });
});

describe('POST /api/planning-tasks', () => {
  it('creates a planning task', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { sort_index: 0 }, error: null }) })) })) })),
      })
      .mockReturnValueOnce({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => Promise.resolve({ data: [mockTrack], error: null })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockTask, error: null });

    const res = await POST(new Request('http://localhost/api/planning-tasks', {
      method: 'POST',
      body: JSON.stringify({ trackId: 3, title: 'Upload signed contract' }),
    }));
    const body = await res.json();
    expect(body.title).toBe('Upload signed contract');
  });
});

describe('PATCH /api/planning-tasks', () => {
  it('updates a planning task', async () => {
    mockFrom
      .mockReturnValueOnce({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => Promise.resolve({ data: [mockTrack], error: null })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockTask, error: null });

    const res = await PATCH(new Request('http://localhost/api/planning-tasks', {
      method: 'PATCH',
      body: JSON.stringify({ id: 10, status: 'Complete' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(10);
  });
});

describe('DELETE /api/planning-tasks', () => {
  it('deletes by id', async () => {
    mockFrom.mockReturnValueOnce({
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    });

    const res = await DELETE(new Request('http://localhost/api/planning-tasks?id=10', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
