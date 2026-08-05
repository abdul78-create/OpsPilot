'use client';

import React, { useState, useEffect } from 'react';
import { NextSidebar } from './NextSidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { ShortcutCheatSheet } from '../ui/ShortcutCheatSheet';
import { NotificationCenter, NotificationItem } from '../ui/NotificationCenter';
import { FloatingAiAssistant } from '../ui/FloatingAiAssistant';
import { Search, Bell, ChevronRight, Sparkles, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { isDemoMode, disableDemoMode } from '@/lib/demo/demoData';
import { DEMO_NOTIFICATIONS } from '@/lib/demo/demoNotifications';

interface DeveloperShellProps {
  children: React.ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  '':            'Overview',
  pipelines:     'Pipelines',
  runs:          'Runs',
  deployments:   'Deployments',
  artifacts:     'Artifacts',
  workspace:     'AI Workspace',
  observability: 'Observability',
  secrets:       'Secrets',
  settings:      'Settings',
  builder:       'Builder',
  ai:            'AI',
};

const SEEDED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n_1',
    kind: 'success',
    title: 'Deployment Successful',
    message: 'StockFlow build runner deployed container to production successfully.',
    time: '2m ago',
    unread: true,
  },
  {
    id: 'n_2',
    kind: 'failed',
    title: 'Pipeline Failed',
    message: 'acme-corp/backend-api run_104 failed during Jest testing stage.',
    time: '20m ago',
    unread: true,
  },
];

export function DeveloperShell({ children }: DeveloperShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [_user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [workspaceName, setWorkspaceName] = useState('Acme Corp');

  const [notifications, setNotifications] = useState<NotificationItem[]>(SEEDED_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [demoState, setDemoState] = useState(false);

  // Authentication check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDemo = isDemoMode();
      setDemoState(isDemo);
      const token = localStorage.getItem('opspilot_token');
      const userData = localStorage.getItem('opspilot_user');

      if (isDemo) {
        setNotifications(DEMO_NOTIFICATIONS);
        setWorkspaceName('Acme Corp');
        setLoading(false);
        return;
      }

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
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
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
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-zinc-500 tracking-wider uppercase animate-pulse">Loading OpsPilot...</p>
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
        {/* Global Demo Banner */}
        {demoState && (
          <div className="bg-gradient-to-r from-violet-900/90 via-purple-900/80 to-blue-900/90 border-b border-violet-500/30 px-4 py-2 text-xs flex items-center justify-between text-white shrink-0 z-40">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles size={14} className="text-violet-300 animate-pulse" />
              <span><strong>Interactive Demo Mode Active</strong> — Viewing simulated data for Acme Corp (47 Developers, 128 Repositories)</span>
            </div>
            <button
              onClick={() => {
                disableDemoMode();
                window.location.href = '/login';
              }}
              className="flex items-center gap-1 bg-violet-600/40 hover:bg-violet-600/60 border border-violet-400/30 text-violet-100 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors"
            >
              Exit Demo <X size={12} />
            </button>
          </div>
        )}

        {/* Top Header */}
        <header className="h-14 px-5 border-b border-[#1C1C1F] bg-[#09090B]/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30 select-none">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">{workspaceName}</span>
            <ChevronRight size={12} className="text-zinc-700" />
            <span className="text-zinc-200 font-semibold">{pageLabel}</span>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2.5 relative">
            {/* Search (opens command palette on click) */}
            <button
              onClick={() => {
                const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true });
                document.dispatchEvent(e);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111113] border border-[#27272A] text-zinc-500 hover:text-zinc-300 hover:border-[#3F3F46] transition-all text-xs"
            >
              <Search size={13} />
              <span>Search...</span>
              <kbd className="ml-3 font-mono text-[10px] bg-[#18181B] text-zinc-500 px-1.5 py-0.5 rounded border border-[#27272A]">⌘K</kbd>
            </button>

            {/* System Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
              <span className="hidden sm:block">All systems go</span>
            </div>

            {/* Notifications Trigger */}
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className={`relative p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ${
                notifOpen ? 'bg-zinc-850 text-zinc-200' : ''
              }`}
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse-glow" />
              )}
            </button>

            {/* Notifications Drawer Component */}
            <NotificationCenter
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Floating AI Copilot Assistant */}
        <FloatingAiAssistant />
      </div>
    </div>
  );
}

/* ─── Wrapper used by individual pages ─── */
interface DeveloperShellWrapperProps {
  children: React.ReactNode;
}
export function DeveloperShellWrapper({ children }: DeveloperShellWrapperProps) {
  return <DeveloperShell>{children}</DeveloperShell>;
}
