'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { DocumentRecord, HomeProject, Room, RoomItem } from '@/lib/types';
import { Box, CheckCircle2, ChevronRight, FileText, Grid3X3, Hammer, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    const [documentRes, roomRes, roomItemRes, projectRes] = await Promise.all([
      fetch('/api/documents'),
      fetch('/api/rooms'),
      fetch('/api/room-items'),
      fetch('/api/home-projects'),
    ]);
    setDocuments(await documentRes.json());
    setRooms(await roomRes.json());
    setRoomItems(await roomItemRes.json());
    setProjects(await projectRes.json());
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => fetchAll());
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading house planning...</div>;

  const placedItems = roomItems.filter(item => item.roomId !== null);
  const unplacedItems = roomItems.filter(item => item.roomId === null);
  const plannedPurchases = roomItems.filter(item => item.itemSource === 'planned_purchase');
  const existingItems = roomItems.filter(item => item.itemSource === 'existing_belonging');
  const openProjects = projects.filter(project => project.status !== 'complete');
  const activeProjects = projects.filter(project => ['planning', 'quoted', 'scheduled'].includes(project.status));
  const highPriorityProjects = projects.filter(project => project.priority === 'high' && project.status !== 'complete');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 28 }}>
        <h1>House Planning</h1>
        <p className="page-subtitle">Rooms, layout, documents, and future projects for the new home.</p>
      </div>

      <HomeSubnav />

      <div className="overview-grid" style={{ marginBottom: 28 }}>
        <SummaryCard
          title="Rooms"
          subtitle={`${rooms.length} rooms defined`}
          href="/home/rooms"
          icon={<Box size={18} />}
        />
        <SummaryCard
          title="Layout"
          subtitle={`${placedItems.length} placed, ${unplacedItems.length} unplaced`}
          href="/home/layout"
          icon={<Grid3X3 size={18} />}
        />
        <SummaryCard
          title="Projects"
          subtitle={`${openProjects.length} open of ${projects.length}`}
          href="/home/projects"
          icon={<Hammer size={18} />}
        />
        <SummaryCard
          title="Documents"
          subtitle={`${documents.length} saved links`}
          href="/home/documents"
          icon={<FileText size={18} />}
        />
      </div>

      <div className="overview-grid">
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Room Planning</h2>
            <Link href="/home/rooms" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <MetricRow label="Existing belongings assigned" value={existingItems.length} icon={<Package size={14} />} />
            <MetricRow label="Planned purchases" value={plannedPurchases.length} icon={<Box size={14} />} />
            <MetricRow label="Placed on layout" value={placedItems.length} icon={<Grid3X3 size={14} />} />
            <MetricRow label="Still unplaced" value={unplacedItems.length} icon={<ChevronRight size={14} />} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Project Pipeline</h2>
            <Link href="/home/projects" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.length === 0 ? (
              <EmptyState text="No future home projects yet." />
            ) : (
              <>
                <MetricRow label="Active planning" value={activeProjects.length} icon={<Hammer size={14} />} />
                <MetricRow label="High priority" value={highPriorityProjects.length} icon={<CheckCircle2 size={14} />} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {openProjects.slice(0, 4).map(project => (
                    <div key={project.id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>{project.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span className="section-label" style={{ margin: 0 }}>{project.status}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{project.priority} priority</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  subtitle,
  href,
  icon,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ height: '100%' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-dark)', flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 4 }}>{subtitle}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MetricRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-dark)', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: 'var(--color-secondary)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-foreground)' }}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>{text}</div>;
}
