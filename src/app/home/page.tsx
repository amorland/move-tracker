'use client';

import HomeSubnav from '@/components/HomeSubnav';
import { DocumentRecord, MoveEvent, MoveSettings, PlanningTask, Room, RoomItem, TimelineEntry } from '@/lib/types';
import { CalendarCheck, CheckSquare, ChevronRight, FileText, Grid3X3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [events, setEvents] = useState<MoveEvent[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [settingsRes, eventRes, timelineRes, taskRes, documentRes, roomRes, roomItemRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/events'),
      fetch('/api/timeline?limit=20'),
      fetch('/api/planning-tasks'),
      fetch('/api/documents'),
      fetch('/api/rooms'),
      fetch('/api/room-items'),
    ]);
    const settingsData: MoveSettings = await settingsRes.json();
    const eventData: MoveEvent[] = await eventRes.json();
    const timelineData: TimelineEntry[] = await timelineRes.json();
    const taskData: PlanningTask[] = await taskRes.json();
    const documentData: DocumentRecord[] = await documentRes.json();
    const roomData: Room[] = await roomRes.json();
    const roomItemData: RoomItem[] = await roomItemRes.json();
    setSettings(settingsData);
    setEvents(eventData);
    setTimelineEntries(timelineData.filter(entry => ['home_purchase', 'loan', 'home_updates'].includes(entry.trackKey || '')));
    setTasks(taskData.filter(task => ['home_purchase', 'loan', 'home_updates'].includes(task.trackKey || '')));
    setDocuments(documentData);
    setRooms(roomData);
    setRoomItems(roomItemData);
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading the Chestnut house plan…</div>;

  const openTasks = tasks.filter(task => task.status !== 'Complete');
  const purchaseMilestones = buildPurchaseMilestones(settings, events, timelineEntries);
  const pendingMilestones = purchaseMilestones.filter(milestone => milestone.status !== 'confirmed');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 28 }}>
        <h1>House Planning</h1>
        <p className="page-subtitle">Where we stand on 25 Chestnut.</p>
      </div>

      <HomeSubnav />

      <div className="mini-timeline" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Home Purchase Process</h2>
          <Link href="/home/timeline" style={{ textDecoration: 'none' }}>
            <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Full timeline <ChevronRight size={12} />
            </span>
          </Link>
        </div>
        <HomePurchaseProcessTimeline milestones={purchaseMilestones} />
      </div>

      <div className="overview-grid" style={{ marginBottom: 28 }}>
        <SummaryCard
          title="Purchase Timeline"
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
          subtitle={`${documents.length} Chestnut and loan links saved`}
          href="/home/documents"
          icon={<FileText size={18} />}
        />
        <SummaryCard
          title="Layout"
          subtitle={`${roomItems.filter(item => item.roomId !== null).length} placed across ${rooms.length} rooms`}
          href="/home/layout"
          icon={<Grid3X3 size={18} />}
        />
      </div>

      <div className="overview-grid">
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Pending Milestones</h2>
            <Link href="/home/timeline" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingMilestones.length === 0 ? (
              <EmptyState text="No pending milestones. The purchase process is fully dated and confirmed." />
            ) : (
              pendingMilestones.map(milestone => (
                <div key={milestone.key} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>{milestone.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="section-label" style={{ margin: 0 }}>{milestone.status === 'estimated' ? 'Estimated' : 'Pending'}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>
                      {milestone.date ? format(parseISO(milestone.date), 'MMM d, yyyy') : 'Date not set'}
                    </span>
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

type PurchaseMilestone = {
  key: string;
  label: string;
  date: string | null;
  status: 'confirmed' | 'estimated' | 'unset';
};

const PURCHASE_SHORT: Record<string, string> = {
  offerSubmitted: 'Offer',
  offerAccepted: 'Accepted',
  contractsSigned: 'Contracts',
 loanPackage: 'Loan',
  commitmentDate: 'Commitment',
  closingDate: 'Closing',
};

function buildPurchaseMilestones(
  settings: MoveSettings | null,
  events: MoveEvent[],
  timelineEntries: TimelineEntry[],
): PurchaseMilestone[] {
  const findEvent = (matcher: (title: string) => boolean) =>
    events.find(event => matcher(event.title.toLowerCase()));
  const findEntry = (matcher: (title: string) => boolean) =>
    timelineEntries.find(entry => matcher(entry.title.toLowerCase()));
  const entryStatus = (entry?: TimelineEntry | null): 'confirmed' | 'estimated' | 'unset' => {
    if (!entry) return 'unset';
    return entry.status === 'confirmed' || entry.status === 'complete' ? 'confirmed' : 'estimated';
  };
  const eventStatus = (event?: MoveEvent | null): 'confirmed' | 'estimated' | 'unset' => {
    if (!event) return 'unset';
    return event.is_confirmed ? 'confirmed' : 'estimated';
  };

  const offerSubmitted = findEntry(title => title.includes('offer submitted'));
  const offerAcceptedEvent = findEvent(title => title.includes('memorandum of agreement'));
  const contractsSignedEvent = findEvent(title => title.includes('contract of sale signed'));
  const loanPackageEntry = findEntry(title => title.includes('underwriting documentation package assembled') || title.includes('mortgage underwriting documents submitted'));
  const commitmentEvent = findEvent(title => title.includes('mortgage commitment deadline'));

  return [
    {
      key: 'offerSubmitted',
      label: 'Offer Submitted',
      date: offerSubmitted?.date ?? null,
      status: entryStatus(offerSubmitted),
    },
    {
      key: 'offerAccepted',
      label: 'Offer Accepted',
      date: offerAcceptedEvent?.date ?? null,
      status: eventStatus(offerAcceptedEvent),
    },
    {
      key: 'contractsSigned',
      label: 'Contracts Signed',
      date: contractsSignedEvent?.date ?? null,
      status: eventStatus(contractsSignedEvent),
    },
    {
      key: 'loanPackage',
      label: 'Loan Package Submitted',
      date: loanPackageEntry?.date ?? null,
      status: entryStatus(loanPackageEntry),
    },
    {
      key: 'commitmentDate',
      label: 'Loan Commitment Date',
      date: commitmentEvent?.date ?? null,
      status: eventStatus(commitmentEvent),
    },
    {
      key: 'closingDate',
      label: 'Closing Date',
      date: settings?.closingDate ?? null,
      status: settings?.closingDate
        ? (settings.isClosingDateConfirmed ? 'confirmed' : 'estimated')
        : 'unset',
    },
  ];
}

function HomePurchaseProcessTimeline({ milestones }: { milestones: PurchaseMilestone[] }) {
  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: 'calc(100% / 12)', right: 'calc(100% / 12)', top: 9, height: 2, background: 'var(--color-border)', zIndex: 0 }} />
        <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
          {milestones.map((milestone) => {
            const isConfirmed = milestone.status === 'confirmed';
            const isUnset = milestone.status === 'unset';
            return (
              <div key={milestone.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 2px' }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isConfirmed ? 'var(--color-accent)' : 'var(--color-surface)',
                  border: `2px ${isUnset ? 'dashed' : 'solid'} ${isUnset ? 'var(--color-border)' : 'var(--color-accent)'}`,
                  boxShadow: isConfirmed ? '0 0 0 3px var(--color-accent-soft)' : 'none',
                }} />
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: isUnset ? 'var(--color-border)' : 'var(--color-secondary)', textAlign: 'center' as const, lineHeight: 1.3 }}>
                  {PURCHASE_SHORT[milestone.key] || milestone.label}
                </div>
                <div style={{ fontSize: 11, fontWeight: isConfirmed ? 700 : 500, color: isUnset ? 'var(--color-border)' : 'var(--color-foreground)', textAlign: 'center' as const, lineHeight: 1.2 }}>
                  {milestone.date ? format(parseISO(milestone.date), 'MMM d') : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
        <TimelineLegendDot type="confirmed" label="Confirmed" />
        <TimelineLegendDot type="estimated" label="Estimated" />
        <TimelineLegendDot type="unset" label="Pending / unset" />
      </div>
    </div>
  );
}

function TimelineLegendDot({ type, label }: { type: 'confirmed' | 'estimated' | 'unset'; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
        background: type === 'confirmed' ? 'var(--color-accent)' : 'transparent',
        border: `1.5px ${type === 'unset' ? 'dashed' : 'solid'} ${type === 'unset' ? 'var(--color-border)' : 'var(--color-accent)'}`,
      }} />
      <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{label}</span>
    </div>
  );
}
