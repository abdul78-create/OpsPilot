'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

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
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://opspilot-backend-nq7l.onrender.com';
      const res = await fetch(`${apiBase}/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError((data.message as string) || `HTTP ${res.status}: Request failed.`);
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
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">

        {/* Brand Header */}
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
            Enterprise CI/CD & DevOps
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border space-y-6"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          {!sent ? (
            <>
              <div className="text-center space-y-1.5">
                <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Reset your password
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Enter your verified account email address and we&apos;ll dispatch a secure password reset link.
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
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Email Address
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
                      onChange={e => setEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none"
                      style={{
                        background: 'var(--bg-tertiary)',
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
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ArrowLeft size={13} />
                  <span>Back to login</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border"
                style={{ background: 'var(--success-dim)', borderColor: 'var(--success)', color: 'var(--success)' }}
              >
                <CheckCircle2 size={28} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Check your inbox
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  If <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{email}</span> is registered, you&apos;ll receive a password reset link shortly.
                </p>
              </div>

              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="underline font-semibold cursor-pointer"
                  style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', padding: 0 }}
                >
                  try again
                </button>.
              </p>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <ArrowLeft size={13} />
                  <span>Back to sign in</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Need assistance?{' '}
          <Link href="/docs" className="underline font-medium" style={{ color: 'var(--text-secondary)' }}>
            Visit Documentation
          </Link>
        </div>

      </div>
    </div>
  );
}
