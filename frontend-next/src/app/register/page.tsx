'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const colors = ['#ff4444', '#fb8500', '#ffb703', '#4ae176'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, height: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, borderRadius: 4,
            background: i < strength ? colors[strength - 1] : '#27272A',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize: 10, color: c.pass ? '#4ae176' : '#464554' }}>
              {c.pass ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {strength > 0 && (
          <span style={{ fontSize: 10, color: colors[strength - 1], fontWeight: 500 }}>
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

  if (registered) {
    return (
      <>
        <style>{`body{background:#09090B;color:#e4e1e5;}`}</style>
        <div style={{ minHeight: '100vh', background: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'Inter, sans-serif' }}>
          <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(73,75,214,0.1)', border: '1px solid rgba(73,75,214,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <MailCheck size={32} style={{ color: '#8083ff' }} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#e4e1e5', marginBottom: 12 }}>Check your inbox</h1>
            <p style={{ fontSize: 14, color: '#908fa0', lineHeight: 1.6, marginBottom: 28 }}>
              We sent a verification link to <span style={{ color: '#c7c4d7', fontWeight: 500 }}>{registeredEmail}</span>.<br />
              Click the link to activate your account.
            </p>
            <div style={{ background: '#111113', border: '1px solid #27272A', borderRadius: 10, padding: 16, textAlign: 'left', marginBottom: 24 }}>
              {["Check your spam folder if you don't see it", 'The link expires in 24 hours', 'You can register again with a different email if needed'].map(tip => (
                <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, fontSize: 12, color: '#464554', lineHeight: 1.5 }}>
                  <span style={{ color: '#353437', marginTop: 1 }}>○</span>
                  {tip}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#464554' }}>
              Already verified?{' '}
              <Link href="/login" style={{ color: '#8083ff', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        body { background: #09090B; color: #e4e1e5; overflow-x: hidden; }
        .ambient { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1;
          background:
            radial-gradient(circle at 20% 20%, rgba(73,75,214,0.12), transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(74,225,118,0.06), transparent 50%); }
        .glass-card {
          background: rgba(17,17,19,0.7);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid #27272A; border-top: 1px solid #3F3F46;
          box-shadow: 0px 8px 32px rgba(0,0,0,0.8);
          border-radius: 12px; padding: 32px;
          position: relative;
        }
        .input-field {
          display: block; width: 100%; background: #09090B;
          border: 1px solid #27272A; border-radius: 8px;
          padding: 10px 14px 10px 44px; color: #e4e1e5;
          font-size: 14px; font-family: Inter, sans-serif;
          outline: none; transition: all 0.2s; box-sizing: border-box;
        }
        .input-field:focus { border-color: #494bd6; box-shadow: 0 0 0 2px rgba(73,75,214,0.2); }
        .input-field::placeholder { color: #71717A; }
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

          {/* Brand header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'rgba(128,131,255,0.1)', border: '1px solid rgba(128,131,255,0.2)', marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#8083ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#e4e1e5', marginBottom: 6 }}>Create your account</h1>
            <p style={{ fontSize: 14, color: '#908fa0' }}>Join high-performance engineering teams.</p>
          </div>

          <div className="glass-card">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#464554,transparent)' }} />

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,180,171,0.05)', border: '1px solid rgba(255,180,171,0.2)', color: '#ffb4ab', fontSize: 12, marginBottom: 20, lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister}>
              {/* Full Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#908fa0', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 15 }}>👤</span>
                  <input id="register-name" type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Jane Doe" required className="input-field" />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#908fa0', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Work Email</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 15 }}>✉</span>
                  <input id="register-email" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="jane@company.com" required className="input-field" />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#908fa0', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 15 }}>🔒</span>
                  <input
                    id="register-password"
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => updateForm('password', e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="input-field"
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#464554', fontSize: 13 }}>
                    {showPass ? '👁' : '👁‍🗨'}
                  </button>
                </div>
                <PasswordStrengthBar password={form.password} />
              </div>

              <button id="register-submit" type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
                ) : (
                  <><span>Create Account</span><span>→</span></>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(70,69,84,0.3)', fontSize: 12, color: '#464554' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#8083ff', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
            </div>
            <p style={{ textAlign: 'center', fontSize: 10, color: '#353437', marginTop: 12 }}>
              By registering, you agree to our{' '}
              <Link href="#" style={{ color: '#464554', textDecoration: 'underline' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="#" style={{ color: '#464554', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
