'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Category, Task, Belonging } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Star, CheckCircle2, ChevronRight, Box, DollarSign, Heart, Trash2, Calendar, X, Save, Clock } from 'lucide-react';
import Link from 'next/link';
import { getMilestones, validateDates, Milestone } from '@/lib/dateUtils';

export default function OverviewPage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [belongings, setBelongings] = useState<Belonging[]>([]);
  const [loading, setLoading] = useState(true);

  // Date modal state
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
    sanitiseSettings(s);
    setSettings(s);
    const { categories: cats, tasks: ts } = await cRes.json();
    setCategories(cats);
    setTasks(ts);
    setBelongings(await bRes.json());
    setLoading(false);
  };

  const sanitiseSettings = (s: MoveSettings) => {
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
    const date = tempDate.trim() || null;
    const confirmKey = CONFIRM_KEY_MAP[dateModal.key];

    if (tempConfirmed && !date) {
      setDateError(`${dateModal.label} cannot be confirmed without a date.`);
      return;
    }

    const projected = { ...settings, [dateModal.key]: date, [confirmKey]: tempConfirmed };
    sanitiseSettings(projected);
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

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'Complete' ? 'Not Started' : 'Complete';
    const completedAt = newStatus === 'Complete' ? new Date().toISOString().split('T')[0] : null;
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus, completedAt }),
    });
    fetchData();
  };

  if (loading || !settings) {
    return <div style={{ padding: 40, color: 'var(--color-secondary)' }}>Loading Starland Hub…</div>;
  }

  const milestones = getMilestones(settings);
  const incompleteTasks = tasks.filter(t => t.status !== 'Complete');
  const completedTasks = tasks.filter(t => t.status === 'Complete');

  // Countdown to drive start
  const driveDate = settings.driveStartDate ? parseISO(settings.driveStartDate) : null;
  const daysUntilDrive = driveDate ? differenceInDays(driveDate, new Date()) : null;

  // Belonging stats
  const bStats = {
    Bring:  { total: 0, done: 0 },
    Sell:   { total: 0, done: 0 },
    Donate: { total: 0, done: 0 },
    Trash:  { total: 0, done: 0 },
  };
  for (const b of belongings) {
    const key = b.action as keyof typeof bStats;
    if (bStats[key]) {
      bStats[key].total++;
      if (b.status === 'resolved') bStats[key].done++;
    }
  }
  const totalDone = belongings.filter(b => b.status === 'resolved').length;
  const resolvePercent = belongings.length ? Math.round((totalDone / belongings.length) * 100) : 0;

  const BELONGING_ICONS: Record<string, React.ReactNode> = {
    Bring:  <Box size={14} />,
    Sell:   <DollarSign size={14} />,
    Donate: <Heart size={14} />,
    Trash:  <Trash2 size={14} />,
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 64 }}>

      {/* Page header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={24} color="white" fill="white" />
          </div>
          <div>
            <h1>Starland Moving</h1>
            <p className="page-subtitle" style={{ marginTop: 2 }}>Andrew · Tory · Remy · Harper · Winston</p>
          </div>
        </div>

        {/* Countdown chip */}
        {daysUntilDrive !== null && daysUntilDrive >= 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)', borderRadius: 12 }}>
            <Clock size={16} color="var(--color-accent-dark)" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent-dark)', lineHeight: 1 }}>{daysUntilDrive}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent-dark)', opacity: 0.8 }}>days to drive</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        <StatChip label="Tasks Done" value={`${completedTasks.length}/${tasks.length}`} />
        <StatChip label="Outstanding" value={String(incompleteTasks.length)} accent />
        <StatChip label="Belongings Resolved" value={`${resolvePercent}%`} />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }} className="overview-grid">

        {/* Key Dates */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Key Dates</h2>
            <Link href="/timeline" style={{ textDecoration: 'none' }}>
              <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                View Full Timeline <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {milestones.map((m, i) => (
              <MilestoneRow key={m.key as string} milestone={m} isLast={i === milestones.length - 1} onClick={() => openDateModal(m)} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Focus — top incomplete tasks */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <h2 style={{ margin: 0 }}>Focus</h2>
              <Link href="/tasks" style={{ textDecoration: 'none' }}>
                <span className="badge badge-neutral" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  All Tasks <ChevronRight size={12} />
                </span>
              </Link>
            </div>
            <div>
              {incompleteTasks.slice(0, 6).map(task => (
                <div key={task.id} className="item-row" style={{ borderBottom: '1px solid var(--color-border)' }} onClick={() => toggleTask(task)}>
                  <div className="check-circle" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-secondary)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{task.owner}</div>
                  </div>
                  <ChevronRight size={14} color="var(--color-border)" />
                </div>
              ))}
              {incompleteTasks.length === 0 && (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--color-secondary)', fontSize: 14 }}>
                  All tasks complete 🎉
                </div>
              )}
            </div>
          </div>

          {/* Belonging resolution */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {Object.entries(bStats).map(([action, { total, done }]) => (
                  <div key={action}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: 'var(--color-secondary)' }}>
                      {BELONGING_ICONS[action]}
                      <span className="section-label">{action}</span>
                    </div>
                    <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-foreground)' }}>{done}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-secondary)', marginLeft: 4 }}>/ {total}</span>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div style={{ background: 'var(--color-background)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="section-label">Resolved</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{resolvePercent}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
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
              <button className="btn btn-ghost btn-sm" onClick={() => setDateModal(null)} style={{ padding: '0 8px' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {dateError && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13, fontWeight: 500 }}>
                  {dateError}
                </div>
              )}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Date</label>
                <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} />
              </div>
              <div
                className={`confirmed-toggle ${tempConfirmed ? 'on' : ''}`}
                onClick={() => setTempConfirmed(v => !v)}
              >
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
              <button className="btn btn-primary" onClick={saveDateModal}>
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      padding: '14px 18px',
      borderRadius: 12,
      background: accent ? 'var(--color-accent-soft)' : 'var(--color-surface)',
      border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? 'var(--color-accent-dark)' : 'var(--color-foreground)' }}>{value}</div>
      <div className="section-label" style={{ marginTop: 4, color: accent ? 'var(--color-accent-dark)' : undefined }}>{label}</div>
    </div>
  );
}

function MilestoneRow({ milestone: m, isLast, onClick }: { milestone: Milestone; isLast: boolean; onClick: () => void }) {
  const isConfirmed = m.status === 'confirmed';
  const isUnset = m.status === 'unset';
  const dateStr = m.date ? format(parseISO(m.date), 'MMM d, yyyy') : 'Not set';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        cursor: 'pointer',
        opacity: isUnset ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
        background: isConfirmed ? 'var(--color-accent)' : isUnset ? 'transparent' : 'var(--color-secondary)',
        border: isUnset ? '2px solid var(--color-border)' : 'none',
        boxShadow: isConfirmed ? '0 0 0 4px var(--color-accent-soft)' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isConfirmed ? 'var(--color-accent-dark)' : 'var(--color-secondary)', marginBottom: 2 }}>
          {m.label}
        </div>
        <div style={{ fontSize: 15, fontWeight: isConfirmed ? 600 : 400, color: isUnset ? 'var(--color-secondary)' : 'var(--color-foreground)' }}>
          {dateStr}
        </div>
      </div>
      <span className={`badge ${isConfirmed ? 'badge-accent' : 'badge-neutral'}`}>
        {isConfirmed ? 'Confirmed' : isUnset ? 'Unset' : 'Estimated'}
      </span>
    </div>
  );
}
