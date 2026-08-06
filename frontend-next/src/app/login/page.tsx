'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://opspilot-backend-nq7l.onrender.com';
    window.location.href = `${apiBase}/v1/auth/google`;
  };

  const handleGitHubLogin = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://opspilot-backend-nq7l.onrender.com';
    window.location.href = `${apiBase}/v1/auth/github`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://opspilot-backend-nq7l.onrender.com';
      const res = await fetch(`${apiBase}/v1/auth/login`, {
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
    <>
      <style>{`
        body { background-color: #09090B; color: #e4e1e5; }
        .glass-panel {
          background: rgba(17,17,19,0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid #27272A;
          border-top: 1px solid #3F3F46;
          box-shadow: 0px 8px 32px rgba(0,0,0,0.8);
        }
        .ambient-bg {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1;
          background:
            radial-gradient(circle at 15% 50%, rgba(73,75,214,0.08), transparent 50%),
            radial-gradient(circle at 85% 30%, rgba(74,225,118,0.05), transparent 50%);
        }
        .input-field {
          display: block; width: 100%;
          background: #09090B;
          border: 1px solid #27272A;
          border-radius: 8px;
          padding: 10px 14px 10px 44px;
          color: #e4e1e5;
          font-size: 14px;
          transition: all 0.2s;
          outline: none;
          font-family: Inter, sans-serif;
        }
        .input-field:focus { border-color: #494bd6; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
        .input-field::placeholder { color: #71717A; }
        .btn-primary {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #494bd6; color: #ffffff;
          font-size: 12px; font-weight: 500; letter-spacing: 0.05em;
          padding: 12px 16px; border-radius: 8px; border: none; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover { background: #3b3dcf; box-shadow: 0 0 15px rgba(73,75,214,0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-social {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #1b1b1e; border: 1px solid #27272A; border-radius: 8px;
          padding: 10px 16px; color: #e4e1e5; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s; width: 100%;
        }
        .btn-social:hover { background: #27272A; border-color: #3F3F46; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="ambient-bg" />

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
        {/* ── Left Panel ── */}
        <div style={{
          display: 'none',
          width: '50%', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px', position: 'relative', overflow: 'hidden',
          borderRight: '1px solid #1C1C1F',
        }} className="lg-panel">
          <style>{`@media(min-width:1024px){.lg-panel{display:flex!important}}`}</style>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(73,75,214,0.08),rgba(74,225,118,0.03),transparent)', pointerEvents: 'none' }} />

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#494bd6,#4ae176)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e4e1e5' }}>OpsPilot</span>
          </Link>

          {/* Hero */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: '#e4e1e5', lineHeight: 1.3, marginBottom: 12 }}>
              Deploy with confidence.<br />
              <span style={{ background: 'linear-gradient(90deg,#8083ff,#4ae176)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Every single time.</span>
            </h2>
            <p style={{ color: '#908fa0', fontSize: 14, lineHeight: 1.6, maxWidth: 280, marginBottom: 32 }}>
              Join engineering teams who ship faster with OpsPilot&apos;s autonomous CI/CD platform.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES_LIST.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#c7c4d7' }}>
                  <span style={{ color: '#4ae176', fontSize: 16 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 32, borderRadius: 10, background: '#111113', border: '1px solid #27272A', padding: '16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              <div style={{ color: '#464554' }}>$ git push origin main</div>
              <div style={{ color: '#8083ff' }}>⚡ Pipeline triggered</div>
              <div style={{ color: '#908fa0' }}>▶ Clone → Install → Build → Test → Deploy</div>
              <div style={{ color: '#4ae176' }}>✓ Deployed in 27.1s · HTTP 200 OK</div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: '#464554', fontSize: 12, fontStyle: 'italic' }}>&ldquo;The AI RCA alone saved us 6 hours this month.&rdquo;</p>
            <p style={{ color: '#353437', fontSize: 11, marginTop: 4 }}>— Platform Engineering Lead</p>
          </div>
        </div>

        {/* ── Right Panel: Login Form ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: '100%', maxWidth: 400 }}>

            {/* Mobile logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }} className="mobile-logo">
              <style>{`@media(min-width:1024px){.mobile-logo{display:none!important}}`}</style>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#494bd6,#4ae176)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e4e1e5' }}>OpsPilot</span>
            </div>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#e4e1e5', marginBottom: 6 }}>Welcome back</h1>
              <p style={{ color: '#908fa0', fontSize: 14 }}>Sign in to your workspace</p>
            </div>

            <div className="glass-panel" style={{ borderRadius: 12, padding: 32 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#3F3F46,transparent)' }} />

              {/* OAuth Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <button id="google-login-btn" type="button" onClick={handleGoogleLogin} className="btn-social">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3s.7 5.6 1.9 8l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                  </svg>
                  Google
                </button>
                <button id="github-login-btn" type="button" onClick={handleGitHubLogin} className="btn-social">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </button>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: '#27272A' }} />
                <span style={{ fontSize: 11, color: '#464554', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or sign in with email</span>
                <div style={{ flex: 1, height: 1, background: '#27272A' }} />
              </div>

              {/* Error */}
              {error && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,180,171,0.05)', border: '1px solid rgba(255,180,171,0.2)', color: '#ffb4ab', fontSize: 12, marginBottom: 20, lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin}>
                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#908fa0', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 16 }}>✉</span>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      required
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#908fa0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
                    <Link href="/forgot-password" style={{ fontSize: 11, color: '#8083ff', textDecoration: 'none' }}>Forgot password?</Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 16 }}>🔒</span>
                    <input
                      id="login-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="input-field"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#464554', fontSize: 13 }}
                    >
                      {showPass ? '👁' : '👁‍🗨'}
                    </button>
                  </div>
                </div>

                <button id="login-submit" type="submit" disabled={loading} className="btn-primary">
                  {loading ? (
                    <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
                  ) : (
                    <><span>Sign in</span><span>→</span></>
                  )}
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#464554', marginTop: 24 }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={{ color: '#8083ff', textDecoration: 'none', fontWeight: 500 }}>Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
