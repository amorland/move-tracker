'use client';

import { useEffect, useState } from 'react';
import { MoveSettings } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Calendar, CheckCircle2, Info, Save, Clock, AlertCircle, X, Star } from 'lucide-react';
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
    <div className="card" style={{ margin: 0, padding: '32px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', background: '#fff', transition: 'all 0.3s ease', borderRadius: 'var(--radius)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: confirmedValue ? 'var(--accent)' : (dateValue ? 'transparent' : 'var(--border)'),
          border: confirmedValue ? 'none' : (dateValue ? '1.5px solid var(--text-secondary)' : 'none')
        }}></div>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="YYYY-MM-DD"
            value={dateValue || ''} 
            onChange={e => onDateChange(e.target.value || null)} 
            style={{ 
              width: '100%', 
              padding: '14px 48px 14px 16px', 
              fontSize: '15px', 
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)'
            }}
          />
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
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
              gap: '10px', 
              padding: '14px', 
              borderRadius: '8px',
              border: 'none',
              background: confirmedValue ? 'var(--accent)' : 'var(--accent-soft)',
              color: confirmedValue ? '#fff' : 'var(--foreground)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            {confirmedValue ? <CheckCircle2 size={14} /> : <Clock size={14} />}
            {confirmedValue ? 'Confirmed' : 'Estimate'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', paddingBottom: '100px' }}>
      <div className="flex flex-stack items-center justify-between mb-16">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: 'var(--radius)', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Star size={32} color="white" fill="white" />
          </div>
          <div>
            <h1 style={{ marginBottom: '4px' }}>Starland Settings</h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Configurations & Parameters</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {lastSaved && (
            <div style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
              <CheckCircle2 size={20} /> PERSISTED
            </div>
          )}
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            style={{ padding: '0 48px', height: '56px', fontSize: '14px', gap: '12px', borderRadius: 'var(--radius)', fontWeight: 700, letterSpacing: '0.1em' }} 
            disabled={saving}
          >
            {saving ? 'SAVING...' : <><Save size={20} /> SAVE ALL</>}
          </button>
        </div>
      </div>

      {validationError && (
        <div className="card" style={{ background: '#fff', border: '1px solid #dc2626', color: '#dc2626', padding: '24px', marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '12px' }}>
          <X size={24} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{validationError}</span>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
        
        <section>
          <div className="flex items-center gap-4 mb-8">
             <Calendar size={20} color="var(--accent)" />
             <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-headings)', letterSpacing: '0.15em' }}>Core Window</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
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
               label="Final Move Date"
               dateValue={settings.confirmedMoveDate}
               onDateChange={val => setSettings({...settings, confirmedMoveDate: val})}
               confirmedValue={!!settings.confirmedMoveDate}
               onConfirmedChange={(val) => {
                 if (val) {
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

        <section>
          <div className="flex items-center gap-4 mb-8">
             <AlertCircle size={20} color="var(--accent)" />
             <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-headings)', letterSpacing: '0.15em' }}>Milestones</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
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

        <section>
          <div className="flex items-center gap-4 mb-8">
             <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 900 }}>U</div>
             <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-headings)', letterSpacing: '0.15em' }}>Logistics</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
             <CustomDateInput 
               label="Container Dropoff"
               dateValue={settings.upackDropoffDate}
               onDateChange={val => setSettings({...settings, upackDropoffDate: val})}
               confirmedValue={settings.isUpackDropoffConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackDropoffConfirmed: val})}
             />
             <CustomDateInput 
               label="Container Pickup"
               dateValue={settings.upackPickupDate}
               onDateChange={val => setSettings({...settings, upackPickupDate: val})}
               confirmedValue={settings.isUpackPickupConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackPickupConfirmed: val})}
             />
             <CustomDateInput 
               label="Container Delivery"
               dateValue={settings.upackDeliveryDate}
               onDateChange={val => setSettings({...settings, upackDeliveryDate: val})}
               confirmedValue={settings.isUpackDeliveryConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackDeliveryConfirmed: val})}
             />
             <CustomDateInput 
               label="Final Empty Pickup"
               dateValue={settings.upackFinalPickupDate}
               onDateChange={val => setSettings({...settings, upackFinalPickupDate: val})}
               confirmedValue={settings.isUpackFinalPickupConfirmed}
               onConfirmedChange={val => setSettings({...settings, isUpackFinalPickupConfirmed: val})}
             />
          </div>
        </section>

        <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', padding: '48px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-8">
            <Info size={32} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)', fontFamily: 'var(--font-headings)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Logistics Protocol</div>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '16px', lineHeight: '1.8', maxWidth: '850px', fontWeight: 400 }}>
                Type dates directly in <strong>YYYY-MM-DD</strong> format for efficiency, or use the minimalist calendar interface. Toggle <strong>Estimate</strong> to finalize logistics and lock parameters across the Starland Moving ecosystem.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
