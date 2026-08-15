'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

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
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://opspilot-backend-nq7l.onrender.com';
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
      <div className="text-center space-y-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
        >
          <Loader2 size={26} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Verifying your identity…
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Validating security token with OpsPilot auth service.
          </p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="text-center space-y-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border"
          style={{ background: 'var(--success-dim)', borderColor: 'var(--success)', color: 'var(--success)' }}
        >
          <CheckCircle2 size={28} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Email verified
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Your account is now activated. You&apos;re signed in and ready to access your DevOps workspaces.
          </p>
        </div>
        <div className="pt-2">
          <Link
            id="verify-go-dashboard"
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border"
        style={{ background: 'var(--error-dim)', borderColor: 'var(--error)', color: 'var(--error)' }}
      >
        <XCircle size={28} />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Verification failed
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
          {message}
        </p>
      </div>
      <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          Create New Account
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-decoration-none">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              OP
            </div>
            <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              OpsPilot
            </span>
          </Link>
          <p className="text-xs tracking-wider uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
            Security Protocol
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
