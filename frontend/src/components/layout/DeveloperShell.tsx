'use client';

import React, { useState, useEffect } from 'react';
import { NextSidebar } from './NextSidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { ShortcutCheatSheet } from '../ui/ShortcutCheatSheet';
import { NotificationCenter, NotificationItem } from '../ui/NotificationCenter';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

interface DeveloperShellProps {
  children: React.ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  '': 'Overview',
  projects: 'Projects',
  repositories: 'Repositories',
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
  billing: 'Billing',
  docs: 'Docs',
};

const SEEDED_NOTIFICATIONS: NotificationItem[] = [];

export function DeveloperShell({ children }: DeveloperShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const workspaceName = organization?.name || (user?.name ? `${user.name}'s Org` : 'Workspace');

  const [notifications, setNotifications] = useState<NotificationItem[]>(SEEDED_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Authentication check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('opspilot_token');
      if (!token) {
        router.push('/login');
        return;
      }
      setLoading(false);
    }
  }, [router]);

  // Determine current page title
  const rawPath = pathname.replace(/^\//, '').replace(/\/$/, '');
  const pageLabel = ROUTE_LABELS[rawPath] ?? 'Dashboard';

  // Global Keyboard Shortcuts
  useEffect(() => {
    let lastKey = '';
    let timer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'g') {
        lastKey = 'g';
        clearTimeout(timer);
        timer = setTimeout(() => { lastKey = ''; }, 1000);
        return;
      }

      if (lastKey === 'g') {
        if (key === 'd') { e.preventDefault(); router.push('/dashboard'); }
        else if (key === 'p') { e.preventDefault(); router.push('/pipelines'); }
        else if (key === 'r') { e.preventDefault(); router.push('/runs'); }
        lastKey = '';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); clearTimeout(timer); };
  }, [router]);

  const markAsRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const clearAll = () => setNotifications([]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center font-bold text-xs animate-pulse">
            OP
          </div>
          <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-wider uppercase">
            Loading Workspace…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased">
      {/* Global CmdK Command Palette */}
      <CommandPalette />

      {/* Shortcut Cheat Sheet */}
      <ShortcutCheatSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Sidebar */}
      <NextSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* ── Topbar ── */}
        <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
          {/* Left: Clean Breadcrumb */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">{workspaceName}</span>
            <span className="text-[var(--text-muted)] opacity-40">/</span>
            <span className="text-[var(--text-primary)] font-semibold">{pageLabel}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Search / Command Bar */}
            <button
              onClick={() => {
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                );
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors w-44 justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Search size={13} />
                <span>Search…</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle compact />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors relative"
                aria-label="Open notifications"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
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
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-10 max-w-6xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DeveloperShellWrapper({ children }: { children: React.ReactNode }) {
  return <DeveloperShell>{children}</DeveloperShell>;
}
