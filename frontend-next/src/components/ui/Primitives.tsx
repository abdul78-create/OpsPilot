'use client';

import React from 'react';

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

export function SkeletonLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} skeleton`} />;
}

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 px-4 border-b border-[#1C1C1F] flex items-center gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} w={j === 0 ? 'w-6' : j === cols - 1 ? 'w-16' : 'flex-1'} h="h-3" />
          ))}
        </div>
      ))}
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
      <div className="p-4 rounded-2xl bg-slate-800/40 text-slate-600">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-400">{title}</p>
        {description && <p className="text-xs text-slate-600 max-w-xs">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-sm font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors text-white ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

type StatusKind = 'success' | 'failed' | 'running' | 'queued' | 'cancelled' | 'healthy' | 'degraded' | 'down';

const STATUS_STYLES: Record<StatusKind, string> = {
  success:   'text-emerald-300 bg-emerald-950/40 border-emerald-800/50',
  failed:    'text-rose-300    bg-rose-950/40    border-rose-800/50',
  running:   'text-blue-300    bg-blue-950/40    border-blue-800/50',
  queued:    'text-amber-300   bg-amber-950/40   border-amber-800/50',
  cancelled: 'text-slate-400   bg-slate-900      border-slate-700',
  healthy:   'text-emerald-300 bg-emerald-950/40 border-emerald-800/50',
  degraded:  'text-amber-300   bg-amber-950/40   border-amber-800/50',
  down:      'text-rose-300    bg-rose-950/40    border-rose-800/50',
};

const STATUS_LABELS: Record<StatusKind, string> = {
  success:   '✓ Success',
  failed:    '✕ Failed',
  running:   '◌ Running',
  queued:    '○ Queued',
  cancelled: '— Cancelled',
  healthy:   '● Healthy',
  degraded:  '⚠ Degraded',
  down:      '✕ Down',
};

export function StatusPill({ status }: { status: string }) {
  const k = status.toLowerCase() as StatusKind;
  const styles = STATUS_STYLES[k] ?? 'text-slate-400 bg-slate-900 border-slate-700';
  const label  = STATUS_LABELS[k] ?? status;
  return (
    <span className={`inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${styles}`}>
      {label}
    </span>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="text-[10px] font-mono text-slate-500 hover:text-slate-200 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded transition-colors"
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, total, limit, onPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-2 py-1 rounded border border-slate-800 disabled:opacity-30 hover:border-slate-700 hover:text-slate-200 transition-colors"
        >← Prev</button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-2 py-1 rounded border border-slate-800 disabled:opacity-30 hover:border-slate-700 hover:text-slate-200 transition-colors"
        >Next →</button>
      </div>
    </div>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────

import { Search } from 'lucide-react';

export function SearchInput({
  value, onChange, placeholder = 'Search...',
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-700 transition-colors"
      />
    </div>
  );
}
