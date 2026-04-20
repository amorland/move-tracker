import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle, mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle, mockInsert, mockUpdate, mockDelete };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/timeline/route';

const mockTrack = { id: 3, key: 'home_purchase', name: 'Home Purchase' };
const mockEntry = {
  id: 2,
  track_id: 3,
  title: 'Sign purchase agreement',
  entry_type: 'milestone',
  status: 'confirmed',
  date: '2026-05-01',
  time: null,
  notes: null,
  sort_index: 0,
  created_at: '2026-04-19T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/timeline', () => {
  it('returns normalized entries with track metadata', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => Promise.resolve({ data: [mockTrack], error: null })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({ data: [mockEntry], error: null })),
          })),
        })),
      });

    const res = await GET(new Request('http://localhost/api/timeline'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].trackKey).toBe('home_purchase');
    expect(body[0].title).toBe('Sign purchase agreement');
  });
});

describe('POST /api/timeline', () => {
  it('creates an entry', async () => {
    mockFrom
      .mockReturnValueOnce({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => Promise.resolve({ data: [mockTrack], error: null })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockEntry, error: null });

    const res = await POST(new Request('http://localhost/api/timeline', {
      method: 'POST',
      body: JSON.stringify({ trackId: 3, title: 'Sign purchase agreement', date: '2026-05-01' }),
    }));
    const body = await res.json();
    expect(body.trackName).toBe('Home Purchase');
  });
});

describe('PATCH /api/timeline', () => {
  it('updates an entry', async () => {
    mockFrom
      .mockReturnValueOnce({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => Promise.resolve({ data: [mockTrack], error: null })),
      });
    mockSingle.mockResolvedValueOnce({ data: mockEntry, error: null });

    const res = await PATCH(new Request('http://localhost/api/timeline', {
      method: 'PATCH',
      body: JSON.stringify({ id: 2, status: 'blocked' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(2);
  });
});

describe('DELETE /api/timeline', () => {
  it('deletes by id', async () => {
    mockDelete.mockReturnValueOnce({ eq: vi.fn(() => ({ error: null })) });
    mockFrom.mockReturnValueOnce({ delete: mockDelete });

    const res = await DELETE(new Request('http://localhost/api/timeline?id=2', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
