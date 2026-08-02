import React from 'react';

interface LogoProps {
  size?: 16 | 24 | 32 | 48;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 24, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="relative flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-500/20 text-white font-bold"
        style={{ width: size, height: size }}
      >
        <svg 
          width={size * 0.65} 
          height={size * 0.65} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 17 22 12" />
        </svg>
      </div>
      {showText && (
        <div className="flex items-center gap-1.5 font-semibold tracking-tight text-slate-100" style={{ fontSize: Math.max(14, size * 0.65) }}>
          <span>OpsPilot</span>
          <span className="text-blue-400 font-bold text-xs bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
            AI
          </span>
        </div>
      )}
    </div>
  );
}
