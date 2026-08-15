'use client';

import React from 'react';
import { X, CheckCircle2, XCircle, FolderGit2, KeyRound, Bell, Check } from 'lucide-react';

export interface NotificationItem {
  id: string;
  kind: 'success' | 'failed' | 'connected' | 'secrets';
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export function NotificationCenter({
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: NotificationCenterProps) {
  if (!open) return null;

  const icons = {
    success: <CheckCircle2 size={15} className="shrink-0" style={{ color: 'var(--success)' }} />,
    failed: <XCircle size={15} className="shrink-0" style={{ color: 'var(--error)' }} />,
    connected: <FolderGit2 size={15} className="shrink-0" style={{ color: 'var(--info)' }} />,
    secrets: <KeyRound size={15} className="shrink-0" style={{ color: 'var(--warning)' }} />,
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div
      className="absolute right-0 top-12 z-50 w-80 border rounded-xl shadow-2xl overflow-hidden animate-slide-up"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              title="Mark all as read"
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <Check size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body List */}
      <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell size={24} className="mb-2 opacity-40" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>All caught up!</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => onMarkAsRead(item.id)}
              className="p-3 flex items-start gap-3 transition-colors cursor-pointer hover:opacity-80"
              style={{
                borderColor: 'var(--border)',
                background: item.unread ? 'var(--bg-tertiary)' : 'transparent',
              }}
            >
              {icons[item.kind]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </p>
                  <span className="text-[9px] shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>{item.time}</span>
                </div>
                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.message}
                </p>
              </div>
              {item.unread && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0 self-center" style={{ background: 'var(--accent)' }} />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          className="px-3 py-2 border-t flex items-center justify-between text-[10px]"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={onClearAll}
            className="font-medium transition-colors cursor-pointer"
            style={{ color: 'var(--error)' }}
          >
            Clear all
          </button>
          <span style={{ color: 'var(--text-muted)' }}>OpsPilot Engine</span>
        </div>
      )}
    </div>
  );
}
