'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type State = 'form' | 'success' | 'error';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  if (!password) return null;
  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? colors[strength] : 'bg-[#27272A]'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(c => (
          <span key={c.label} className={`text-[10px] flex items-center gap-1 ${c.pass ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {c.pass ? '✓' : '○'} {c.label}
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
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <XCircle size={32} className="text-red-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid reset link</h1>
          <p className="text-sm text-zinc-400">No reset token found. Please use the link from your email.</p>
        </div>
        <Link href="/forgot-password" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all">
          Request new link
        </Link>
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
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      let data: any = {};
      try { data = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setState('error');
        setErrorMsg(data.message || 'This reset link is invalid or has expired.');
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
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Password updated!</h1>
          <p className="text-sm text-zinc-400">Your password has been changed. Sign in with your new credentials.</p>
        </div>
        <Link
          id="reset-go-login"
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
        >
          Sign in <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <XCircle size={32} className="text-red-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Reset link expired</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">{errorMsg}</p>
        </div>
        <Link href="/forgot-password" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
        <p className="text-sm text-zinc-500">Choose a strong password for your account.</p>
      </div>

      {formError && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">New password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              id="reset-new-password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
            />
            <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <PasswordStrength password={newPassword} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Confirm password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              id="reset-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              required
              className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
            />
            <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          id="reset-submit"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/20"
        >
          {loading ? (
            <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
          ) : (
            <>Update password <ArrowRight size={15} /></>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-8">
      <div className="w-full max-w-sm animate-fade-in space-y-6">
        <Link href="/landing" className="inline-flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-white">OpsPilot</span>
        </Link>

        <Suspense fallback={
          <div className="flex justify-center py-8">
            <Loader2 size={28} className="text-violet-400 animate-spin" />
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
