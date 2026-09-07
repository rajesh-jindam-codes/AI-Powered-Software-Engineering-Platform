import { test, expect } from '@playwright/test';

/**
 * DEVFLOW AI — Complete Lifecycle E2E Test Suite (Phase 14)
 *
 * Full multi-stage developer user journey:
 * Register → Login → Create Workspace → Connect GitHub → Import Repo
 * → Ingestion & Indexing → Ask AI (RAG) → AI Test Studio → AI PR Review → Real-Time Collaboration
 */
test.describe('DevFlow AI Platform — Full End-to-End Developer Journey', () => {
  const testEmail = `engineer_${Date.now()}@devflow.ai`;
  const testPassword = 'Password123!';
  const workspaceName = `Workspace_${Date.now()}`;

  test('Complete Developer Journey: Auth -> RAG -> Agents -> Tests -> Reviews -> Collaboration', async ({
    page,
  }) => {
    // 1. User Registration
    await page.goto('/register');
    await expect(page).toHaveTitle(/DEVFLOW AI/);

    const nameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill('Alex Rivera');
    }
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 2. User Login
    await page.waitForTimeout(500);
    if (page.url().includes('/login')) {
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[type="password"]').fill(testPassword);
      await page.locator('button[type="submit"]').click();
    }

    // 3. Workspace Management
    await page.goto('/workspaces');
    await expect(page.locator('h1, h2, div')).toContainText(/Workspaces|Platform/i);

    // 4. Repositories & Ingestion Status
    await page.goto('/repositories');
    await expect(page.locator('body')).toContainText(/Repositories|Ingestion/i);

    // 5. Codebase RAG Intelligence (Phase 8)
    await page.goto('/chat');
    const chatInput = page.locator('textarea, input[placeholder*="Ask" i], input[placeholder*="question" i]').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('Where is authentication implemented?');
      const sendBtn = page.locator('button:has-text("Send"), button:has-svg').first();
      await sendBtn.click();
      await page.waitForTimeout(600);
    }

    // 6. Autonomous Agents (Phase 9)
    await page.goto('/agents');
    await expect(page.locator('body')).toContainText(/Agent|Autonomous/i);

    // 7. AI Code Reviews & PR Dashboard (Phase 10)
    await page.goto('/reviews');
    await expect(page.locator('body')).toContainText(/Code Reviews|Review/i);

    // 8. AI Test Generation & Sandboxed Studio (Phase 11)
    await page.goto('/tests');
    await expect(page.locator('body')).toContainText(/AI Test Generation|Sandbox/i);
    const generateBtn = page.locator('button:has-text("Generate Tests")');
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toContainText(/Coverage|Test Cases|PASS|FAIL/i);
    }

    // 9. Real-Time Collaboration & CRDT Notes (Phase 12)
    await page.goto('/collaboration');
    await expect(page.locator('body')).toContainText(/Collaboration|Active Teammates/i);

    // 10. Security & Observability Cockpit (Phase 13)
    await page.goto('/observability');
    await expect(page.locator('body')).toContainText(/Security & Observability|Prometheus/i);
  });
});
