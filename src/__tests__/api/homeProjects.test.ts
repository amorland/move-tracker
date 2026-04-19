import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import { DELETE, GET, PATCH, POST } from '@/app/api/home-projects/route';

const mockProject = {
  id: 5,
  title: 'Hardwood floors upstairs',
  area: 'Upstairs',
  status: 'idea',
  priority: 'high',
  target_date: '2026-09-01',
  budget_notes: null,
  notes: null,
  created_at: '2026-04-19T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/home-projects', () => {
  it('returns normalized projects', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({ data: [mockProject], error: null })),
        })),
      })),
    });
    const res = await GET(new Request('http://localhost/api/home-projects'));
    const body = await res.json();
    expect(body[0].title).toBe('Hardwood floors upstairs');
  });
});

describe('POST /api/home-projects', () => {
  it('creates a project', async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
    });
    mockSingle.mockResolvedValueOnce({ data: mockProject, error: null });

    const res = await POST(new Request('http://localhost/api/home-projects', {
      method: 'POST',
      body: JSON.stringify({ title: 'Hardwood floors upstairs' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(5);
  });
});

describe('PATCH /api/home-projects', () => {
  it('updates a project', async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })),
    });
    mockSingle.mockResolvedValueOnce({ data: mockProject, error: null });

    const res = await PATCH(new Request('http://localhost/api/home-projects', {
      method: 'PATCH',
      body: JSON.stringify({ id: 5, status: 'planning' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(5);
  });
});

describe('DELETE /api/home-projects', () => {
  it('deletes by id', async () => {
    mockFrom.mockReturnValueOnce({
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    });
    const res = await DELETE(new Request('http://localhost/api/home-projects?id=5', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
