'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Belonging } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Star, CheckCircle2, ChevronRight, Box, DollarSign, Heart, Trash2, Clock, X, Save } from 'lucide-react';
import Link from 'next/link';
import { getMilestones, validateDates, Milestone } from '@/lib/dateUtils';

export default function OverviewPage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
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
    const { tasks: ts } = await cRes.json();
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
  const incompleteTasks = tasks.filter(t => t.status !== 'Complete');
  const taskPercent = tasks.length ? Math.round((completeTasks.length / tasks.length) * 100) : 0;

  const driveDate = settings.driveStartDate ? parseISO(settings.driveStartDate) : null;
  const daysUntilDrive = driveDate ? differenceInDays(driveDate, new Date()) : null;

  // Belonging stats
  const bStats = { Bring: { t: 0, d: 0 }, Sell: { t: 0, d: 0 }, Donate: { t: 0, d: 0 }, Trash: { t: 0, d: 0 } };
  for (const b of belongings) {
    const k = b.action as keyof typeof bStats;
    if (bStats[k]) { bStats[k].t++; if (b.status === 'resolved') bStats[k].d++; }
  }
  const resolvePercent = belongings.length ? Math.round((belongings.filter(b => b.status === 'resolved').length / belongings.length) * 100) : 0;

  // Task summary by owner
  const ownerStats = ['Andrew', 'Tory', 'Both'].map(owner => ({
    label: owner,
    total: tasks.filter(t => t.owner === owner).length,
    done: tasks.filter(t => t.owner === owner && t.status === 'Complete').length,
  })).filter(s => s.total > 0);

  const BELONGING_ICONS: Record<string, React.ReactNode> = {
    Bring: <Box size={13} />, Sell: <DollarSign size={13} />, Donate: <Heart size={13} />, Trash: <Trash2 size={13} />,
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 64 }}>

      {/* Page header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Star size={22} color="white" fill="white" />
          </div>
          <div>
            <h1>Starland Moving</h1>
            <p className="page-subtitle" style={{ marginTop: 2, fontSize: 13 }}>Andrew · Tory · Remy · Harper · Winston</p>
          </div>
        </div>
        {daysUntilDrive !== null && daysUntilDrive >= 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)', borderRadius: 12 }}>
            <Clock size={15} color="var(--color-accent-dark)" />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent-dark)', lineHeight: 1 }}>{daysUntilDrive}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent-dark)', opacity: 0.8 }}>days to drive</div>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE: Horizontal key dates strip ─────────────── */}
      <div className="key-dates-strip">
        {milestones.map(m => {
          const isConfirmed = m.status === 'confirmed';
          const isUnset = m.status === 'unset';
          return (
            <button
              key={m.key as string}
              onClick={() => openDateModal(m)}
              style={{
                flexShrink: 0, width: 152, padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                background: isConfirmed ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                border: `1px solid ${isConfirmed ? 'var(--color-accent)' : 'var(--color-border)'}`,
                opacity: isUnset ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: isConfirmed ? 'var(--color-accent)' : isUnset ? 'transparent' : 'var(--color-secondary)',
                  border: isUnset ? '1.5px solid var(--color-border)' : 'none',
                }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isConfirmed ? 'var(--color-accent-dark)' : 'var(--color-secondary)', lineHeight: 1.2 }}>
                  {m.label}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: isConfirmed ? 700 : 500, color: isUnset ? 'var(--color-secondary)' : 'var(--color-foreground)', marginBottom: 8, lineHeight: 1.2 }}>
                {m.date ? format(parseISO(m.date), 'MMM d, yyyy') : 'Not set'}
              </div>
              <span className={`badge ${isConfirmed ? 'badge-accent' : 'badge-neutral'}`} style={{ fontSize: 9 }}>
                {isConfirmed ? 'Confirmed' : isUnset ? 'Unset' : 'Estimated'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatChip label="Tasks Done" value={`${completeTasks.length}/${tasks.length}`} />
        <StatChip label="Outstanding" value={String(incompleteTasks.length)} accent />
        <StatChip label="Belongings" value={`${resolvePercent}%`} />
      </div>

      {/* ── Main grid (desktop: 2-col, mobile: 1-col) ──────── */}
      <div className="overview-grid">

        {/* Key Dates — desktop vertical list (hidden on mobile since we have the strip) */}
        <div className="card desktop-only" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Key Dates</h2>
            <Link href="/timeline" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                View Full Timeline <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div style={{ padding: '8px 24px 16px' }}>
            {milestones.map((m, i) => (
              <MilestoneRow key={m.key as string} milestone={m} isLast={i === milestones.length - 1} onClick={() => openDateModal(m)} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tasks summary */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <h2 style={{ margin: 0 }}>Tasks</h2>
              <Link href="/tasks" style={{ textDecoration: 'none' }}>
                <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Manage Tasks <ChevronRight size={12} />
                </span>
              </Link>
            </div>
            <div className="card-body">
              {/* Overall progress bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="section-label">Overall Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{taskPercent}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${taskPercent}%`, background: 'var(--color-accent)', borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
              </div>
              {/* By owner */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ownerStats.map(({ label, total, done }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="section-label" style={{ width: 52, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: total ? `${Math.round((done / total) * 100)}%` : '0%', background: 'var(--color-accent)', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary)', width: 40, textAlign: 'right', flexShrink: 0 }}>{done}/{total}</span>
                  </div>
                ))}
              </div>
              {incompleteTasks.length > 0 && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--color-background)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-secondary)' }}>
                    <strong style={{ color: 'var(--color-foreground)' }}>{incompleteTasks.length}</strong> tasks still outstanding
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Belongings summary */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <h2 style={{ margin: 0 }}>Belongings</h2>
              <Link href="/belongings" style={{ textDecoration: 'none' }}>
                <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View All <ChevronRight size={12} />
                </span>
              </Link>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {Object.entries(bStats).map(([action, { t, d }]) => (
                  <div key={action}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--color-secondary)' }}>
                      {BELONGING_ICONS[action]}
                      <span className="section-label">{action}</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-foreground)' }}>{d}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-secondary)', marginLeft: 4 }}>/ {t}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--color-background)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="section-label">Resolved</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{resolvePercent}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${resolvePercent}%`, background: 'var(--color-accent)', transition: 'width 0.8s ease', borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date modal */}
      {dateModal && (
        <div className="modal-backdrop" onClick={() => setDateModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Update — {dateModal.label}</h2>
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

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 12, background: accent ? 'var(--color-accent-soft)' : 'var(--color-surface)', border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? 'var(--color-accent-dark)' : 'var(--color-foreground)' }}>{value}</div>
      <div className="section-label" style={{ marginTop: 3, color: accent ? 'var(--color-accent-dark)' : undefined }}>{label}</div>
    </div>
  );
}

function MilestoneRow({ milestone: m, isLast, onClick }: { milestone: Milestone; isLast: boolean; onClick: () => void }) {
  const isConfirmed = m.status === 'confirmed';
  const isUnset = m.status === 'unset';
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: isLast ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', opacity: isUnset ? 0.5 : 1 }}
      className="milestone-row"
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: isConfirmed ? 'var(--color-accent)' : isUnset ? 'transparent' : 'var(--color-secondary)', border: isUnset ? '2px solid var(--color-border)' : 'none', boxShadow: isConfirmed ? '0 0 0 4px var(--color-accent-soft)' : 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isConfirmed ? 'var(--color-accent-dark)' : 'var(--color-secondary)', marginBottom: 2 }}>{m.label}</div>
        <div style={{ fontSize: 15, fontWeight: isConfirmed ? 600 : 400, color: isUnset ? 'var(--color-secondary)' : 'var(--color-foreground)' }}>
          {m.date ? format(parseISO(m.date), 'MMM d, yyyy') : 'Not set'}
        </div>
      </div>
      <span className={`badge ${isConfirmed ? 'badge-accent' : 'badge-neutral'}`}>{isConfirmed ? 'Confirmed' : isUnset ? 'Unset' : 'Estimated'}</span>
    </div>
  );
}
