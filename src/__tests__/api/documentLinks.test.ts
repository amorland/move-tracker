import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSingle, mockInsert } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockSingle, mockInsert };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

import { GET, POST } from '@/app/api/document-links/route';

const mockLink = {
  id: 7,
  document_id: 1,
  entity_type: 'timeline_entry',
  entity_id: 3,
  label: null,
  created_at: '2026-05-07T00:00:00Z',
};

const mockDocument = {
  id: 1,
  title: 'Appraisal',
  provider: 'google_drive',
  url: 'https://drive.google.com/file/d/appraisal',
  url_key: 'google-drive:file:appraisal',
  mime_type: null,
  category: 'loan',
  notes: null,
  created_at: '2026-05-07T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/document-links', () => {
  it('returns links with document metadata', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn(() => ({ order: vi.fn(() => filteredLinkQuery([mockLink])) })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({ in: vi.fn(() => ({ data: [mockDocument], error: null })) })),
      });

    const res = await GET(new Request('http://localhost/api/document-links?entityType=timeline_entry&entityId=3'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].document.title).toBe('Appraisal');
    expect(body[0].document.urlKey).toBe('google-drive:file:appraisal');
  });
});

describe('POST /api/document-links', () => {
  it('returns an existing link instead of duplicating it', async () => {
    mockFrom.mockReturnValueOnce({ select: vi.fn(() => existingLinkQuery([mockLink])) });

    const res = await POST(new Request('http://localhost/api/document-links', {
      method: 'POST',
      body: JSON.stringify({ documentId: 1, entityType: 'timeline_entry', entityId: 3 }),
    }));
    const body = await res.json();
    expect(body.id).toBe(7);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('creates a link when no matching attachment exists', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockLink, error: null });
    mockInsert.mockReturnValueOnce({ select: vi.fn(() => ({ single: mockSingle })) });
    mockFrom
      .mockReturnValueOnce({ select: vi.fn(() => existingLinkQuery([])) })
      .mockReturnValueOnce({ insert: mockInsert });

    const res = await POST(new Request('http://localhost/api/document-links', {
      method: 'POST',
      body: JSON.stringify({ documentId: 1, entityType: 'timeline_entry', entityId: 3 }),
    }));
    const body = await res.json();
    expect(body.id).toBe(7);
    expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({
      document_id: 1,
      entity_type: 'timeline_entry',
      entity_id: 3,
    })]);
  });
});

function existingLinkQuery(data: unknown[]) {
  const query = {
    eq: vi.fn(() => query),
    limit: vi.fn(() => ({ data, error: null })),
  };
  return query;
}

function filteredLinkQuery(data: unknown[]) {
  const query = {
    data,
    error: null,
    eq: vi.fn(() => query),
  };
  return query;
}
