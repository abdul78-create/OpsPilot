'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Rocket,
  PlayCircle,
  Package,
  Activity,
  KeyRound,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  GitBranch,
  FolderGit2,
  ChevronLeft,
  ChevronDown,
  User,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const NAV_SECTIONS = [
  {
    label: 'Platform',
    links: [
      { to: '/dashboard',     icon: LayoutDashboard, label: 'Overview',      exact: true },
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
    label: 'Config',
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

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('Workspace');
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('opspilot_user');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed.name)    setUserName(parsed.name);
          if (parsed.email)   setUserEmail(parsed.email);
          if (parsed.company) setActiveWorkspace(parsed.company);
          else if (parsed.name) setActiveWorkspace(`${parsed.name}'s Org`);
        } catch { /* ignore */ }
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('opspilot_token');
      localStorage.removeItem('opspilot_user');
    }
    toast({ kind: 'info', title: 'Logged out successfully' });
    router.push('/login');
  };

  const handleSwitchWorkspace = (name: string) => {
    setActiveWorkspace(name);
    setWorkspaceMenuOpen(false);
    toast({ kind: 'success', title: 'Workspace Switched', message: `Switched context to ${name}.` });
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to;
    return pathname.startsWith(to) && to !== '/';
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-[52px]' : 'w-[52px] md:w-[216px]'
      } bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col h-screen sticky top-0 select-none transition-[width] duration-200 ease-in-out z-40 shrink-0`}
    >
      {/* ── Brand Header ── */}
      <div className="h-12 px-3 border-b border-[var(--border)] flex items-center justify-between gap-2 shrink-0">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0 group">
            {/* Monochrome logo mark */}
            <div className="w-6 h-6 rounded-md bg-[var(--text-primary)] flex items-center justify-center shrink-0 transition-opacity group-hover:opacity-80">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="var(--accent-fg)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight truncate">
              OpsPilot
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-6 h-6 rounded-md bg-[var(--text-primary)] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="var(--accent-fg)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Link>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        )}
      </div>

      {/* ── Workspace Switcher ── */}
      {!collapsed && (
        <div className="px-2 pt-2.5 pb-1 shrink-0 relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all duration-150 group text-xs ${
              workspaceMenuOpen
                ? 'bg-[var(--bg-tertiary)] border-[var(--border-bright)]'
                : 'bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-[var(--border-bright)]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-bold text-[10px] flex items-center justify-center shrink-0">
                {activeWorkspace.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-[var(--text-primary)] truncate">{activeWorkspace}</span>
            </div>
            <ChevronDown
              size={11}
              className={`text-[var(--text-muted)] shrink-0 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-2 right-2 mt-1 z-50 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] py-1 overflow-hidden animate-slide-up">
              <p className="px-2.5 py-1 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                Switch Workspace
              </p>
              <button
                onClick={() => handleSwitchWorkspace(activeWorkspace)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <span className="truncate">{activeWorkspace}</span>
                <span className="text-[9px] font-mono bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] px-1.5 rounded ml-2 shrink-0">
                  Active
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const IconComponent = link.icon;
                const active = isActive(link.to, link.exact);
                return (
                  <Link
                    key={link.to}
                    href={link.to}
                    title={collapsed ? link.label : undefined}
                    className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100 ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'nav-active'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <IconComponent
                      size={14}
                      className={active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}
                    />
                    {!collapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="p-2 border-t border-[var(--border)] shrink-0 relative">
        <div
          onClick={() => !collapsed && setProfileMenuOpen(!profileMenuOpen)}
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${
            profileMenuOpen ? 'bg-[var(--bg-tertiary)]' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* User avatar — monochrome */}
            <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] text-[10px] font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{userName}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">Admin</p>
              </div>
            )}
          </div>
          {collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              title="Log out"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-dim)] rounded transition-colors"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>

        {/* Profile Popover */}
        {!collapsed && profileMenuOpen && (
          <div className="absolute bottom-12 left-2 right-2 z-50 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] py-1 overflow-hidden animate-slide-up">
            <div className="px-2.5 py-2 border-b border-[var(--border)] mb-1">
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">{userName}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{userEmail}</p>
            </div>

            <button
              onClick={() => { setProfileMenuOpen(false); router.push('/settings'); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <User size={13} className="text-[var(--text-muted)]" />
              <span>My Profile</span>
            </button>

            <a
              href="https://docs.opspilot.io"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <HelpCircle size={13} className="text-[var(--text-muted)]" />
              <span>Documentation</span>
            </a>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-[var(--error)] hover:bg-[var(--error-dim)] transition-colors border-t border-[var(--border)] mt-1"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
