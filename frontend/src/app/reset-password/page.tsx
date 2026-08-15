'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

type State = 'form' | 'success' | 'error';

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: '12+ chars', pass: password.length >= 12 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;

  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1.5 h-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors duration-300"
            style={{
              background: i < strength
                ? strength === 4 ? 'var(--success)' : strength >= 2 ? 'var(--warning)' : 'var(--error)'
                : 'var(--border)',
            }}
          />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {checks.map(c => (
          <span
            key={c.label}
            className="text-[10px] flex items-center gap-1 font-mono"
            style={{ color: c.pass ? 'var(--success)' : 'var(--text-muted)' }}
          >
            <span>{c.pass ? '✓' : '○'}</span>
            <span>{c.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<State>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  if (!token && state === 'form') {
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
            Invalid reset link
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No reset token found in URL. Please open the link directly from your email.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://opspilot-backend-nq7l.onrender.com';
      const res = await fetch(`${apiBase}/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setState('error');
        setErrorMsg((data.message as string) || 'This reset link is invalid or has expired.');
        return;
      }
      setState('success');
    } catch {
      setFormError('Network error. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

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
            Password updated
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Your account credentials have been updated securely. You can now sign in.
          </p>
        </div>
        <div className="pt-2">
          <Link
            id="reset-go-login"
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <span>Sign in to OpsPilot</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'error') {
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
            Reset link expired
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {errorMsg}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const requirementsMet = [
    { label: 'At least 12 characters long', pass: newPassword.length >= 12 },
    { label: 'Contains at least one uppercase letter', pass: /[A-Z]/.test(newPassword) },
    { label: 'Contains at least one number', pass: /\d/.test(newPassword) },
    { label: 'Contains at least one special character', pass: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Set new password
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Create a strong password to protect your DevOps workspace.
        </p>
      </div>

      {formError && (
        <div
          className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs border"
          style={{
            background: 'var(--error-dim)',
            borderColor: 'var(--error)',
            color: 'var(--error)',
          }}
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label
            htmlFor="reset-new-password"
            className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            New Password
          </label>
          <div className="relative">
            <Lock
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              id="reset-new-password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowNew(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <PasswordStrengthBar password={newPassword} />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="reset-confirm-password"
            className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Confirm New Password
          </label>
          <div className="relative">
            <Lock
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              id="reset-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--error)' }}>
              Passwords do not match
            </p>
          )}
        </div>

        {/* Requirements Box */}
        <div
          className="p-3.5 rounded-xl border space-y-2"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Security Requirements
          </div>
          <div className="space-y-1.5">
            {requirementsMet.map(req => (
              <div key={req.label} className="flex items-center gap-2 text-xs">
                <span style={{ color: req.pass ? 'var(--success)' : 'var(--text-muted)' }}>
                  {req.pass ? '✓' : '○'}
                </span>
                <span style={{ color: req.pass ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          id="reset-submit"
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <span>Update Password</span>
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
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Account Security
          </p>
        </div>

        {/* Glass Card */}
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
            <ResetPasswordContent />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
