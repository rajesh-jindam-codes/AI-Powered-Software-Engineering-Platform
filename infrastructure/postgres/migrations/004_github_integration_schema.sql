-- =========================================================
-- DEVFLOW AI — Phase 4 GitHub Integration Migration (004_github_integration_schema.sql)
-- =========================================================

-- 1. GitHub Installations Table
CREATE TABLE IF NOT EXISTS github_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    github_user_id VARCHAR(100) NOT NULL,
    github_username VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    encrypted_access_token TEXT NOT NULL,
    token_type VARCHAR(50) NOT NULL DEFAULT 'bearer',
    scope TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (workspace_id, github_user_id)
);

CREATE INDEX IF NOT EXISTS idx_github_installations_workspace ON github_installations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_github_installations_gh_user ON github_installations(github_user_id);

-- 2. Enhance Repositories Table
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS owner VARCHAR(255);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS html_url TEXT;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS language VARCHAR(100);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS stars_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS forks_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS open_issues_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS github_metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS idx_repositories_workspace ON repositories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_repositories_github_repo_id ON repositories(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories(full_name);

-- 3. Webhook Deliveries Table (for audit, replay, and deduplication)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(255) PRIMARY KEY, -- GitHub X-GitHub-Delivery GUID
    event_type VARCHAR(100) NOT NULL,
    repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    signature VARCHAR(255),
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PROCESSED', 'IGNORED', 'FAILED')),
    error_message TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event_type, processed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_repo ON webhook_deliveries(repository_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_workspace ON webhook_deliveries(workspace_id);
