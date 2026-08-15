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
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4">

        {/* Top Header Bar */}
        <div
          className="h-14 px-4 rounded-xl border flex items-center justify-between shrink-0"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <Settings size={15} style={{ color: 'var(--text-muted)' }} />
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Organization Settings</h1>
            <span
              className="text-[10px] font-mono border px-2 py-0.5 rounded-full"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {org?.name ?? 'Production Workspace'}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div
            className="flex gap-1 p-1 rounded-lg border"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
          >
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
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--accent-fg)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div
          className="flex-1 min-h-0 border rounded-xl p-6 overflow-y-auto"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Organization Profile</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Manage organization identity, slug, and subscription details.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Organization Name
                  </label>
                  <input
                    type="text"
                    defaultValue={org?.name ?? 'Production Workspace'}
                    className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Slug ID
                  </label>
                  <input
                    type="text"
                    defaultValue={org?.slug ?? 'production-workspace'}
                    disabled
                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono opacity-70"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Organization ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={org?.id ?? '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913'}
                      readOnly
                      className="flex-1 border rounded-lg px-3 py-2 text-xs font-mono"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    />
                    <CopyButton text={org?.id ?? '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913'} label="Copy ID" />
                  </div>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div
                    className="flex items-center justify-between p-4 rounded-xl border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                        OpsPilot Pro Plan (Unlimited Concurrent Builds)
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        5 Worker Threads · High-Performance Execution Engine
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold border px-2.5 py-1 rounded-full"
                      style={{
                        background: 'var(--success-dim)',
                        borderColor: 'var(--success)',
                        color: 'var(--success)',
                      }}
                    >
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
                  <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Team Members & Access Control</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Manage team role permissions (RBAC) and send invitations.</p>
                </div>
                <button
                  onClick={() => setShowInviteForm(v => !v)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Plus size={13} /> Invite Member
                </button>
              </div>

              {/* Invite Form */}
              {showInviteForm && (
                <form
                  onSubmit={handleSendInvite}
                  className="p-4 border rounded-xl space-y-3"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Invite New Teammate</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase tracking-wider block mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        required
                        className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none"
                        style={{
                          background: 'var(--bg-primary)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider block mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as any)}
                        className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none"
                        style={{
                          background: 'var(--bg-primary)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
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
                      className="px-3 py-1.5 text-xs border rounded-lg transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      {inviting ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                      Send Invitation
                    </button>
                  </div>
                </form>
              )}

              {/* Members Table */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Active Members ({members.length})
                </div>
                <div
                  className="border rounded-xl overflow-hidden divide-y"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                >
                  {members.map(m => (
                    <div key={m.id} className="p-3.5 flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full font-bold flex items-center justify-center border text-xs"
                          style={{
                            background: 'var(--bg-secondary)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {m.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</div>
                          <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{m.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                          style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {m.role}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Joined {m.joinedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invitations */}
              {invites.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Pending Invitations ({invites.length})
                  </div>
                  <div
                    className="border rounded-xl overflow-hidden divide-y"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                  >
                    {invites.map(inv => (
                      <div key={inv.id} className="p-3.5 flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3">
                          <Mail size={14} style={{ color: 'var(--warning)' }} />
                          <div>
                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{inv.email}</div>
                            <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Invited {inv.invitedAt}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-mono border px-2 py-0.5 rounded"
                            style={{
                              background: 'var(--warning-dim)',
                              borderColor: 'var(--warning)',
                              color: 'var(--warning)',
                            }}
                          >
                            {inv.role} (PENDING)
                          </span>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-[10px] border px-2 py-1 rounded transition-colors"
                            style={{
                              borderColor: 'var(--error)',
                              color: 'var(--error)',
                            }}
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
                <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>GitHub App Integration</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connect OpsPilot to your GitHub organization for automatic webhook delivery and JWT authentication.</p>
              </div>

              <div
                className="p-5 rounded-xl border space-y-4"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-xl border"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      <GithubIcon size={20} />
                    </div>

                    <div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>OpsPilot GitHub App</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Auto-provisions pipelines, verifies HMAC signatures, and syncs branches</div>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-mono font-bold border px-2.5 py-1 rounded-full"
                    style={{
                      background: 'var(--success-dim)',
                      borderColor: 'var(--success)',
                      color: 'var(--success)',
                    }}
                  >
                    Connected
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: 'var(--text-muted)' }}>Webhook Endpoint URL:</span>
                    <code className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>http://localhost/v1/webhooks/github</code>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: 'var(--text-muted)' }}>HMAC Webhook Secret:</span>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>••••••••••••••••</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleConnectGitHub}
                    className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-colors border"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <GithubIcon size={14} />
                    <span>Manage Installations on GitHub</span>
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
                <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Notification Preferences</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Configure build failure alerts, Slack webhooks, and email digests.</p>
              </div>

              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-4 rounded-xl border"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                >
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Email Failure Notifications</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Receive immediate email alerts when a build stage fails</div>
                  </div>
                  <button
                    onClick={() => setEmailAlerts(v => !v)}
                    className="w-10 h-5 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: emailAlerts ? 'var(--accent)' : 'var(--border)' }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all"
                      style={{ right: emailAlerts ? '3px' : 'auto', left: emailAlerts ? 'auto' : '3px' }}
                    />
                  </button>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-xl border"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                >
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Slack Webhook Alerts</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Post pipeline status updates to Slack channel</div>
                  </div>
                  <button
                    onClick={() => setSlackAlerts(v => !v)}
                    className="w-10 h-5 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: slackAlerts ? 'var(--accent)' : 'var(--border)' }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all"
                      style={{ right: slackAlerts ? '3px' : 'auto', left: slackAlerts ? 'auto' : '3px' }}
                    />
                  </button>
                </div>

                {slackAlerts && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider block mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Slack Incoming Webhook URL
                    </label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
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
