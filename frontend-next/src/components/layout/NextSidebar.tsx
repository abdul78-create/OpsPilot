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
  ChevronLeft,
  ChevronDown,
  User,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const NAV_SECTIONS = [
  {
    label: 'Platform',
    links: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', exact: true },
      { to: '/pipelines', icon: GitBranch, label: 'Pipelines' },
      { to: '/runs', icon: PlayCircle, label: 'Runs' },
      { to: '/deployments', icon: Rocket, label: 'Deployments' },
      { to: '/artifacts', icon: Package, label: 'Artifacts' },
    ],
  },
  {
    label: 'Intelligence',
    links: [
      { to: '/workspace', icon: Sparkles, label: 'AI Workspace' },
      { to: '/observability', icon: Activity, label: 'Observability' },
    ],
  },
  {
    label: 'Config',
    links: [
      { to: '/secrets', icon: KeyRound, label: 'Secrets' },
      { to: '/settings', icon: Settings, label: 'Settings' },
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
  const [activeWorkspace, setActiveWorkspace] = useState('Acme Corp');
  const [userName, setUserName] = useState('Alice Chen');
  const [userEmail, setUserEmail] = useState('admin@opspilot.ai');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('opspilot_user');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.company) {
            setActiveWorkspace(parsed.company);
          } else if (parsed.name) {
            setActiveWorkspace(`${parsed.name}'s Org`);
          }
        } catch {
          // Ignore
        }
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
    toast({
      kind: 'success',
      title: 'Workspace Switched',
      message: `Switched context to ${name}.`,
    });
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to;
    return pathname.startsWith(to) && to !== '/';
  };

  return (
    <aside
      className={`${collapsed ? 'w-[60px]' : 'w-[220px]'} bg-[#111113] border-r border-[#27272A] flex flex-col h-screen sticky top-0 select-none transition-all duration-200 ease-in-out z-40`}
    >
      {/* Brand Header */}
      <div className="h-14 px-3 border-b border-[#1C1C1F] flex items-center justify-between gap-2 shrink-0">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-violet-500/20 transition-shadow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">OpsPilot</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Org Picker (Workspace Switcher) */}
      {!collapsed && (
        <div className="px-2 pt-3 pb-1 shrink-0 relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#18181B] border transition-all duration-150 group ${
              workspaceMenuOpen ? 'border-violet-500/50 shadow shadow-violet-500/10' : 'border-[#27272A] hover:border-[#3F3F46]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-600/30 to-blue-600/30 text-violet-300 font-bold text-[10px] flex items-center justify-center border border-violet-500/20 shrink-0">
                {activeWorkspace.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-zinc-200 truncate">{activeWorkspace}</span>
            </div>
            <ChevronDown size={12} className={`text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Workspace Dropdown Panel */}
          {workspaceMenuOpen && (
            <div className="absolute left-2 right-2 mt-1.5 z-50 bg-[#111113] border border-[#27272A] rounded-lg shadow-xl py-1.5 overflow-hidden animate-slide-up">
              <p className="px-2.5 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">Switch Workspace</p>
              <button
                onClick={() => handleSwitchWorkspace('Acme Corp')}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-left text-xs hover:bg-[#18181B] transition-colors ${activeWorkspace === 'Acme Corp' ? 'text-violet-400 font-medium' : 'text-zinc-300'}`}
              >
                <span>Acme Corp</span>
                <span className="text-[9px] font-mono bg-[#18181B] border border-[#27272A] text-zinc-500 px-1 rounded">Pro</span>
              </button>
              <button
                onClick={() => handleSwitchWorkspace('Personal Dev')}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-left text-xs hover:bg-[#18181B] transition-colors ${activeWorkspace === 'Personal Dev' ? 'text-violet-400 font-medium' : 'text-zinc-300'}`}
              >
                <span>Personal Dev</span>
                <span className="text-[9px] font-mono bg-[#18181B] border border-[#27272A] text-zinc-500 px-1 rounded">Starter</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">
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
                    className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'nav-active bg-violet-600/10 text-violet-300 border border-violet-500/20'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    <IconComponent size={15} className={active ? 'text-violet-400' : ''} />
                    {!collapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer (Profile Panel Dropdown) */}
      <div className="p-2 border-t border-[#1C1C1F] shrink-0 relative">
        <div
          onClick={() => !collapsed && setProfileMenuOpen(!profileMenuOpen)}
          className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer ${profileMenuOpen ? 'bg-zinc-800/50' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{userName}</p>
                <p className="text-[10px] text-zinc-500 truncate">Admin</p>
              </div>
            )}
          </div>
          {collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              title="Log out"
              className="p-1 text-zinc-650 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>

        {/* Profile Popover Panel */}
        {!collapsed && profileMenuOpen && (
          <div className="absolute bottom-12 left-2 right-2 z-50 bg-[#111113] border border-[#27272A] rounded-lg shadow-xl py-1.5 overflow-hidden animate-slide-up">
            <div className="px-2.5 py-1.5 border-b border-[#1C1C1F] mb-1">
              <p className="text-xs font-semibold text-zinc-200">{userName}</p>
              <p className="text-[10px] text-zinc-500 font-mono truncate">{userEmail}</p>
            </div>
            
            <button
              onClick={() => { setProfileMenuOpen(false); router.push('/settings'); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-[#18181B] transition-colors"
            >
              <User size={13} className="text-zinc-500" />
              <span>My Profile</span>
            </button>

            <a
              href="https://docs.opspilot.io"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-[#18181B] transition-colors"
            >
              <HelpCircle size={13} className="text-zinc-500" />
              <span>Documentation</span>
            </a>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#1C1C1F] mt-1 pt-1.5"
            >
              <LogOut size={13} className="text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
