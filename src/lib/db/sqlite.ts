import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { migrate } from "./schema";
import type {
  Repository,
  CreateInviteInput,
  InviteRow,
  InviteStatusResult,
  CreateApplicationInput,
  ApplicationRow,
  AuditLogInput,
  AuditLogRow,
} from "./index";

export function createSqliteRepository(): Repository {
  const dbPath = process.env.DATABASE_PATH || "./data/onboarding.db";

  // Ensure the directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run migrations
  migrate(db);

  // Prepared statements
  const stmts = {
    insertInvite: db.prepare(`
      INSERT INTO invites (token, application_id, person_id, person_name, person_email, company_name, person_data, email_html, expires_at)
      VALUES (@token, @applicationId, @personId, @personName, @personEmail, @companyName, @personData, @emailHtml, @expiresAt)
    `),
    getInvite: db.prepare(`SELECT * FROM invites WHERE token = ?`),
    markInviteUsed: db.prepare(
      `UPDATE invites SET used_at = datetime('now') WHERE token = ?`,
    ),
    updateInvitePersonData: db.prepare(
      `UPDATE invites SET person_data = ? WHERE token = ?`,
    ),

    insertApplication: db.prepare(`
      INSERT INTO applications (id, reference_number, data, status, confirmation_email_html, submitted_at)
      VALUES (@id, @referenceNumber, @data, @status, @confirmationEmailHtml, @submittedAt)
    `),
    getApplication: db.prepare(`SELECT * FROM applications WHERE id = ?`),
    listApplications: db.prepare(
      `SELECT * FROM applications ORDER BY created_at DESC LIMIT ?`,
    ),

    insertAudit: db.prepare(`
      INSERT INTO audit_log (id, application_id, actor, action, details)
      VALUES (@id, @applicationId, @actor, @action, @details)
    `),
    listAuditLog: db.prepare(`
      SELECT * FROM audit_log
      WHERE (@appId IS NULL OR application_id = @appId)
      ORDER BY created_at DESC LIMIT @limit
    `),
  };

  return {
    // ── Invites ──────────────────────────────────────────────────────────

    createInvite(input: CreateInviteInput): void {
      stmts.insertInvite.run(input);
    },

    getInvite(token: string): InviteRow | null {
      return (stmts.getInvite.get(token) as InviteRow) || null;
    },

    markInviteUsed(token: string): void {
      stmts.markInviteUsed.run(token);
    },

    updateInvitePersonData(token: string, personData: string): void {
      stmts.updateInvitePersonData.run(personData, token);
    },

    getInviteStatuses(
      tokens: Array<{ personId: string; token: string }>,
    ): InviteStatusResult[] {
      return tokens.map(({ personId, token }) => {
        const invite = stmts.getInvite.get(token) as InviteRow | undefined;
        if (!invite) return { personId, status: "not_started" };
        if (invite.used_at)
          return { personId, status: "completed", completedAt: invite.used_at };
        if (new Date(invite.expires_at) < new Date())
          return { personId, status: "expired" };
        return { personId, status: "invite_sent" };
      });
    },

    // ── Applications ─────────────────────────────────────────────────────

    createApplication(input: CreateApplicationInput): void {
      stmts.insertApplication.run(input);
    },

    getApplication(id: string): ApplicationRow | null {
      return (stmts.getApplication.get(id) as ApplicationRow) || null;
    },

    listApplications(limit = 500): ApplicationRow[] {
      return stmts.listApplications.all(limit) as ApplicationRow[];
    },

    // ── Audit log ───────────────────────────────────────────────────────

    appendAuditLog(input: AuditLogInput): void {
      stmts.insertAudit.run({
        applicationId: null,
        actor: null,
        details: null,
        ...input,
      });
    },

    listAuditLog(applicationId?: string, limit = 500): AuditLogRow[] {
      return stmts.listAuditLog.all({
        appId: applicationId ?? null,
        limit,
      }) as AuditLogRow[];
    },

    // ── Maintenance ─────────────────────────────────────────────────────

    clearAll(): void {
      db.exec(`DELETE FROM invites`);
      db.exec(`DELETE FROM applications`);
      db.exec(`DELETE FROM audit_log`);
    },
  };
}
