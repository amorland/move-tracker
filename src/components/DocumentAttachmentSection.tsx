'use client';

import { DocumentLink, LinkedEntityType } from '@/lib/types';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DocumentAttachmentSection({
  entityType,
  entityId,
}: {
  entityType: LinkedEntityType;
  entityId: number;
}) {
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLinks();
  }, [entityType, entityId]);

  const fetchLinks = async () => {
    setLoading(true);
    const res = await fetch(`/api/document-links?entityType=${entityType}&entityId=${entityId}`);
    const data = await res.json();
    setLinks(data);
    setLoading(false);
  };

  const addLink = async () => {
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
        provider: url.includes('drive.google.com') ? 'google_drive' : 'manual_link',
        category: 'other',
      }),
    });
    const doc = await docRes.json();
    if (!docRes.ok) {
      setError(doc.error || 'Could not add document.');
      setSaving(false);
      return;
    }

    const linkRes = await fetch('/api/document-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: doc.id,
        entityType,
        entityId,
      }),
    });
    const linkBody = await linkRes.json();
    if (!linkRes.ok) {
      setError(linkBody.error || 'Could not attach document.');
      setSaving(false);
      return;
    }

    setTitle('');
    setUrl('');
    setNotes('');
    setSaving(false);
    fetchLinks();
  };

  const removeLink = async (id: number) => {
    await fetch(`/api/document-links?id=${id}`, { method: 'DELETE' });
    fetchLinks();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link2 size={14} color="var(--color-secondary)" />
        <span className="section-label" style={{ margin: 0 }}>Documents</span>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>Loading documents…</div>
      ) : links.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>No documents attached yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map(link => (
            <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--color-background)' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-background)' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Google Drive or secure document link" />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ height: 64, resize: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={addLink} disabled={saving}>
            <Plus size={14} /> {saving ? 'Adding…' : 'Attach Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
