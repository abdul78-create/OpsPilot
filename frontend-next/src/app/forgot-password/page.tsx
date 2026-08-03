'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, MailCheck, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      let data: any = {};
      try { data = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError(data.message || `HTTP ${res.status}: Request failed.`);
        return;
      }

      setSent(true);
    } catch {
      setError('Network error. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-8">
      <div className="w-full max-w-sm animate-fade-in space-y-6">

        {/* Logo */}
        <Link href="/landing" className="inline-flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-white">OpsPilot</span>
        </Link>

        {!sent ? (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Forgot your password?</h1>
              <p className="text-sm text-zinc-500">
                Enter your account email and we'll send you a secure reset link.
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
                  />
                </div>
              </div>

              <button
                id="forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/20"
              >
                {loading ? (
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
                ) : (
                  <>Send reset link <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft size={13} />
              Back to sign in
            </Link>
          </>
        ) : (
          /* Success state */
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center">
                <MailCheck size={32} className="text-violet-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                If <span className="text-zinc-200 font-medium">{email}</span> is registered, you'll receive a password reset link shortly.
              </p>
            </div>
            <p className="text-xs text-zinc-600">
              Didn't get it? Check your spam folder or{' '}
              <button
                className="text-violet-400 hover:text-violet-300 transition-colors"
                onClick={() => { setSent(false); setEmail(''); }}
              >
                try again
              </button>.
            </p>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft size={13} />
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
