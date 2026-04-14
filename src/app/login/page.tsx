"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import PrismLogo from '@/components/PrismLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [brandName, setBrandName] = useState('EF Prism');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('QMS_APP_NAME');
    const savedLogo = localStorage.getItem('QMS_APP_LOGO');
    if (savedName) setBrandName(savedName);
    if (savedLogo) setBrandLogo(savedLogo);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
            ) : (
              <PrismLogo size={38} />
            )}
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
              {brandName}
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ISO 9001:2015 Compliant System
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Sign in to your account
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
            Enter your credentials to access the system
          </p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="email">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={14} />
                  Email Address
                </span>
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@prism.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} />
                  Password
                </span>
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                color: 'var(--danger)',
                fontSize: '0.875rem',
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              {loading ? (
                <span style={{ opacity: 0.8 }}>Signing in...</span>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Authorised personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}
