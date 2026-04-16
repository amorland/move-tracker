'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('Invalid password');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '48px 40px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)', marginBottom: '16px', letterSpacing: '0.1em' }}>STARLAND MOVE TRACKER</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px' }}>Welcome</div>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Please enter the app password to continue</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <input 
              type="password" 
              placeholder="App password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              style={{ 
                width: '100%', 
                height: '52px', 
                fontSize: '16px', 
                border: error ? '2px solid #e74c3c' : '1px solid var(--border)',
                padding: '0 16px',
                borderRadius: '8px'
              }}
            />
          </div>
          
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e74c3c', fontSize: '13px', marginBottom: '16px', justifyContent: 'center', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              {error}
            </div>
          )}
          
          <div style={{ marginTop: '32px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '48px', fontSize: '15px' }} 
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Access Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
