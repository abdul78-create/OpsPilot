'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield, Key, Lock, Laptop, CheckCircle2,
  Trash2, Plus, Copy, Check, AlertTriangle, ExternalLink
} from 'lucide-react';
import {
  ApiKeyItem, UserSessionItem, AuditLogItem,
  listApiKeys, createApiKey, revokeApiKey,
  fetchUserSessions, revokeUserSession, revokeAllOtherSessions,
  changeUserPassword, fetchAuditLogs
} from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface SecuritySettingsProps {
  organizationId: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ organizationId }) => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const { toast } = useToast();

  const loadSecurityData = async () => {
    if (organizationId) {
      setLoadingKeys(true);
      listApiKeys(organizationId)
        .then((res) => setApiKeys(Array.isArray(res?.data) ? res.data : []))
        .catch(() => setApiKeys([]))
        .finally(() => setLoadingKeys(false));

      fetchAuditLogs(organizationId, 10)
        .then((res) => setAuditLogs(Array.isArray(res?.data) ? res.data : []))
        .catch(() => setAuditLogs([]));
    }

    setLoadingSessions(true);
    fetchUserSessions()
      .then((res) => setSessions(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  };

  useEffect(() => {
    loadSecurityData();
  }, [organizationId]);

  // 1. Password Change Handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 8) {
      toast({
        kind: 'error',
        title: 'Weak Password',
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        kind: 'error',
        title: 'Passwords Mismatch',
        message: 'New password and confirmation do not match.',
      });
      return;
    }

    setChangingPassword(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      toast({
        kind: 'success',
        title: 'Password Updated',
        message: 'Your login credentials have been securely updated.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Password Update Failed',
        message: (err as Error).message || 'Failed to update password.',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // 2. Session Revocation Handlers
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeUserSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast({
        kind: 'success',
        title: 'Session Revoked',
        message: 'The selected session was immediately terminated.',
      });
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Revoke Failed',
        message: (err as Error).message || 'Failed to revoke session.',
      });
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await revokeAllOtherSessions();
      toast({
        kind: 'success',
        title: 'Sessions Terminated',
        message: 'All other active sessions were revoked.',
      });
      loadSecurityData();
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Termination Failed',
        message: (err as Error).message || 'Failed to terminate sessions.',
      });
    }
  };

  // 3. API Key Handlers
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setGeneratingKey(true);
    try {
      const res = await createApiKey(organizationId, keyName.trim());
      setGeneratedRawKey(res.data.rawKey);
      setApiKeys((prev) => [res.data, ...prev]);
      toast({
        kind: 'success',
        title: 'API Key Generated',
        message: 'Save this key now. You will not be able to view it again.',
      });
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Generation Failed',
        message: (err as Error).message || 'Failed to generate API key.',
      });
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    try {
      await revokeApiKey(organizationId, id);
      setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isRevoked: true } : k)));
      toast({
        kind: 'success',
        title: 'Key Revoked',
        message: 'API token was revoked and can no longer authenticate.',
      });
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Revocation Failed',
        message: (err as Error).message || 'Failed to revoke API key.',
      });
    }
  };

  const handleCopyRawKey = () => {
    if (generatedRawKey) {
      navigator.clipboard.writeText(generatedRawKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Security & Access Governance</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Manage authentication credentials, active browser sessions, and CI/CD service tokens.
        </p>
      </div>

      {/* ── 1. Password Management ── */}
      <form onSubmit={handlePasswordChange} className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <Lock className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Change Password</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-medium text-[var(--text-primary)]">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[var(--text-primary)]">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[var(--text-primary)]">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={changingPassword || !currentPassword || !newPassword}
            className="px-4 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm"
          >
            {changingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* ── 2. Active Sessions ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-indigo-500" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Browser Sessions</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Signed-in devices authorized with active session cookies</p>
            </div>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllOtherSessions}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              Revoke All Other Sessions
            </button>
          )}
        </div>

        {loadingSessions ? (
          <div className="py-4 text-center text-[var(--text-muted)]">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="py-4 text-center text-[var(--text-muted)]">Current session active.</div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/60">
            {(Array.isArray(sessions) ? sessions : []).map((sess, idx) => (
              <div key={sess.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center">
                    <Laptop className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <span>{idx === 0 ? 'Current Active Session' : 'Authorized Device'}</span>
                      {idx === 0 && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                          This Device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate max-w-sm">
                      {sess.userAgent || 'Web Browser'} · IP: {sess.ipAddress || 'Localhost'}
                    </div>
                  </div>
                </div>

                {idx !== 0 && (
                  <button
                    onClick={() => handleRevokeSession(sess.id)}
                    className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                    title="Revoke session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. API Keys / CI Tokens ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-500" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Developer API Keys</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Scoped tokens for programmatic CI/CD pipeline triggers</p>
            </div>
          </div>

          <button
            onClick={() => { setGeneratedRawKey(null); setShowKeyModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate Token
          </button>
        </div>

        {loadingKeys ? (
          <div className="py-4 text-center text-[var(--text-muted)]">Loading API keys...</div>
        ) : (!Array.isArray(apiKeys) || apiKeys.length === 0) ? (
          <div className="py-4 text-center text-[var(--text-muted)]">
            No API keys generated yet for this workspace.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/60">
            {(Array.isArray(apiKeys) ? apiKeys : []).map((key) => (
              <div key={key.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span>{key.name}</span>
                    {key.isRevoked && (
                      <span className="text-[10px] bg-rose-500/10 text-rose-500 px-1.5 py-0.2 rounded font-bold">
                        REVOKED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                    Prefix: {key.keyPrefix}••••••••••••
                  </div>
                </div>

                {!key.isRevoked && (
                  <button
                    onClick={() => handleRevokeApiKey(key.id)}
                    className="px-2.5 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Runtime Secrets Vault Link ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            AES-256-GCM Runtime Secrets Vault
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Runtime secrets and environmental keys are injected into ephemeral container runners with authenticated encryption.
          </p>
        </div>

        <Link
          href="/secrets"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/80 transition-colors shrink-0"
        >
          Open Secrets Vault
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Key Generation Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-slide-up">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {generatedRawKey ? 'API Key Generated' : 'Generate CI Service Token'}
            </h3>

            {!generatedRawKey ? (
              <form onSubmit={handleCreateApiKey} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-medium text-[var(--text-primary)]">Token Name</label>
                  <input
                    type="text"
                    placeholder="e.g. GitHub Actions CI Token"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingKey || !keyName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {generatingKey ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                  Copy this token now. It will never be displayed again.
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-200 justify-between">
                  <span className="truncate">{generatedRawKey}</span>
                  <button
                    onClick={handleCopyRawKey}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => { setShowKeyModal(false); setGeneratedRawKey(null); setKeyName(''); }}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
