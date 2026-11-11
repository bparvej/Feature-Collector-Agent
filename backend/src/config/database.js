import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from './env.js';

const dbDirectory = path.dirname(env.dbPath);
fs.mkdirSync(dbDirectory, { recursive: true });

export const db = new Database(env.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const ensureDatabase = () => {
  const initSql = `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      extension TEXT,
      size_bytes INTEGER,
      mime_type TEXT,
      storage_path TEXT,
      upload_date TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT DEFAULT 'uploaded',
      parsing_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_contents (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      provider_name TEXT,
      model_name TEXT,
      config_snapshot TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_job_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(analysis_job_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_version_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT,
      source_document TEXT,
      evidence TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(analysis_version_id) REFERENCES analysis_versions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_version_id TEXT,
      feature_id TEXT,
      name TEXT NOT NULL,
      module TEXT,
      description TEXT,
      business_purpose TEXT,
      actor TEXT,
      preconditions TEXT,
      workflow TEXT,
      alternative_workflow TEXT,
      business_rules TEXT,
      inputs TEXT,
      outputs TEXT,
      dependencies TEXT,
      source_document TEXT,
      source_evidence TEXT,
      confidence_score REAL,
      implementation_status TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(analysis_version_id) REFERENCES analysis_versions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS business_rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_version_id TEXT,
      rule TEXT NOT NULL,
      category TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(analysis_version_id) REFERENCES analysis_versions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS test_scenarios (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_version_id TEXT,
      feature_id TEXT,
      scenario_name TEXT NOT NULL,
      scenario_type TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(analysis_version_id) REFERENCES analysis_versions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_version_id TEXT,
      feature_id TEXT,
      requirement_id TEXT,
      module TEXT,
      scenario TEXT,
      title TEXT NOT NULL,
      objective TEXT,
      preconditions TEXT,
      steps TEXT,
      test_data TEXT,
      expected_result TEXT,
      test_type TEXT,
      priority TEXT,
      execution_type TEXT,
      source_evidence TEXT,
      status TEXT DEFAULT 'NOT_EXECUTED',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(analysis_version_id) REFERENCES analysis_versions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS evidence_references (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_version_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      document_id TEXT,
      document_name TEXT,
      page_number TEXT,
      sheet_name TEXT,
      section_heading TEXT,
      paragraph_ref TEXT,
      excerpt TEXT,
      status TEXT DEFAULT 'explicit',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL,
      FOREIGN KEY(analysis_version_id) REFERENCES analysis_versions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS feature_testcase_links (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL,
      test_case_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analysis_provider_snapshots (
      id TEXT PRIMARY KEY,
      analysis_version_id TEXT,
      provider_name TEXT,
      model_name TEXT,
      config_snapshot TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exports (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_version_id TEXT,
      type TEXT NOT NULL,
      file_name TEXT,
      download_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS application_settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `;

  db.exec(initSql);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_features_project_id ON features(project_id);
    CREATE INDEX IF NOT EXISTS idx_test_cases_project_id ON test_cases(project_id);
    CREATE INDEX IF NOT EXISTS idx_requirement_project_id ON requirements(project_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_project_id ON evidence_references(project_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_versions_project_id ON analysis_versions(project_id);
  `);
};

ensureDatabase();
