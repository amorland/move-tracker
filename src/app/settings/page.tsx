'use client';

import { useEffect, useState } from 'react';
import { MoveSettings } from '@/lib/types';
import { format, parseISO } from 'date-fns';

import { useEffect, useState } from 'react';
import { MoveSettings } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Calendar, CheckCircle2, Info, Save, Clock, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      setLastSaved(new Date());
      setTimeout(() => setLastSaved(null), 3000);
    }
    setSaving(false);
  };

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading Settings...</div>;

  const DateSelector = ({ 
    label, 
    dateValue, 
    onDateChange, 
    confirmedValue, 
    onConfirmedChange 
  }: { 
    label: string, 
    dateValue: string | null, 
    onDateChange: (val: string | null) => void, 
    confirmedValue?: boolean, 
    onConfirmedChange?: (val: boolean) => void 
  }) => (
    <div className="card" style={{ margin: 0, padding: '20px', border: '1px solid var(--border)', background: confirmedValue ? 'var(--success-soft)' : '#fff' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="date" 
            value={dateValue || ''} 
            onChange={e => onDateChange(e.target.value || null)} 
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              fontSize: '15px', 
              fontWeight: 700,
              borderRadius: '10px',
              border: '2px solid #f1f5f9',
              background: '#fff',
              color: 'var(--foreground)'
            }}
          />
        </div>
        {onConfirmedChange !== undefined && (
          <button 
            type="button"
            onClick={() => onConfirmedChange(!confirmedValue)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              padding: '10px', 
              borderRadius: '8px',
              border: 'none',
              background: confirmedValue ? 'var(--success)' : '#f1f5f9',
              color: confirmedValue ? '#fff' : '#64748b',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase'
            }}
          >
            {confirmedValue ? <CheckCircle2 size={14} /> : <Clock size={14} />}
            {confirmedValue ? 'Confirmed' : 'Set as Confirmed'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', paddingBottom: '100px' }}>
      <div className="flex flex-stack items-center justify-between mb-10">
        <div>
          <h1>Relocation Settings</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Define anchor dates and logistics for your move.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {lastSaved && (
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> CHANGES SAVED
            </div>
          )}
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            style={{ padding: '0 32px', height: '48px', fontSize: '15px', gap: '10px' }} 
            disabled={saving}
          >
            {saving ? 'Saving Changes...' : <><Save size={18} /> Save All Settings</>}
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Core Timeline Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <Calendar size={20} color="var(--accent)" />
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Core Move Window</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
             <DateSelector 
               label="Earliest Move Date"
               dateValue={settings.earliestMoveDate}
               onDateChange={val => setSettings({...settings, earliestMoveDate: val || ''})}
             />
             <DateSelector 
               label="Latest Move Date"
               dateValue={settings.latestMoveDate}
               onDateChange={val => setSettings({...settings, latestMoveDate: val || ''})}
             />
             <DateSelector 
               label="Final Confirmed Move Date"
               dateValue={settings.confirmedMoveDate}
               onDateChange={val => setSettings({...settings, confirmedMoveDate: val})}
               confirmedValue={!!settings.confirmedMoveDate}
               onConfirmedChange={() => {}} // Always confirmed if present in this slot
             />
          </div>
        </section>

        {/* Major Milestones */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <AlertCircle size={20} color="var(--warning)" />
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Key Milestones</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
             <DateSelector 
               label="House Closing"
               dateValue={settings.closingDate}
               onDateChange={val => setSettings({...settings, closingDate: val})}
               confirmedValue={settings.isClosingDateConfirmed}
               onConfirmedChange={val => setSettings({...settings, isClosingDateConfirmed: val})}
             />
             <DateSelector 
               label="Drive Start"
               dateValue={settings.driveStartDate}
               onDateChange={val => setSettings({...settings, driveStartDate: val})}
               confirmedValue={settings.isDriveStartConfirmed}
               onConfirmedChange={val => setSettings({...settings, isDriveStartConfirmed: val})}
             />
             <DateSelector 
               label="Arrival at New Home"
               dateValue={settings.arrivalDate}
               onDateChange={val => setSettings({...settings, arrivalDate: val})}
               confirmedValue={settings.isArrivalConfirmed}
               onConfirmedChange={val => setSettings({...settings, isArrivalConfirmed: val})}
             />
          </div>
        </section>

        {/* U-Pack Logistics */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 900 }}>U</div>
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>U-Pack Logistics</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
             <DateSelector 
               label="Container Dropoff (FL)"
               dateValue={settings.upackDropoffDate}
               onDateChange={val => setSettings({...settings, upackDropoffDate: val})}
               confirmedValue={settings.isUpackDropoffConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackDropoffConfirmed: val})}
             />
             <DateSelector 
               label="Container Pickup (FL)"
               dateValue={settings.upackPickupDate}
               onDateChange={val => setSettings({...settings, upackPickupDate: val})}
               confirmedValue={settings.isUpackPickupConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackPickupConfirmed: val})}
             />
             <DateSelector 
               label="Container Delivery (NY)"
               dateValue={settings.upackDeliveryDate}
               onDateChange={val => setSettings({...settings, upackDeliveryDate: val})}
               confirmedValue={settings.isUpackDeliveryConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackDeliveryConfirmed: val})}
             />
             <DateSelector 
               label="Final Empty Pickup (NY)"
               dateValue={settings.upackFinalPickupDate}
               onDateChange={val => setSettings({...settings, upackFinalPickupDate: val})}
               confirmedValue={settings.isUpackFinalPickupConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackFinalPickupConfirmed: val})}
             />
          </div>
        </section>

        <div className="card" style={{ background: 'var(--accent-soft)', border: 'none', padding: '24px 32px' }}>
          <div className="flex items-start gap-4">
            <Info size={24} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>Anchor Date System</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.6' }}>
                Dates marked as <strong>Estimated</strong> will appear with a subtle clock icon across the app. Toggle <strong>Set as Confirmed</strong> once dates are finalized with U-Pack or your agent to lock them in.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
