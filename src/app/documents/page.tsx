'use client';

import { useEffect, useState } from 'react';
import { Document, Task, Category } from '@/lib/types';
import { Plus, Link as LinkIcon, FileText, Trash2, ExternalLink } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', url: '', isLink: true, taskId: '', categoryId: '' });

  useEffect(() => {
    Promise.all([
      fetch('/api/documents').then(res => res.json()),
      fetch('/api/categories').then(res => res.json())
    ]).then(([docs, catTasks]) => {
      setDocuments(docs);
      setData(catTasks);
      setLoading(false);
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newDoc,
        taskId: newDoc.taskId ? parseInt(newDoc.taskId) : null,
        categoryId: newDoc.categoryId ? parseInt(newDoc.categoryId) : null
      })
    });
    setNewDoc({ name: '', url: '', isLink: true, taskId: '', categoryId: '' });
    setIsAdding(false);
    const res = await fetch('/api/documents');
    setDocuments(await res.json());

    if (newDoc.name.toLowerCase().includes('closing') || newDoc.name.toLowerCase().includes('lease')) {
      if (confirm('Smart Extraction detected "Closing/Lease" in document. Create "Sign documents" task for Andrew & Tory?')) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            categoryId: data.categories.find(c => c.name.includes('Closing'))?.id || data.categories[0].id,
            title: 'Sign ' + newDoc.name,
            owner: 'Both',
            status: 'Not Started',
            timingType: 'Before Closing',
            timingOffsetDays: 0,
            orderIndex: 0
          })
        });
      }
    }
  };

  const deleteDoc = async (id: number) => {
    if (!confirm('Delete this document link?')) return;
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    const res = await fetch('/api/documents');
    setDocuments(await res.json());
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading documents...</div>;

  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      <div className="flex flex-stack items-center justify-between mb-12">
        <div>
          <h1>Documents</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Essential files and links for your relocation.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} />
          Add New
        </button>
      </div>

      {isAdding && (
        <div className="card" style={{ maxWidth: '600px', marginBottom: '40px', border: '2px solid var(--accent-soft)' }}>
          <h2 style={{ marginTop: 0 }}>Attach Link</h2>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Label</label>
                <input 
                  required
                  value={newDoc.name} 
                  onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} 
                  placeholder="e.g. Closing Disclosure, Rental Agreement"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>URL / Drive Link</label>
                <input 
                  required
                  value={newDoc.url} 
                  onChange={e => setNewDoc({ ...newDoc, url: e.target.value })} 
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div className="flex gap-3" style={{ marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary">Save Document</button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {documents.map(doc => (
          <div key={doc.id} className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '20px', border: 'none', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-start gap-4">
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                {doc.isLink ? <LinkIcon size={20} /> : <FileText size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>ADDED {new Date(doc.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="flex gap-2" style={{ marginTop: 'auto' }}>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, gap: '8px', fontSize: '13px', height: '36px' }}>
                <ExternalLink size={14} /> Open
              </a>
              <button 
                onClick={() => deleteDoc(doc.id)} 
                className="btn btn-secondary" 
                style={{ width: '36px', height: '36px', padding: 0, color: 'var(--text-secondary)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)', background: 'white', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
             <FileText size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
             <div style={{ fontSize: '14px', fontWeight: 600 }}>No documents yet. Attach your first link to get started.</div>
          </div>
        )}
      </div>
    </div>
  );
}
