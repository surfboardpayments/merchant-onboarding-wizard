// ---------------------------------------------------------------------------
// Repository interface — the abstraction layer for swapping DB backends
// ---------------------------------------------------------------------------

export interface CreateInviteInput {
  token: string;
  applicationId: string;
  personId: string;
  personName: string;
  personEmail: string;
  companyName: string;
  personData: string; // JSON
  emailHtml: string;
  expiresAt: string; // ISO 8601
}

export interface InviteRow {
  token: string;
  application_id: string;
  person_id: string;
  person_name: string;
  person_email: string;
  company_name: string;
  person_data: string | null;
  email_html: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface InviteStatusResult {
  personId: string;
  status: string;
  completedAt?: string;
}

export interface CreateApplicationInput {
  id: string;
  referenceNumber: string;
  data: string; // JSON
  status: string;
  confirmationEmailHtml?: string;
  submittedAt: string;
}

export interface ApplicationRow {
  id: string;
  reference_number: string;
  data: string;
  status: string;
  confirmation_email_html: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface AuditLogInput {
  id: string;
  applicationId?: string;
  actor?: string;
  action: string;
  details?: string; // JSON
}

export interface AuditLogRow {
  id: string;
  application_id: string | null;
  actor: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export interface Repository {
  // Invites (used for inviting beneficial owners to complete their own details)
  createInvite(input: CreateInviteInput): void;
  getInvite(token: string): InviteRow | null;
  markInviteUsed(token: string): void;
  updateInvitePersonData(token: string, personData: string): void;
  getInviteStatuses(
    tokens: Array<{ personId: string; token: string }>,
  ): InviteStatusResult[];

  // Applications
  createApplication(input: CreateApplicationInput): void;
  getApplication(id: string): ApplicationRow | null;
  listApplications(limit?: number): ApplicationRow[];

  // Audit log
  appendAuditLog(input: AuditLogInput): void;
  listAuditLog(applicationId?: string, limit?: number): AuditLogRow[];

  // Maintenance
  clearAll(): void;
}

// ---------------------------------------------------------------------------
// Singleton factory — swap this to change the backend
// ---------------------------------------------------------------------------

import { createSqliteRepository } from "./sqlite";

let _repo: Repository | null = null;

export function getRepository(): Repository {
  if (!_repo) {
    _repo = createSqliteRepository();
  }
  return _repo;
}
