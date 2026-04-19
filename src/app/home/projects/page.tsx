'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { HomeProject } from '@/lib/types';
import { useScrollLock } from '@/lib/useScrollLock';
import { Calendar, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const STATUS_OPTIONS: HomeProject['status'][] = ['idea', 'planning', 'quoted', 'scheduled', 'complete'];
const PRIORITY_OPTIONS: HomeProject['priority'][] = ['low', 'medium', 'high'];

export default function HomeProjectsPage() {
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HomeProject['status'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<HomeProject['priority'] | 'all'>('all');
  const [modalProject, setModalProject] = useState<Partial<HomeProject> | null>(null);

  useScrollLock(modalProject !== null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await fetch('/api/home-projects');
    setProjects(await res.json());
    setLoading(false);
  };

  const saveProject = async (project: Partial<HomeProject>) => {
    const res = await fetch('/api/home-projects', {
      method: project.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (res.ok) {
      setModalProject(null);
      fetchProjects();
    }
  };

  const deleteProject = async (id: number) => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/home-projects?id=${id}`, { method: 'DELETE' });
    fetchProjects();
  };

  const visible = projects.filter(project => {
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && project.priority !== priorityFilter) return false;
    if (search && !project.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading projects…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>House Projects</h1>
          <p className="page-subtitle">Repairs, upgrades, and later ideas.</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setModalProject({ title: '', area: '', status: 'idea', priority: 'medium', targetDate: null, budgetNotes: '', notes: '' })}
        >
          <Plus size={18} /> Add Project
        </button>
      </div>

      <HomeSubnav />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setStatusFilter('all')} className={`filter-chip ${statusFilter === 'all' ? 'filter-chip-active' : ''}`}>All statuses</button>
          {STATUS_OPTIONS.map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`filter-chip ${statusFilter === status ? 'filter-chip-active' : ''}`}>
              {status}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setPriorityFilter('all')} className={`filter-chip ${priorityFilter === 'all' ? 'filter-chip-active' : ''}`}>All priorities</button>
          {PRIORITY_OPTIONS.map(priority => (
            <button key={priority} onClick={() => setPriorityFilter(priority)} className={`filter-chip ${priorityFilter === priority ? 'filter-chip-active' : ''}`}>
              {priority}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <Calendar size={40} color="var(--color-border)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-secondary)', fontSize: 14 }}>Nothing matches the filters.</p>
          </div>
        ) : (
          visible.map(project => (
            <div key={project.id} className="task-row" style={{ display: 'flex', alignItems: 'stretch', background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 10, flexShrink: 0 }}>
                <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>{project.priority}</span>
              </div>
              <div style={{ flex: 1, padding: '13px 8px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-secondary)' }}>{project.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span className="section-label" style={{ margin: 0 }}>{project.status}</span>
                  {project.area && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{project.area}</span>}
                  {project.targetDate && <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{project.targetDate}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4 }}>
                <button className="row-action-btn" onClick={() => setModalProject(project)} title="Edit project">
                  <Pencil size={14} />
                </button>
                <button className="row-action-btn row-action-delete" onClick={() => deleteProject(project.id)} title="Delete project">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalProject && (
        <ProjectModal project={modalProject} onClose={() => setModalProject(null)} onSave={saveProject} />
      )}
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Partial<HomeProject>;
  onClose: () => void;
  onSave: (project: Partial<HomeProject>) => void;
}) {
  const [editing, setEditing] = useState(project);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{project.id ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0 8px' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} autoFocus={!project.id} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Area</label>
              <input value={editing.area || ''} onChange={e => setEditing({ ...editing, area: e.target.value })} placeholder="e.g. Upstairs" />
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Target Date</label>
              <input type="date" value={editing.targetDate || ''} onChange={e => setEditing({ ...editing, targetDate: e.target.value || null })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
              <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as HomeProject['status'] })}>
                {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Priority</label>
              <select value={editing.priority} onChange={e => setEditing({ ...editing, priority: e.target.value as HomeProject['priority'] })}>
                {PRIORITY_OPTIONS.map(priority => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Budget Notes</label>
            <textarea value={editing.budgetNotes || ''} onChange={e => setEditing({ ...editing, budgetNotes: e.target.value })} style={{ height: 64, resize: 'none' }} />
          </div>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
            <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={{ height: 80, resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(editing)}>Save Project</button>
        </div>
      </div>
    </div>
  );
}
