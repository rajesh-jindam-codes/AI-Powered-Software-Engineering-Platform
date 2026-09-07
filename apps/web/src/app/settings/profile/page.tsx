'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User as UserIcon,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { ROLE_PERMISSIONS } from '@devflow/shared-types';

export default function ProfileSettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setIsUpdatingProfile(true);

    try {
      await updateProfile({ name, avatarUrl });
      setProfileSuccess('Profile details updated successfully');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userPermissions = user?.role ? ROLE_PERMISSIONS[user.role] : [];

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-blue-500" />
            User Profile & Security
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your account identity, role assignments, and security credentials.
          </p>
        </div>

        {/* Profile Card Header */}
        <Card className="border-border bg-gradient-to-r from-card to-card/50">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-10 w-10 text-primary" />
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge variant="default" className="font-mono text-[10px] bg-blue-600">
                    ROLE: {user?.role}
                  </Badge>
                  <Badge variant="success" className="font-mono text-[10px]">
                    {user?.status}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span>
                  ID: <code className="font-mono">{user?.id}</code>
                </span>
                <span>•</span>
                <span>
                  Active Session: <strong className="text-emerald-500">Authenticated (JWT)</strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile & Change Password Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Edit Profile Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-blue-500" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs">
                Update your display name and avatar URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-3.5">
                {profileSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Avatar URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-9 px-3 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdatingProfile}
                  className="w-full gap-2"
                >
                  {isUpdatingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Profile Changes'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-500" />
                Security & Password
              </CardTitle>
              <CardDescription className="text-xs">
                Update your credentials with bcrypt protection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3.5">
                {passwordSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-9 px-3 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-9 px-3 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-9 px-3 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isChangingPassword}
                  className="w-full gap-2"
                >
                  {isChangingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RBAC Permissions Matrix Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              Active Role Permissions Matrix ({user?.role})
            </CardTitle>
            <CardDescription className="text-xs">
              Permissions automatically granted to your assigned security role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {userPermissions.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border/70 bg-muted/30 text-xs font-mono"
                >
                  <Lock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-foreground">{perm}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
