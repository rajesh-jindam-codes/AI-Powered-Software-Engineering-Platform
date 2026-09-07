-- =========================================================
-- DEVFLOW AI — Phase 5 Repository Ingestion Schema (005_repository_ingestion_schema.sql)
-- =========================================================

-- 1. Repository Files Table
CREATE TABLE IF NOT EXISTS repository_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path VARCHAR(1024) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    language VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    sha VARCHAR(64) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'indexed' CHECK (status IN ('indexed', 'ignored', 'binary', 'failed')),
    last_ingested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (repository_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_repo_files_repo ON repository_files(repository_id);
CREATE INDEX IF NOT EXISTS idx_repo_files_path ON repository_files(repository_id, file_path);
CREATE INDEX IF NOT EXISTS idx_repo_files_lang ON repository_files(language);
CREATE INDEX IF NOT EXISTS idx_repo_files_sha ON repository_files(repository_id, sha);

-- 2. Enhance Code Chunks Table
ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES repository_files(id) ON DELETE CASCADE;
ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS tokens_count INTEGER;
ALTER TABLE code_chunks ALTER COLUMN embedding DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_code_chunks_file ON code_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_type ON code_chunks(repository_id, chunk_type);
CREATE INDEX IF NOT EXISTS idx_code_chunks_lines ON code_chunks(repository_id, file_path, start_line, end_line);

-- 3. Symbols Table (AST Identifiers, Functions, Classes, Interfaces, Tables)
CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_id UUID REFERENCES repository_files(id) ON DELETE CASCADE,
    file_path VARCHAR(1024) NOT NULL,
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(50) NOT NULL CHECK (kind IN ('function', 'class', 'interface', 'method', 'variable', 'type', 'enum', 'table', 'view', 'procedure')),
    container_name VARCHAR(255),
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    signature TEXT,
    docstring TEXT,
    is_exported BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_symbols_repo ON symbols(repository_id);
CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_id);
CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(repository_id, kind);
CREATE INDEX IF NOT EXISTS idx_symbols_trgm ON symbols USING gin (name gin_trgm_ops);

-- 4. Dependencies Table (Internal imports and External package dependencies)
CREATE TABLE IF NOT EXISTS dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_file_id UUID REFERENCES repository_files(id) ON DELETE CASCADE,
    source_file_path VARCHAR(1024) NOT NULL,
    target_module VARCHAR(1024) NOT NULL,
    dependency_type VARCHAR(50) NOT NULL CHECK (dependency_type IN ('internal', 'external')),
    imported_symbols JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_deps_repo ON dependencies(repository_id);
CREATE INDEX IF NOT EXISTS idx_deps_source ON dependencies(source_file_id);
CREATE INDEX IF NOT EXISTS idx_deps_target ON dependencies(target_module);

-- 5. Ingestion Jobs Table (Asynchronous Execution Tracking)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    total_files INTEGER NOT NULL DEFAULT 0,
    processed_files INTEGER NOT NULL DEFAULT 0,
    total_chunks INTEGER NOT NULL DEFAULT 0,
    total_symbols INTEGER NOT NULL DEFAULT 0,
    total_dependencies INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_repo ON ingestion_jobs(repository_id, status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_workspace ON ingestion_jobs(workspace_id);
