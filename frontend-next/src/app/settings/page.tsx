'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Settings, Users, Shield, Key, Bell, ExternalLink, Plus,
  CheckCircle2, XCircle, Trash2, Mail, Building,
  RefreshCw, Loader2, Sparkles, Copy, Sliders, AlertCircle,
} from 'lucide-react';

function GithubIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

import { getCurrentOrganization, Organization } from '@/lib/apiClient';
import { StatusPill, CopyButton, EmptyState, ConfirmDialog } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  avatarUrl?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
}

const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: 'Alice Chen', email: 'admin@opspilot.ai', role: 'OWNER', joinedAt: '2026-08-01' },
  { id: 'm2', name: 'DevOps Bot', email: 'bot@opspilot.internal', role: 'ADMIN', joinedAt: '2026-08-01' },
];

const INITIAL_INVITES: Invitation[] = [
  { id: 'inv_1', email: 'sarah.engineering@company.io', role: 'MEMBER', invitedAt: '2026-08-02', status: 'PENDING' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'github' | 'notifications'>('general');
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [invites, setInvites] = useState<Invitation[]>(INITIAL_INVITES);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Notifications state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T000/B000/XXXX');

  const { toast } = useToast();

  const loadOrg = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCurrentOrganization();
      setOrg(res.data);
    } catch {
      setOrg({
        id: '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
        name: 'Production Workspace',
        slug: 'production-workspace',

        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrg(); }, [loadOrg]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setTimeout(() => {
      const newInv: Invitation = {
        id: `inv_${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        invitedAt: new Date().toISOString().slice(0, 10),
        status: 'PENDING',
      };
      setInvites(prev => [newInv, ...prev]);
      toast({ kind: 'success', title: 'Invitation sent', message: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');
      setInviting(false);
      setShowInviteForm(false);
    }, 600);
  };

  const handleRevokeInvite = (invId: string) => {
    setInvites(prev => prev.filter(i => i.id !== invId));
    toast({ kind: 'info', title: 'Invitation revoked' });
  };

  const handleConnectGitHub = () => {
    const appName = 'opspilot-ci-cd';
    const redirectUrl = `https://github.com/apps/${appName}/installations/new`;
    window.open(redirectUrl, '_blank');
    toast({ kind: 'info', title: 'Redirecting to GitHub App Setup', message: 'Authorizing GitHub App installation...' });
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4 animate-fade-in">

        {/* Top Header Bar */}
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Settings size={16} className="text-violet-400" />
            <h1 className="text-sm font-bold text-zinc-100">Organization Settings</h1>
            <span className="text-[10px] font-mono text-zinc-500 border border-[#27272A] px-2 py-0.5 rounded-full">
              {org?.name ?? 'Production Workspace'}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-[#09090B] p-1 rounded-lg border border-[#27272A]">
            {[
              { id: 'general', label: 'General', icon: Building },
              { id: 'team', label: 'Team & Access', icon: Users },
              { id: 'github', label: 'GitHub App', icon: GithubIcon },
              { id: 'notifications', label: 'Notifications', icon: Bell },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    isActive ? 'bg-violet-600 text-white font-semibold shadow' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 bg-[#111113] border border-[#27272A] rounded-xl p-6 overflow-y-auto">

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 mb-1">Organization Profile</h2>
                <p className="text-xs text-zinc-400">Manage organization identity, slug, and subscription details.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Organization Name</label>
                  <input
                    type="text"
                    defaultValue={org?.name ?? 'Production Workspace'}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
                  />
                </div>


                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Slug ID</label>
                  <input
                    type="text"
                    defaultValue={org?.slug ?? 'production-workspace'}

                    disabled
                    className="w-full bg-[#09090B]/60 border border-[#27272A]/80 rounded-lg px-3 py-2 text-xs text-zinc-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Organization ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={org?.id ?? '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913'}
                      readOnly
                      className="flex-1 bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-zinc-400 font-mono"
                    />
                    <CopyButton text={org?.id ?? '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913'} label="Copy ID" />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#27272A]">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090B] border border-[#27272A]">
                    <div>
                      <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <Sparkles size={14} className="text-violet-400" />
                        OpsPilot Pro Plan (Unlimited Concurrent Builds)
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">5 Worker Threads · High-Performance Execution Engine</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEAM & ACCESS */}
          {activeTab === 'team' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100 mb-1">Team Members & Access Control</h2>
                  <p className="text-xs text-zinc-400">Manage team role permissions (RBAC) and send invitations.</p>
                </div>
                <button
                  onClick={() => setShowInviteForm(v => !v)}
                  className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  <Plus size={13} /> Invite Member
                </button>
              </div>

              {/* Invite Form Modal / Inline */}
              {showInviteForm && (
                <form onSubmit={handleSendInvite} className="p-4 bg-[#09090B] border border-[#27272A] rounded-xl space-y-3 animate-slide-up">
                  <p className="text-xs font-bold text-zinc-200">Invite New Teammate</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        required
                        className="w-full bg-[#111113] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Role</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as any)}
                        className="w-full bg-[#111113] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="px-3 py-1.5 text-xs text-zinc-400 border border-[#27272A] rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg"
                    >
                      {inviting ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                      Send Invitation
                    </button>
                  </div>
                </form>
              )}

              {/* Members Table */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Active Members ({members.length})</div>
                <div className="bg-[#09090B] border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]/60">
                  {members.map(m => (
                    <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-300 font-bold flex items-center justify-center border border-violet-500/30">
                          {m.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-200">{m.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{m.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#27272A] bg-[#111113] text-zinc-300">
                          {m.role}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">Joined {m.joinedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invitations */}
              {invites.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Pending Invitations ({invites.length})</div>
                  <div className="bg-[#09090B] border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]/60 animate-fade-in">
                    {invites.map(inv => (
                      <div key={inv.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <Mail size={14} className="text-amber-400" />
                          <div>
                            <div className="font-semibold text-zinc-200">{inv.email}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">Invited {inv.invitedAt}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
                            {inv.role} (PENDING)
                          </span>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 border border-rose-800/40 px-2 py-1 rounded"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GITHUB APP */}
          {activeTab === 'github' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 mb-1">GitHub App Integration</h2>
                <p className="text-xs text-zinc-400">Connect OpsPilot to your GitHub organization for automatic webhook delivery and JWT authentication.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#111113] text-zinc-200">
                      <GithubIcon size={20} />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-200">OpsPilot GitHub App</div>
                      <div className="text-[10px] text-zinc-500">Auto-provisions pipelines, verifies HMAC signatures, and syncs branches</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                    Connected
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#27272A] text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500">Webhook Endpoint URL:</span>
                    <code className="text-violet-400 font-mono">http://localhost/v1/webhooks/github</code>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500">HMAC Webhook Secret:</span>
                    <span className="font-mono text-zinc-400">••••••••••••••••</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleConnectGitHub}
                    className="flex items-center gap-2 text-xs font-bold bg-[#18181B] hover:bg-zinc-800 text-zinc-100 px-4 py-2 rounded-lg transition-colors border border-[#27272A]"
                  >
                    <GithubIcon size={14} />
                    Manage Installations on GitHub
                    <ExternalLink size={12} />
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 mb-1">Notification Preferences</h2>
                <p className="text-xs text-zinc-400">Configure build failure alerts, Slack webhooks, and email digests.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090B] border border-[#27272A]">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Email Failure Notifications</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Receive immediate email alerts when a build stage fails</div>
                  </div>
                  <button
                    onClick={() => setEmailAlerts(v => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${emailAlerts ? 'bg-violet-600' : 'bg-zinc-800'}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all ${emailAlerts ? 'right-0.75' : 'left-0.75'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090B] border border-[#27272A]">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Slack Webhook Alerts</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Post pipeline status updates to Slack channel</div>
                  </div>
                  <button
                    onClick={() => setSlackAlerts(v => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${slackAlerts ? 'bg-violet-600' : 'bg-zinc-800'}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all ${slackAlerts ? 'right-0.75' : 'left-0.75'}`} />
                  </button>
                </div>

                {slackAlerts && (
                  <div className="animate-slide-up">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Slack Incoming Webhook URL</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </DeveloperShell>
  );
}
