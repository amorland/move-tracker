'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Belonging, Category } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
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

  const [dateModal, setDateModal] = useState<{ key: string; label: string } | null>(null);
  const [tempDate, setTempDate] = useState('');
  const [tempConfirmed, setTempConfirmed] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [sRes, cRes, bRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/belongings'),
    ]);
    const s = await sRes.json();
    sanitise(s);
    setSettings(s);
    const { categories: cats, tasks: ts } = await cRes.json();
    setCategories(cats);
    setTasks(ts);
    setBelongings(await bRes.json());
    setLoading(false);
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
  const daysUntilDrive = driveDate ? differenceInDays(driveDate, new Date()) : null;

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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }}>

      {/* Page header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Hi, Starlands.</h1>
          <p className="page-subtitle">Here's where the move stands.</p>
        </div>
        {daysUntilDrive !== null && daysUntilDrive >= 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)', borderRadius: 12 }}>
            <Clock size={14} color="var(--color-accent-dark)" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent-dark)', lineHeight: 1 }}>{daysUntilDrive}</div>
              <div className="section-label" style={{ color: 'var(--color-accent-dark)', opacity: 0.85, marginTop: 2 }}>days to drive</div>
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
