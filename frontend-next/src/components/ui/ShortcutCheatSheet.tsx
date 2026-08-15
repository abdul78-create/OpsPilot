'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutCheatSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutCheatSheet({ open, onClose }: ShortcutCheatSheetProps) {
  if (!open) return null;

  const SHORTCUTS = [
    { keys: ['⌘ K', 'Ctrl + K'], description: 'Open Command Palette' },
    { keys: ['G', 'D'], description: 'Go to Overview / Dashboard' },
    { keys: ['G', 'P'], description: 'Go to Pipelines' },
    { keys: ['G', 'R'], description: 'Go to Runs' },
    { keys: ['?'], description: 'Show Keyboard Shortcuts Help' },
    { keys: ['ESC'], description: 'Dismiss active modal / Command Palette' },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 backdrop-blur-md"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md border rounded-xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Keyboard size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {SHORTCUTS.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.description}</span>
                <div className="flex items-center gap-1">
                  {item.keys.map((k, idx) => (
                    <React.Fragment key={idx}>
                      <kbd
                        className="text-[10px] font-mono px-2 py-0.5 rounded border"
                        style={{
                          background: 'var(--bg-primary)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {k}
                      </kbd>
                      {idx < item.keys.length - 1 && item.keys[0] !== '⌘ K' && (
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>then</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t text-center"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            Type any combination above to navigate rapidly.
          </p>
        </div>
      </div>
    </div>
  );
}
