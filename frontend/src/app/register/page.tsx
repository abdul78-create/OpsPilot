'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, MailCheck } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

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
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 3, height: 3 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, borderRadius: 4,
            background: i < strength ? colors[strength - 1] : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize: 10, color: c.pass ? 'var(--success)' : 'var(--text-muted)' }}>
              {c.pass ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {strength > 0 && (
          <span style={{ fontSize: 10, color: colors[strength - 1], fontWeight: 600 }}>
            {labels[strength - 1]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const updateForm = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, name: form.name }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError((data.message as string) || `HTTP ${res.status}: Registration failed. Try a different email.`);
        return;
      }
      setRegisteredEmail(form.email);
      setRegistered(true);
    } catch {
      setError('Network connection error. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7,
    padding: '9px 14px 9px 38px', color: 'var(--text-primary)', fontSize: 14,
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  // ── Success State ──
  if (registered) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-dim)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <MailCheck size={28} style={{ color: 'var(--success)' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Check your inbox</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 28 }}>
            We sent a verification link to{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{registeredEmail}</span>.<br />
            Click the link to activate your account.
          </p>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', textAlign: 'left', marginBottom: 24 }}>
            {["Check your spam folder if you don't see it", 'The link expires in 24 hours', 'You can register again with a different email if needed'].map(tip => (
              <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                <span style={{ marginTop: 1 }}>○</span>
                {tip}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Already verified?{' '}
            <Link href="/login" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>Sign in</Link>
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Register Form ──
  return (
    <div className="relative" style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 11, background: 'var(--text-primary)', marginBottom: 16, textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Create your account</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Join high-performance engineering teams.</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 28px 24px' }}>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 7, background: 'var(--error-dim)', border: '1px solid var(--error)', color: 'var(--error)', fontSize: 12, marginBottom: 18, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Full Name */}
            <div>
              <label htmlFor="register-name" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="register-name"
                  type="text"
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                  placeholder="Jane Doe"
                  required
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label htmlFor="register-email" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="register-email"
                  type="email"
                  value={form.email}
                  onChange={e => updateForm('email', e.target.value)}
                  placeholder="jane@company.com"
                  required
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => updateForm('password', e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <PasswordStrengthBar password={form.password} />
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? 'var(--text-muted)' : 'var(--accent)', color: 'var(--accent-fg)',
                fontSize: 13, fontWeight: 600,
                padding: '11px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s', marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {loading ? (
                <svg style={{ animation: 'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10" />
                </svg>
              ) : (
                <><span>Create Account</span><span>→</span></>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>Sign in</Link>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            By registering, you agree to our{' '}
            <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Terms</Link>
            {' '}and{' '}
            <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
