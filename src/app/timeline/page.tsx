'use client';

import { useEffect, useState } from 'react';
import { MoveSettings, Task, Category } from '@/lib/types';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import { CheckCircle2, ChevronRight, Calendar as CalendarIcon, MapPin } from 'lucide-react';

export default function TimelinePage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [data, setData] = useState<{ categories: Category[], tasks: Task[] }>({ categories: [], tasks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/categories').then(res => res.json())
    ]).then(([settingsData, categoriesData]) => {
      setSettings(settingsData);
      setData(categoriesData);
      setLoading(false);
    });
  }, []);

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Preparing your timeline...</div>;

  const moveDate = parseISO(settings.confirmedMoveDate || settings.earliestMoveDate);
  const closingDate = settings.closingDate ? parseISO(settings.closingDate) : null;

  const getTaskDate = (task: Task) => {
    if (task.dueDate) return parseISO(task.dueDate);
    if (!settings) return null;
    const moveDate = parseISO(settings.confirmedMoveDate || settings.earliestMoveDate);
    const closingDate = settings.closingDate ? parseISO(settings.closingDate) : null;

    let baseDate = moveDate;
    if (task.timingType === 'Before Closing' || task.timingType === 'After Closing') {
      if (!closingDate) return null;
      baseDate = closingDate;
    }
    return addDays(baseDate, task.timingOffsetDays);
  };

  const tasksWithDates = data.tasks.map(t => ({
    ...t,
    calculatedDate: getTaskDate(t)
  })).sort((a, b) => {
    if (!a.calculatedDate) return 1;
    if (!b.calculatedDate) return -1;
    return a.calculatedDate.getTime() - b.calculatedDate.getTime();
  });

  const anchorDatesTimeline = [
    { label: 'U-Pack Dropoff (FL)', date: settings.upackDropoffDate, confirmed: settings.isUpackDropoffConfirmed, type: 'anchor' },
    { label: 'U-Pack Pickup (FL)', date: settings.upackPickupDate, confirmed: settings.isUpackPickupConfirmed, type: 'anchor' },
    { label: 'Drive Start', date: settings.driveStartDate, confirmed: settings.isDriveStartConfirmed, type: 'anchor' },
    { label: 'House Closing', date: settings.closingDate, confirmed: settings.isClosingDateConfirmed, type: 'anchor' },
    { label: 'Arrival (NY)', date: settings.arrivalDate, confirmed: settings.isArrivalConfirmed, type: 'anchor' },
    { label: 'U-Pack Delivery (NY)', date: settings.upackDeliveryDate, confirmed: settings.isUpackDeliveryConfirmed, type: 'anchor' },
    { label: 'U-Pack Final Pickup', date: settings.upackFinalPickupDate, confirmed: settings.isUpackFinalPickupConfirmed, type: 'anchor' }
  ].filter(ad => ad.date).map(ad => ({
    id: `anchor-${ad.label}`,
    title: ad.label,
    calculatedDate: parseISO(ad.date!),
    type: 'anchor',
    confirmed: ad.confirmed
  }));

  const allTimelineItems = [
    ...tasksWithDates.map(t => ({ ...t, type: 'task' })),
    ...anchorDatesTimeline
  ].sort((a, b) => {
    if (!a.calculatedDate) return 1;
    if (!b.calculatedDate) return -1;
    return a.calculatedDate.getTime() - b.calculatedDate.getTime();
  });

  const windows = [
    { label: 'Strategy', filter: (d: number) => d <= -60, icon: 'assignment' },
    { label: 'Packing', filter: (d: number) => d > -60 && d <= -14, icon: 'package_2' },
    { label: 'Transit', filter: (d: number) => d > -14 && d < 0, icon: 'local_shipping' },
    { label: 'Move Day', filter: (d: number) => d === 0, icon: 'local_shipping' },
    { label: 'Settling', filter: (d: number) => d > 0, icon: 'celebration' }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex flex-stack items-center justify-between mb-12">
        <div>
          <h1>Timeline</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Chronological roadmap of key dates and actions.
          </p>
        </div>
        <div className="badge badge-info" style={{ height: '40px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <CalendarIcon size={16} />
           <span style={{ fontWeight: 700 }}>{format(moveDate, 'MMMM d, yyyy')}</span>
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: '40px' }}>
        {/* Central Vertical Connector */}
        <div style={{ 
          position: 'absolute', 
          left: '11px', 
          top: '0', 
          bottom: '0', 
          width: '2px', 
          background: 'var(--border)',
          opacity: 0.5
        }}></div>

        {windows.map((window) => {
          const itemsInWindow = allTimelineItems.filter(item => {
            if (!item.calculatedDate) return false;
            const diff = differenceInDays(item.calculatedDate, moveDate);
            return window.filter(diff);
          });

          if (itemsInWindow.length === 0) return null;

          return (
            <div key={window.label} style={{ marginBottom: '60px' }}>
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-40px', 
                  top: '0', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: 'white', 
                  border: '2px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  boxShadow: '0 0 0 4px var(--background)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--accent)' }}>{window.icon}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>{window.label}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {itemsInWindow.map((item: any) => {
                  const isTask = item.type === 'task';
                  const isComplete = isTask && item.status === 'Complete';
                  const isAnchor = item.type === 'anchor';

                  return (
                    <div key={item.id} style={{ 
                      padding: isAnchor ? '16px 20px' : '12px 20px', 
                      borderRadius: '12px',
                      background: isAnchor ? (item.confirmed ? 'var(--success-soft)' : '#f8fafc') : (isComplete ? 'transparent' : 'white'),
                      border: isAnchor ? (item.confirmed ? '1px solid rgba(26, 138, 95, 0.1)' : '1px solid #f1f5f9') : (isComplete ? '1px solid var(--border)' : '1px solid #f1f5f9'),
                      boxShadow: (isAnchor || isComplete) ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      opacity: isComplete ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: isAnchor ? '15px' : '14px', 
                          fontWeight: (isAnchor || !isComplete) ? 700 : 500, 
                          color: isComplete ? 'var(--text-secondary)' : 'var(--foreground)',
                          textDecoration: isComplete ? 'line-through' : 'none',
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarIcon size={10} />
                          {format(item.calculatedDate, 'MMM d, yyyy')}
                          {isAnchor && !item.confirmed && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#e2e8f0', color: '#475569' }}>ESTIMATED</span>}
                          {isAnchor && item.confirmed && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'var(--success)', color: 'white' }}>CONFIRMED</span>}
                        </div>
                      </div>
                      {isComplete && (
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 'bold' }}>done</span>
                        </div>
                      )}
                      {isAnchor && <span className="material-symbols-outlined" style={{ color: item.confirmed ? 'var(--success)' : '#94a3b8', fontSize: '20px' }}>event_available</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
