'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { DocumentRecord, PlanningTask, TimelineEntry } from '@/lib/types';
import { CalendarCheck, CheckSquare, ChevronRight, FileText, House } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [timelineRes, taskRes, documentRes] = await Promise.all([
      fetch('/api/timeline?limit=6'),
      fetch('/api/planning-tasks'),
      fetch('/api/documents'),
    ]);
    const timelineData: TimelineEntry[] = await timelineRes.json();
    const taskData: PlanningTask[] = await taskRes.json();
    const documentData: DocumentRecord[] = await documentRes.json();
    setTimelineEntries(timelineData.filter(entry => ['home_purchase', 'loan', 'home_updates'].includes(entry.trackKey || '')));
    setTasks(taskData.filter(task => ['home_purchase', 'loan', 'home_updates'].includes(task.trackKey || '')));
    setDocuments(documentData);
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading home planning…</div>;

  const openTasks = tasks.filter(task => task.status !== 'Complete');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 28 }}>
        <h1>Home Planning</h1>
        <p className="page-subtitle">Purchase, loan, documents, and future update planning</p>
      </div>

      <HomeSubnav />

      <div className="overview-grid" style={{ marginBottom: 28 }}>
        <SummaryCard
          title="Timeline"
          subtitle={`${timelineEntries.length} recent items`}
          href="/home/timeline"
          icon={<CalendarCheck size={18} />}
        />
        <SummaryCard
          title="Tasks"
          subtitle={`${openTasks.length} open of ${tasks.length}`}
          href="/home/tasks"
          icon={<CheckSquare size={18} />}
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
            <h2 style={{ margin: 0 }}>Recent Timeline</h2>
            <Link href="/home/timeline" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {timelineEntries.length === 0 ? (
              <EmptyState text="No home planning timeline entries yet." />
            ) : (
              timelineEntries.slice(0, 5).map(entry => (
                <div key={entry.id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>{entry.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="section-label" style={{ margin: 0 }}>{entry.trackName}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{entry.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Open Tasks</h2>
            <Link href="/home/tasks" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openTasks.length === 0 ? (
              <EmptyState text="No open home tasks." />
            ) : (
              openTasks.slice(0, 5).map(task => (
                <div key={task.id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="section-label" style={{ margin: 0 }}>{task.trackName}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{task.section.replace('_', ' ')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2 style={{ margin: 0 }}>Documents Snapshot</h2>
          <Link href="/home/documents" style={{ textDecoration: 'none' }}>
            <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open <ChevronRight size={12} />
            </span>
          </Link>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {documents.length === 0 ? (
            <EmptyState text="No documents saved yet." />
          ) : (
            documents.slice(0, 4).map(document => (
              <div key={document.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)' }}>
                  <House size={14} color="var(--color-accent-dark)" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{document.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-secondary)', marginTop: 4 }}>{document.category}</div>
                </div>
              </div>
            ))
          )}
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

function EmptyState({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>{text}</div>;
}
