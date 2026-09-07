'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  MessageSquare,
  Sparkles,
  History,
  Send,
  AtSign,
  Plus,
  Circle,
  Eye,
  CheckCircle2,
  GitPullRequest,
  Activity,
  Bell,
  Layers,
  Cpu,
  RefreshCw,
  Edit3,
  Share2,
  Shield,
  Zap,
} from 'lucide-react';
import {
  CollaborativeDoc,
  UserPresence,
  DocumentComment,
  RealtimeNotification,
  ActivityFeedItem,
  DocumentVersionSnapshot,
} from '@devflow/shared-types';

const INITIAL_DOCUMENTS: CollaborativeDoc[] = [
  {
    id: 'doc_arch_01',
    workspaceId: 'ws_devflow_primary',
    title: 'RFC 042: Real-Time Multi-Region Collaboration & CRDT Convergence',
    content: `# RFC 042: Real-Time Multi-Region Collaboration Architecture

## 1. Overview
DevFlow AI uses a hybrid transport combining Redis Pub/Sub, NestJS WebSockets, and Vector Clock CRDT synchronization.

## 2. Presence & State Synchronization
- Distributed presence tracking via Redis with 60s TTL heartbeats.
- Real-time multiplayer cursor broadcasts and typing indicators.
- Threaded discussions with automatic @mention resolution.

## 3. Conflict-Free Operational Transformations
Each mutation is encapsulated as a \`DocOperation\` with vector clock stamps.
Deterministic tie-breaking ensures identical convergence across all connected peers.

## 4. Security & Multi-Tenancy
All socket connections enforce JWT authentication and RBAC boundary isolation per workspace.`,
    version: 4,
    lastModifiedBy: 'Priya Patel',
    activeCollaboratorsCount: 3,
    vectorClock: { usr_priya_03: 3, usr_rajesh_01: 1 },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc_sec_02',
    workspaceId: 'ws_devflow_primary',
    title: 'Security Specification: Zero-Trust Sandboxed Execution Engine',
    content: `# Security Spec: Zero-Trust Sandboxed Execution Engine

## 1. Isolation Policy
All repository test suites and dynamic code execution occur inside gVisor-based sandbox containers.

## 2. Resource Quotas
- CPU: 1.0 Core (1000m)
- Memory: 512 MB ceiling
- Execution Timeout: 15 seconds
- Outbound Networking: Airgapped (disabled)

## 3. Prohibited Command Filters
Direct host execution of shell scripts or arbitrary command injection is blocked via regex guardrails.`,
    version: 2,
    lastModifiedBy: 'Alex Chen',
    activeCollaboratorsCount: 1,
    vectorClock: { usr_alex_04: 2 },
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_PRESENCE: UserPresence[] = [
  {
    userId: 'usr_rajesh_01',
    userName: 'Rajesh Kumar',
    email: 'rajesh@devflow.ai',
    role: 'STAFF_ENGINEER',
    status: 'online',
    currentLocation: {
      file: 'apps/api/src/modules/auth/auth.service.ts',
      activity: 'Viewing auth.service.ts',
    },
    lastSeenAt: new Date().toISOString(),
    workspaceId: 'ws_devflow_primary',
  },
  {
    userId: 'usr_rahul_02',
    userName: 'Rahul Sharma',
    email: 'rahul@devflow.ai',
    role: 'TECH_LEAD',
    status: 'online',
    currentLocation: {
      prNumber: 182,
      activity: 'Reviewing PR #182 (Checkout VAT calculation)',
    },
    lastSeenAt: new Date().toISOString(),
    workspaceId: 'ws_devflow_primary',
  },
  {
    userId: 'usr_priya_03',
    userName: 'Priya Patel',
    email: 'priya@devflow.ai',
    role: 'SENIOR_DEVELOPER',
    status: 'online',
    currentLocation: {
      documentId: 'doc_arch_01',
      activity: 'Editing System Architecture & CRDT RFC',
    },
    lastSeenAt: new Date().toISOString(),
    workspaceId: 'ws_devflow_primary',
  },
  {
    userId: 'usr_alex_04',
    userName: 'Alex Chen',
    email: 'alex@devflow.ai',
    role: 'DEVOPS_ENGINEER',
    status: 'idle',
    currentLocation: {
      activity: 'Monitoring Kafka Job Cluster & Redis TTLs',
    },
    lastSeenAt: new Date(Date.now() - 30000).toISOString(),
    workspaceId: 'ws_devflow_primary',
  },
];

const INITIAL_COMMENTS: DocumentComment[] = [
  {
    id: 'cmt_001',
    documentId: 'doc_arch_01',
    authorId: 'usr_rahul_02',
    authorName: 'Rahul Sharma',
    content: 'Great writeup @priya! How are we handling out-of-order packet delivery during network reconnects?',
    mentions: ['priya'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'cmt_002',
    documentId: 'doc_arch_01',
    authorId: 'usr_priya_03',
    authorName: 'Priya Patel',
    content: '@rahul The CrdtSyncService uses an operation ID cache and vector clocks to achieve idempotent convergence.',
    mentions: ['rahul'],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

const INITIAL_ACTIVITY: ActivityFeedItem[] = [
  {
    id: 'act_001',
    workspaceId: 'ws_devflow_primary',
    actorName: 'Rajesh Kumar',
    action: 'VIEWED_FILE',
    target: 'src/modules/auth/auth.service.ts',
    description: 'Rajesh is viewing auth.service.ts in Repository devflow-ai/api',
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'act_002',
    workspaceId: 'ws_devflow_primary',
    actorName: 'Rahul Sharma',
    action: 'REVIEWED_PR',
    target: 'PR #182',
    description: 'Rahul is reviewing PR #182 (Checkout VAT tax calculation fix)',
    timestamp: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: 'act_003',
    workspaceId: 'ws_devflow_primary',
    actorName: 'Priya Patel',
    action: 'EDITED_DOC',
    target: 'RFC 042: Real-Time Multi-Region Collaboration',
    description: 'Priya updated the CRDT state vector specification',
    timestamp: new Date(Date.now() - 360000).toISOString(),
  },
  {
    id: 'act_004',
    workspaceId: 'ws_devflow_primary',
    actorName: 'Alex Chen',
    action: 'GENERATED_TESTS',
    target: 'CheckoutServiceSpec',
    description: 'Alex generated 4 test cases and verified them in gVisor sandbox',
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
];

const INITIAL_SNAPSHOTS: DocumentVersionSnapshot[] = [
  {
    id: 'snap_v1',
    documentId: 'doc_arch_01',
    version: 1,
    title: 'RFC 042: Real-Time Collaboration Draft',
    content: '# RFC 042: Draft\n\nInitial notes on WebSockets and Redis pub/sub.',
    modifiedBy: 'Priya Patel',
    summary: 'Initial architecture draft.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'snap_v2',
    documentId: 'doc_arch_01',
    version: 2,
    title: 'RFC 042: Multi-Region Collaboration & CRDT Convergence',
    content: '# RFC 042: Real-Time Multi-Region Collaboration\n\nAdded vector clock and presence details.',
    modifiedBy: 'Rajesh Kumar',
    summary: 'Integrated vector clock specs.',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'snap_v4',
    documentId: 'doc_arch_01',
    version: 4,
    title: 'RFC 042: Real-Time Multi-Region Collaboration & CRDT Convergence',
    content: INITIAL_DOCUMENTS[0].content,
    modifiedBy: 'Priya Patel',
    summary: 'Current production version.',
    createdAt: new Date().toISOString(),
  },
];

export default function CollaborationPage() {
  const [documents, setDocuments] = useState<CollaborativeDoc[]>(INITIAL_DOCUMENTS);
  const [activeDoc, setActiveDoc] = useState<CollaborativeDoc>(INITIAL_DOCUMENTS[0]);
  const [docContent, setDocContent] = useState<string>(INITIAL_DOCUMENTS[0].content);
  const [presenceList, setPresenceList] = useState<UserPresence[]>(INITIAL_PRESENCE);
  const [comments, setComments] = useState<DocumentComment[]>(INITIAL_COMMENTS);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>(INITIAL_ACTIVITY);
  const [snapshots, setSnapshots] = useState<DocumentVersionSnapshot[]>(INITIAL_SNAPSHOTS);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [typingUser, setTypingUser] = useState<string | null>('Priya Patel');
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'activity'>('editor');
  const [selectedSnapshot, setSelectedSnapshot] = useState<DocumentVersionSnapshot | null>(null);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([
    {
      id: 'notif_1',
      workspaceId: 'ws_devflow_primary',
      type: 'mention',
      title: 'Mentioned in RFC 042',
      message: 'Rahul Sharma mentioned you in a comment.',
      read: false,
      actor: { userId: 'usr_rahul_02', userName: 'Rahul Sharma' },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ]);

  // Simulate multiplayer typing indicator cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingUser((prev) => (prev ? null : 'Priya Patel'));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleDocChange = (newText: string) => {
    setDocContent(newText);
    setActiveDoc((prev) => ({
      ...prev,
      content: newText,
      version: prev.version + 1,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handlePostComment = () => {
    if (!newCommentText.trim()) return;

    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(newCommentText)) !== null) {
      if (match[1]) mentions.push(match[1].toLowerCase());
    }

    const newComment: DocumentComment = {
      id: `cmt_${Date.now()}`,
      documentId: activeDoc.id,
      authorId: 'usr_curr_user',
      authorName: 'Rajesh Kumar (You)',
      content: newCommentText,
      mentions,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [...prev, newComment]);
    setNewCommentText('');

    // Generate notifications for mentioned peers
    if (mentions.length > 0) {
      const notifs: RealtimeNotification[] = mentions.map((m) => ({
        id: `notif_${Date.now()}_${m}`,
        workspaceId: 'ws_devflow_primary',
        type: 'mention',
        title: `Mentioned in ${activeDoc.title}`,
        message: `Rajesh mentioned @${m}: "${newComment.content.substring(0, 60)}"`,
        read: false,
        actor: { userId: 'usr_curr_user', userName: 'Rajesh Kumar' },
        createdAt: new Date().toISOString(),
      }));
      setNotifications((prev) => [...notifs, ...prev]);
    }

    // Add activity
    setActivityFeed((prev) => [
      {
        id: `act_${Date.now()}`,
        workspaceId: 'ws_devflow_primary',
        actorName: 'Rajesh Kumar',
        action: 'POSTED_COMMENT',
        target: activeDoc.title,
        description: `Rajesh posted a comment on ${activeDoc.title}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const insertMention = (name: string) => {
    setNewCommentText((prev) => `${prev} @${name.toLowerCase().replace(' ', '')} `);
  };

  const selectDocument = (doc: CollaborativeDoc) => {
    setActiveDoc(doc);
    setDocContent(doc.content);
    setSelectedSnapshot(null);
  };

  const handleCreateNewDoc = () => {
    const id = `doc_${Date.now().toString().slice(-4)}`;
    const newDoc: CollaborativeDoc = {
      id,
      workspaceId: 'ws_devflow_primary',
      title: 'New Engineering RFC Document',
      content: `# New Engineering RFC\n\n## 1. Problem Statement\nDescribe the technical challenge...\n\n## 2. Proposed Architecture\n- Scalability\n- Security boundaries\n- CRDT data synchronization`,
      version: 1,
      lastModifiedBy: 'Rajesh Kumar',
      activeCollaboratorsCount: 1,
      vectorClock: { usr_curr_user: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDoc(newDoc);
    setDocContent(newDoc.content);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono tracking-widest text-primary font-bold uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              PHASE 12
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              WebSockets • Redis Pub/Sub • CRDT Vector Clocks
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent flex items-center gap-2.5">
            <Users className="h-7 w-7 text-primary" />
            Real-Time Collaboration & Engineering Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multiplayer live document editing, presence awareness, typing indicators, threaded comments with @mentions, and team activity feeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 font-mono text-xs px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync: 3 Peers Connected
          </Badge>
          <Button
            size="sm"
            onClick={handleCreateNewDoc}
            className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs px-3"
          >
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>
      </div>

      {/* Real-Time Presence Ribbon */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
        <CardContent className="p-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground shrink-0">
              <Activity className="h-4 w-4 text-primary animate-pulse" />
              Active Teammates ({presenceList.filter((p) => p.status !== 'offline').length} online):
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {presenceList.map((user) => {
                const isOnline = user.status === 'online';
                return (
                  <div
                    key={user.userId}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-lg border border-border/60 bg-muted/20 text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="relative">
                      <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center border border-primary/30">
                        {user.userName.charAt(0)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background ${
                          isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-foreground block text-[11px] leading-tight">
                        {user.userName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px] block">
                        {user.currentLocation.activity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Collaboration Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Documents Selector & Activity Feed */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Engineering Docs
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {documents.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5">
              {documents.map((doc) => {
                const isSelected = activeDoc.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => selectDocument(doc)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/40 bg-muted/10 hover:bg-muted/30 hover:border-border'
                    }`}
                  >
                    <div className="font-semibold text-foreground truncate">{doc.title}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-mono">
                      <span>CRDT v{doc.version}</span>
                      <span>{doc.lastModifiedBy.split(' ')[0]}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Activity Feed Box */}
          <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Live Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5 max-h-[300px] overflow-y-auto">
              {activityFeed.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg border border-border/40 bg-muted/10 text-[11px] space-y-0.5"
                >
                  <div className="flex items-center justify-between text-muted-foreground font-mono text-[10px]">
                    <span className="font-bold text-foreground">{item.actorName}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-muted-foreground leading-snug">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Collaborative Document Editor */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-border/80 bg-card/60 backdrop-blur-xl flex flex-col min-h-[580px]">
            {/* Editor Header Bar */}
            <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary shrink-0" />
                  {activeDoc.title}
                </CardTitle>
                <CardDescription className="text-[11px] font-mono mt-0.5 flex items-center gap-2">
                  <span>Version {activeDoc.version}</span>
                  <span>•</span>
                  <span>Modified by {activeDoc.lastModifiedBy}</span>
                </CardDescription>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    activeTab === 'editor' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                    activeTab === 'history' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <History className="h-3 w-3" />
                  History
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col space-y-3">
              {/* CRDT Synchronization Status Banner */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/60 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>CRDT Converged (v{activeDoc.version})</span>
                </div>
                {typingUser && (
                  <span className="text-blue-400 flex items-center gap-1.5 animate-pulse text-[11px]">
                    <Sparkles className="h-3 w-3" />
                    {typingUser} is typing...
                  </span>
                )}
              </div>

              {/* Editor Workspace */}
              {activeTab === 'editor' && (
                <div className="relative flex-1 flex flex-col">
                  <textarea
                    value={docContent}
                    onChange={(e) => handleDocChange(e.target.value)}
                    rows={18}
                    className="w-full flex-1 p-3 rounded-lg bg-background/90 border border-border/80 font-mono text-xs text-foreground focus:outline-none focus:border-primary transition-colors resize-y leading-relaxed font-normal"
                    placeholder="Type collaborative markdown..."
                  />

                  {/* Simulated multiplayer cursor badge */}
                  <div className="absolute top-10 right-4 px-2 py-0.5 rounded bg-indigo-600/90 text-white font-mono text-[10px] shadow-md flex items-center gap-1 animate-bounce">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    Priya Patel
                  </div>
                </div>
              )}

              {/* Version History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Version Snapshots & Timelines
                  </span>
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      onClick={() => setSelectedSnapshot(snap)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedSnapshot?.id === snap.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border/60 bg-muted/10 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium text-foreground">
                        <span className="font-bold">v{snap.version}: {snap.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(snap.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{snap.summary}</p>
                      <div className="text-[10px] text-primary font-mono mt-1">Author: {snap.modifiedBy}</div>
                    </div>
                  ))}

                  {selectedSnapshot && (
                    <div className="p-3 rounded-lg bg-background/90 border border-border font-mono text-xs space-y-2 mt-3">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Snapshot Preview (v{selectedSnapshot.version})</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDocContent(selectedSnapshot.content);
                            setActiveTab('editor');
                          }}
                          className="h-6 text-[10px] font-mono"
                        >
                          Rewind to this version
                        </Button>
                      </div>
                      <pre className="text-muted-foreground max-h-[140px] overflow-y-auto whitespace-pre-wrap">
                        <code>{selectedSnapshot.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Threaded Comments & @Mentions */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/80 bg-card/60 backdrop-blur-xl flex flex-col h-[580px]">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Comments & Mentions ({comments.length})
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 flex-1 flex flex-col justify-between space-y-3 overflow-hidden">
              {/* Comments Thread List */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-2.5 rounded-lg border border-border/50 bg-muted/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-[11px]">{comment.authorName}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {comment.content.split(' ').map((word, i) => {
                        if (word.startsWith('@')) {
                          return (
                            <span key={i} className="text-primary font-semibold font-mono">
                              {word}{' '}
                            </span>
                          );
                        }
                        return word + ' ';
                      })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick Mention Pill Buttons */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <AtSign className="h-3 w-3 text-primary" />
                  Quick Mention:
                  {['rajesh', 'rahul', 'priya', 'alex'].map((name) => (
                    <button
                      key={name}
                      onClick={() => insertMention(name)}
                      className="px-1.5 py-0.5 rounded bg-muted/40 hover:bg-primary/20 hover:text-primary transition-colors text-[10px] font-mono"
                    >
                      @{name}
                    </button>
                  ))}
                </div>

                {/* Comment Input Box */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                    placeholder="Add comment with @mention..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary font-sans"
                  />
                  <Button
                    size="sm"
                    onClick={handlePostComment}
                    disabled={!newCommentText.trim()}
                    className="h-8 px-2.5 bg-primary text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
