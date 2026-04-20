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

import { DELETE, GET, PATCH, POST } from '@/app/api/documents/route';

const mockDocument = {
  id: 1,
  title: 'Loan estimate',
  provider: 'google_drive',
  url: 'https://drive.google.com/file/d/abc',
  mime_type: null,
  category: 'loan',
  notes: null,
  created_at: '2026-04-19T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/documents', () => {
  it('returns normalized documents', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [mockDocument], error: null })) })),
    });
    const res = await GET(new Request('http://localhost/api/documents'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Loan estimate');
    expect(body[0].mimeType).toBeNull();
  });
});

describe('POST /api/documents', () => {
  it('creates a document', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockDocument, error: null });
    mockInsert.mockReturnValueOnce({ select: vi.fn(() => ({ single: mockSingle })) });
    mockFrom.mockReturnValueOnce({ insert: mockInsert });

    const res = await POST(new Request('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'Loan estimate', url: 'https://drive.google.com/file/d/abc' }),
    }));
    const body = await res.json();
    expect(body.title).toBe('Loan estimate');
  });
});

describe('PATCH /api/documents', () => {
  it('updates a document', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockDocument, error: null });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) });
    mockFrom.mockReturnValueOnce({ update: mockUpdate });

    const res = await PATCH(new Request('http://localhost/api/documents', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, title: 'Updated title' }),
    }));
    const body = await res.json();
    expect(body.id).toBe(1);
  });
});

describe('DELETE /api/documents', () => {
  it('deletes by id', async () => {
    mockDelete.mockReturnValueOnce({ eq: vi.fn(() => ({ error: null })) });
    mockFrom.mockReturnValueOnce({ delete: mockDelete });

    const res = await DELETE(new Request('http://localhost/api/documents?id=1', { method: 'DELETE' }));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
