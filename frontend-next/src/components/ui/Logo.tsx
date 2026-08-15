import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 24, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Monochrome icon — no violet gradient */}
      <div
        className="relative flex items-center justify-center rounded-lg bg-[var(--text-primary)] shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-fg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </div>
      {showText && (
        <span
          className="font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontSize: Math.max(13, size * 0.6) }}
        >
          OpsPilot
        </span>
      )}
    </div>
  );
}
