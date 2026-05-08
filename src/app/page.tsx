'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { format, parseISO, differenceInCalendarDays, startOfDay } from 'date-fns';
import {
  AlertCircle,
  Box,
  CalendarDays,
  CarFront,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Grid3X3,
  Hammer,
  Heart,
  House,
  Landmark,
  Map,
  Package,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import AreaIcon, { type AreaIconKey } from '@/components/AreaIcon';
import { Milestone, validateDates } from '@/lib/dateUtils';
import type {
  Belonging,
  Category,
  DocumentRecord,
  DriveLoadoutItem,
  DriveVehicle,
  HomeProject,
  MoveEvent,
  MoveLocation,
  MoveSettings,
  PlanningTask,
  Room,
  RoomItem,
  Task,
  TimelineEntry,
} from '@/lib/types';
import { buildHqModel, type HqModel, type HqModelInput } from '@/features/hq/hqModel';
import type { TaskAsset, TaskAssetScope } from '@/features/tasks/taskAssets';
import type { TimelineAsset } from '@/features/timelines/timelineAssets';

type OverviewData = Omit<HqModelInput, 'today'>;
type MilestoneDateKey =
  | 'closingDate'
  | 'upackDropoffDate'
  | 'upackPickupDate'
  | 'driveStartDate'
  | 'arrivalDate'
  | 'upackDeliveryDate'
  | 'upackFinalPickupDate';
type MilestoneConfirmKey =
  | 'isClosingDateConfirmed'
  | 'isUpackDropoffConfirmed'
  | 'isUpackPickupConfirmed'
  | 'isDriveStartConfirmed'
  | 'isArrivalConfirmed'
  | 'isUpackDeliveryConfirmed'
  | 'isUpackFinalPickupConfirmed';

const MILESTONE_SHORT: Record<string, string> = {
  'U-Pack Dropoff (FL)': 'Dropoff',
  'U-Pack Pickup (FL)': 'Pickup',
  'Drive Start': 'Drive',
  'Arrival (NY)': 'Arrival',
  'House Closing': 'Closing',
  'U-Pack Delivery (NY)': 'Delivery',
  'U-Pack Final Pickup (NY)': 'Final',
};

const CONFIRM_KEY_MAP: Record<MilestoneDateKey, MilestoneConfirmKey> = {
  closingDate: 'isClosingDateConfirmed',
  upackDropoffDate: 'isUpackDropoffConfirmed',
  upackPickupDate: 'isUpackPickupConfirmed',
  driveStartDate: 'isDriveStartConfirmed',
  arrivalDate: 'isArrivalConfirmed',
  upackDeliveryDate: 'isUpackDeliveryConfirmed',
  upackFinalPickupDate: 'isUpackFinalPickupConfirmed',
};

const TASK_SCOPE_ICONS: Record<TaskAssetScope, AreaIconKey> = {
  move: 'move',
  home_purchase: 'home_purchase',
  loan: 'loan',
  home_setup: 'home_setup',
  home_updates: 'home_updates',
};

const BELONGING_ICONS: Record<Belonging['action'], ReactNode> = {
  Bring: <Box size={12} />,
  Sell: <DollarSign size={12} />,
  Donate: <Heart size={12} />,
  Trash: <Trash2 size={12} />,
};

const MILESTONE_DATE_KEYS = new Set<keyof MoveSettings>(Object.keys(CONFIRM_KEY_MAP) as MilestoneDateKey[]);

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dateModal, setDateModal] = useState<{ key: MilestoneDateKey; label: string } | null>(null);
  const [tempDate, setTempDate] = useState('');
  const [tempConfirmed, setTempConfirmed] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  async function fetchData() {
    setLoadError(null);
    const [
      settingsRes,
      categoriesRes,
      planningTasksRes,
      eventsRes,
      timelineRes,
      locationsRes,
      belongingsRes,
      documentsRes,
      roomsRes,
      roomItemsRes,
      projectsRes,
      vehiclesRes,
      loadoutRes,
    ] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/planning-tasks'),
      fetch('/api/events'),
      fetch('/api/timeline'),
      fetch('/api/locations'),
      fetch('/api/belongings'),
      fetch('/api/documents'),
      fetch('/api/rooms'),
      fetch('/api/room-items'),
      fetch('/api/home-projects'),
      fetch('/api/drive-vehicles'),
      fetch('/api/drive-loadout-items'),
    ]);

    const settings = await readJson<MoveSettings>(settingsRes);
    sanitise(settings);
    const categoriesPayload = await readJson<{ categories: Category[]; tasks: Task[] }>(categoriesRes);

    setData({
      settings,
      categories: categoriesPayload.categories,
      tasks: categoriesPayload.tasks,
      planningTasks: await readJson<PlanningTask[]>(planningTasksRes),
      events: await readJson<MoveEvent[]>(eventsRes),
      timelineEntries: await readJson<TimelineEntry[]>(timelineRes),
      locations: await readJson<MoveLocation[]>(locationsRes),
      belongings: await readJson<Belonging[]>(belongingsRes),
      documents: await readJson<DocumentRecord[]>(documentsRes),
      rooms: await readJson<Room[]>(roomsRes),
      roomItems: await readJson<RoomItem[]>(roomItemsRes),
      projects: await readJson<HomeProject[]>(projectsRes),
      driveVehicles: await readJson<DriveVehicle[]>(vehiclesRes),
      driveLoadoutItems: await readJson<DriveLoadoutItem[]>(loadoutRes),
    });
  }

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve()
      .then(() => fetchData())
      .catch(error => {
        if (isMounted) setLoadError(error instanceof Error ? error.message : 'Unable to load HQ data.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const hq = useMemo(() => data ? buildHqModel(data) : null, [data]);

  const openDateModal = (milestone: Milestone) => {
    if (!data || !isMilestoneDateKey(milestone.key)) return;
    const confirmKey = CONFIRM_KEY_MAP[milestone.key];
    setDateModal({ key: milestone.key, label: milestone.label });
    setTempDate(data.settings[milestone.key] || '');
    setTempConfirmed(Boolean(data.settings[confirmKey]));
    setDateError(null);
  };

  const saveDateModal = async () => {
    if (!data || !dateModal) return;
    const date = tempDate || null;
    const confirmKey = CONFIRM_KEY_MAP[dateModal.key];
    if (tempConfirmed && !date) {
      setDateError(`${dateModal.label} cannot be confirmed without a date.`);
      return;
    }

    const projected = {
      ...data.settings,
      [dateModal.key]: date,
      [confirmKey]: tempConfirmed,
    } as MoveSettings;
    sanitise(projected);
    const err = validateDates(projected);
    if (err) {
      setDateError(err);
      return;
    }

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [dateModal.key]: date, [confirmKey]: tempConfirmed }),
    });

    if (res.ok) {
      setData(current => current ? { ...current, settings: projected } : current);
      setDateModal(null);
    } else {
      const e = await res.json();
      setDateError(e.error || 'Unknown error');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading HQ...</div>;
  }

  if (loadError || !data || !hq) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 40 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertCircle size={20} color="#b91c1c" />
            <div>
              <h2 style={{ margin: 0 }}>HQ could not load</h2>
              <p style={{ margin: '6px 0 0', color: 'var(--color-secondary)' }}>{loadError ?? 'Missing dashboard data.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const driveDate = data.settings.driveStartDate ? parseISO(data.settings.driveStartDate) : null;
  const daysUntilDrive = driveDate ? differenceInCalendarDays(driveDate, startOfDay(new Date())) : null;
  const driveCountdownLabel = daysUntilDrive === 0
    ? 'Drive starts today'
    : daysUntilDrive === 1
      ? 'Drive starts tomorrow'
      : daysUntilDrive !== null && daysUntilDrive > 1
        ? `Drive starts in ${daysUntilDrive} days`
        : null;

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>HQ</h1>
          <p className="page-subtitle">Synced command center for move, timelines, loan, stuff, cars, and house planning.</p>
        </div>
        {driveDate && driveCountdownLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)', borderRadius: 8 }}>
            <Clock size={15} color="var(--color-accent-dark)" />
            <div>
              <div className="section-label" style={{ color: 'var(--color-accent-dark)', opacity: 0.85, marginBottom: 4 }}>Drive Start</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent-dark)', lineHeight: 1.2 }}>{format(driveDate, 'EEEE, MMM d')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-accent-dark)', opacity: 0.9, marginTop: 4 }}>{driveCountdownLabel}</div>
            </div>
          </div>
        )}
      </div>

      <div className="overview-grid" style={{ marginBottom: 28 }}>
        <QuickLinkCard href="/timeline" title="Timelines" subtitle={`${hq.timelineSummary.upcoming.length} upcoming, ${hq.timelineSummary.blocked.length} blocked`} icon={<CalendarDays size={18} />} />
        <QuickLinkCard href="/tasks" title="Tasks" subtitle={`${hq.taskSummary.complete} / ${hq.taskSummary.total} complete`} icon={<CheckSquare size={18} />} />
        <QuickLinkCard href="/tasks?filter=loan" title="Loan" subtitle={`${hq.loanSummary.taskOpen} open tasks, ${hq.loanSummary.timelineBlocked} blocked`} icon={<Landmark size={18} />} />
        <QuickLinkCard href="/belongings" title="Stuff" subtitle={`${hq.belongingsSummary.resolved} / ${hq.belongingsSummary.total} sorted`} icon={<Package size={18} />} />
        <QuickLinkCard href="/drive-plan" title="Cars" subtitle={`${hq.driveSummary.vehicles} vehicles, ${hq.driveSummary.unassignedItems} unassigned`} icon={<CarFront size={18} />} />
        <QuickLinkCard href="/home" title="House Planning" subtitle={`${hq.houseSummary.rooms} rooms, ${hq.houseSummary.openProjects} open projects`} icon={<House size={18} />} />
      </div>

      <div className="mini-timeline" style={{ marginBottom: 28 }}>
        <CardHeader title="Key Dates" href="/timeline?filter=key_dates" action="Full timeline" />
        <MiniTimeline milestones={hq.milestones} onEdit={openDateModal} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          <TimelineLegendDot type="confirmed" label="Confirmed" />
          <TimelineLegendDot type="estimated" label="Estimated" />
          <TimelineLegendDot type="unset" label="Not set" />
          <div style={{ width: 1, height: 12, background: 'var(--color-border)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>Tap any date to edit</span>
        </div>
      </div>

      <div className="overview-grid" style={{ alignItems: 'start', marginBottom: 28 }}>
        <TimelinesCard hq={hq} />
        <TasksCard hq={hq} />
      </div>

      <div className="overview-grid" style={{ alignItems: 'start', marginBottom: 28 }}>
        <LoanCard hq={hq} />
        <HousePlanningCard hq={hq} />
      </div>

      <div className="overview-grid" style={{ alignItems: 'start' }}>
        <StuffCard hq={hq} />
        <CarsRouteCard hq={hq} />
      </div>

      {dateModal && (
        <div className="modal-backdrop" onClick={() => setDateModal(null)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{dateModal.label}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDateModal(null)} style={{ padding: '0 8px' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {dateError && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>{dateError}</div>
              )}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Date</label>
                <input type="date" value={tempDate} onChange={event => setTempDate(event.target.value)} />
              </div>
              <div className={`confirmed-toggle ${tempConfirmed ? 'on' : ''}`} onClick={() => setTempConfirmed(value => !value)}>
                <div className={`check-circle ${tempConfirmed ? 'checked' : ''}`}>
                  {tempConfirmed && <CheckCircle2 size={14} color="white" />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Confirmed</div>
                  <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 2 }}>Lock this date in the timeline</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDateModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveDateModal}><Save size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed with ${res.status}`);
  return data as T;
}

function sanitise(settings: MoveSettings) {
  if (settings.isClosingDateConfirmed && !settings.closingDate) settings.isClosingDateConfirmed = false;
  if (settings.isUpackDropoffConfirmed && !settings.upackDropoffDate) settings.isUpackDropoffConfirmed = false;
  if (settings.isUpackPickupConfirmed && !settings.upackPickupDate) settings.isUpackPickupConfirmed = false;
  if (settings.isDriveStartConfirmed && !settings.driveStartDate) settings.isDriveStartConfirmed = false;
  if (settings.isArrivalConfirmed && !settings.arrivalDate) settings.isArrivalConfirmed = false;
  if (settings.isUpackDeliveryConfirmed && !settings.upackDeliveryDate) settings.isUpackDeliveryConfirmed = false;
  if (settings.isUpackFinalPickupConfirmed && !settings.upackFinalPickupDate) settings.isUpackFinalPickupConfirmed = false;
}

function isMilestoneDateKey(key: keyof MoveSettings): key is MilestoneDateKey {
  return MILESTONE_DATE_KEYS.has(key);
}

function TimelinesCard({ hq }: { hq: HqModel }) {
  const items = hq.timelineSummary.blocked.length > 0
    ? hq.timelineSummary.blocked.slice(0, 3)
    : hq.timelineSummary.upcoming.slice(0, 4);
  return (
    <div className="card">
      <CardHeader title="Timelines" href="/timeline" action="Open" />
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-neutral">{hq.timelineSummary.total} total</span>
          <span className="badge badge-neutral">{hq.timelineSummary.upcoming.length} upcoming</span>
          {hq.timelineSummary.blocked.length > 0 && <span className="badge" style={{ background: '#fff0f0', color: '#b91c1c' }}>{hq.timelineSummary.blocked.length} blocked</span>}
        </div>
        <TimelineList items={items} emptyText="No upcoming timeline items." />
      </div>
    </div>
  );
}

function TasksCard({ hq }: { hq: HqModel }) {
  return (
    <div className="card">
      <CardHeader title="Tasks" href="/tasks" action="Open" />
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--color-foreground)' }}>{hq.taskSummary.complete}</span>
            <span style={{ fontSize: 16, color: 'var(--color-secondary)', fontWeight: 400 }}>/ {hq.taskSummary.total}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)', marginLeft: 4 }}>tasks complete</span>
          </div>
          <ProgressBar percent={hq.taskSummary.percent} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          {hq.taskSummary.scopes.map(scope => (
            <ScopeProgressRow key={scope.scope} scope={scope.scope} label={scope.label} complete={scope.complete} total={scope.total} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoanCard({ hq }: { hq: HqModel }) {
  return (
    <div className="card">
      <CardHeader title="Loan" href="/tasks?filter=loan" action="Open tasks" />
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-neutral">{hq.loanSummary.taskOpen} open tasks</span>
          <span className="badge badge-neutral">{hq.loanSummary.timelineTotal} timeline entries</span>
          {hq.loanSummary.timelineBlocked > 0 && <span className="badge" style={{ background: '#fff0f0', color: '#b91c1c' }}>{hq.loanSummary.timelineBlocked} blocked</span>}
        </div>
        {hq.loanSummary.latestTimeline && (
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Latest loan event</div>
            <TimelineRow item={hq.loanSummary.latestTimeline} />
          </div>
        )}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Open loan tasks</div>
          <TaskList tasks={hq.loanSummary.nextTasks} emptyText="No open loan tasks." />
        </div>
      </div>
    </div>
  );
}

function HousePlanningCard({ hq }: { hq: HqModel }) {
  return (
    <div className="card">
      <CardHeader title="House Planning" href="/home" action="Open" />
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MetricRow label="Rooms defined" value={hq.houseSummary.rooms} icon={<House size={14} />} />
        <MetricRow label="Room items placed" value={`${hq.houseSummary.placedItems} / ${hq.houseSummary.roomItems}`} icon={<Grid3X3 size={14} />} />
        <MetricRow label="Open projects" value={hq.houseSummary.openProjects} icon={<Hammer size={14} />} />
        <MetricRow label="High priority projects" value={hq.houseSummary.highPriorityProjects} icon={<AlertCircle size={14} />} />
        <MetricRow label="Saved document links" value={hq.houseSummary.documents} icon={<FileText size={14} />} />
      </div>
    </div>
  );
}

function StuffCard({ hq }: { hq: HqModel }) {
  return (
    <div className="card">
      <CardHeader title="Stuff" href="/belongings" action="Open" />
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--color-foreground)' }}>{hq.belongingsSummary.resolved}</span>
            <span style={{ fontSize: 16, color: 'var(--color-secondary)', fontWeight: 400 }}>/ {hq.belongingsSummary.total}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)', marginLeft: 4 }}>items sorted</span>
          </div>
          <ProgressBar percent={hq.belongingsSummary.percent} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          {hq.belongingsSummary.byAction.map(action => (
            <div key={action.action}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {BELONGING_ICONS[action.action]} {action.action}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary)' }}>{action.resolved} / {action.total}</span>
              </div>
              <ProgressBar percent={action.total ? Math.round((action.resolved / action.total) * 100) : 0} small />
            </div>
          ))}
          {hq.belongingsSummary.total === 0 && <EmptyState text="No stuff has been added yet." />}
        </div>
      </div>
    </div>
  );
}

function CarsRouteCard({ hq }: { hq: HqModel }) {
  return (
    <div className="card">
      <CardHeader title="Cars And Route" href="/drive-plan" action="Open cars" />
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MetricRow label="Vehicles" value={hq.driveSummary.vehicles} icon={<CarFront size={14} />} />
        <MetricRow label="Loadout assigned" value={`${hq.driveSummary.assignedItems} / ${hq.driveSummary.loadoutItems}`} icon={<Package size={14} />} />
        <MetricRow label="Required unassigned" value={hq.driveSummary.requiredUnassignedItems} icon={<AlertCircle size={14} />} />
        <MetricRow label="Route stops" value={hq.driveSummary.routeStops} icon={<Map size={14} />} />
        <MetricRow label="Overnights" value={hq.driveSummary.overnightStops} icon={<Clock size={14} />} />
        <Link href="/map" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', marginTop: 4, textDecoration: 'none' }}>
          <Map size={14} /> Open route
        </Link>
      </div>
    </div>
  );
}

function CardHeader({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="card-header">
      <h2 style={{ margin: 0 }}>{title}</h2>
      <Link href={href} style={{ textDecoration: 'none' }}>
        <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          {action} <ChevronRight size={12} />
        </span>
      </Link>
    </div>
  );
}

function TimelineList({ items, emptyText }: { items: TimelineAsset[]; emptyText: string }) {
  if (items.length === 0) return <EmptyState text={emptyText} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => <TimelineRow key={item.id} item={item} />)}
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineAsset }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            {item.trackKey && <AreaIcon area={item.trackKey === 'loan' ? 'loan' : item.trackKey === 'home_updates' ? 'home_updates' : item.trackKey === 'home_purchase' ? 'home_purchase' : 'events'} size={12} />}
            <span className="section-label" style={{ margin: 0 }}>{item.label}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)' }}>{item.title}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground)' }}>{format(item.date, 'MMM d')}</div>
          <StatusPill status={item.status} />
        </div>
      </div>
    </div>
  );
}

function TaskList({ tasks, emptyText }: { tasks: TaskAsset[]; emptyText: string }) {
  if (tasks.length === 0) return <EmptyState text={emptyText} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tasks.map(task => (
        <div key={task.uid} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AreaIcon area={TASK_SCOPE_ICONS[task.scope]} size={12} />
                <span className="section-label" style={{ margin: 0 }}>{task.groupLabel}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)' }}>{task.title}</div>
            </div>
            {task.dueDate && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary)', whiteSpace: 'nowrap' }}>{format(parseISO(task.dueDate), 'MMM d')}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScopeProgressRow({ scope, label, complete, total }: { scope: TaskAssetScope; label: string; complete: number; total: number }) {
  const pct = total ? Math.round((complete / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <AreaIcon area={TASK_SCOPE_ICONS[scope]} size={12} /> {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary)' }}>{complete} / {total}</span>
      </div>
      <ProgressBar percent={pct} small />
    </div>
  );
}

function MetricRow({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-dark)', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: 'var(--color-secondary)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-foreground)' }}>{value}</div>
    </div>
  );
}

function ProgressBar({ percent, small = false }: { percent: number; small?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: small ? 0 : 10 }}>
      <div style={{ flex: 1, height: small ? 5 : 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: 'var(--color-accent)', borderRadius: 4, opacity: small ? 0.75 : 1, transition: 'width 0.8s ease' }} />
      </div>
      {!small && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary)', flexShrink: 0, width: 34, textAlign: 'right' }}>{percent}%</span>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'confirmed') {
    return <span className="badge" style={{ marginTop: 5, background: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)' }}>Confirmed</span>;
  }
  if (status === 'complete' || status === 'Complete') {
    return <span className="badge" style={{ marginTop: 5, background: 'var(--color-sage-soft)', color: 'var(--color-sage)' }}>Complete</span>;
  }
  if (status === 'blocked') {
    return <span className="badge" style={{ marginTop: 5, background: '#fff0f0', color: '#b91c1c' }}>Blocked</span>;
  }
  return <span className="badge badge-neutral" style={{ marginTop: 5 }}>Estimated</span>;
}

function QuickLinkCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ height: '100%' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-dark)', flexShrink: 0 }}>
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

function MiniTimeline({ milestones, onEdit }: { milestones: Milestone[]; onEdit: (milestone: Milestone) => void }) {
  const today = new Date();
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 'calc(100% / 14)', right: 'calc(100% / 14)', top: 9, height: 2, background: 'var(--color-border)', zIndex: 0 }} />
      <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
        {milestones.map(milestone => {
          const isConfirmed = milestone.status === 'confirmed';
          const isUnset = milestone.status === 'unset';
          const isPast = milestone.date ? parseISO(milestone.date) < today : false;
          const isSolid = isConfirmed || isPast;
          return (
            <button
              key={milestone.key as string}
              onClick={() => onEdit(milestone)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                flexShrink: 0,
                background: isSolid ? 'var(--color-accent)' : 'var(--color-surface)',
                border: `2px ${isUnset ? 'dashed' : 'solid'} ${isUnset ? 'var(--color-border)' : 'var(--color-accent)'}`,
                boxShadow: isConfirmed && !isPast ? '0 0 0 3px var(--color-accent-soft)' : 'none',
                transition: 'all 0.15s',
              }} />
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isUnset ? 'var(--color-border)' : 'var(--color-secondary)', textAlign: 'center', lineHeight: 1.3 }}>
                {MILESTONE_SHORT[milestone.label] || milestone.label}
              </div>
              <div style={{ fontSize: 11, fontWeight: isConfirmed ? 700 : 400, color: isUnset ? 'var(--color-border)' : isSolid ? 'var(--color-foreground)' : 'var(--color-secondary)', textAlign: 'center', lineHeight: 1.2 }}>
                {milestone.date ? format(parseISO(milestone.date), 'MMM d') : '-'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: 'var(--color-secondary)' }}>{text}</div>;
}
