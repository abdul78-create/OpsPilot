'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type State = 'form' | 'success' | 'error';

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: '12+ chars', pass: password.length >= 12 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const colors = ['#ff4444', '#fb8500', '#ffb703', '#4ae176'];

  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, height: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, borderRadius: 4, background: i < strength ? colors[strength - 1] : '#27272A', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        {checks.map(c => (
          <span key={c.label} style={{ fontSize: 10, color: c.pass ? '#4ae176' : '#464554' }}>
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
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,180,171,0.05)', border: '1px solid rgba(255,180,171,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span style={{ fontSize: 32 }}>✖</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', marginBottom: 12 }}>Invalid reset link</h2>
        <p style={{ fontSize: 13, color: '#908fa0', marginBottom: 24 }}>No reset token found. Please use the link from your email.</p>
        <Link href="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#494bd6', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          Request new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (newPassword !== confirmPassword) { setFormError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) { setState('error'); setErrorMsg((data.message as string) || 'This reset link is invalid or has expired.'); return; }
      setState('success');
    } catch {
      setFormError('Network error. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  if (state === 'success') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(74,225,118,0.08)', border: '1px solid rgba(74,225,118,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span style={{ fontSize: 32 }}>✓</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', marginBottom: 12 }}>Password updated!</h2>
        <p style={{ fontSize: 13, color: '#908fa0', marginBottom: 28 }}>Your password has been changed. Sign in with your new credentials.</p>
        <Link id="reset-go-login" href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#494bd6', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          Sign in →
        </Link>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,180,171,0.05)', border: '1px solid rgba(255,180,171,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span style={{ fontSize: 32 }}>✖</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', marginBottom: 12 }}>Reset link expired</h2>
        <p style={{ fontSize: 13, color: '#908fa0', marginBottom: 28, lineHeight: 1.6 }}>{errorMsg}</p>
        <Link href="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#494bd6', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          Request new link
        </Link>
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
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', marginBottom: 8 }}>Reset Password</h2>
        <p style={{ fontSize: 13, color: '#908fa0' }}>Secure your OpsPilot enterprise account.</p>
      </div>

      {formError && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,180,171,0.05)', border: '1px solid rgba(255,180,171,0.2)', color: '#ffb4ab', fontSize: 12, marginBottom: 20, lineHeight: 1.5 }}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* New Password */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#908fa0', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>New Password</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 15 }}>🔒</span>
            <input
              id="reset-new-password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              className="input-field"
              style={{ paddingRight: 44 }}
            />
            <button type="button" onClick={() => setShowNew(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#464554', fontSize: 13 }}>
              {showNew ? '👁' : '👁‍🗨'}
            </button>
          </div>
          <PasswordStrengthBar password={newPassword} />
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#908fa0', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 15 }}>🔒</span>
            <input
              id="reset-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="input-field"
              style={{ paddingRight: 44 }}
            />
            <button type="button" onClick={() => setShowConfirm(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#464554', fontSize: 13 }}>
              {showConfirm ? '👁' : '👁‍🗨'}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p style={{ fontSize: 11, color: '#ffb4ab', marginTop: 4 }}>Passwords do not match</p>
          )}
        </div>

        {/* Requirements */}
        <div style={{ background: 'rgba(31,31,34,0.5)', border: '1px solid rgba(70,69,84,0.5)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: '#e4e1e5', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password Requirements</h4>
          {requirementsMet.map(req => (
            <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: req.pass ? '#4ae176' : '#464554', fontSize: 14 }}>{req.pass ? '●' : '○'}</span>
              <span style={{ color: req.pass ? '#c7c4d7' : 'rgba(199,196,215,0.5)' }}>{req.label}</span>
            </div>
          ))}
        </div>

        <button id="reset-submit" type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
          ) : (
            <><span>Update Password</span><span>→</span></>
          )}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/login" style={{ fontSize: 12, color: '#8083ff', textDecoration: 'none' }}>Return to Login</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <style>{`
        body { background: #09090B; color: #e4e1e5; overflow-x: hidden; }
        .ambient {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1;
          background:
            radial-gradient(circle at 15% 50%, rgba(73,75,214,0.08), transparent 50%),
            radial-gradient(circle at 85% 30%, rgba(74,225,118,0.05), transparent 50%);
        }
        .glass-card {
          background: rgba(27,27,30,0.4);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(70,69,84,0.4);
          box-shadow: 0px 8px 32px rgba(0,0,0,0.8);
          border-radius: 12px; padding: 32px; position: relative;
        }
        .input-field {
          display: block; width: 100%; background: #1f1f22;
          border: 1px solid #27272A; border-radius: 8px;
          padding: 10px 14px 10px 44px; color: #e4e1e5;
          font-size: 14px; font-family: Inter, sans-serif;
          outline: none; transition: all 0.2s; box-sizing: border-box;
        }
        .input-field:focus { border-color: #8083ff; box-shadow: 0 0 0 2px rgba(128,131,255,0.2); }
        .input-field::placeholder { color: #908fa0; }
        .btn-primary {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #494bd6; color: #fff;
          font-size: 12px; font-weight: 500; letter-spacing: 0.05em;
          padding: 12px 16px; border-radius: 8px; border: none; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover { background: #3b3dcf; box-shadow: 0 0 20px rgba(73,75,214,0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="ambient" />

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'rgba(128,131,255,0.08)', border: '1px solid rgba(128,131,255,0.2)', marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#c0c1ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(53,52,55,1),transparent)' }} />
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: 32 }}>
                <svg className="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: 'auto' }}><circle cx="12" cy="12" r="10" stroke="#8083ff" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
              </div>
            }>
              <ResetPasswordContent />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
