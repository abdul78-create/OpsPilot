'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

type Option = { value: 'light' | 'dark' | 'system'; icon: React.ElementType; label: string };
const OPTIONS: Option[] = [
  { value: 'light',  icon: Sun,     label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark',   icon: Moon,    label: 'Dark' },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5 gap-0.5"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            aria-pressed={active}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium
              transition-all duration-150 select-none
              ${active
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-xs)] border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }
            `}
          >
            <Icon size={12} strokeWidth={2} />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
