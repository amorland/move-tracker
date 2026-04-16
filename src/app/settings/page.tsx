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

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Settings</h1>
      <p className="section-subtitle">Manage move dates and relocation details.</p>
      
      <div className="card" style={{ maxWidth: '800px', padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>Timeline Configuration</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Adjust your moving window and closing date.</div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earliest Move Date</label>
                <input 
                  type="date" 
                  value={settings.earliestMoveDate} 
                  onChange={e => setSettings({ ...settings, earliestMoveDate: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Move Date</label>
                <input 
                  type="date" 
                  value={settings.latestMoveDate} 
                  onChange={e => setSettings({ ...settings, latestMoveDate: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed Move Date</label>
                <input 
                  type="date" 
                  value={settings.confirmedMoveDate || ''} 
                  onChange={e => setSettings({ ...settings, confirmedMoveDate: e.target.value || null })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closing Date</label>
                <input 
                  type="date" 
                  value={settings.closingDate || ''} 
                  onChange={e => setSettings({ ...settings, closingDate: e.target.value || null })} 
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 32px', background: '#fcfcfd', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
             <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px' }} disabled={saving}>
               {saving ? 'Saving...' : 'Save Configuration'}
             </button>
          </div>
        </form>
      </div>

      <div className="card mt-8" style={{ maxWidth: '800px', background: 'var(--accent-soft)', border: 'none' }}>
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '24px' }}>info</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>How dates are calculated</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.6' }}>
              Your task timeline is anchored to <strong>{settings.confirmedMoveDate ? 'your confirmed date' : 'the start of your move window'} ({format(parseISO(settings.confirmedMoveDate || settings.earliestMoveDate), 'MMMM d, yyyy')})</strong>. Updating these dates will automatically reschedule all relative tasks.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
