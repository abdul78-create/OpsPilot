'use client';

import React, { useState, useEffect } from 'react';
import { NextSidebar } from './NextSidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { ShortcutCheatSheet } from '../ui/ShortcutCheatSheet';
import { NotificationCenter, NotificationItem } from '../ui/NotificationCenter';
import { FloatingAiAssistant } from '../ui/FloatingAiAssistant';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface DeveloperShellProps {
  children: React.ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  '': 'Overview',
  pipelines: 'Pipelines',
  runs: 'Runs',
  deployments: 'Deployments',
  artifacts: 'Artifacts',
  workspace: 'AI Workspace',
  observability: 'Observability',
  secrets: 'Secrets',
  settings: 'Settings',
  builder: 'Builder',
  ai: 'AI',
};

const SEEDED_NOTIFICATIONS: NotificationItem[] = [];


export function DeveloperShell({ children }: DeveloperShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [_user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [workspaceName, setWorkspaceName] = useState('Production Workspace');

  const [notifications, setNotifications] = useState<NotificationItem[]>(SEEDED_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Authentication check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('opspilot_token');
      const userData = localStorage.getItem('opspilot_user');

      if (!token) {
        router.push('/login');
      } else {
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            if (parsedUser.company) {
              setWorkspaceName(parsedUser.company);
            } else if (parsedUser.name) {
              setWorkspaceName(`${parsedUser.name}'s Org`);
            }
          } catch {
            // Ignore
          }
        }
        setLoading(false);
      }
    }
  }, [router]);

  // Determine current page title
  const rawPath = pathname.replace(/^\//, '');
  const pageLabel = ROUTE_LABELS[rawPath] ?? 'Dashboard';

  // Global Keyboard Shortcuts
  useEffect(() => {
    let lastKey = '';
    let timer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'g') {
        lastKey = 'g';
        clearTimeout(timer);
        timer = setTimeout(() => {
          lastKey = '';
        }, 1000);
        return;
      }

      if (lastKey === 'g') {
        if (key === 'd') {
          e.preventDefault();
          router.push('/dashboard');
        } else if (key === 'p') {
          e.preventDefault();
          router.push('/pipelines');
        } else if (key === 'r') {
          e.preventDefault();
          router.push('/runs');
        }
        lastKey = '';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [router]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#09090B] text-zinc-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center animate-pulse shadow-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-zinc-500 tracking-wider uppercase animate-pulse">
            Loading OpsPilot...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#09090B] text-zinc-100 font-sans antialiased">
      {/* Global CmdK Command Palette Overlay */}
      <CommandPalette />

      {/* Global Shortcut Cheat Sheet Overlay */}
      <ShortcutCheatSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Developer Sidebar */}
      <NextSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header */}
        <header className="h-14 border-b border-[#1C1C1F] bg-[#09090B]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 font-medium">{workspaceName}</span>
            <ChevronRight size={14} className="text-zinc-600" />
            <span className="text-white font-semibold">{pageLabel}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Command Search Bar */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(event);
              }}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#111113] border border-[#27272A] hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-all w-64 justify-between"
            >
              <div className="flex items-center gap-2">
                <Search size={14} className="text-zinc-500" />
                <span>Search pipelines, runs, resources...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#18181B] text-[10px] text-zinc-400 border border-[#27272A]">
                ⌘K
              </kbd>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg bg-[#111113] border border-[#27272A] hover:border-zinc-700 text-zinc-400 hover:text-white transition-all relative"
                aria-label="Open notifications"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500 ring-4 ring-[#09090B]" />
                )}
              </button>

              <NotificationCenter
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
              />
            </div>

            {/* Keyboard Shortcuts Trigger */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#111113] border border-[#27272A] hover:border-zinc-700 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-all"
            >
              Shortcuts
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* Floating AI Assistant Drawer */}
        <FloatingAiAssistant />
      </div>
    </div>
  );
}

export { DeveloperShell as DeveloperShellWrapper };

