'use client';

import { useEffect, useState } from 'react';
import { MoveSettings } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Calendar, CheckCircle2, Info, Save, Clock, AlertCircle, X, Heart } from 'lucide-react';
import { validateDates } from '@/lib/dateUtils';

export default function SettingsPage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setValidationError(null);

    // Business rule validation
    const error = validateDates(settings);
    if (error) {
      setValidationError(error);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      setLastSaved(new Date());
      setTimeout(() => setLastSaved(null), 3000);
    } else {
      const err = await res.json();
      setValidationError(err.error || 'Unknown error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setSaving(false);
  };

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading Starland Settings...</div>;

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: confirmedValue ? 'var(--success)' : (dateValue ? 'transparent' : '#e2e8f0'),
          border: confirmedValue ? 'none' : (dateValue ? '1.5px solid #94a3b8' : 'none')
        }}></div>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
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
      <div className="flex flex-stack items-center justify-between mb-12">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '18px', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(212, 122, 106, 0.25)'
          }}>
            <Heart size={32} color="white" fill="white" />
          </div>
          <div>
            <h1 style={{ marginBottom: '2px' }}>Starland Settings</h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '16px', fontWeight: 600 }}>Define anchor dates and logistics for your move.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {lastSaved && (
            <div style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} /> UPDATES PERSISTED
            </div>
          )}
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            style={{ padding: '0 40px', height: '56px', fontSize: '16px', gap: '12px', borderRadius: '14px', fontWeight: 700 }} 
            disabled={saving}
          >
            {saving ? 'Saving...' : <><Save size={22} /> Save All Settings</>}
          </button>
        </div>
      </div>

      {validationError && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '24px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '16px' }}>
          <X size={24} />
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{validationError}</span>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
        
        {/* Core Timeline Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
             <Calendar size={24} color="var(--accent)" />
             <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-headings)' }}>Core Move Window</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
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
               onConfirmedChange={(val) => {
                 if (val) {
                   // Cannot confirm without a date
                   if (!settings.confirmedMoveDate) {
                     setValidationError("Final move date cannot be confirmed without a date.");
                     return;
                   }
                   setSettings({...settings, confirmedMoveDate: settings.confirmedMoveDate});
                 } else {
                   setSettings({...settings, confirmedMoveDate: null});
                 }
               }} 
             />
          </div>
        </section>

        {/* Major Milestones */}
        <section>
          <div className="flex items-center gap-4 mb-8">
             <AlertCircle size={24} color="var(--warning)" />
             <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-headings)' }}>Key Milestones</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
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
          <div className="flex items-center gap-4 mb-8">
             <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 900 }}>U</div>
             <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-headings)' }}>U-Pack Logistics</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }}>
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

        <div className="card" style={{ background: 'var(--accent-soft)', border: 'none', padding: '40px', borderRadius: '20px' }}>
          <div className="flex items-start gap-6">
            <Info size={32} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-headings)' }}>Logistics Management</div>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: '1.7', maxWidth: '850px' }}>
                Type dates directly in <strong>YYYY-MM-DD</strong> format for speed, or click the terracotta calendar icon to select. Toggle <strong>Set as Confirmed</strong> once you have definitive dates to lock them in across your Starland Moving hub and Timeline.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
