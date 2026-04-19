'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Belonging, Category, MoveLocation, TimelineEntry, MoveEvent } from '@/lib/types';
import { format, parseISO, differenceInCalendarDays, addSeconds, startOfDay } from 'date-fns';
import { CheckCircle2, ChevronRight, Box, DollarSign, Heart, Trash2, Clock, X, Save } from 'lucide-react';
import Link from 'next/link';
import { getMilestones, validateDates, Milestone } from '@/lib/dateUtils';

const MILESTONE_SHORT: Record<string, string> = {
  'U-Pack Dropoff (FL)': 'Dropoff',
  'U-Pack Pickup (FL)': 'Pickup',
  'Drive Start': 'Drive',
  'Arrival (NY)': 'Arrival',
  'House Closing': 'Closing',
  'U-Pack Delivery (NY)': 'Delivery',
  'U-Pack Final Pickup (NY)': 'Final',
};

const BELONGING_ICONS: Record<string, React.ReactNode> = {
  Bring: <Box size={12} />, Sell: <DollarSign size={12} />, Donate: <Heart size={12} />, Trash: <Trash2 size={12} />,
};

export default function OverviewPage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [belongings, setBelongings] = useState<Belonging[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeSummary, setRouteSummary] = useState<{
    distanceMiles: number;
    adjustedDuration: number;
    daysOfDriving: number;
    estArrival: Date | null;
    finalDayDuration: number | null;
  } | null>(null);
  const [routeLocations, setRouteLocations] = useState<MoveLocation[]>([]);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [homeEntries, setHomeEntries] = useState<TimelineEntry[]>([]);
  const [events, setEvents] = useState<MoveEvent[]>([]);

  const [dateModal, setDateModal] = useState<{ key: string; label: string } | null>(null);
  const [tempDate, setTempDate] = useState('');
  const [tempConfirmed, setTempConfirmed] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [sRes, cRes, bRes, lRes, homeRes, eventRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/belongings'),
      fetch('/api/locations'),
      fetch('/api/timeline?limit=20'),
      fetch('/api/events'),
    ]);
    const s = await sRes.json();
    sanitise(s);
    setSettings(s);
    const { categories: cats, tasks: ts } = await cRes.json();
    setCategories(cats);
    setTasks(ts);
    setBelongings(await bRes.json());
    const locs: MoveLocation[] = await lRes.json();
    const homeTimeline: TimelineEntry[] = await homeRes.json();
    const eventData: MoveEvent[] = await eventRes.json();
    setHomeEntries(homeTimeline.filter(entry => ['home_purchase', 'loan', 'home_updates'].includes(entry.trackKey || '')));
    setEvents(eventData);
    setLoading(false);

    const visibleStops = locs
      .filter(l => l.category === 'Origin' || l.category === 'Destination' ||
        (l.category === 'Stop' && !!l.notes?.startsWith('[overnight]')))
      .sort((a, b) => {
        if (a.category === 'Origin') return -1;
        if (b.category === 'Origin') return 1;
        if (a.category === 'Destination') return 1;
        if (b.category === 'Destination') return -1;
        return (a.id ?? 0) - (b.id ?? 0);
      });
    setRouteLocations(visibleStops);

    const routePoints = locs
      .filter(l => ['Origin', 'Stop', 'Destination'].includes(l.category) && l.lat && l.lng)
      .sort((a, b) => {
        if (a.category === 'Origin') return -1;
        if (b.category === 'Origin') return 1;
        if (a.category === 'Destination') return 1;
        if (b.category === 'Destination') return -1;
        return (a.id ?? 0) - (b.id ?? 0);
      });
    if (routePoints.length >= 2) {
      try {
        const coords = routePoints.map(p => `${p.lng},${p.lat}`).join(';');
        const rRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`);
        const rData = await rRes.json();
        if (rData.routes?.[0]) {
          const overnightCount = locs.filter(l => l.category === 'Stop' && l.notes?.startsWith('[overnight]')).length;
          const daysOfDriving = overnightCount + 1;
          const adjustedDuration = Math.round(rData.routes[0].duration * 0.8);
          const legs = Array.isArray(rData.routes[0].legs) ? rData.routes[0].legs : [];
          const adjustedLegDurations = legs.map((leg: { duration?: number }) => Math.round((leg.duration || 0) * 0.8));
          const dayDurations: number[] = [];
          let currentDayDuration = 0;

          adjustedLegDurations.forEach((legDuration: number, index: number) => {
            currentDayDuration += legDuration;
            const nextPoint = routePoints[index + 1];
            const endsDrivingDay = nextPoint?.category === 'Destination'
              || (nextPoint?.category === 'Stop' && !!nextPoint.notes?.startsWith('[overnight]'));

            if (endsDrivingDay) {
              dayDurations.push(currentDayDuration);
              currentDayDuration = 0;
            }
          });

          if (currentDayDuration > 0) {
            dayDurations.push(currentDayDuration);
          }

          const finalDayDuration = dayDurations.length > 0
            ? dayDurations[dayDurations.length - 1]
            : daysOfDriving > 0
              ? Math.round(adjustedDuration / daysOfDriving)
              : null;
          let estArrival: Date | null = null;
          if (s.driveStartDate && finalDayDuration !== null) {
            const driveStart = parseISO(s.driveStartDate);
            const lastDayStart = new Date(driveStart);
            lastDayStart.setDate(lastDayStart.getDate() + (daysOfDriving - 1));
            lastDayStart.setHours(9, 0, 0, 0);
            estArrival = addSeconds(lastDayStart, finalDayDuration);
          }
          setRouteSummary({
            distanceMiles: rData.routes[0].distance * 0.000621371,
            adjustedDuration,
            daysOfDriving,
            estArrival,
            finalDayDuration,
          });
        }
      } catch {}
    }
  };

  const sanitise = (s: MoveSettings) => {
    if (s.isClosingDateConfirmed && !s.closingDate) s.isClosingDateConfirmed = false;
    if (s.isUpackDropoffConfirmed && !s.upackDropoffDate) s.isUpackDropoffConfirmed = false;
    if (s.isUpackPickupConfirmed && !s.upackPickupDate) s.isUpackPickupConfirmed = false;
    if (s.isDriveStartConfirmed && !s.driveStartDate) s.isDriveStartConfirmed = false;
    if (s.isArrivalConfirmed && !s.arrivalDate) s.isArrivalConfirmed = false;
    if (s.isUpackDeliveryConfirmed && !s.upackDeliveryDate) s.isUpackDeliveryConfirmed = false;
    if (s.isUpackFinalPickupConfirmed && !s.upackFinalPickupDate) s.isUpackFinalPickupConfirmed = false;
  };

  const CONFIRM_KEY_MAP: Record<string, string> = {
    closingDate: 'isClosingDateConfirmed',
    upackDropoffDate: 'isUpackDropoffConfirmed',
    upackPickupDate: 'isUpackPickupConfirmed',
    driveStartDate: 'isDriveStartConfirmed',
    arrivalDate: 'isArrivalConfirmed',
    upackDeliveryDate: 'isUpackDeliveryConfirmed',
    upackFinalPickupDate: 'isUpackFinalPickupConfirmed',
  };

  const openDateModal = (m: Milestone) => {
    if (!settings) return;
    setDateModal({ key: m.key as string, label: m.label });
    setTempDate((settings as any)[m.key] || '');
    setTempConfirmed(!!(settings as any)[CONFIRM_KEY_MAP[m.key as string]]);
    setDateError(null);
  };

  const saveDateModal = async () => {
    if (!settings || !dateModal) return;
    const date = tempDate || null;
    const confirmKey = CONFIRM_KEY_MAP[dateModal.key];
    if (tempConfirmed && !date) { setDateError(`${dateModal.label} cannot be confirmed without a date.`); return; }
    const projected = { ...settings, [dateModal.key]: date, [confirmKey]: tempConfirmed };
    sanitise(projected);
    const err = validateDates(projected);
    if (err) { setDateError(err); return; }
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [dateModal.key]: date, [confirmKey]: tempConfirmed }),
    });
    if (res.ok) { setSettings(projected); setDateModal(null); }
    else { const e = await res.json(); setDateError(e.error || 'Unknown error'); }
  };

  if (loading || !settings) return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading…</div>;

  const milestones = getMilestones(settings);
  const completeTasks = tasks.filter(t => t.status === 'Complete');
  const taskPercent = tasks.length ? Math.round((completeTasks.length / tasks.length) * 100) : 0;

  const driveDate = settings.driveStartDate ? parseISO(settings.driveStartDate) : null;
  const daysUntilDrive = driveDate ? differenceInCalendarDays(driveDate, startOfDay(new Date())) : null;
  const driveCountdownLabel = daysUntilDrive === 0
    ? 'Drive starts today'
    : daysUntilDrive === 1
      ? 'Drive starts tomorrow'
      : daysUntilDrive !== null && daysUntilDrive > 1
        ? `Drive starts in ${daysUntilDrive} days`
        : null;

  const categoryRows = categories
    .map(cat => ({
      label: cat.name,
      total: tasks.filter(t => t.categoryId === cat.id).length,
      done: tasks.filter(t => t.categoryId === cat.id && t.status === 'Complete').length,
    }))
    .filter(r => r.total > 0);

  // Belonging breakdown by action
  const bStats: Record<string, { t: number; d: number }> = {
    Bring: { t: 0, d: 0 }, Sell: { t: 0, d: 0 }, Donate: { t: 0, d: 0 }, Trash: { t: 0, d: 0 },
  };
  for (const b of belongings) {
    const k = b.action as keyof typeof bStats;
    if (bStats[k]) { bStats[k].t++; if (b.status === 'resolved') bStats[k].d++; }
  }
  const resolvedTotal = belongings.filter(b => b.status === 'resolved').length;
  const resolvePercent = belongings.length ? Math.round((resolvedTotal / belongings.length) * 100) : 0;
  const purchaseMilestones = buildPurchaseMilestones(settings, events, homeEntries);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>

      {/* Page header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Fat Necks on the Move</h1>
          <p className="page-subtitle">Clearwater, FL → Cold Spring, NY · Summer 2026</p>
        </div>
        {driveDate && driveCountdownLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)', borderRadius: 12 }}>
            <Clock size={15} color="var(--color-accent-dark)" />
            <div>
              <div className="section-label" style={{ color: 'var(--color-accent-dark)', opacity: 0.85, marginBottom: 4 }}>Drive Start</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent-dark)', lineHeight: 1.2 }}>{format(driveDate, 'EEEE, MMM d')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-accent-dark)', opacity: 0.9, marginTop: 4 }}>{driveCountdownLabel}</div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Timeline */}
      <div className="mini-timeline">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Move Timeline</h2>
          <Link href="/timeline" style={{ textDecoration: 'none' }}>
            <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Full timeline <ChevronRight size={12} />
            </span>
          </Link>
        </div>
        <MiniTimeline milestones={milestones} onEdit={openDateModal} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          <TimelineLegendDot type="confirmed" label="Confirmed" />
          <TimelineLegendDot type="estimated" label="Estimated" />
          <TimelineLegendDot type="unset" label="Not set" />
          <div style={{ width: 1, height: 12, background: 'var(--color-border)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>Tap any date to edit</span>
        </div>
      </div>

      {/* Route summary */}
      {routeSummary && (
        <div className="mini-timeline" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>The Route</h2>
            <Link href="/map" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>

          {/* Drive stops — same visual structure as MiniTimeline */}
          {routeLocations.length >= 2 && (() => {
            const driveBase = settings.driveStartDate ? parseISO(settings.driveStartDate) : null;
            return (
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ position: 'absolute', left: `calc(100% / ${routeLocations.length * 2})`, right: `calc(100% / ${routeLocations.length * 2})`, top: 9, height: 2, background: 'var(--color-border)', zIndex: 0 }} />
                <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
                  {routeLocations.map((loc, idx) => {
                    const isOrigin = loc.category === 'Origin';
                    const isDest = loc.category === 'Destination';
                    const overnight = loc.category === 'Stop' && !!loc.notes?.startsWith('[overnight]');
                    let stopDate: string | null = null;
                    if (driveBase) {
                      if (isDest && routeSummary.estArrival) {
                        stopDate = format(routeSummary.estArrival, 'MMM d');
                      } else {
                        stopDate = format(new Date(driveBase.getFullYear(), driveBase.getMonth(), driveBase.getDate() + idx), 'MMM d');
                      }
                    }
                    return (
                      <div key={loc.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 2px' }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: overnight ? '#eef2ff' : isOrigin ? 'var(--color-accent)' : 'var(--color-surface)',
                          border: `2px solid ${overnight ? '#6366f1' : 'var(--color-accent)'}`,
                          boxShadow: overnight ? '0 0 0 3px #eef2ff' : '0 0 0 3px var(--color-accent-soft)',
                        }} />
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: overnight ? '#6366f1' : 'var(--color-secondary)', textAlign: 'center' as const, lineHeight: 1.3 }}>
                          {isOrigin ? 'Start' : isDest ? 'End' : 'Night'}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-foreground)', textAlign: 'center' as const, lineHeight: 1.2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {loc.name}
                        </div>
                        {stopDate && (
                          <div style={{ fontSize: 10, color: 'var(--color-secondary)', textAlign: 'center' as const, lineHeight: 1.2 }}>
                            {stopDate}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Stats toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: showRouteDetails ? 12 : 0 }}>
            <button
              onClick={() => setShowRouteDetails(v => !v)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, color: 'var(--color-secondary)', gap: 4 }}
            >
              {showRouteDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {/* Stats row */}
          {showRouteDetails && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', rowGap: 12 }}>
              <RouteStat label="Distance" value={`${Math.round(routeSummary.distanceMiles).toLocaleString()} mi`} />
              <RouteDiv />
              <RouteStat label="Drive Time" value={fmtDuration(routeSummary.adjustedDuration)} />
              {routeSummary.daysOfDriving > 1 && <><RouteDiv /><RouteStat label="Days" value={`${routeSummary.daysOfDriving}`} /></>}
              <RouteDiv />
              <RouteStat label="Departs" value="9:00 AM" />
              {settings.driveStartDate && <><RouteDiv /><RouteStat label="Drive Start" value={format(parseISO(settings.driveStartDate), 'MMM d')} accent /></>}
              {routeSummary.estArrival && <><RouteDiv /><RouteStat label="Drive End" value={format(routeSummary.estArrival, "MMM d 'at' h:mma")} accent /></>}
            </div>
          )}
        </div>
      )}

      {/* Home purchase timeline */}
      <div className="mini-timeline" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Home Purchase</h2>
          <Link href="/home/timeline" style={{ textDecoration: 'none' }}>
            <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open <ChevronRight size={12} />
            </span>
          </Link>
        </div>
        <HomePurchaseProcessTimeline milestones={purchaseMilestones} />
      </div>

      {/* Overview grid — Tasks + Belongings */}
      <div className="overview-grid">

        {/* Tasks */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>The List</h2>
            <Link href="/tasks" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Headline stat */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--color-foreground)' }}>{completeTasks.length}</span>
                <span style={{ fontSize: 16, color: 'var(--color-secondary)', fontWeight: 400 }}>/ {tasks.length}</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)', marginLeft: 4 }}>tasks complete</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${taskPercent}%`, background: 'var(--color-accent)', borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary)', flexShrink: 0, width: 34, textAlign: 'right' }}>{taskPercent}%</span>
              </div>
            </div>

            {categoryRows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                {categoryRows.map(({ label, total, done }) => {
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span className="section-label">{label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary)' }}>{done} / {total}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent)', borderRadius: 3, opacity: 0.75 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Belongings */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>The Big Sort</h2>
            <Link href="/belongings" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Headline stat */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--color-foreground)' }}>{resolvedTotal}</span>
                <span style={{ fontSize: 16, color: 'var(--color-secondary)', fontWeight: 400 }}>/ {belongings.length}</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)', marginLeft: 4 }}>items sorted</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${resolvePercent}%`, background: 'var(--color-accent)', borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary)', flexShrink: 0, width: 34, textAlign: 'right' }}>{resolvePercent}%</span>
              </div>
            </div>

            {/* Per-action breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              {Object.entries(bStats).filter(([, { t }]) => t > 0).map(([action, { t, d }]) => {
                const pct = t ? Math.round((d / t) * 100) : 0;
                return (
                  <div key={action}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {BELONGING_ICONS[action]} {action}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary)' }}>{d} / {t}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent)', borderRadius: 3, opacity: 0.75 }} />
                    </div>
                  </div>
                );
              })}
              {belongings.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--color-secondary)', margin: 0 }}>No items catalogued yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date edit modal */}
      {dateModal && (
        <div className="modal-backdrop" onClick={() => setDateModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
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
                <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} />
              </div>
              <div className={`confirmed-toggle ${tempConfirmed ? 'on' : ''}`} onClick={() => setTempConfirmed(v => !v)}>
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

function StatusPill({ status }: { status: string }) {
  if (status === 'confirmed' || status === 'complete') {
    return <span className="badge" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)' }}>{status === 'complete' ? 'Complete' : 'Confirmed'}</span>;
  }
  if (status === 'blocked') {
    return <span className="badge" style={{ background: '#fff0f0', color: '#b91c1c' }}>Blocked</span>;
  }
  return <span className="badge badge-neutral">Estimated</span>;
}

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function RouteStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: '0 8px' }}>
      <div className="section-label">{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent ? 'var(--color-accent-dark)' : 'var(--color-foreground)', marginTop: 3 }}>{value}</div>
    </div>
  );
}

function RouteDiv() {
  return <div style={{ width: 1, height: 28, background: 'var(--color-border)', margin: '0 4px', flexShrink: 0, alignSelf: 'center' }} />;
}

function TimelineLegendDot({ type, label }: { type: 'confirmed' | 'estimated' | 'unset'; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: type === 'confirmed' ? 'var(--color-accent)' : 'transparent',
        border: `1.5px ${type === 'unset' ? 'dashed' : 'solid'} ${type === 'unset' ? 'var(--color-border)' : 'var(--color-accent)'}`,
      }} />
      <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>{label}</span>
    </div>
  );
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

function MiniTimeline({ milestones, onEdit }: { milestones: Milestone[]; onEdit: (m: Milestone) => void }) {
  const today = new Date();
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 'calc(100% / 14)', right: 'calc(100% / 14)', top: 9, height: 2, background: 'var(--color-border)', zIndex: 0 }} />
      <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
        {milestones.map((m) => {
          const isConfirmed = m.status === 'confirmed';
          const isUnset = m.status === 'unset';
          const isPast = m.date ? parseISO(m.date) < today : false;
          const isSolid = isConfirmed || isPast;
          return (
            <button
              key={m.key as string}
              onClick={() => onEdit(m)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isSolid ? 'var(--color-accent)' : 'var(--color-surface)',
                border: `2px ${isUnset ? 'dashed' : 'solid'} ${isUnset ? 'var(--color-border)' : 'var(--color-accent)'}`,
                boxShadow: isConfirmed && !isPast ? '0 0 0 3px var(--color-accent-soft)' : 'none',
                transition: 'all 0.15s',
              }} />
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: isUnset ? 'var(--color-border)' : 'var(--color-secondary)', textAlign: 'center' as const, lineHeight: 1.3 }}>
                {MILESTONE_SHORT[m.label] || m.label}
              </div>
              <div style={{ fontSize: 11, fontWeight: isConfirmed ? 700 : 400, color: isUnset ? 'var(--color-border)' : isSolid ? 'var(--color-foreground)' : 'var(--color-secondary)', textAlign: 'center' as const, lineHeight: 1.2 }}>
                {m.date ? format(parseISO(m.date), 'MMM d') : '—'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
