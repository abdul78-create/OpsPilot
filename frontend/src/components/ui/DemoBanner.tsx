'use client';

import React, { useEffect, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

/**
 * DemoBanner
 *
 * Displayed persistently across the entire app when the user is authenticated
 * with a demo token (JWT contains isDemo=true).
 *
 * This component ensures the presentation audience always knows they are
 * viewing simulated demo data, not real customer data.
 */
export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check the stored JWT for isDemo claim
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('opspilot_token');
    if (!token) return;

    try {
      // JWT is base64url-encoded — decode payload (middle part)
      const parts = token.split('.');
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload?.isDemo === true) {
        setIsDemo(true);
      }
    } catch {
      // Not a valid JWT — ignore
    }
  }, []);

  if (!isDemo || dismissed) return null;

  return (
    <div
      role="banner"
      aria-label="Demo mode banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #7C3AED 0%, #4F46E5 50%, #0EA5E9 100%)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        fontSize: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
        gap: '8px',
      }}
    >
      {/* Left: Icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <FlaskConical size={14} strokeWidth={2.5} />
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            opacity: 0.9,
            background: 'rgba(255,255,255,0.18)',
            padding: '2px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          DEMO MODE
        </span>
        <span style={{ opacity: 0.95, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Simulated Demo Environment — No real infrastructure is contacted. All data is isolated and synthetic.
        </span>
      </div>

      {/* Right: dismiss */}
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss demo banner"
        aria-label="Dismiss demo banner"
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          padding: '3px',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
      >
        <X size={13} />
      </button>
    </div>
  );
}
