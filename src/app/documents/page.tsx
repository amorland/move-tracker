'use client';

import { useEffect, useState } from 'react';
import { Document, Task, Category } from '@/lib/types';

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
      if (confirm('Smart Extraction detected "Closing/Lease" in document. Create "Sign documents" task?')) {
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
    if (!confirm('Are you sure?')) return;
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    const res = await fetch('/api/documents');
    setDocuments(await res.json());
  };

  if (loading) return <div style={{ color: '#5f6368' }}>Loading Documents...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1>Documents</h1>
        <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>add</span>
          New
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="card" style={{ maxWidth: '600px', marginBottom: '32px' }}>
          <div className="mb-4">
            <input 
              required
              value={newDoc.name} 
              onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} 
              placeholder="Name (e.g. Closing Disclosure)"
              style={{ width: '100%' }}
            />
          </div>
          <div className="mb-4">
            <input 
              required
              value={newDoc.url} 
              onChange={e => setNewDoc({ ...newDoc, url: e.target.value })} 
              placeholder="Link URL"
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex gap-4">
            <button type="submit" className="btn btn-primary">Add</button>
            <button type="button" className="btn btn-outline" onClick={() => setIsAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ background: 'white', border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', padding: '12px 16px', background: '#f8f9fa', borderBottom: '1px solid #dadce0', fontSize: '12px', fontWeight: 500, color: '#5f6368' }}>
          <div>NAME</div>
          <div>DATE ADDED</div>
          <div></div>
        </div>
        {documents.map((doc, idx) => (
          <div key={doc.id} style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 100px', 
            padding: '12px 16px', 
            borderBottom: idx === documents.length - 1 ? 'none' : '1px solid #f1f3f4',
            alignItems: 'center',
            fontSize: '14px'
          }}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: '#1a73e8', fontSize: '20px' }}>
                {doc.isLink ? 'link' : 'description'}
              </span>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#202124', textDecoration: 'none', fontWeight: 500 }}>
                {doc.name}
              </a>
            </div>
            <div style={{ color: '#5f6368' }}>{new Date(doc.createdAt).toLocaleDateString()}</div>
            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={() => deleteDoc(doc.id)} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5f6368' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
              </button>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#5f6368', fontSize: '14px' }}>
            No documents yet.
          </div>
        )}
      </div>
    </div>
  );
}
