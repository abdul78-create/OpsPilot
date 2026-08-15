'use client';

import React, { useState, useEffect } from 'react';
import { NextSidebar } from './NextSidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { ShortcutCheatSheet } from '../ui/ShortcutCheatSheet';
import { NotificationCenter, NotificationItem } from '../ui/NotificationCenter';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface DeveloperShellProps {
  children: React.ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  '': 'Overview',
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
      let token = localStorage.getItem('opspilot_token');
      let userData = localStorage.getItem('opspilot_user');

      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          token = 'dev-local-session-token';
          const devUser = { id: 'dev-1', email: 'engineer@opspilot.com', name: 'Dev Engineer', role: 'ADMIN' };
          localStorage.setItem('opspilot_token', token);
          localStorage.setItem('opspilot_user', JSON.stringify(devUser));
          setUser(devUser);
          setWorkspaceName('Production Workspace');
        } else {
          router.push('/login');
          return;
        }
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
      }
      setLoading(false);
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

  // ── Loading state — neutral, no violet
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)] flex items-center justify-center animate-pulse-subtle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="var(--accent-fg)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-wider uppercase">
            Loading…
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
        <header className="h-12 border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-30 shrink-0">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--text-muted)] font-medium">{workspaceName}</span>
            <ChevronRight size={13} className="text-[var(--border-bright)]" />
            <span className="text-[var(--text-primary)] font-semibold">{pageLabel}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search / Command Bar */}
            <button
              onClick={() => {
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                );
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors w-56 justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Search size={13} />
                <span>Search…</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">
                ⌘K
              </kbd>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle compact />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors relative"
                aria-label="Open notifications"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--error)]" />
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

            {/* Shortcuts Trigger */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="px-2 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors hidden sm:block"
            >
              Shortcuts
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

export { DeveloperShell as DeveloperShellWrapper };
