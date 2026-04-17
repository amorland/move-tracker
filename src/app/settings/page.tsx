'use client';

import { useEffect, useState } from 'react';
import { MoveSettings } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Calendar, CheckCircle2, Info, Save, Clock, AlertCircle, X } from 'lucide-react';

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

  const CustomDateInput = ({ 
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
    <div className="card" style={{ margin: 0, padding: '24px', border: 'none', boxShadow: 'var(--shadow-sm)', background: confirmedValue ? 'var(--success-soft)' : '#fff', transition: 'all 0.2s ease' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="YYYY-MM-DD"
            value={dateValue || ''} 
            onChange={e => onDateChange(e.target.value || null)} 
            style={{ 
              width: '100%', 
              padding: '12px 48px 12px 16px', 
              fontSize: '15px', 
              fontWeight: 700,
              borderRadius: '10px',
              border: '2px solid #f1f5f9',
              background: '#fff',
              color: 'var(--foreground)'
            }}
          />
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '24px', height: '24px' }}>
               <input 
                 type="date" 
                 value={dateValue || ''} 
                 onChange={e => onDateChange(e.target.value || null)} 
                 style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
               />
               <Calendar size={18} color="var(--accent)" style={{ position: 'absolute', inset: 0, margin: 'auto', zIndex: 1 }} />
            </div>
          </div>
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
              padding: '12px', 
              borderRadius: '10px',
              border: 'none',
              background: confirmedValue ? 'var(--success)' : '#f1f5f9',
              color: confirmedValue ? '#fff' : '#64748b',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {lastSaved && (
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> UPDATES PERSISTED
            </div>
          )}
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            style={{ padding: '0 40px', height: '52px', fontSize: '15px', gap: '12px', borderRadius: '12px' }} 
            disabled={saving}
          >
            {saving ? 'Saving...' : <><Save size={20} /> Save All Settings</>}
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        {/* Core Timeline Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <Calendar size={20} color="var(--accent)" />
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Core Move Window</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
             <CustomDateInput 
               label="Earliest Possible"
               dateValue={settings.earliestMoveDate}
               onDateChange={val => setSettings({...settings, earliestMoveDate: val || ''})}
             />
             <CustomDateInput 
               label="Latest Possible"
               dateValue={settings.latestMoveDate}
               onDateChange={val => setSettings({...settings, latestMoveDate: val || ''})}
             />
             <CustomDateInput 
               label="Final Confirmed Move Date"
               dateValue={settings.confirmedMoveDate}
               onDateChange={val => setSettings({...settings, confirmedMoveDate: val})}
               confirmedValue={!!settings.confirmedMoveDate}
               onConfirmedChange={() => {}} 
             />
          </div>
        </section>

        {/* Major Milestones */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <AlertCircle size={20} color="var(--warning)" />
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Key Milestones</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
             <CustomDateInput 
               label="House Closing"
               dateValue={settings.closingDate}
               onDateChange={val => setSettings({...settings, closingDate: val})}
               confirmedValue={settings.isClosingDateConfirmed}
               onConfirmedChange={val => setSettings({...settings, isClosingDateConfirmed: val})}
             />
             <CustomDateInput 
               label="Drive Start"
               dateValue={settings.driveStartDate}
               onDateChange={val => setSettings({...settings, driveStartDate: val})}
               confirmedValue={settings.isDriveStartConfirmed}
               onConfirmedChange={val => setSettings({...settings, isDriveStartConfirmed: val})}
             />
             <CustomDateInput 
               label="Arrival at NY"
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
             <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 900 }}>U</div>
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>U-Pack Logistics</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
             <CustomDateInput 
               label="Container Dropoff (FL)"
               dateValue={settings.upackDropoffDate}
               onDateChange={val => setSettings({...settings, upackDropoffDate: val})}
               confirmedValue={settings.isUpackDropoffConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackDropoffConfirmed: val})}
             />
             <CustomDateInput 
               label="Container Pickup (FL)"
               dateValue={settings.upackPickupDate}
               onDateChange={val => setSettings({...settings, upackPickupDate: val})}
               confirmedValue={settings.isUpackPickupConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackPickupConfirmed: val})}
             />
             <CustomDateInput 
               label="Container Delivery (NY)"
               dateValue={settings.upackDeliveryDate}
               onDateChange={val => setSettings({...settings, upackDeliveryDate: val})}
               confirmedValue={settings.isUpackDeliveryConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackDeliveryConfirmed: val})}
             />
             <CustomDateInput 
               label="Final Empty Pickup (NY)"
               dateValue={settings.upackFinalPickupDate}
               onDateChange={val => setSettings({...settings, upackFinalPickupDate: val})}
               confirmedValue={settings.isUpackFinalPickupConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackFinalPickupConfirmed: val})}
             />
          </div>
        </section>

        <div className="card" style={{ background: 'var(--accent-soft)', border: 'none', padding: '32px' }}>
          <div className="flex items-start gap-5">
            <Info size={28} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)' }}>Logistics Management</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.7', maxWidth: '800px' }}>
                Type dates directly in <strong>YYYY-MM-DD</strong> format for speed, or click the blue calendar icon to select. Toggle <strong>Set as Confirmed</strong> once you have definitive dates to lock them in across your Command Center and Timeline.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
