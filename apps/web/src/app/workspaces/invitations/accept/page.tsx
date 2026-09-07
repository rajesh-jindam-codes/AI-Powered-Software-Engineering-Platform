'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const { acceptInvitation } = useWorkspace();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = useCallback(async () => {
    if (!token) {
      setError('Missing invitation token.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const member = await acceptInvitation(token);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/workspaces/${member.workspaceId}`);
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to accept invitation. The invitation may be expired or invalid.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [acceptInvitation, router, token]);

  useEffect(() => {
    if (token && isAuthenticated) {
      handleAccept();
    }
  }, [handleAccept, isAuthenticated, token]);

  return (
    <div className="max-w-md mx-auto py-16">
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Workspace Invitation</CardTitle>
          <CardDescription className="text-xs">
            Join the engineering team on DevFlow AI.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-center">
          {isLoading && (
            <div className="py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Verifying invitation token and joining workspace...</p>
            </div>
          )}

          {success && (
            <div className="py-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Welcome to the Team!</h3>
              <p className="text-xs text-muted-foreground">
                You have successfully joined the workspace. Redirecting to your dashboard...
              </p>
            </div>
          )}

          {error && (
            <div className="py-4 space-y-4">
              <div className="p-3.5 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-xs flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>

              <Link href="/workspaces">
                <Button size="sm" variant="outline" className="w-full">
                  Return to Workspaces
                </Button>
              </Link>
            </div>
          )}

          {!token && (
            <div className="py-4 text-xs text-muted-foreground">
              No invitation token specified. Please click the invitation link provided in your invite email.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="text-center p-12 text-muted-foreground">Loading invitation...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
