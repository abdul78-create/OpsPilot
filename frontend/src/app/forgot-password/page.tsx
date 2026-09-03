'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { getApiBaseUrl } from '@/lib/apiClient';

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
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError((data.message as string) || `HTTP ${res.status}: Password reset request failed.`);
        return;
      }
      setSent(true);
    } catch {
      setError('Network connection error. Ensure the NestJS backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3 text-decoration-none group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--info))',
                color: '#FFFFFF',
              }}
            >
              OP
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-base tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                OpsPilot AI
              </span>
              <span className="text-[10px] font-mono tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                ACCOUNT RECOVERY
              </span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border space-y-6 shadow-xl backdrop-blur-md"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          {!sent ? (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Reset your password
                </h1>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Enter your registered account email and we will dispatch a cryptographically secure reset link.
                </p>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs border"
                  style={{
                    background: 'var(--error-dim)',
                    borderColor: 'var(--error)',
                    color: 'var(--error)',
                  }}
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="forgot-email"
                    className="block text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:border-[var(--accent)]"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <button
                  id="forgot-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-[var(--accent)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ArrowLeft size={13} />
                  <span>Back to sign in</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center space-y-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-sm"
                style={{
                  background: 'var(--success-dim)',
                  borderColor: 'var(--success)',
                  color: 'var(--success)',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Check your inbox
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  If <span className="font-bold text-[var(--text-primary)]">{email}</span> is registered with OpsPilot, a secure password reset token has been dispatched.
                </p>
              </div>

              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Didn&apos;t receive the email? Check your spam filter or{' '}
                <button
                  type="button"
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="underline font-bold hover:text-[var(--accent)] cursor-pointer"
                  style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', padding: 0 }}
                >
                  try again
                </button>.
              </p>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:text-[var(--accent)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <ArrowLeft size={13} />
                  <span>Return to sign in</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Need assistance?{' '}
          <Link href="/docs" className="font-semibold underline hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Visit Platform Documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
