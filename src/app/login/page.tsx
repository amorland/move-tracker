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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--gray-50)' }}>
      <form onSubmit={handleLogin} className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <h1 style={{ fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>Move Tracker</h1>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: '24px', fontSize: '14px' }}>Please enter the shared password</p>
        
        <div className="mb-4">
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        
        {error && <p style={{ color: '#d44', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }} disabled={loading}>
          {loading ? 'Authenticating...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
