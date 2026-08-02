'use client';

import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  onToggleCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  onToggleInspector?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({
  onToggleCommandPalette,
  onToggleSidebar,
  onToggleInspector,
  onEscape,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleCommandPalette?.();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleSidebar?.();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        onToggleInspector?.();
      } else if (e.key === 'Escape') {
        onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCommandPalette, onToggleSidebar, onToggleInspector, onEscape]);
}
