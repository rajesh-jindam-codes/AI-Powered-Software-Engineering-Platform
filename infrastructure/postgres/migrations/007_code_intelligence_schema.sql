-- =========================================================
-- DEVFLOW AI — Phase 7 Code Intelligence & Repository Graph Schema (007_code_intelligence_schema.sql)
-- =========================================================

-- 1. Code Graph Nodes Table
CREATE TABLE IF NOT EXISTS code_graph_nodes (
    id VARCHAR(255) PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    node_type VARCHAR(50) NOT NULL CHECK (node_type IN (
        'FILE',
        'CLASS',
        'FUNCTION',
        'INTERFACE',
        'API_ENDPOINT',
        'DB_MODEL',
        'AUTH_GUARD',
        'CONFIG_SCHEMA',
        'TEST_SUITE'
    )),
    name VARCHAR(512) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    start_line INTEGER,
    end_line INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_repo ON code_graph_nodes(repository_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON code_graph_nodes(repository_id, node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_path ON code_graph_nodes(repository_id, file_path);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_name ON code_graph_nodes(name);

-- 2. Code Graph Edges Table
CREATE TABLE IF NOT EXISTS code_graph_edges (
    id VARCHAR(255) PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_node_id VARCHAR(255) NOT NULL REFERENCES code_graph_nodes(id) ON DELETE CASCADE,
    target_node_id VARCHAR(255) NOT NULL REFERENCES code_graph_nodes(id) ON DELETE CASCADE,
    edge_type VARCHAR(50) NOT NULL CHECK (edge_type IN (
        'IMPORTS',
        'DEFINES',
        'CALLS',
        'EXTENDS',
        'IMPLEMENTS',
        'ACCESSES_DB',
        'PROTECTED_BY',
        'TESTS'
    )),
    weight NUMERIC NOT NULL DEFAULT 1.0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (repository_id, source_node_id, target_node_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_repo ON code_graph_edges(repository_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON code_graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON code_graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_type ON code_graph_edges(repository_id, edge_type);

-- 3. Code Intelligence Domain Metadata Table
CREATE TABLE IF NOT EXISTS code_intel_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'api_endpoint',
        'db_model',
        'auth_pattern',
        'config_pattern',
        'test_suite'
    )),
    entity_name VARCHAR(512) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    start_line INTEGER,
    end_line INTEGER,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_intel_meta_repo ON code_intel_metadata(repository_id, category);
CREATE INDEX IF NOT EXISTS idx_intel_meta_path ON code_intel_metadata(repository_id, file_path);
