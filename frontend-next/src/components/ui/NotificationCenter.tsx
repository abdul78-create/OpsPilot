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
    success: <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />,
    failed: <XCircle size={15} className="text-red-400 shrink-0" />,
    connected: <FolderGit2 size={15} className="text-blue-400 shrink-0" />,
    secrets: <KeyRound size={15} className="text-amber-400 shrink-0" />,
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="absolute right-0 top-12 z-50 w-80 bg-[#111113] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1C1C1F] bg-[#18181B]/40">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-violet-400" />
          <span className="text-xs font-semibold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-600 text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              title="Mark all as read"
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <Check size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-[#1C1C1F]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-zinc-600 mb-2">🔔</span>
            <p className="text-xs text-zinc-500 font-medium">All caught up!</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => onMarkAsRead(item.id)}
              className={`p-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-zinc-800/30 ${
                item.unread ? 'bg-violet-600/[0.02]' : ''
              }`}
            >
              {icons[item.kind]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[11px] font-bold truncate ${item.unread ? 'text-white' : 'text-zinc-300'}`}>
                    {item.title}
                  </p>
                  <span className="text-[9px] text-zinc-500 shrink-0 font-medium">{item.time}</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                  {item.message}
                </p>
              </div>
              {item.unread && (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 self-center" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="bg-[#18181B]/40 px-3 py-2 border-t border-[#1C1C1F] flex items-center justify-between text-[10px]">
          <button
            onClick={onClearAll}
            className="text-zinc-500 hover:text-red-400 font-medium transition-colors"
          >
            Clear all
          </button>
          <span className="text-zinc-600">OpsPilot Engine</span>
        </div>
      )}
    </div>
  );
}
