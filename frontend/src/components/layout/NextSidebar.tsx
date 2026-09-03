'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  FolderGit2,
  GitBranch,
  PlayCircle,
  Rocket,
  Package,
  Sparkles,
  Activity,
  KeyRound,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LogOut,
  User,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    links: [
      { to: '/dashboard',     icon: LayoutDashboard, label: 'Overview',      exact: true },
      { to: '/projects',      icon: FolderKanban,    label: 'Projects' },
      { to: '/repositories',  icon: FolderGit2,      label: 'Repositories' },
      { to: '/pipelines',     icon: GitBranch,       label: 'Pipelines' },
      { to: '/runs',          icon: PlayCircle,      label: 'Runs' },
      { to: '/deployments',   icon: Rocket,          label: 'Deployments' },
      { to: '/artifacts',     icon: Package,         label: 'Artifacts' },
    ],
  },
  {
    label: 'Intelligence',
    links: [
      { to: '/workspace',     icon: Sparkles,        label: 'AI Workspace' },
      { to: '/observability', icon: Activity,        label: 'Observability' },
    ],
  },
  {
    label: 'Configuration',
    links: [
      { to: '/secrets',       icon: KeyRound,        label: 'Secrets' },
      { to: '/settings',      icon: Settings,        label: 'Settings' },
    ],
  },
];

interface NextSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function NextSidebar({ collapsed = false, onToggle }: NextSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, organization } = useApp();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const activeWorkspace = organization?.name || (user?.name ? `${user.name}'s Org` : 'Workspace');
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('opspilot_token');
      localStorage.removeItem('opspilot_user');
    }
    toast({ kind: 'info', title: 'Logged out successfully' });
    router.push('/login');
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to || pathname === `${to}/`;
    return (pathname.startsWith(to) || pathname.startsWith(`${to}/`)) && to !== '/';
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-14' : 'w-14 md:w-60'
      } bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col h-screen sticky top-0 select-none transition-[width] duration-150 ease-in-out z-40 shrink-0`}
    >
      {/* ── Brand Header ── */}
      <div className="h-14 px-4 border-b border-[var(--border)] flex items-center justify-between gap-2 shrink-0">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group text-decoration-none">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
              OP
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[var(--text-primary)] tracking-tight leading-none truncate">
                OpsPilot
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider mt-0.5">
                CONTROL PLANE
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center font-bold text-xs">
              OP
            </div>
          </Link>
        )}

        {onToggle && !collapsed && (
          <button
            onClick={onToggle}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* ── Workspace Context Button ── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0 relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--bg-tertiary)] transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-bold text-[10px] flex items-center justify-center shrink-0">
                {activeWorkspace.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-[var(--text-primary)] text-xs truncate">{activeWorkspace}</span>
            </div>
            <ChevronDown
              size={12}
              className={`text-[var(--text-muted)] shrink-0 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-3 right-3 mt-1 z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-lg p-1.5 overflow-hidden animate-slide-up">
              <p className="px-2 py-1 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Current Workspace
              </p>
              <div className="px-2 py-1.5 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                <span className="truncate">{activeWorkspace}</span>
                <span className="text-[9px] font-mono text-[var(--success)] font-bold">Active</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation Items ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to, link.exact);
                return (
                  <Link
                    key={link.to}
                    href={link.to}
                    title={collapsed ? link.label : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      collapsed ? 'justify-center px-0' : ''
                    } ${
                      active
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <Icon
                      size={15}
                      className={`shrink-0 ${active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                    />
                    {!collapsed && <span className="truncate">{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="p-2.5 border-t border-[var(--border)] shrink-0 relative">
        <div
          onClick={() => !collapsed && setProfileMenuOpen(!profileMenuOpen)}
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold text-[10px] flex items-center justify-center shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate leading-none">
                  {userName}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                  {userEmail || 'Engineer'}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <ChevronDown size={11} className="text-[var(--text-muted)] shrink-0" />
          )}
        </div>

        {profileMenuOpen && !collapsed && (
          <div className="absolute bottom-14 left-2.5 right-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-lg p-1 z-50 animate-slide-up">
            <Link
              href="/settings"
              onClick={() => setProfileMenuOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <User size={13} />
              <span>Account Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-[var(--error)] hover:bg-[var(--error-dim)] transition-colors text-left"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
