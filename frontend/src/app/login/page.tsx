'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { getApiBaseUrl, getOAuthBaseUrl } from '@/lib/apiClient';

function GithubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const FEATURES_LIST = [
  'Automated CI/CD pipeline from first push',
  'Isolated Docker build environments',
  'AI-powered root cause analysis',
  'Real-time log streaming via SSE',
  'HMAC-verified webhook security',
  'Auto-rollback on failed health checks',
];

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      setError(`OAuth Error: ${oauthError}`);
    } else if (token) {
      localStorage.setItem('opspilot_token', token);
      if (userParam) {
        try { localStorage.setItem('opspilot_user', userParam); } catch { /* ignore */ }
      }
      window.location.href = '/dashboard';
    }
  }, []);

  const handleGoogleLogin = () => {
    const oauthBase = getOAuthBaseUrl();
    window.location.href = `${oauthBase}/auth/google`;
  };

  const handleGitHubLogin = () => {
    const oauthBase = getOAuthBaseUrl();
    window.location.href = `${oauthBase}/auth/github`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        const msg = (data.message as string) || `HTTP ${res.status}: Authentication failed`;
        if (res.status === 401 && msg.toLowerCase().includes('verif')) {
          setError('Please verify your email before signing in. Check your inbox for the verification link.');
        } else {
          setError(msg);
        }
        return;
      }
      const tokens = (data.data as Record<string, unknown>)?.tokens as Record<string, string> | undefined;
      const user = (data.data as Record<string, unknown>)?.user;
      localStorage.setItem('opspilot_token', tokens?.accessToken || '');
      localStorage.setItem('opspilot_user', JSON.stringify(user || {}));
      window.location.href = '/dashboard';
    } catch {
      setError('Network connection error. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left Panel: Marketing ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '50%', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px', borderRight: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>OpsPilot</span>
        </Link>

        {/* Hero Content */}
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: 12 }}>
            Deploy with confidence.<br />Every single time.
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.65, maxWidth: 300, marginBottom: 36 }}>
            Join engineering teams who ship faster with OpsPilot&apos;s autonomous CI/CD platform.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES_LIST.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--success)', fontSize: 14 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          {/* Terminal block — always dark */}
          <div style={{
            borderRadius: 10, background: 'var(--terminal-bg)',
            border: '1px solid #2A2A2A', padding: '16px 20px',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.7,
          }}>
            <div className="log-prompt" style={{ color: '#525252' }}>$ git push origin main</div>
            <div style={{ color: '#93C5FD' }}>⚡ Pipeline triggered</div>
            <div style={{ color: '#A3A3A3' }}>▶ Clone → Install → Build → Test → Deploy</div>
            <div style={{ color: '#22C55E' }}>✓ Deployed in 27.1s · HTTP 200 OK</div>
          </div>
        </div>

        {/* Testimonial */}
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6 }}>
            &ldquo;The AI RCA alone saved us 6 hours this month.&rdquo;
          </p>
          <p style={{ color: 'var(--border-bright)', fontSize: 11, marginTop: 4 }}>— Platform Engineering Lead</p>
        </div>
      </div>

      {/* ── Right Panel: Auth Form ── */}
      <div className="relative" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Mobile logo */}
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>OpsPilot</span>
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Welcome back</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in to your workspace</p>
          </div>

          {/* OAuth Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            <button
              id="google-login-btn"
              type="button"
              onClick={handleGoogleLogin}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '9px 16px', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3s.7 5.6 1.9 8l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
              </svg>
              Google
            </button>
            <button
              id="github-login-btn"
              type="button"
              onClick={handleGitHubLogin}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '9px 16px', color: 'var(--accent-fg)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <GithubIcon size={15} />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 7,
              background: 'var(--error-dim)', border: '1px solid var(--error)',
              color: 'var(--error)', fontSize: 12, marginBottom: 16, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div>
              <label htmlFor="login-email" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  style={{
                    display: 'block', width: '100%',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7,
                    padding: '9px 14px 9px 38px', color: 'var(--text-primary)', fontSize: 14,
                    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label htmlFor="login-password" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--text-primary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    display: 'block', width: '100%',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7,
                    padding: '9px 40px 9px 38px', color: 'var(--text-primary)', fontSize: 14,
                    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? 'var(--text-muted)' : 'var(--accent)',
                color: 'var(--accent-fg)',
                fontSize: 13, fontWeight: 600,
                padding: '11px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {loading ? (
                <svg style={{ animation: 'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10" />
                </svg>
              ) : (
                <>Sign in <span>→</span></>
              )}
            </button>
          </form>

          {/* Footer links */}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Create one free
            </Link>
          </p>

          {/* Demo hint */}
          <div style={{
            marginTop: 20, padding: '10px 14px', borderRadius: 7,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6,
          }}>
            Demo: <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>admin@opspilot.io</span>{' '}
            /{' '}
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>admin123</span>
          </div>
        </div>
      </div>

      {/* Global spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .hidden { display: none; } .flex { display: flex; } @media (min-width: 1024px) { .lg\\:flex { display: flex !important; } .lg\\:hidden { display: none !important; } }`}</style>
    </div>
  );
}
