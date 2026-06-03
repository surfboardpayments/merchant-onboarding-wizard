import type Database from "better-sqlite3";

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      token TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      person_name TEXT NOT NULL,
      person_email TEXT NOT NULL,
      company_name TEXT,
      person_data TEXT,
      email_html TEXT,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      reference_number TEXT UNIQUE,
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      confirmation_email_html TEXT,
      submitted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      application_id TEXT,
      actor TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_app ON audit_log(application_id);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at DESC);
  `);
}
