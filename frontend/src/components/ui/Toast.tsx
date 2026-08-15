'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const ms = t.duration ?? 4000;
    const timer = setTimeout(onDismiss, ms);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  const icons: Record<ToastKind, React.ReactNode> = {
    success: <CheckCircle2 size={16} className="text-[var(--success)] shrink-0" />,
    error:   <XCircle size={16} className="text-[var(--error)] shrink-0" />,
    warning: <AlertTriangle size={16} className="text-[var(--warning)] shrink-0" />,
    info:    <Info size={16} className="text-[var(--info)] shrink-0" />,
  };

  const borders: Record<ToastKind, string> = {
    success: 'var(--success)',
    error:   'var(--error)',
    warning: 'var(--warning)',
    info:    'var(--info)',
  };

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3 border min-w-[280px] max-w-sm transition-all duration-200"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: borders[t.kind],
        boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.2))',
      }}
    >
      {icons[t.kind]}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
        {t.message && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.message}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="p-0.5 transition-colors shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = String(++idRef.current);
    setToasts(prev => [...prev, { ...t, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast Portal */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
