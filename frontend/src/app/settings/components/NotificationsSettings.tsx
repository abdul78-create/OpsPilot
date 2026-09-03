'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell, Plus, Trash2, CheckCircle2, Shield,
  ExternalLink, Mail, MessageSquare, AlertCircle, X
} from 'lucide-react';
import {
  NotificationChannelItem, AlertPolicyItem,
  listNotificationChannels, createNotificationChannel, deleteNotificationChannel,
  listAlertPolicies, createAlertPolicy
} from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

interface NotificationsSettingsProps {
  organizationId: string;
}

export const NotificationsSettings: React.FC<NotificationsSettingsProps> = ({
  organizationId,
}) => {
  const [channels, setChannels] = useState<NotificationChannelItem[]>([]);
  const [policies, setPolicies] = useState<AlertPolicyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Channel Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'SLACK' | 'PAGERDUTY' | 'WEBHOOK' | 'EMAIL'>('WEBHOOK');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);

  const { toast } = useToast();

  const loadNotificationData = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [channelsRes, policiesRes] = await Promise.all([
        listNotificationChannels(organizationId).catch(() => ({ data: [] })),
        listAlertPolicies(organizationId).catch(() => ({ data: [] })),
      ]);
      setChannels(Array.isArray(channelsRes?.data) ? channelsRes.data : []);
      setPolicies(Array.isArray(policiesRes?.data) ? policiesRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotificationData();
  }, [organizationId]);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    setAddingChannel(true);
    try {
      const res = await createNotificationChannel(organizationId, {
        name: channelName.trim(),
        type: channelType,
        webhookUrl: webhookUrl.trim() || undefined,
        emailAddress: emailAddress.trim() || undefined,
      });

      setChannels((prev) => [res.data, ...prev]);
      toast({
        kind: 'success',
        title: 'Channel Created',
        message: `Notification channel '${channelName}' added successfully.`,
      });
      setShowAddModal(false);
      setChannelName('');
      setWebhookUrl('');
      setEmailAddress('');
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Creation Failed',
        message: (err as Error).message || 'Failed to create notification channel.',
      });
    } finally {
      setAddingChannel(false);
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    try {
      await deleteNotificationChannel(organizationId, id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
      toast({
        kind: 'success',
        title: 'Channel Removed',
        message: `Channel '${name}' deleted successfully.`,
      });
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Delete Failed',
        message: (err as Error).message || 'Failed to delete channel.',
      });
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Notification Channels & Alert Policies</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Configure incident broadcast endpoints and automated event dispatch rules.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Channel
        </button>
      </div>

      {/* ── 1. Channels List ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Configured Channels</h3>

        {loading ? (
          <div className="py-4 text-center text-[var(--text-muted)]">Loading notification channels...</div>
        ) : (!Array.isArray(channels) || channels.length === 0) ? (
          <div className="py-4 text-center text-[var(--text-muted)]">
            No notification channels configured yet. Add a Slack, Webhook, or Email endpoint.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/60">
            {(Array.isArray(channels) ? channels : []).map((channel) => (
              <div key={channel.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center font-bold text-xs text-indigo-500">
                    {channel.type === 'EMAIL' ? <Mail className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <span>{channel.name}</span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded font-mono">
                        {channel.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {channel.webhookUrl || channel.emailAddress || 'Configured via Integration'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteChannel(channel.id, channel.name)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                  title="Delete channel"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Alert Policies ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Automated Incident Alert Policies</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Alert policies determine which pipeline failures, deployment rollbacks, and security vulnerabilities trigger automated channel notifications.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { event: 'Pipeline Run Failed', desc: 'Dispatches when a DAG stage exits non-zero' },
            { event: 'Deployment Health Breach', desc: 'Dispatches when health probe fails post-release' },
            { event: 'Security Vulnerability Detected', desc: 'Dispatches on plaintext secret leak detection' },
            { event: 'SLO Error Budget Burn', desc: 'Dispatches on elevated service error rates' },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/60 space-y-1">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {item.event}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleAddChannel} className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add Notification Channel</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[var(--text-primary)]">Channel Name</label>
              <input
                type="text"
                placeholder="e.g. Ops Incident Channel"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[var(--text-primary)]">Channel Type</label>
              <select
                value={channelType}
                onChange={(e) => setChannelType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              >
                <option value="WEBHOOK">Webhook (HTTP POST)</option>
                <option value="SLACK">Slack Webhook</option>
                <option value="PAGERDUTY">PagerDuty Event API</option>
                <option value="EMAIL">Email Dispatch</option>
              </select>
            </div>

            {channelType === 'EMAIL' ? (
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--text-primary)]">Recipient Email</label>
                <input
                  type="email"
                  placeholder="alerts@company.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--text-primary)]">Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/... or https://api.company.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingChannel || !channelName.trim()}
                className="px-4 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm"
              >
                {addingChannel ? 'Saving...' : 'Save Channel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
