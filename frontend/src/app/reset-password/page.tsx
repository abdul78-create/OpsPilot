'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowRight,
  ArrowLeft, Loader2, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { getApiBaseUrl } from '@/lib/apiClient';

type State = 'form' | 'success' | 'error';

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const colors = ['var(--error)', 'var(--warning)', 'var(--info)', 'var(--success)'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1.5 h-1.5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors duration-300"
            style={{
              background: i < strength ? colors[strength - 1] : 'var(--border)',
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex gap-2.5 font-mono">
          {checks.map(c => (
            <span key={c.label} style={{ color: c.pass ? 'var(--success)' : 'var(--text-muted)' }}>
              {c.pass ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {strength > 0 && (
          <span className="font-bold" style={{ color: colors[strength - 1] }}>
            {labels[strength - 1]}
          </span>
        )}
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
      <div className="text-center space-y-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-sm"
          style={{ background: 'var(--error-dim)', borderColor: 'var(--error)', color: 'var(--error)' }}
        >
          <XCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Invalid Recovery Link
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            No cryptographic reset token was detected. Please open the reset link directly from your confirmation email.
          </p>
        </div>
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <span>Request New Recovery Link</span>
            <ArrowRight size={14} />
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
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setState('error');
        setErrorMsg((data.message as string) || 'This reset token is invalid or has expired.');
        return;
      }
      setState('success');
    } catch {
      setFormError('Network connection error. Ensure the NestJS backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  if (state === 'success') {
    return (
      <div className="text-center space-y-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-sm"
          style={{ background: 'var(--success-dim)', borderColor: 'var(--success)', color: 'var(--success)' }}
        >
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Password Updated
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Your account credentials have been securely updated with Argon2id encryption.
          </p>
        </div>
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/login"
            className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <span>Sign in to Control Plane</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center space-y-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-sm"
          style={{ background: 'var(--error-dim)', borderColor: 'var(--error)', color: 'var(--error)' }}
        >
          <XCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Recovery Failed
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {errorMsg}
          </p>
        </div>
        <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/forgot-password"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-center"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Request New Link
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold border text-center hover:bg-[var(--bg-tertiary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Create New Password
        </h1>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Choose a strong password to protect your DevOps control plane.
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
        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="block text-[11px] uppercase tracking-wider font-semibold"
            style={{ color: 'var(--text-secondary)' }}
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
              id="new-password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:border-[var(--accent)]"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <PasswordStrengthBar password={newPassword} />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="block text-[11px] uppercase tracking-wider font-semibold"
            style={{ color: 'var(--text-secondary)' }}
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
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:border-[var(--accent)]"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <button
          id="reset-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <>
              <span>Update Password & Proceed</span>
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
    </div>
  );
}

export default function ResetPasswordPage() {
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
                PASSWORD RECOVERY
              </span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border shadow-xl backdrop-blur-md"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <Suspense fallback={
            <div className="py-12 text-center text-xs flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
              <span style={{ color: 'var(--text-muted)' }}>Validating recovery token...</span>
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>

        {/* Footer */}
        <div className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          OpsPilot Enterprise Security · Argon2id Password Hashing
        </div>
      </div>
    </div>
  );
}
