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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '48px 40px', borderRadius: '8px', border: '1px solid #dadce0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: 500, color: '#202124', marginBottom: '8px' }}>Move Tracker</div>
          <div style={{ fontSize: '24px', fontWeight: 400, color: '#202124', marginBottom: '12px' }}>Welcome</div>
          <p style={{ fontSize: '16px', color: '#202124' }}>To continue, enter the app password</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <input 
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              style={{ 
                width: '100%', 
                height: '56px', 
                fontSize: '16px', 
                border: error ? '1px solid #d93025' : '1px solid #dadce0',
                padding: '13px 15px' 
              }}
            />
          </div>
          
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d93025', fontSize: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
            <span style={{ fontSize: '14px', color: '#1a73e8', fontWeight: 500, cursor: 'pointer' }}>Forgot password?</span>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ height: '40px', minWidth: '88px', borderRadius: '4px' }} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
