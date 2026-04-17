'use client';

import { useEffect, useState } from 'react';
import { MoveSettings } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export default function SettingsPage() {
  const [settings, setSettings] = useState<MoveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    setSaving(false);
    alert('Settings saved!');
  };

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading Settings...</div>;

  const DateInput = ({ 
    label, 
    dateValue, 
    onDateChange, 
    confirmedValue, 
    onConfirmedChange 
  }: { 
    label: string, 
    dateValue: string | null, 
    onDateChange: (val: string | null) => void, 
    confirmedValue: boolean, 
    onConfirmedChange: (val: boolean) => void 
  }) => (
    <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: confirmedValue ? 'var(--success-soft)' : 'transparent' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          type="date" 
          value={dateValue || ''} 
          onChange={e => onDateChange(e.target.value || null)} 
          style={{ width: '100%' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          <input 
            type="checkbox" 
            checked={confirmedValue} 
            onChange={e => onConfirmedChange(e.target.checked)} 
            style={{ width: '16px', height: '16px' }}
          />
          {confirmedValue ? 'Confirmed' : 'Estimated'}
        </label>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', paddingBottom: '60px' }}>
      <div className="flex flex-stack items-center justify-between mb-8">
        <div>
          <h1>Settings</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Manage move dates and relocation details.</p>
        </div>
      </div>
      
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
          
          {/* Main Move Window */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)', margin: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)' }}>Base Move Window</div>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Earliest Possible Date</label>
                <input 
                  type="date" 
                  value={settings.earliestMoveDate} 
                  onChange={e => setSettings({ ...settings, earliestMoveDate: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Latest Possible Date</label>
                <input 
                  type="date" 
                  value={settings.latestMoveDate} 
                  onChange={e => setSettings({ ...settings, latestMoveDate: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Confirmed Move Date (Final)</label>
                <input 
                  type="date" 
                  value={settings.confirmedMoveDate || ''} 
                  onChange={e => setSettings({ ...settings, confirmedMoveDate: e.target.value || null })} 
                />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Setting this will anchor all "Before/After Move" tasks to this specific date.</p>
              </div>
            </div>
          </div>

          {/* Anchor Dates */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)', margin: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)' }}>Logistics Anchor Dates</div>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <DateInput 
                label="House Closing"
                dateValue={settings.closingDate}
                onDateChange={val => setSettings({...settings, closingDate: val})}
                confirmedValue={settings.isClosingDateConfirmed}
                onConfirmedChange={val => setSettings({...settings, isClosingDateConfirmed: val})}
              />
              <DateInput 
                label="Drive Start"
                dateValue={settings.driveStartDate}
                onDateChange={val => setSettings({...settings, driveStartDate: val})}
                confirmedValue={settings.isDriveStartConfirmed}
                onConfirmedChange={val => setSettings({...settings, isDriveStartConfirmed: val})}
              />
              <DateInput 
                label="Arrival at NY"
                dateValue={settings.arrivalDate}
                onDateChange={val => setSettings({...settings, arrivalDate: val})}
                confirmedValue={settings.isArrivalConfirmed}
                onConfirmedChange={val => setSettings({...settings, isArrivalConfirmed: val})}
              />
            </div>
          </div>

          {/* U-Pack Logistics */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)', margin: 0, gridColumn: '1 / -1' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)' }}>U-Pack Logistics</div>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <DateInput 
                label="Empty Dropoff (FL)"
                dateValue={settings.upackDropoffDate}
                onDateChange={val => setSettings({...settings, upackDropoffDate: val})}
                confirmedValue={settings.isUpackDropoffConfirmed}
                onConfirmedChange={val => setSettings({...settings, isUpackDropoffConfirmed: val})}
              />
              <DateInput 
                label="Full Pickup (FL)"
                dateValue={settings.upackPickupDate}
                onDateChange={val => setSettings({...settings, upackPickupDate: val})}
                confirmedValue={settings.isUpackPickupConfirmed}
                onConfirmedChange={val => setSettings({...settings, isUpackPickupConfirmed: val})}
              />
              <DateInput 
                label="Delivery (NY)"
                dateValue={settings.upackDeliveryDate}
                onDateChange={val => setSettings({...settings, upackDeliveryDate: val})}
                confirmedValue={settings.isUpackDeliveryConfirmed}
                onConfirmedChange={val => setSettings({...settings, isUpackDeliveryConfirmed: val})}
              />
              <DateInput 
                label="Final Pickup (NY)"
                dateValue={settings.upackFinalPickupDate}
                onDateChange={val => setSettings({...settings, upackFinalPickupDate: val})}
                confirmedValue={settings.isUpackFinalPickupConfirmed}
                onConfirmedChange={val => setSettings({...settings, isUpackFinalPickupConfirmed: val})}
              />
            </div>
          </div>

        </div>

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '14px 40px', fontSize: '15px' }} disabled={saving}>
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>

      <div className="card mt-12" style={{ background: 'var(--accent-soft)', border: 'none' }}>
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '24px' }}>info</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>How anchor dates work</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.6' }}>
              Anchor dates marked as <strong>Estimated</strong> will appear with a subtle visual cue on your Command Center and Timeline. Mark them as <strong>Confirmed</strong> once you have definitive dates from U-Pack or your real estate agent.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
