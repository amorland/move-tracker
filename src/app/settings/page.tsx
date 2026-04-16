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

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div>
      <h1>Settings</h1>
      
      <form onSubmit={handleSave} className="card" style={{ maxWidth: '600px' }}>
        <h2 style={{ marginTop: 0 }}>Move Window</h2>
        
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Earliest Move Date</label>
          <input 
            type="date" 
            value={settings.earliestMoveDate} 
            onChange={e => setSettings({ ...settings, earliestMoveDate: e.target.value })} 
          />
        </div>

        <div className="mb-4">
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Latest Move Date</label>
          <input 
            type="date" 
            value={settings.latestMoveDate} 
            onChange={e => setSettings({ ...settings, latestMoveDate: e.target.value })} 
          />
        </div>

        <div className="mb-4">
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Confirmed Move Date (Optional)</label>
          <input 
            type="date" 
            value={settings.confirmedMoveDate || ''} 
            onChange={e => setSettings({ ...settings, confirmedMoveDate: e.target.value || null })} 
          />
          <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
            Setting this will re-anchor all relative tasks to this specific date.
          </p>
        </div>

        <div className="mb-4">
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Closing Date (Optional)</label>
          <input 
            type="date" 
            value={settings.closingDate || ''} 
            onChange={e => setSettings({ ...settings, closingDate: e.target.value || null })} 
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      <div className="card mt-4" style={{ maxWidth: '600px', backgroundColor: 'var(--gray-50)' }}>
        <h3>Current Status</h3>
        <p style={{ marginTop: '8px' }}>
          <strong>Status:</strong> {settings.confirmedMoveDate ? 'Move Date Confirmed' : 'Flexible Window'}
        </p>
        <p>
          <strong>Target Date:</strong> {settings.confirmedMoveDate ? format(parseISO(settings.confirmedMoveDate), 'PPP') : 'Not yet confirmed'}
        </p>
      </div>
    </div>
  );
}
