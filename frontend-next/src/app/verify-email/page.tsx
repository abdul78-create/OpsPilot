'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type State = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setState('error');
      setMessage('No verification token was found in the URL. Please use the link from your email.');
      return;
    }

    const verify = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* ignore */ }

        if (!res.ok) {
          setState('error');
          setMessage((data.message as string) || 'This verification link is invalid or has expired.');
          return;
        }

        const tokens = (data.data as Record<string, unknown>)?.tokens as Record<string, string> | undefined;
        const user = (data.data as Record<string, unknown>)?.user;
        if (typeof window !== 'undefined') {
          localStorage.setItem('opspilot_token', tokens?.accessToken || '');
          localStorage.setItem('opspilot_user', JSON.stringify(user || {}));
        }
        setState('success');
      } catch {
        setState('error');
        setMessage('Network error. Please try again or contact support.');
      }
    };

    verify();
  }, [token]);

  if (state === 'loading') {
    return (
      <>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(73,75,214,0.1)', border: '1px solid rgba(73,75,214,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(128,131,255,0.1)', borderRadius: '50%', filter: 'blur(8px)' }} />
          <svg style={{ animation: 'spin 1s linear infinite', position: 'relative', zIndex: 1 }} width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#c0c1ff" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', textAlign: 'center', marginBottom: 8 }}>Verifying your identity…</h2>
        <p style={{ fontSize: 14, color: '#908fa0', textAlign: 'center' }}>This will only take a moment.</p>
      </>
    );
  }

  if (state === 'success') {
    return (
      <>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(74,225,118,0.08)', border: '1px solid rgba(74,225,118,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span style={{ fontSize: 36, color: '#4ae176' }}>✓</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', textAlign: 'center', marginBottom: 12 }}>Email verified!</h2>
        <p style={{ fontSize: 14, color: '#908fa0', textAlign: 'center', marginBottom: 28 }}>Your account is now active. You&apos;re signed in and ready to go.</p>
        <div style={{ textAlign: 'center' }}>
          <Link
            id="verify-go-dashboard"
            href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', background: '#494bd6', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
          >
            Go to Dashboard →
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,180,171,0.05)', border: '1px solid rgba(255,180,171,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <span style={{ fontSize: 36, color: '#ffb4ab' }}>✖</span>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', textAlign: 'center', marginBottom: 12 }}>Verification failed</h2>
      <p style={{ fontSize: 13, color: '#908fa0', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>{message}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#494bd6', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          Register again
        </Link>
        <Link href="/login" style={{ fontSize: 13, color: '#908fa0', textDecoration: 'none' }}>Back to sign in</Link>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <style>{`
        body { background: #09090B; color: #e4e1e5; overflow-x: hidden; }
        .ambient {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1;
          background: radial-gradient(circle at 50% -20%, rgba(128,131,255,0.15), rgba(19,19,22,0) 70%);
        }
        .dot-grid {
          position: absolute; inset: 0; z-index: 0; opacity: 0.1; pointer-events: none;
          background-image: radial-gradient(#464554 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .card-edge {
          background: linear-gradient(180deg,#3F3F46 0%,#27272A 100%);
          padding: 1px; border-radius: 12px;
          box-shadow: 0px 8px 32px rgba(0,0,0,0.8);
        }
        .card-inner { background: #111113; border-radius: 11px; padding: 48px 40px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ambient" />

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
        <div className="dot-grid" />

        <div style={{ width: '100%', maxWidth: 420, padding: '0 16px', position: 'relative', zIndex: 1 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: '#e4e1e5', letterSpacing: '-0.03em', marginBottom: 8 }}>OpsPilot</h1>
            <p style={{ fontSize: 14, color: '#908fa0' }}>Enterprise Security Protocol</p>
          </div>

          <div className="card-edge">
            <div className="card-inner">
              <Suspense fallback={
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <svg style={{ animation: 'spin 1s linear infinite', margin: 'auto' }} width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#c0c1ff" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/>
                  </svg>
                </div>
              }>
                <VerifyEmailContent />
              </Suspense>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/login" style={{ fontSize: 12, color: '#464554', textDecoration: 'none' }}>Return to Login</Link>
          </div>
        </div>
      </div>
    </>
  );
}
