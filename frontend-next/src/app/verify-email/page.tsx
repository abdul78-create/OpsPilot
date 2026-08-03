'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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

        let data: any = {};
        try { data = await res.json(); } catch { /* ignore */ }

        if (!res.ok) {
          setState('error');
          setMessage(data.message || 'This verification link is invalid or has expired.');
          return;
        }

        const tokenValue = data.data?.tokens?.accessToken || data.tokens?.accessToken || '';
        const userValue = data.data?.user || data.user || {};
        if (typeof window !== 'undefined') {
          localStorage.setItem('opspilot_token', tokenValue);
          localStorage.setItem('opspilot_user', JSON.stringify(userValue));
        }

        setState('success');
      } catch {
        setState('error');
        setMessage('Network error. Please try again or contact support.');
      }
    };

    verify();
  }, [token]);

  return (
    <>
      {state === 'loading' && (
        <>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <Loader2 size={28} className="text-violet-400 animate-spin" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-1">Verifying your email…</h1>
            <p className="text-sm text-zinc-500">This will only take a moment.</p>
          </div>
        </>
      )}

      {state === 'success' && (
        <>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Email verified!</h1>
            <p className="text-sm text-zinc-400">
              Your account is now active. You&apos;re signed in and ready to go.
            </p>
          </div>
          <Link
            id="verify-go-dashboard"
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/20"
          >
            Go to Dashboard
          </Link>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <XCircle size={32} className="text-red-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Verification failed</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
            >
              Register again
            </Link>
            <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-8">
      <div className="w-full max-w-sm text-center animate-fade-in space-y-6">
        <Link href="/landing" className="inline-flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base font-bold text-white">OpsPilot</span>
        </Link>

        <Suspense fallback={
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <Loader2 size={28} className="text-violet-400 animate-spin" />
            </div>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
