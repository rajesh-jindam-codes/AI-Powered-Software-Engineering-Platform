'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Mail,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  ArrowLeft,
  Sparkles,
  Loader2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { Workspace, WorkspaceMember, WorkspaceInvitation, UserRole } from '@devflow/shared-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const AVAILABLE_ROLES: { role: UserRole; label: string; desc: string }[] = [
  { role: 'ADMIN', label: 'Admin', desc: 'Full workspace control, billing, member invites & role management.' },
  { role: 'DEVELOPER', label: 'Developer', desc: 'Push code, trigger AI coding agents, and run test generation.' },
  { role: 'REVIEWER', label: 'Reviewer', desc: 'Perform AI code reviews, approve pull requests, and view insights.' },
  { role: 'VIEWER', label: 'Viewer', desc: 'Read-only access to repositories, architecture diagrams, and review logs.' },
];

export default function WorkspaceMembersPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const {
    getWorkspace,
    listMembers,
    inviteMember,
    listInvitations,
    updateMemberRole,
    removeMember,
  } = useWorkspace();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('DEVELOPER');
  const [isInviting, setIsInviting] = useState(false);
  const [lastCreatedInvite, setLastCreatedInvite] = useState<WorkspaceInvitation | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const ws = await getWorkspace(workspaceId);
      setWorkspace(ws);

      const [memberList, inviteList] = await Promise.all([
        listMembers(workspaceId),
        listInvitations(workspaceId),
      ]);
      setMembers(memberList);
      setInvitations(inviteList);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load workspace members.' });
    } finally {
      setIsLoading(false);
    }
  }, [getWorkspace, listInvitations, listMembers, workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setFeedback(null);
    try {
      const invite = await inviteMember(workspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setLastCreatedInvite(invite);
      setInvitations((prev) => [invite, ...prev]);
      setInviteEmail('');
      setFeedback({
        type: 'success',
        message: `Invitation successfully created for ${invite.email}`,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to issue invitation.' });
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    setFeedback(null);
    try {
      const updated = await updateMemberRole(workspaceId, targetUserId, newRole);
      setMembers((prev) => prev.map((m) => (m.userId === targetUserId ? updated : m)));
      setFeedback({ type: 'success', message: 'Member role updated successfully.' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to update member role.' });
      }
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;

    setFeedback(null);
    try {
      await removeMember(workspaceId, targetUserId);
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
      setFeedback({ type: 'success', message: `${memberName} was removed from the workspace.` });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to remove member.' });
      }
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/workspaces/invitations/accept?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  if (isLoading) {
    return <div className="max-w-5xl mx-auto p-12 text-center text-muted-foreground animate-pulse">Loading team members and permissions...</div>;
  }

  if (!workspace) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-xl border border-border text-center space-y-3">
        <h2 className="text-base font-bold">Workspace Not Found</h2>
        <Link href="/workspaces">
          <Button size="sm">Back to Workspaces</Button>
        </Link>
      </div>
    );
  }

  const isAdmin = workspace.userRole === 'ADMIN' || user?.role === 'ADMIN';
  const adminCount = members.filter((m) => m.role === 'ADMIN').length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Back Link */}
      <Link
        href={`/workspaces/${workspaceId}`}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {workspace.name}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider uppercase">
            <Shield className="h-4 w-4" />
            <span>Multi-Tenant Access Control</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Team Members & Invitations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has access to {workspace.name} and assign granular RBAC privileges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs px-3 py-1">
            {members.length} Active Collaborators
          </Badge>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Invite Member Section (Admins only) */}
      {isAdmin && (
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Team Member
            </CardTitle>
            <CardDescription className="text-xs">
              Send an email invitation with a secure cryptographically signed join link.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    className="w-full h-10 pl-9 pr-3.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Assigned RBAC Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label} ({r.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="w-full h-10 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Issuing Invite...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </form>

            {lastCreatedInvite && (
              <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Invitation Link Ready for {lastCreatedInvite.email}
                  </div>
                  <div className="text-muted-foreground font-mono text-[11px] mt-0.5">
                    Token: {lastCreatedInvite.token}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyInviteLink(lastCreatedInvite.token)}
                  className="gap-1.5 text-xs shrink-0"
                >
                  {copiedToken ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Invite Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members Directory */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Active Workspace Members
          </CardTitle>
          <CardDescription className="text-xs">
            Members have access to repositories and AI agents scoped strictly to this workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {members.map((member) => {
              const isSelf = member.userId === user?.id;
              const isSoleAdmin = member.role === 'ADMIN' && adminCount <= 1;

              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                      {member.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {member.user.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate">
                          {member.user.name}
                        </span>
                        {isSelf && (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            YOU
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{member.user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Role Dropdown */}
                    {isAdmin ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          disabled={isSoleAdmin}
                          onChange={(e) =>
                            handleRoleChange(member.userId, e.target.value as UserRole)
                          }
                          className="h-8 px-2.5 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono disabled:opacity-60"
                          title={
                            isSoleAdmin
                              ? 'Cannot change role: this user is the only remaining ADMIN'
                              : 'Change Member Role'
                          }
                        >
                          {AVAILABLE_ROLES.map((r) => (
                            <option key={r.role} value={r.role}>
                              {r.role}
                            </option>
                          ))}
                        </select>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSoleAdmin}
                          onClick={() => handleRemoveMember(member.userId, member.user.name)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30"
                          title={
                            isSoleAdmin
                              ? 'Cannot remove the sole remaining ADMIN'
                              : 'Remove member from workspace'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="font-mono text-xs">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      {isAdmin && invitations.length > 0 && (
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Awaiting acceptance by the recipient before expiration.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {inv.email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Role: <span className="font-mono text-foreground font-medium">{inv.role}</span> • Expires:{' '}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyInviteLink(inv.token)}
                      className="text-xs gap-1.5"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
