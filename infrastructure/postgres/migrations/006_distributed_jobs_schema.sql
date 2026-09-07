-- =========================================================
-- DEVFLOW AI — Phase 6 Distributed Job Processing Schema (006_distributed_jobs_schema.sql)
-- =========================================================

-- 1. Distributed Jobs Table
CREATE TABLE IF NOT EXISTS distributed_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN (
        'REPOSITORY_INDEX',
        'CODE_ANALYSIS',
        'EMBEDDING_GENERATION',
        'TEST_EXECUTION',
        'AI_REVIEW',
        'DOCUMENTATION'
    )),
    state VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (state IN (
        'QUEUED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'RETRYING',
        'CANCELLED',
        'DEAD_LETTER'
    )),
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4), -- 1: CRITICAL, 2: HIGH, 3: NORMAL, 4: LOW
    idempotency_key VARCHAR(255) UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error_details JSONB,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    attempt INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    backoff_ms INTEGER NOT NULL DEFAULT 1000,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    worker_id VARCHAR(100),
    lock_token VARCHAR(100),
    locked_until TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Fast Queue and Priority Polling Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_state_prio_next ON distributed_jobs(state, priority, next_run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_workspace ON distributed_jobs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_repo ON distributed_jobs(repository_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_worker_lease ON distributed_jobs(worker_id, locked_until) WHERE state = 'PROCESSING';
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency ON distributed_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_jobs_type_state ON distributed_jobs(job_type, state);

-- 2. Worker Heartbeats Table
CREATE TABLE IF NOT EXISTS worker_heartbeats (
    worker_id VARCHAR(100) PRIMARY KEY,
    worker_type VARCHAR(50) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    pid INTEGER NOT NULL,
    concurrency INTEGER NOT NULL DEFAULT 5,
    active_jobs INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ALIVE' CHECK (status IN ('ALIVE', 'BUSY', 'SHUTTING_DOWN', 'DEAD')),
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    processed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workers_heartbeat ON worker_heartbeats(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_workers_type_status ON worker_heartbeats(worker_type, status);

-- 3. Dead Worker Reclamation Stored Procedure
CREATE OR REPLACE FUNCTION reclaim_dead_worker_jobs(heartbeat_threshold_seconds INTEGER DEFAULT 15)
RETURNS TABLE (reclaimed_job_id UUID, reallocated_worker_id VARCHAR(100), previous_state VARCHAR(30)) AS $$
BEGIN
    -- Mark unresponsive workers as DEAD
    UPDATE worker_heartbeats
    SET status = 'DEAD'
    WHERE status != 'DEAD'
      AND last_heartbeat < (clock_timestamp() - (heartbeat_threshold_seconds || ' seconds')::INTERVAL);

    -- Reclaim jobs locked by dead workers
    RETURN QUERY
    UPDATE distributed_jobs j
    SET 
        state = CASE WHEN j.attempt < j.max_retries THEN 'RETRYING' ELSE 'DEAD_LETTER' END,
        error_details = jsonb_build_object(
            'message', 'Worker lease expired or worker crashed unexpectedly',
            'isRetryable', j.attempt < j.max_retries,
            'failedAt', clock_timestamp(),
            'attempt', j.attempt,
            'deadLetterReason', CASE WHEN j.attempt >= j.max_retries THEN 'Exceeded max retries after worker crash' ELSE NULL END
        ),
        worker_id = NULL,
        lock_token = NULL,
        locked_until = NULL,
        next_run_at = clock_timestamp() + (j.backoff_ms || ' milliseconds')::INTERVAL,
        updated_at = clock_timestamp()
    FROM worker_heartbeats w
    WHERE j.worker_id = w.worker_id
      AND j.state = 'PROCESSING'
      AND (w.status = 'DEAD' OR j.locked_until < clock_timestamp())
    RETURNING j.id, j.worker_id, j.state;
END;
$$ LANGUAGE plpgsql;
