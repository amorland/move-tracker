'use client';

import { DocumentLink, DocumentRecord, LinkedEntityType } from '@/lib/types';
import { ExternalLink, FileText, Link2, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type AttachMode = 'existing' | 'new';

export default function DocumentAttachmentSection({
  entityType,
  entityId,
}: {
  entityType: LinkedEntityType;
  entityId: number;
}) {
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AttachMode>('existing');
  const [search, setSearch] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [linksRes, docsRes] = await Promise.all([
      fetch(`/api/document-links?entityType=${entityType}&entityId=${entityId}`),
      fetch('/api/documents'),
    ]);
    const nextLinks = await linksRes.json();
    const nextDocuments = await docsRes.json();
    setLinks(nextLinks);
    setDocuments(nextDocuments);
    setMode(current => nextDocuments.length === 0 ? 'new' : current);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  const attachedDocumentIds = useMemo(
    () => new Set(links.map(link => Number(link.documentId))),
    [links],
  );

  const availableDocuments = documents
    .filter(document => !attachedDocumentIds.has(Number(document.id)))
    .filter(document => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return document.title.toLowerCase().includes(q)
        || document.url.toLowerCase().includes(q)
        || (document.notes ?? '').toLowerCase().includes(q);
    })
    .slice(0, 8);

  const attachExisting = async () => {
    if (!selectedDocumentId) {
      setError('Select a document to attach.');
      return;
    }
    setSaving(true);
    setError('');
    const ok = await attachDocument(selectedDocumentId);
    setSaving(false);
    if (ok) {
      setSelectedDocumentId(null);
      setSearch('');
      void fetchData();
    }
  };

  const addNewLink = async () => {
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required.');
      return;
    }
    setSaving(true);
    setError('');

    const docRes = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        url: url.trim(),
        notes: notes.trim() || null,
        provider: url.includes('drive.google.com') || url.includes('docs.google.com') ? 'google_drive' : 'manual_link',
        category: 'other',
      }),
    });
    const doc = await docRes.json();
    if (!docRes.ok) {
      setError(doc.error || 'Could not add document.');
      setSaving(false);
      return;
    }

    const ok = await attachDocument(Number(doc.id));
    setSaving(false);
    if (ok) {
      setTitle('');
      setUrl('');
      setNotes('');
      setMode('existing');
      void fetchData();
    }
  };

  const attachDocument = async (documentId: number) => {
    const linkRes = await fetch('/api/document-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        entityType,
        entityId,
      }),
    });
    const body = await linkRes.json();
    if (!linkRes.ok) {
      setError(body.error || 'Could not attach document.');
      return false;
    }
    return true;
  };

  const removeLink = async (id: number) => {
    await fetch(`/api/document-links?id=${id}`, { method: 'DELETE' });
    void fetchData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link2 size={14} color="var(--color-secondary)" />
        <span className="section-label" style={{ margin: 0 }}>Documents</span>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>Loading documents...</div>
      ) : links.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>No documents attached yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map(link => (
            <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-background)' }}>
              <FileText size={14} color="var(--color-secondary)" />
              <a href={link.document?.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'var(--color-accent-dark)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {link.document?.title || 'Untitled document'}
              </a>
              <a href={link.document?.url} target="_blank" rel="noreferrer" className="row-action-btn" title="Open document">
                <ExternalLink size={14} />
              </a>
              <button onClick={() => removeLink(link.id)} className="row-action-btn row-action-delete" title="Remove attachment">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-background)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`filter-chip ${mode === 'existing' ? 'filter-chip-active' : ''}`} onClick={() => setMode('existing')} disabled={documents.length === 0}>
            <Search size={12} /> Existing
          </button>
          <button className={`filter-chip ${mode === 'new' ? 'filter-chip-active' : ''}`} onClick={() => setMode('new')}>
            <Plus size={12} /> New Link
          </button>
        </div>

        {mode === 'existing' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="search-bar">
              <Search size={16} className="search-bar-icon" />
              <input placeholder="Search saved documents..." value={search} onChange={event => setSearch(event.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflow: 'auto' }}>
              {availableDocuments.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>No available saved documents.</div>
              ) : availableDocuments.map(document => (
                <button
                  key={document.id}
                  onClick={() => setSelectedDocumentId(Number(document.id))}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${selectedDocumentId === Number(document.id) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: selectedDocumentId === Number(document.id) ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {document.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="section-label" style={{ margin: 0 }}>{document.category}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{document.provider === 'google_drive' ? 'Google Drive' : 'Link'}</span>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={attachExisting} disabled={saving || !selectedDocumentId}>
                <Link2 size={14} /> {saving ? 'Attaching...' : 'Attach Existing'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Document title" />
            <input value={url} onChange={event => setUrl(event.target.value)} placeholder="Google Drive or secure document link" />
            <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Notes (optional)" style={{ height: 64, resize: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={addNewLink} disabled={saving}>
                <Plus size={14} /> {saving ? 'Adding...' : 'Attach Link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
