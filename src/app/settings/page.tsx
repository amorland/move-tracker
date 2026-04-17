'use client';

import { useEffect, useState } from 'react';
import { MoveSettings } from '@/lib/types';
import { CheckCircle2, Save, X, Star, Info } from 'lucide-react';
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

  if (loading || !settings) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading Starland Settings...</div>;

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
            <p className="section-subtitle" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Configurations</p>
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
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
        <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', padding: '48px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-8">
            <Info size={32} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)', fontFamily: 'var(--font-headings)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>System Status</div>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '16px', lineHeight: '1.8', maxWidth: '850px', fontWeight: 400 }}>
                All move milestones, U-Pack dates, and house closing logistics are now managed directly through the <strong>Move Narrative</strong> on the Overview dashboard. No further global configuration is required here.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
