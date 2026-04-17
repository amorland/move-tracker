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

    const projectedSettings = { ...settings };
    if (projectedSettings.isClosingDateConfirmed && !projectedSettings.closingDate) projectedSettings.isClosingDateConfirmed = false;
    if (projectedSettings.isUpackDropoffConfirmed && !projectedSettings.upackDropoffDate) projectedSettings.isUpackDropoffConfirmed = false;
    if (projectedSettings.isUpackPickupConfirmed && !projectedSettings.upackPickupDate) projectedSettings.isUpackPickupConfirmed = false;
    if (projectedSettings.isDriveStartConfirmed && !projectedSettings.driveStartDate) projectedSettings.isDriveStartConfirmed = false;
    if (projectedSettings.isArrivalConfirmed && !projectedSettings.arrivalDate) projectedSettings.isArrivalConfirmed = false;
    if (projectedSettings.isUpackDeliveryConfirmed && !projectedSettings.upackDeliveryDate) projectedSettings.isUpackDeliveryConfirmed = false;
    if (projectedSettings.isUpackFinalPickupConfirmed && !projectedSettings.upackFinalPickupDate) projectedSettings.isUpackFinalPickupConfirmed = false;

    const error = validateDates(projectedSettings);
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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading settings...</div>;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
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
            <h1 style={{ marginBottom: '4px' }}>Settings</h1>
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Global Configuration</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {lastSaved && (
            <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
              <CheckCircle2 size={18} /> SAVED
            </div>
          )}
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            style={{ padding: '0 48px', height: '56px', fontSize: '14px', gap: '12px', borderRadius: 'var(--radius)', fontWeight: 700, letterSpacing: '0.1em' }} 
            disabled={saving}
          >
            {saving ? 'SAVING...' : 'SAVE ALL'}
          </button>
        </div>
      </div>

      {validationError && (
        <div className="card" style={{ background: '#fff', border: '1px solid #dc2626', color: '#dc2626', padding: '24px', marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '12px' }}>
          <X size={24} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{validationError}</span>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        <section>
          <div className="flex items-center gap-4 mb-8">
             <Calendar size={20} color="var(--accent)" />
             <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Target Move Window</h2>
          </div>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '32px', borderRadius: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}>Earliest Possible Date</label>
              <input 
                type="date" 
                value={settings.earliestMoveDate} 
                onChange={e => setSettings({...settings, earliestMoveDate: e.target.value})} 
                style={{ background: 'var(--background)', border: '1px solid var(--border)', height: '48px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}>Latest Possible Date</label>
              <input 
                type="date" 
                value={settings.latestMoveDate} 
                onChange={e => setSettings({...settings, latestMoveDate: e.target.value})} 
                style={{ background: 'var(--background)', border: '1px solid var(--border)', height: '48px' }}
              />
            </div>
          </div>
          <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            The target move window defines the broadest range for your relocation. Specific milestones and logistics can be managed directly from the Overview dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}
