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
    
    // Refresh
    const res = await fetch('/api/documents');
    setDocuments(await res.json());

    // Simulated Smart Extraction
    if (newDoc.name.toLowerCase().includes('closing') || newDoc.name.toLowerCase().includes('lease')) {
      if (confirm('Smart Extraction detected "Closing/Lease" in document. Would you like to create a "Sign documents" task?')) {
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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1>Documents</h1>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={16} /> Add Document / Link
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="card mb-8">
          <h2 style={{ marginTop: 0 }}>Add New Document</h2>
          <div className="mb-4">
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Name</label>
            <input 
              required
              value={newDoc.name} 
              onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} 
              placeholder="e.g. Closing Disclosure, Rental Agreement"
            />
          </div>
          <div className="mb-4">
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>URL / Google Drive Link</label>
            <input 
              required
              value={newDoc.url} 
              onChange={e => setNewDoc({ ...newDoc, url: e.target.value })} 
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div className="flex gap-4">
            <button type="submit" className="btn btn-primary">Add Document</button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {documents.map(doc => (
          <div key={doc.id} className="card" style={{ padding: '16px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ padding: '8px', background: 'var(--gray-50)', borderRadius: '4px', color: 'var(--gray-600)' }}>
                  {doc.isLink ? <LinkIcon size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{doc.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                    Added {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex items-center gap-2">
                  <ExternalLink size={14} /> Open
                </a>
                <button onClick={() => deleteDoc(doc.id)} className="text-gray-600 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="card text-center text-gray-600 italic" style={{ padding: '48px' }}>
            No documents attached yet. Add links to Google Drive or other files.
          </div>
        )}
      </div>
    </div>
  );
}
