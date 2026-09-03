'use client';

import React from 'react';
import {
  User, Building2, Users, Layers, Shield,
  Bell, Sparkles, CreditCard, Sliders, ChevronDown
} from 'lucide-react';

export type SettingsTab =
  | 'account'
  | 'organization'
  | 'team'
  | 'integrations'
  | 'security'
  | 'notifications'
  | 'ai'
  | 'billing'
  | 'preferences';

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'ACCOUNT',
    items: [{ id: 'account', label: 'Account', icon: User }],
  },
  {
    group: 'WORKSPACE',
    items: [
      { id: 'organization', label: 'Organization', icon: Building2 },
      { id: 'team', label: 'Team & Access', icon: Users },
    ],
  },
  {
    group: 'INTEGRATIONS',
    items: [{ id: 'integrations', label: 'Integrations', icon: Layers }],
  },
  {
    group: 'SECURITY & GOVERNANCE',
    items: [{ id: 'security', label: 'Security', icon: Shield }],
  },
  {
    group: 'COMMUNICATIONS',
    items: [{ id: 'notifications', label: 'Notifications', icon: Bell }],
  },
  {
    group: 'INTELLIGENCE',
    items: [{ id: 'ai', label: 'AI Intelligence', icon: Sparkles }],
  },
  {
    group: 'COMMERCIAL',
    items: [{ id: 'billing', label: 'Billing & Plan', icon: CreditCard }],
  },
  {
    group: 'PREFERENCES',
    items: [{ id: 'preferences', label: 'Preferences', icon: Sliders }],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <>
      {/* Mobile Selector Dropdown */}
      <div className="md:hidden relative mb-4">
        <select
          value={activeTab}
          onChange={(e) => onSelectTab(e.target.value as SettingsTab)}
          className="w-full appearance-none px-4 py-2.5 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ALL_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Desktop Left Navigation */}
      <nav className="hidden md:block w-56 shrink-0 space-y-5 select-none" aria-label="Settings Navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {group.group}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border-l-2 border-indigo-500'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-500' : 'text-[var(--text-muted)]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
};
