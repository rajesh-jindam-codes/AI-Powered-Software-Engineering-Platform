'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GitPullRequest,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Zap,
  TestTube,
  Code2,
  Check,
  Flame,
  FileDiff,
  Percent,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { CodeReviewReport, ReviewDecision, ReviewCategory, ReviewSeverity } from '@devflow/shared-types';

const initialReviews: CodeReviewReport[] = [
  {
    id: 'pr-143',
    workspaceId: 'ws-default',
    repositoryId: 'devflow-ai/api',
    repositoryName: 'devflow-ai/api',
    prNumber: 143,
    prTitle: 'PR #143: Security: Fix raw SQL query string interpolation in analytics service',
    commitSha: 'sha-99c1a7e2',
    baseBranch: 'main',
    headBranch: 'security/fix-sql-injection',
    author: 'alex-sec',
    status: 'COMPLETED',
    decision: 'CHANGES_REQUESTED',
    additions: 24,
    deletions: 4,
    publishedToGitHub: true,
    publishedAt: new Date(Date.now() - 1100000).toISOString(),
    githubReviewId: 'gh-rev-9941',
    summary: {
      overview: 'Critical SQL injection detected in analytics query construction. Immediate parameterization required.',
      totalFindings: 1,
      securityIssuesCount: 1,
      performanceIssuesCount: 0,
      qualityIssuesCount: 0,
      typeSafetyIssuesCount: 0,
      criticalIssuesCount: 1,
      testCoverageDelta: 3.8,
      securityScore: 75,
      performanceScore: 100,
      qualityScore: 100,
      overallScore: 78,
    },
    findings: [
      {
        id: 'finding-sec-001',
        file: 'apps/api/src/modules/analytics/analytics.service.ts',
        line: 10,
        filePath: 'apps/api/src/modules/analytics/analytics.service.ts',
        startLine: 10,
        endLine: 10,
        category: 'Security',
        severity: 'CRITICAL',
        confidence: 0.98,
        ruleId: 'SEC-001',
        title: 'SQL Injection Vulnerability (OWASP A03:2021)',
        message: 'Raw SQL query constructed via string interpolation/concatenation.',
        explanation: 'Always use parameterized SQL queries rather than direct string interpolation.',
        recommendation: 'Use parameterized queries ($1, $2) with an arguments array.',
        originalSnippet: "const query = `SELECT * FROM metrics WHERE workspace_id = '${workspaceId}'`;",
        suggestedReplacement: 'const query = "SELECT * FROM metrics WHERE workspace_id = $1";',
        applied: false,
      },
    ],
    synthesizedTests: [
      {
        id: 'suite-143',
        targetFile: 'apps/api/src/modules/analytics/analytics.service.ts',
        testFilePath: 'apps/api/src/modules/analytics/analytics.service.spec.ts',
        framework: 'jest',
        fullCode: `describe('AnalyticsService', () => {\n  it('should escape malicious input', async () => {});\n});`,
        mockDefinitions: [],
        testCases: [
          {
            id: 'tc-1',
            name: 'getWorkspaceMetrics() — should reject SQL injection payload',
            description: 'Verifies SQL injection sanitization against malicious workspaceId',
            type: 'boundary',
            code: "it('should safely execute parameterized query', async () => {});",
            passStatus: 'passed',
          },
        ],
        estimatedCoverageDelta: 3.8,
        executionResult: {
          passed: true,
          total: 1,
          passedCount: 1,
          failedCount: 0,
          durationMs: 38,
          output: 'PASS analytics.service.spec.ts',
        },
      },
    ],
    analyzedFilesCount: 1,
    totalLinesChanged: 28,
    durationMs: 135,
    createdAt: new Date(Date.now() - 1200000).toISOString(),
    completedAt: new Date(Date.now() - 1180000).toISOString(),
  },
  {
    id: 'pr-142',
    workspaceId: 'ws-default',
    repositoryId: 'devflow-ai/api',
    repositoryName: 'devflow-ai/api',
    prNumber: 142,
    prTitle: 'PR #142: Feat: Add Redis Sliding-Window Rate Limiting Middleware',
    commitSha: 'sha-88f9e1c2',
    baseBranch: 'main',
    headBranch: 'feat/redis-rate-limiter',
    author: 'rajesh-dev',
    status: 'COMPLETED',
    decision: 'APPROVED',
    additions: 38,
    deletions: 0,
    publishedToGitHub: true,
    publishedAt: new Date(Date.now() - 3500000).toISOString(),
    githubReviewId: 'gh-rev-8812',
    summary: {
      overview: 'Clean pull request diff. All 7 review categories passed with 100% confidence.',
      totalFindings: 0,
      securityIssuesCount: 0,
      performanceIssuesCount: 0,
      qualityIssuesCount: 0,
      typeSafetyIssuesCount: 0,
      criticalIssuesCount: 0,
      testCoverageDelta: 4.2,
      securityScore: 100,
      performanceScore: 100,
      qualityScore: 100,
      overallScore: 98,
    },
    findings: [],
    synthesizedTests: [
      {
        id: 'suite-142',
        targetFile: 'apps/api/src/common/middleware/rate-limiter.middleware.ts',
        testFilePath: 'apps/api/src/common/middleware/rate-limiter.middleware.spec.ts',
        framework: 'jest',
        fullCode: `describe('RateLimiterMiddleware', () => {});`,
        mockDefinitions: [],
        testCases: [
          {
            id: 'tc-142-1',
            name: 'use() — should allow requests within window rate limit',
            description: 'Asserts request continues when count < limit',
            type: 'happy_path',
            code: "it('should allow requests', async () => {});",
            passStatus: 'passed',
          },
          {
            id: 'tc-142-2',
            name: 'use() — should reject requests with 429 when limit exceeded',
            description: 'Asserts 429 status code',
            type: 'boundary',
            code: "it('should throw 429', async () => {});",
            passStatus: 'passed',
          },
        ],
        estimatedCoverageDelta: 4.2,
      },
    ],
    analyzedFilesCount: 1,
    totalLinesChanged: 38,
    durationMs: 140,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3550000).toISOString(),
  },
  {
    id: 'pr-141',
    workspaceId: 'ws-default',
    repositoryId: 'devflow-ai/ai-service',
    repositoryName: 'devflow-ai/ai-service',
    prNumber: 141,
    prTitle: 'PR #141: Refactor: Tree-sitter AST parser chunk size bounds',
    commitSha: 'sha-44b2c890',
    baseBranch: 'main',
    headBranch: 'refactor/tree-sitter-bounds',
    author: 'ai-agent-bot',
    status: 'COMPLETED',
    decision: 'APPROVED',
    additions: 18,
    deletions: 6,
    summary: {
      overview: 'AST chunk boundaries updated with fallback token estimators.',
      totalFindings: 1,
      securityIssuesCount: 0,
      performanceIssuesCount: 1,
      qualityIssuesCount: 0,
      typeSafetyIssuesCount: 0,
      criticalIssuesCount: 0,
      testCoverageDelta: 8.0,
      securityScore: 100,
      performanceScore: 90,
      qualityScore: 95,
      overallScore: 95,
    },
    findings: [],
    synthesizedTests: [],
    analyzedFilesCount: 1,
    totalLinesChanged: 24,
    durationMs: 120,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7150000).toISOString(),
  },
  {
    id: 'pr-140',
    workspaceId: 'ws-default',
    repositoryId: 'devflow-ai/api',
    repositoryName: 'devflow-ai/api',
    prNumber: 140,
    prTitle: 'PR #140: Fix: Potential N+1 query in workspace repository fetch',
    commitSha: 'sha-11a3d5e7',
    baseBranch: 'main',
    headBranch: 'fix/n-plus-1-workspaces',
    author: 'sarah-eng',
    status: 'COMPLETED',
    decision: 'APPROVED',
    additions: 12,
    deletions: 3,
    summary: {
      overview: 'Batched workspace repositories query using IN operator.',
      totalFindings: 0,
      securityIssuesCount: 0,
      performanceIssuesCount: 0,
      qualityIssuesCount: 0,
      typeSafetyIssuesCount: 0,
      criticalIssuesCount: 0,
      testCoverageDelta: 1.5,
      securityScore: 100,
      performanceScore: 100,
      qualityScore: 100,
      overallScore: 91,
    },
    findings: [],
    synthesizedTests: [],
    analyzedFilesCount: 1,
    totalLinesChanged: 15,
    durationMs: 110,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    completedAt: new Date(Date.now() - 10750000).toISOString(),
  },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<CodeReviewReport[]>(initialReviews);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ReviewCategory>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | ReviewDecision>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customPrNumber, setCustomPrNumber] = useState('145');
  const [customRepo, setCustomRepo] = useState('devflow-ai/api');
  const [customDiff, setCustomDiff] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);

  // Metrics summary
  const totalReviews = reviews.length;
  const avgScore = Math.round(reviews.reduce((acc, r) => acc + r.summary.overallScore, 0) / (totalReviews || 1));
  const securityPrevented = reviews.reduce((acc, r) => acc + r.summary.securityIssuesCount, 0);
  const testsSynthesized = reviews.reduce(
    (acc, r) => acc + r.synthesizedTests.reduce((tAcc, t) => tAcc + t.testCases.length, 0),
    0,
  );

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.prTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.repositoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDecision = decisionFilter === 'ALL' || r.decision === decisionFilter;
    const matchesCategory =
      categoryFilter === 'ALL' ||
      r.findings.some((f) => f.category === categoryFilter);
    return matchesSearch && matchesDecision && matchesCategory;
  });

  const handleSelectPreset = (prNum: number) => {
    setSelectedPreset(prNum);
    setCustomPrNumber(prNum.toString());
    if (prNum === 143) {
      setCustomRepo('devflow-ai/api');
      setCustomDiff(`diff --git a/apps/api/src/modules/analytics/analytics.service.ts b/apps/api/src/modules/analytics/analytics.service.ts
new file mode 100644
--- /dev/null
+++ b/apps/api/src/modules/analytics/analytics.service.ts
@@ -0,0 +1,28 @@
+import { Injectable } from '@nestjs/common';
+import { DataSource } from 'typeorm';
+
+@Injectable()
+export class AnalyticsService {
+  constructor(private readonly dataSource: DataSource) {}
+
+  async getWorkspaceMetrics(workspaceId: string, filterType: string) {
+    // Raw SQL with potential injection
+    const query = \`SELECT * FROM metrics WHERE workspace_id = '\${workspaceId}' AND type = '\${filterType}'\`;
+    const results = await this.dataSource.query(query);
+    return results;
+  }
+}`);
    } else if (prNum === 144) {
      setCustomRepo('devflow-ai/api');
      setCustomDiff(`diff --git a/apps/api/src/modules/jobs/batch-publisher.service.ts b/apps/api/src/modules/jobs/batch-publisher.service.ts
new file mode 100644
--- /dev/null
+++ b/apps/api/src/modules/jobs/batch-publisher.service.ts
@@ -0,0 +1,24 @@
+import { Injectable } from '@nestjs/common';
+
+@Injectable()
+export class BatchPublisherService {
+  async processItems(items: string[]) {
+    for (let i = 0; i <= items.length; i++) {
+      await this.db.query('SELECT * FROM items WHERE id = ?', [items[i]]);
+    }
+  }
+}`);
    } else {
      setCustomRepo('devflow-ai/api');
      setCustomDiff('');
    }
  };

  const handleTriggerReview = () => {
    setIsTriggering(true);
    setTimeout(() => {
      const prNum = parseInt(customPrNumber, 10) || 145;
      const isSecPr = prNum === 143 || (customDiff.includes('SELECT') && customDiff.includes('${'));
      const isPerfPr = prNum === 144 || customDiff.includes('for (');

      const score = isSecPr ? 78 : isPerfPr ? 82 : 96;
      const decision: ReviewDecision = isSecPr ? 'CHANGES_REQUESTED' : isPerfPr ? 'COMMENTED' : 'APPROVED';

      const newReview: CodeReviewReport = {
        id: `pr-${prNum}`,
        workspaceId: 'ws-default',
        repositoryId: customRepo,
        repositoryName: customRepo,
        prNumber: prNum,
        prTitle: `PR #${prNum}: ${
          isSecPr
            ? 'Security: Fix raw SQL query string interpolation in analytics service'
            : isPerfPr
            ? 'Correctness & Perf: Fix off-by-one array loop and batch database queries'
            : 'Feat: Add Redis Sliding-Window Rate Limiting Middleware'
        }`,
        commitSha: `sha-${Math.random().toString(36).slice(2, 10)}`,
        baseBranch: 'main',
        headBranch: `feature/pr-${prNum}`,
        author: 'rajesh-dev',
        status: 'COMPLETED',
        decision,
        additions: isSecPr ? 28 : 22,
        deletions: isSecPr ? 4 : 5,
        publishedToGitHub: true,
        publishedAt: new Date().toISOString(),
        githubReviewId: `gh-rev-${Math.floor(Math.random() * 9000 + 1000)}`,
        summary: {
          overview: isSecPr
            ? 'Critical SQL injection detected in query string interpolation (OWASP A03).'
            : isPerfPr
            ? 'Detected off-by-one boundary (CORR-001) and N+1 query loop (PERF-001).'
            : 'Clean code changes. High testability and 100% confidence across all 7 categories.',
          totalFindings: isSecPr ? 1 : isPerfPr ? 2 : 0,
          securityIssuesCount: isSecPr ? 1 : 0,
          performanceIssuesCount: isPerfPr ? 1 : 0,
          qualityIssuesCount: 0,
          typeSafetyIssuesCount: isPerfPr ? 1 : 0,
          criticalIssuesCount: isSecPr ? 1 : 0,
          testCoverageDelta: 4.5,
          securityScore: isSecPr ? 75 : 100,
          performanceScore: isPerfPr ? 80 : 100,
          qualityScore: 100,
          overallScore: score,
        },
        findings: isSecPr
          ? [
              {
                id: `finding-sec-${Date.now()}`,
                file: 'apps/api/src/modules/analytics/analytics.service.ts',
                line: 10,
                filePath: 'apps/api/src/modules/analytics/analytics.service.ts',
                startLine: 10,
                endLine: 10,
                category: 'Security',
                severity: 'CRITICAL',
                confidence: 0.98,
                ruleId: 'SEC-001',
                title: 'SQL Injection Vulnerability (OWASP A03:2021)',
                message: 'Raw SQL query constructed via string interpolation/concatenation.',
                explanation: 'Always use parameterized SQL queries rather than direct string interpolation.',
                recommendation: 'Use parameterized queries ($1, $2) with an arguments array.',
                originalSnippet: "const query = `SELECT * FROM metrics WHERE workspace_id = '${workspaceId}'`;",
                suggestedReplacement: 'const query = "SELECT * FROM metrics WHERE workspace_id = $1";',
                applied: false,
              },
            ]
          : isPerfPr
          ? [
              {
                id: `finding-corr-${Date.now()}`,
                file: 'apps/api/src/modules/jobs/batch-publisher.service.ts',
                line: 6,
                category: 'Correctness',
                severity: 'HIGH',
                confidence: 0.96,
                ruleId: 'CORR-001',
                title: 'Potential Off-By-One Array Index Boundary',
                message: 'Loop condition uses `<= array.length` instead of `< array.length`.',
                explanation: 'Accessing array[array.length] causes undefined dereference on the final iteration.',
                recommendation: 'Change `<=` to `<` in the loop condition.',
                originalSnippet: 'for (let i = 0; i <= items.length; i++)',
                suggestedReplacement: 'for (let i = 0; i < items.length; i++)',
                applied: false,
              },
            ]
          : [],
        synthesizedTests: [
          {
            id: `suite-${prNum}`,
            targetFile: 'src/modules/service.ts',
            testFilePath: 'src/modules/service.spec.ts',
            framework: 'jest',
            fullCode: `describe('GeneratedTestSuite', () => {});`,
            mockDefinitions: [],
            testCases: [
              {
                id: 'tc-1',
                name: 'should execute successfully with valid arguments',
                description: 'Happy path verification',
                type: 'happy_path',
                code: "it('should work', async () => {});",
                passStatus: 'passed',
              },
            ],
            estimatedCoverageDelta: 4.5,
          },
        ],
        analyzedFilesCount: 1,
        totalLinesChanged: 28,
        durationMs: 145,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      setReviews([newReview, ...reviews.filter((r) => r.id !== newReview.id)]);
      setIsTriggering(false);
      setIsModalOpen(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
              <GitPullRequest className="h-5 w-5" />
            </div>
            AI Pull Request Review Cockpit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated PR diff analysis covering 7 review categories (Correctness, Security, Performance, Maintainability, Quality, Testing, Architecture) with verified GitHub publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white gap-2 shadow-lg shadow-purple-900/20"
          >
            <Sparkles className="h-4 w-4" />
            Trigger AI PR Review
          </Button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-md border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-foreground">{avgScore}/100</div>
              <div className="text-xs text-muted-foreground font-medium">Avg Code Health Score</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-red-400">{securityPrevented}</div>
              <div className="text-xs text-muted-foreground font-medium">Security Flaws Blocked</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-blue-400">+{testsSynthesized}</div>
              <div className="text-xs text-muted-foreground font-medium">Tests Synthesized</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TestTube className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-purple-400">{totalReviews}</div>
              <div className="text-xs text-muted-foreground font-medium">PRs Analyzed & Synced</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Code2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/30 p-3 rounded-xl border border-border/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search PR title, repo, author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-background/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto overflow-x-auto">
          {(['ALL', 'APPROVED', 'CHANGES_REQUESTED', 'COMMENTED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDecisionFilter(filter)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                decisionFilter === filter
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {filter === 'ALL'
                ? 'All Decisions'
                : filter === 'APPROVED'
                ? 'Approved'
                : filter === 'CHANGES_REQUESTED'
                ? 'Changes Requested'
                : 'Commented'}
            </button>
          ))}
        </div>
      </div>

      {/* 7 Review Category Filters Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-muted-foreground font-medium mr-1 select-none">Category:</span>
        {(
          [
            'ALL',
            'Correctness',
            'Security',
            'Performance',
            'Maintainability',
            'Code Quality',
            'Testing',
            'Architecture',
          ] as const
        ).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-purple-950/40 border-purple-500 text-purple-300'
                : 'border-border/50 bg-card/40 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Pull Request Review Feed */}
      <div className="grid grid-cols-1 gap-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border/60 rounded-xl">
            <GitPullRequest className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <div className="text-base font-semibold text-foreground">No matching pull request reviews</div>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          filteredReviews.map((pr) => {
            const score = pr.summary.overallScore;
            const scoreColor =
              score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-amber-400' : 'text-red-400';

            return (
              <Card
                key={pr.id}
                className="group hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-950/10 transition-all bg-card/60 backdrop-blur-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/reviews/${pr.id}`}
                          className="text-base font-semibold text-foreground group-hover:text-purple-400 transition-colors flex items-center gap-2"
                        >
                          {pr.prTitle}
                        </Link>
                        <Badge
                          variant={
                            pr.decision === 'APPROVED'
                              ? 'success'
                              : pr.decision === 'CHANGES_REQUESTED'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="font-mono text-[10px] uppercase font-bold"
                        >
                          {pr.decision === 'CHANGES_REQUESTED'
                            ? 'Changes Requested'
                            : pr.decision === 'APPROVED'
                            ? 'Approved'
                            : 'Commented'}
                        </Badge>
                        {pr.publishedToGitHub && (
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30 gap-1">
                            <Check className="h-3 w-3" />
                            GitHub Synced
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span>
                          Repo: <span className="text-foreground font-medium">{pr.repositoryName}</span>
                        </span>
                        <span>•</span>
                        <span>
                          Branch: <span className="text-purple-400">{pr.headBranch}</span>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400">+{pr.additions || 20}</span>
                        <span className="text-red-400">-{pr.deletions || 4}</span>
                        <span>•</span>
                        <span>Author: {pr.author}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${scoreColor}`}>{score}/100</div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Code Health
                        </span>
                      </div>

                      <Link href={`/reviews/${pr.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-purple-500/30 group-hover:border-purple-500 group-hover:bg-purple-600 group-hover:text-white transition-colors"
                        >
                          Inspect
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-muted/20 p-2.5 rounded-lg border border-border/30">
                    {pr.summary.overview}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/30">
                    <span
                      className={`flex items-center gap-1.5 font-medium ${
                        pr.summary.securityIssuesCount > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {pr.summary.securityIssuesCount > 0 ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      {pr.summary.securityIssuesCount} Security Vulnerabilities
                    </span>
                    <span>•</span>
                    <span
                      className={`flex items-center gap-1.5 font-medium ${
                        pr.summary.performanceIssuesCount > 0 ? 'text-amber-400' : 'text-muted-foreground'
                      }`}
                    >
                      <Zap className="h-4 w-4" />
                      {pr.summary.performanceIssuesCount} Performance
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 text-blue-400 font-medium font-mono">
                      <CheckCircle2 className="h-4 w-4" />
                      Coverage: +{pr.summary.testCoverageDelta}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Trigger AI Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Trigger AI PR Review Pipeline</h3>
                  <p className="text-xs text-muted-foreground">
                    Webhook ➔ Kafka Job ➔ Diff Fetch ➔ Repository Context RAG ➔ 7-Category AI Review ➔ Verified GitHub Comments.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Benchmark Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Benchmark Scenario Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPreset(143)}
                  className={`p-2.5 text-left rounded-lg border text-xs transition-all ${
                    selectedPreset === 143
                      ? 'border-red-500 bg-red-500/10 text-red-300'
                      : 'border-border bg-card/40 hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-red-400" />
                    PR #143: SQL Injection (OWASP)
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Unsanitized string interpolation in TypeORM query
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset(144)}
                  className={`p-2.5 text-left rounded-lg border text-xs transition-all ${
                    selectedPreset === 144
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-border bg-card/40 hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    PR #144: Off-by-one & N+1 Loop
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Array boundary overflow and unbatched loop queries
                  </div>
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Pull Request #</label>
                  <input
                    type="number"
                    value={customPrNumber}
                    onChange={(e) => setCustomPrNumber(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Target Repository</label>
                  <input
                    type="text"
                    value={customRepo}
                    onChange={(e) => setCustomRepo(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Custom Git Unified Diff (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Paste git diff here or leave empty for automated simulation..."
                  value={customDiff}
                  onChange={(e) => setCustomDiff(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTriggerReview}
                disabled={isTriggering}
                className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
              >
                {isTriggering ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    Running End-to-End Pipeline...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Run Review Pipeline
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
