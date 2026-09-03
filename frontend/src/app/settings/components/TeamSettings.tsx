'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, Check, X,
  Trash2, ChevronRight, Mail, Calendar, AlertCircle
} from 'lucide-react';
import {
  OrganizationMember, listOrganizationMembers,
  updateMemberRole, removeMember, inviteMember
} from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

interface TeamSettingsProps {
  organizationId: string;
}

const ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;

export const TeamSettings: React.FC<TeamSettingsProps> = ({ organizationId }) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviting, setInviting] = useState(false);

  // Permissions table tab toggle
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'permissions'>('members');

  const { toast } = useToast();

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await listOrganizationMembers(organizationId);
      setMembers(res.data || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadMembers();
    }
  }, [organizationId]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(organizationId, memberId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole as any } : m)),
      );
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember({ ...selectedMember, role: newRole as any });
      }
      toast({
        kind: 'success',
        title: 'Role Updated',
        message: `Member role updated to ${newRole}.`,
      });
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Role Update Failed',
        message: (err as Error).message || 'Failed to update member role.',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    try {
      await removeMember(organizationId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSelectedMember(null);
      toast({
        kind: 'success',
        title: 'Member Removed',
        message: `${name} was removed from the organization.`,
      });
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Remove Failed',
        message: (err as Error).message || 'Failed to remove member.',
      });
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteMember(organizationId, inviteEmail.trim(), inviteRole);
      toast({
        kind: 'success',
        title: 'Invitation Dispatched',
        message: `Invitation email sent to ${inviteEmail}.`,
      });
      setShowInviteModal(false);
      setInviteEmail('');
      loadMembers();
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Invitation Failed',
        message: (err as Error).message || 'Failed to dispatch invitation.',
      });
    } finally {
      setInviting(false);
    }
  };

  const formatJoinedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Team & Access Control</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage organization members, assign role-based permissions, and dispatch invitations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="flex items-center p-1 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs">
            <button
              onClick={() => setActiveSubTab('members')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeSubTab === 'members'
                  ? 'bg-[var(--surface-primary)] text-indigo-500 font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveSubTab('permissions')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeSubTab === 'permissions'
                  ? 'bg-[var(--surface-primary)] text-indigo-500 font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Role Matrix
            </button>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Member
          </button>
        </div>
      </div>

      {activeSubTab === 'members' ? (
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Loading organization members...
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              No team members found. You are currently the sole member of this workspace.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]/60 text-xs">
              <div className="grid grid-cols-12 px-6 py-2.5 bg-[var(--surface-secondary)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <div className="col-span-5">Member</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Joined</div>
              </div>

              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-[var(--surface-secondary)]/40 cursor-pointer transition-colors"
                >
                  {/* Member Name + Email */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 font-bold flex items-center justify-center text-xs shrink-0">
                      {member.user?.name ? member.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] truncate">
                        {member.user?.name || member.user?.email}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {member.user?.email}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-indigo-500 uppercase tracking-wider">
                      {member.role}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  {/* Joined Date */}
                  <div className="col-span-2 text-right text-[11px] text-[var(--text-muted)] font-mono">
                    {formatJoinedDate(member.joinedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* RBAC Reference Matrix */
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">System Permission Matrix</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Operational permissions enforced by backend security guards.
            </p>
          </div>

          <div className="border border-[var(--border-subtle)] rounded-lg overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--surface-secondary)] text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider border-b border-[var(--border-subtle)]">
                  <th className="p-3">Capability</th>
                  <th className="p-3 text-center">Owner</th>
                  <th className="p-3 text-center">Admin</th>
                  <th className="p-3 text-center">Member</th>
                  <th className="p-3 text-center">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/60 text-[11px]">
                {[
                  { name: 'Organization Settings & Deletion', owner: true, admin: false, member: false, viewer: false },
                  { name: 'Team Member Invitations & Role Changes', owner: true, admin: true, member: false, viewer: false },
                  { name: 'Project & Pipeline Configuration', owner: true, admin: true, member: true, viewer: false },
                  { name: 'Trigger & Cancel Pipeline Runs', owner: true, admin: true, member: true, viewer: false },
                  { name: 'Environment Deployment Releases', owner: true, admin: true, member: true, viewer: false },
                  { name: 'Secret Vault Management & Key Reveal', owner: true, admin: true, member: false, viewer: false },
                  { name: 'Read-Only Observability & Log Streaming', owner: true, admin: true, member: true, viewer: true },
                ].map((cap, i) => (
                  <tr key={i} className="hover:bg-[var(--surface-secondary)]/40">
                    <td className="p-3 font-medium text-[var(--text-primary)]">{cap.name}</td>
                    <td className="p-3 text-center">{cap.owner ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--text-muted)] mx-auto" />}</td>
                    <td className="p-3 text-center">{cap.admin ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--text-muted)] mx-auto" />}</td>
                    <td className="p-3 text-center">{cap.member ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--text-muted)] mx-auto" />}</td>
                    <td className="p-3 text-center">{cap.viewer ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--text-muted)] mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Member Detail Drawer (Side Drawer) ── */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--surface-primary)] border-l border-[var(--border-subtle)] h-full p-6 shadow-2xl flex flex-col justify-between animate-slide-left text-xs">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Member Profile</h3>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Member details */}
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 font-bold text-base flex items-center justify-center mx-auto">
                  {selectedMember.user?.name ? selectedMember.user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-[var(--text-primary)]">
                    {selectedMember.user?.name || selectedMember.user?.email}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {selectedMember.user?.email}
                  </div>
                </div>
              </div>

              {/* Role modification */}
              <div className="space-y-1.5 pt-4 border-t border-[var(--border-subtle)]">
                <label className="font-semibold text-[var(--text-primary)]">Organization Role</label>
                <select
                  value={selectedMember.role}
                  onChange={(e) => handleRoleChange(selectedMember.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Changing role alters permissions across all projects immediately.
                </p>
              </div>

              {/* Joined metadata */}
              <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60 text-[11px] space-y-1 text-[var(--text-secondary)]">
                <div>Member Since: {formatJoinedDate(selectedMember.joinedAt)}</div>
                <div>User ID: <span className="font-mono">{selectedMember.user?.id}</span></div>
              </div>
            </div>

            {/* Remove button */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => handleRemoveMember(selectedMember.id, selectedMember.user?.name || selectedMember.user?.email)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove from Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite Member Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleInvite} className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-slide-up text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-500" />
                Invite Team Member
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[var(--text-primary)]">Email Address</label>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[var(--text-primary)]">Assign Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MEMBER">MEMBER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm"
              >
                {inviting ? 'Dispatching...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
