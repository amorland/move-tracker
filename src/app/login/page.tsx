'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'unauthorized') setError('Your Google account is not authorized to access this app.');
    else if (err === 'auth_failed') setError('Sign-in failed. Please try again.');
    else if (err === 'no_code') setError('Authentication was cancelled. Please try again.');
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: '48px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--color-accent)', fontFamily: 'var(--font-sans)' }}>SL</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>Starland™ Moving</div>
          <p style={{ fontSize: 14, color: 'var(--color-secondary)', margin: 0 }}>Sign in to access the tracker</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', height: 48, fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--color-foreground)', transition: 'background 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {!loading && (
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--color-secondary)', opacity: 0.6, lineHeight: 1.5, margin: '24px 0 0' }}>
          Access restricted to authorized family members only.
        </p>
      </div>
    </div>
  );
}
