'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
    <>
      <style>{`
        body { background: #09090B; color: #e4e1e5; overflow-x: hidden; }
        .ambient {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1;
          background:
            radial-gradient(at 0% 0%, hsla(240,100%,70%,0.05) 0px, transparent 50%),
            radial-gradient(at 100% 0%, hsla(240,100%,70%,0.05) 0px, transparent 50%);
        }
        .glass-card {
          background: rgba(17,17,19,0.7);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid #27272A; border-top: 1px solid #3F3F46;
          box-shadow: 0px 8px 32px rgba(0,0,0,0.8);
          border-radius: 12px; padding: 40px; position: relative; overflow: hidden;
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
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: '#1f1f22', border: '1px solid #27272A', marginBottom: 16, boxShadow: '0 0 20px rgba(73,75,214,0.15)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#c0c1ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', marginBottom: 4 }}>OpsPilot</h1>
            <p style={{ fontSize: 11, color: '#464554', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Enterprise CI/CD</p>
          </div>

          <div className="glass-card">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(128,131,255,0.5),transparent)', opacity: 0.5 }} />

            {!sent ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', marginBottom: 8 }}>Reset your password</h2>
                  <p style={{ fontSize: 13, color: '#908fa0', lineHeight: 1.6 }}>Enter your email address and we&apos;ll send you a link to reset your password.</p>
                </div>

                {error && (
                  <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,180,171,0.05)', border: '1px solid rgba(255,180,171,0.2)', color: '#ffb4ab', fontSize: 12, marginBottom: 20, lineHeight: 1.5 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#908fa0', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#464554', fontSize: 15 }}>✉</span>
                      <input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="engineer@company.com"
                        required
                        className="input-field"
                      />
                    </div>
                  </div>

                  <button id="forgot-submit" type="submit" disabled={loading} className="btn-primary">
                    {loading ? (
                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
                    ) : (
                      <><span>Send Reset Link</span><span>→</span></>
                    )}
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#908fa0', textDecoration: 'none', transition: 'color 0.2s' }}>
                    ← Back to login
                  </Link>
                </div>
              </>
            ) : (
              /* Success state */
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(73,75,214,0.1)', border: '1px solid rgba(73,75,214,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <span style={{ fontSize: 32 }}>📧</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e1e5', marginBottom: 12 }}>Check your inbox</h2>
                <p style={{ fontSize: 13, color: '#908fa0', lineHeight: 1.6, marginBottom: 24 }}>
                  If <span style={{ color: '#c7c4d7', fontWeight: 500 }}>{email}</span> is registered, you&apos;ll receive a password reset link shortly.
                </p>
                <p style={{ fontSize: 12, color: '#464554' }}>
                  Didn&apos;t get it? Check your spam folder or{' '}
                  <button style={{ background: 'none', border: 'none', color: '#8083ff', cursor: 'pointer', fontSize: 12, padding: 0 }} onClick={() => { setSent(false); setEmail(''); }}>try again</button>.
                </p>
                <div style={{ marginTop: 24 }}>
                  <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#908fa0', textDecoration: 'none' }}>
                    ← Back to sign in
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#353437' }}>
            Need help?{' '}
            <Link href="#" style={{ color: '#8083ff', textDecoration: 'none' }}>Contact Support</Link>
          </div>
        </div>
      </div>
    </>
  );
}
