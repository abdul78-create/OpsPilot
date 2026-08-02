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
      className="fixed inset-0 z-[100] bg-[#09090B]/85 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-[#111113] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1C1F]">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="divide-y divide-[#1C1C1F]">
            {SHORTCUTS.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-xs text-zinc-400 font-medium">{item.description}</span>
                <div className="flex items-center gap-1">
                  {item.keys.map((k, idx) => (
                    <React.Fragment key={idx}>
                      <kbd className="text-[10px] font-mono bg-[#18181B] text-zinc-300 px-2 py-0.5 rounded border border-[#27272A] shadow">
                        {k}
                      </kbd>
                      {idx < item.keys.length - 1 && item.keys[0] !== '⌘ K' && (
                        <span className="text-[10px] text-zinc-600 font-semibold">then</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#18181B] px-5 py-3 border-t border-[#1C1C1F] text-center">
          <p className="text-[10px] text-zinc-500 font-medium">Type any combination above to navigate rapidly.</p>
        </div>
      </div>
    </div>
  );
}
