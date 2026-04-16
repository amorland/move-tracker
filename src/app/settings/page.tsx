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

  if (loading || !settings) return <div style={{ color: '#5f6368' }}>Loading Settings...</div>;

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ color: '#5f6368', marginBottom: '32px' }}>Manage your move timeline and address details.</p>
      
      <div className="card" style={{ maxWidth: '800px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #dadce0' }}>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#202124', marginBottom: '8px' }}>Move Details</div>
          <div style={{ fontSize: '14px', color: '#5f6368' }}>Set the dates for your relocation window.</div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#3c4043' }}>Earliest Move Date</label>
                <input 
                  type="date" 
                  value={settings.earliestMoveDate} 
                  onChange={e => setSettings({ ...settings, earliestMoveDate: e.target.value })} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#3c4043' }}>Latest Move Date</label>
                <input 
                  type="date" 
                  value={settings.latestMoveDate} 
                  onChange={e => setSettings({ ...settings, latestMoveDate: e.target.value })} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#3c4043' }}>Confirmed Move Date</label>
                <input 
                  type="date" 
                  value={settings.confirmedMoveDate || ''} 
                  onChange={e => setSettings({ ...settings, confirmedMoveDate: e.target.value || null })} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#3c4043' }}>Closing Date</label>
                <input 
                  type="date" 
                  value={settings.closingDate || ''} 
                  onChange={e => setSettings({ ...settings, closingDate: e.target.value || null })} 
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 24px', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
             <button type="submit" className="btn btn-primary" disabled={saving}>
               {saving ? 'Saving...' : 'Save changes'}
             </button>
          </div>
        </form>
      </div>

      <div className="card mt-8" style={{ maxWidth: '800px', background: '#f8f9fa' }}>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined" style={{ color: '#1a73e8', fontSize: '24px' }}>info</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#202124' }}>Current Timeline Anchor</div>
            <div style={{ fontSize: '14px', color: '#5f6368', marginTop: '4px' }}>
              Your tasks are currently calculated based on <strong>{settings.confirmedMoveDate ? 'your confirmed date' : 'the earliest window date'} ({format(parseISO(settings.confirmedMoveDate || settings.earliestMoveDate), 'PPP')})</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
