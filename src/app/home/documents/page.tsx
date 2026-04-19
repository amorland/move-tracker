'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { DocumentLink, DocumentRecord } from '@/lib/types';
import { ExternalLink, FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const CATEGORIES = ['all', 'contract', 'disclosure', 'loan', 'inspection', 'receipt', 'floorplan', 'project', 'other'] as const;

export default function HomeDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORIES)[number]>('all');
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [docsRes, linksRes] = await Promise.all([
      fetch('/api/documents'),
      fetch('/api/document-links'),
    ]);
    setDocuments(await docsRes.json());
    setLinks(await linksRes.json());
    setLoading(false);
  };

  const linkCountByDocumentId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const link of links) {
      counts.set(link.documentId, (counts.get(link.documentId) || 0) + 1);
    }
    return counts;
  }, [links]);

  const visible = documents.filter(document => {
    if (categoryFilter !== 'all' && document.category !== categoryFilter) return false;
    if (search && !document.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const deleteDocument = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading documents…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Home Documents</h1>
          <p className="page-subtitle">{documents.length} saved links across home planning and move items</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add Document
        </button>
      </div>

      <HomeSubnav />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {CATEGORIES.map(category => (
            <button key={category} onClick={() => setCategoryFilter(category)} className={`filter-chip ${categoryFilter === category ? 'filter-chip-active' : ''}`}>
              {category === 'all' ? 'All categories' : category}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <FileText size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>No documents match your filters.</p>
          </div>
        ) : (
          visible.map(document => (
            <div key={document.id} className="task-row" style={{ display: 'flex', alignItems: 'stretch', background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0 }}>
                <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>{document.category}</span>
              </div>
              <div style={{ flex: 1, padding: '13px 8px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {document.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span className="section-label" style={{ margin: 0 }}>{document.provider === 'google_drive' ? 'Google Drive' : 'Link'}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{linkCountByDocumentId.get(document.id) || 0} attachments</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4, flexShrink: 0 }}>
                <a href={document.url} target="_blank" rel="noreferrer" className="row-action-btn" title="Open document">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => setEditing(document)} className="row-action-btn" title="Edit document">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteDocument(document.id)} className="row-action-btn row-action-delete" title="Delete document">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {(adding || editing) && (
        <DocumentModal
          existing={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

function DocumentModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: DocumentRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'other');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required.');
      return;
    }
    setSaving(true);
    const body = {
      title: title.trim(),
      url: url.trim(),
      category,
      notes: notes.trim() || null,
      provider: url.includes('drive.google.com') ? 'google_drive' : 'manual_link',
    };
    const res = await fetch('/api/documents', {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing ? { ...body, id: existing.id } : body),
    });
    if (res.ok) onSaved();
    else {
      const e = await res.json();
      setError(e.error || 'Error saving document');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{existing ? 'Edit Document' : 'Add Document'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{error}</div>
          )}
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus={!existing} />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Google Drive or secure document link" />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as DocumentRecord['category'])}>
              {CATEGORIES.filter(value => value !== 'all').map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 72, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
