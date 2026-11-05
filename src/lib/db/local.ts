// Local, zero-config data adapter backed by SQLite (better-sqlite3).
//
// This exists so PrintReady is fully runnable and demo-able without first
// provisioning a Supabase project (handy for local development, CI, and this
// sandbox preview). It mirrors the exact schema and semantics used by the
// production Supabase adapter (see supabase/migrations/0001_init.sql and
// lib/db/supabase.ts). To switch an environment to production Supabase,
// simply set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — see
// docs/DEPLOYMENT.md.
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import {
  AppUser,
  Project,
  Inspection,
  UsageSummary,
  AdminStats,
  DataAdapter,
  Payment,
} from "./types";
import { currentUsagePeriod, getPlan } from "../plans";

// On serverless hosts (e.g. Vercel) the deployed bundle's working directory
// is read-only, so the zero-config local demo DB would crash trying to
// create ./data there. Fall back to /tmp (writable, though ephemeral per
// instance) whenever we detect a serverless runtime and no explicit data
// dir was configured. For real production use, configure Supabase instead
// — see docs/DEPLOYMENT.md.
const DB_DIR =
  process.env.PRINTREADY_DATA_DIR ||
  (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? "/tmp/printready-data"
    : path.join(process.cwd(), "data"));
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, "printready.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  job_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  spec_key TEXT,
  spec_label TEXT,
  target_width_in REAL,
  target_height_in REAL,
  bleed_in REAL,
  margin_in REAL,
  page_count INTEGER NOT NULL,
  score INTEGER NOT NULL,
  critical_count INTEGER NOT NULL,
  warning_count INTEGER NOT NULL,
  info_count INTEGER NOT NULL,
  passed_checks INTEGER NOT NULL,
  total_checks INTEGER NOT NULL,
  issues_json TEXT NOT NULL,
  pages_json TEXT NOT NULL,
  thumbnails_json TEXT NOT NULL,
  is_encrypted INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS usage_counters (
  user_id TEXT NOT NULL,
  period TEXT NOT NULL,
  inspections_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS processing_failures (
  id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Additive, idempotent column migrations for DBs created before billing was
// added — SQLite has no "ADD COLUMN IF NOT EXISTS", so check pragma first.
(function migrateUserBillingColumns() {
  const cols = (db.prepare("PRAGMA table_info(users)").all() as any[]).map((c) => c.name);
  if (!cols.includes("billing_provider")) db.exec("ALTER TABLE users ADD COLUMN billing_provider TEXT");
  if (!cols.includes("billing_ref")) db.exec("ALTER TABLE users ADD COLUMN billing_ref TEXT");
  if (!cols.includes("plan_expires_at")) db.exec("ALTER TABLE users ADD COLUMN plan_expires_at TEXT");
})();

function rowToUser(row: any): AppUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    isAdmin: !!row.is_admin,
    createdAt: row.created_at,
    billingProvider: row.billing_provider || null,
    billingRef: row.billing_ref || null,
    planExpiresAt: row.plan_expires_at || null,
  };
}

function rowToPayment(row: any): Payment {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerRef: row.provider_ref,
    plan: row.plan,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
  };
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToInspection(row: any): Inspection {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    jobId: row.job_id,
    documentName: row.document_name,
    fileSizeBytes: row.file_size_bytes,
    specKey: row.spec_key,
    specLabel: row.spec_label,
    targetWidthIn: row.target_width_in,
    targetHeightIn: row.target_height_in,
    bleedIn: row.bleed_in,
    marginIn: row.margin_in,
    pageCount: row.page_count,
    score: row.score,
    criticalCount: row.critical_count,
    warningCount: row.warning_count,
    infoCount: row.info_count,
    passedChecks: row.passed_checks,
    totalChecks: row.total_checks,
    issues: JSON.parse(row.issues_json),
    pages: JSON.parse(row.pages_json),
    thumbnails: JSON.parse(row.thumbnails_json),
    isEncrypted: !!row.is_encrypted,
    blocked: !!row.blocked,
    createdAt: row.created_at,
  };
}

function seedAdminIfEmpty() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  if (count === 0) {
    const now = new Date().toISOString();
    const adminId = randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, plan, is_admin, created_at) VALUES (?,?,?,?,?,?,?)`
    ).run(adminId, "admin@printready.demo", bcrypt.hashSync("PrintReadyAdmin!2026", 10), "Demo Admin", "business", 1, now);

    const demoId = randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, plan, is_admin, created_at) VALUES (?,?,?,?,?,?,?)`
    ).run(demoId, "demo@printready.demo", bcrypt.hashSync("PrintReadyDemo!2026", 10), "Demo Creator", "pro", 0, now);

    const projId = randomUUID();
    db.prepare(
      `INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)`
    ).run(projId, demoId, "My First Novel — 6x9", now, now);
  }
}
seedAdminIfEmpty();

export const localAdapter: DataAdapter = {
  kind: "local",

  async registerUser(email, password, name) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
    if (existing) return { error: "An account with this email already exists." };
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    const id = randomUUID();
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, plan, is_admin, created_at) VALUES (?,?,?,?,?,?,?)`
    ).run(id, email.toLowerCase(), hash, name || null, "free", 0, now);
    return { user: rowToUser({ id, email: email.toLowerCase(), name, plan: "free", is_admin: 0, created_at: now }) };
  },

  async authenticate(email, password) {
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as any;
    if (!row) return { error: "Invalid email or password." };
    const valid = bcrypt.compareSync(password, row.password_hash);
    if (!valid) return { error: "Invalid email or password." };
    return { user: rowToUser(row) };
  },

  async getUserById(id) {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    return row ? rowToUser(row) : null;
  },

  async getUserByBillingRef(ref) {
    const row = db.prepare("SELECT * FROM users WHERE billing_ref = ?").get(ref) as any;
    return row ? rowToUser(row) : null;
  },

  async requestPasswordReset(email) {
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as any;
    if (!row) {
      // Do not reveal whether the account exists.
      return {};
    }
    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();
    db.prepare(`INSERT INTO password_reset_tokens (token, user_id, expires_at, used) VALUES (?,?,?,0)`)
      .run(token, row.id, expires);
    return { resetLink: `/reset-password/confirm?token=${token}` };
  },

  async resetPassword(token, newPassword) {
    const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token = ?").get(token) as any;
    if (!row || row.used || new Date(row.expires_at) < new Date()) {
      return { ok: false, error: "This reset link is invalid or has expired." };
    }
    if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
    db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE token = ?").run(token);
    return { ok: true };
  },

  async createProject(userId, name) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)`)
      .run(id, userId, name, now, now);
    return rowToProject({ id, user_id: userId, name, created_at: now, updated_at: now });
  },

  async listProjects(userId) {
    const rows = db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as any[];
    return rows.map((r) => {
      const agg = db.prepare(
        "SELECT COUNT(*) as c, MAX(created_at) as latest FROM inspections WHERE project_id = ?"
      ).get(r.id) as any;
      let latestScore: number | null = null;
      if (agg.latest) {
        const latestRow = db.prepare(
          "SELECT score FROM inspections WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
        ).get(r.id) as any;
        latestScore = latestRow ? latestRow.score : null;
      }
      return { ...rowToProject(r), inspectionCount: agg.c, latestScore };
    });
  },

  async renameProject(userId, id, name) {
    const row = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId) as any;
    if (!row) return null;
    const now = new Date().toISOString();
    db.prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?").run(name, now, id);
    return rowToProject({ ...row, name, updated_at: now });
  },

  async deleteProject(userId, id) {
    const info = db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId);
    return info.changes > 0;
  },

  async getProject(userId, id) {
    const row = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId) as any;
    return row ? rowToProject(row) : null;
  },

  async createInspection(input) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO inspections (
        id, user_id, project_id, job_id, document_name, file_size_bytes, spec_key, spec_label,
        target_width_in, target_height_in, bleed_in, margin_in, page_count, score,
        critical_count, warning_count, info_count, passed_checks, total_checks,
        issues_json, pages_json, thumbnails_json, is_encrypted, blocked, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      input.id, input.userId, input.projectId, input.jobId, input.documentName, input.fileSizeBytes,
      input.specKey, input.specLabel, input.targetWidthIn, input.targetHeightIn, input.bleedIn, input.marginIn,
      input.pageCount, input.score, input.criticalCount, input.warningCount, input.infoCount,
      input.passedChecks, input.totalChecks, JSON.stringify(input.issues), JSON.stringify(input.pages),
      JSON.stringify(input.thumbnails), input.isEncrypted ? 1 : 0, input.blocked ? 1 : 0, now
    );
    if (input.projectId) {
      db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, input.projectId);
    }
    return { ...input, createdAt: now };
  },

  async listInspections(userId, projectId) {
    const rows = projectId
      ? db.prepare("SELECT * FROM inspections WHERE user_id = ? AND project_id = ? ORDER BY created_at DESC").all(userId, projectId)
      : db.prepare("SELECT * FROM inspections WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    return (rows as any[]).map(rowToInspection);
  },

  async getInspection(userId, id) {
    const row = db.prepare("SELECT * FROM inspections WHERE id = ? AND user_id = ?").get(id, userId) as any;
    return row ? rowToInspection(row) : null;
  },

  async deleteInspection(userId, id) {
    const info = db.prepare("DELETE FROM inspections WHERE id = ? AND user_id = ?").run(id, userId);
    return info.changes > 0;
  },

  async reassignInspection(userId, id, projectId) {
    const info = db.prepare("UPDATE inspections SET project_id = ? WHERE id = ? AND user_id = ?").run(projectId, id, userId);
    return info.changes > 0;
  },

  async getUsage(userId) {
    const period = currentUsagePeriod();
    const row = db.prepare("SELECT * FROM usage_counters WHERE user_id = ? AND period = ?").get(userId, period) as any;
    const user = await this.getUserById(userId);
    const plan = getPlan(user?.plan);
    return {
      period,
      inspectionsUsed: row ? row.inspections_used : 0,
      inspectionsLimit: plan.inspectionsPerMonth,
    };
  },

  async incrementUsage(userId) {
    const period = currentUsagePeriod();
    db.prepare(
      `INSERT INTO usage_counters (user_id, period, inspections_used) VALUES (?, ?, 1)
       ON CONFLICT(user_id, period) DO UPDATE SET inspections_used = inspections_used + 1`
    ).run(userId, period);
  },

  async setUserPlan(userId, plan) {
    db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(plan, userId);
  },

  async activateSubscription(userId, { provider, providerRef, plan, expiresAt }) {
    db.prepare(
      "UPDATE users SET plan = ?, billing_provider = ?, billing_ref = ?, plan_expires_at = ? WHERE id = ?"
    ).run(plan, provider, providerRef, expiresAt ?? null, userId);
  },

  async cancelSubscription(userId) {
    db.prepare(
      "UPDATE users SET plan = 'free', billing_provider = NULL, billing_ref = NULL, plan_expires_at = NULL WHERE id = ?"
    ).run(userId);
  },

  async recordPayment(input) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO payments (id, user_id, provider, provider_ref, plan, amount, currency, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(id, input.userId, input.provider, input.providerRef, input.plan, input.amount, input.currency, input.status, createdAt);
    return { id, createdAt, ...input };
  },

  async listPayments(userId) {
    const rows = db.prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC").all(userId) as any[];
    return rows.map(rowToPayment);
  },

  async getPaymentByRef(providerRef) {
    const row = db.prepare("SELECT * FROM payments WHERE provider_ref = ? ORDER BY created_at DESC LIMIT 1").get(providerRef) as any;
    return row ? rowToPayment(row) : null;
  },

  async updatePaymentStatus(id, status) {
    db.prepare("UPDATE payments SET status = ? WHERE id = ?").run(status, id);
  },

  async recordProcessingFailure(reason) {
    db.prepare("INSERT INTO processing_failures (id, reason, created_at) VALUES (?,?,?)")
      .run(randomUUID(), reason, new Date().toISOString());
  },

  async getAdminStats() {
    const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
    const totalInspections = (db.prepare("SELECT COUNT(*) as c FROM inspections").get() as any).c;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const inspectionsLast30Days = (db.prepare("SELECT COUNT(*) as c FROM inspections WHERE created_at >= ?").get(since) as any).c;
    const processingFailures = (db.prepare("SELECT COUNT(*) as c FROM processing_failures").get() as any).c;

    const sizeRow = db.prepare("SELECT COALESCE(SUM(file_size_bytes),0) as s FROM inspections").get() as any;
    const storageUsedMb = Math.round((sizeRow.s / (1024 * 1024)) * 10) / 10;

    const planRows = db.prepare("SELECT plan, COUNT(*) as c FROM users GROUP BY plan").all() as any[];
    const planBreakdown: Record<string, number> = {};
    planRows.forEach((r) => (planBreakdown[r.plan] = r.c));

    const recentUsers = (db.prepare("SELECT email, created_at, plan FROM users ORDER BY created_at DESC LIMIT 8").all() as any[])
      .map((r) => ({ email: r.email, createdAt: r.created_at, plan: r.plan }));

    const recentInspections = (db.prepare(
      `SELECT i.document_name, i.score, i.created_at, u.email FROM inspections i
       JOIN users u ON u.id = i.user_id ORDER BY i.created_at DESC LIMIT 8`
    ).all() as any[]).map((r) => ({ documentName: r.document_name, score: r.score, createdAt: r.created_at, email: r.email }));

    const dailyRows = db.prepare(
      `SELECT substr(created_at, 1, 10) as day, COUNT(*) as c FROM inspections
       WHERE created_at >= ? GROUP BY day ORDER BY day ASC`
    ).all(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) as any[];
    const dailyMap = new Map(dailyRows.map((r) => [r.day, r.c]));
    const dailyInspections: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dailyInspections.push({ date: d.slice(5), count: dailyMap.get(d) || 0 });
    }

    // Real payment ledger only — never fabricated. All Freemius charges are
    // settled in USD, so this is a straight sum (no currency conversion).
    const paymentRows = db.prepare(
      `SELECT p.*, u.email FROM payments p JOIN users u ON u.id = p.user_id
       WHERE p.status = 'completed' ORDER BY p.created_at DESC`
    ).all() as any[];
    const totalRevenueUsd = Math.round(
      paymentRows.reduce((sum, r) => sum + r.amount, 0) * 100
    ) / 100;
    const recentPayments = paymentRows.slice(0, 8).map((r) => ({
      email: r.email, provider: r.provider, plan: r.plan, amount: r.amount, currency: r.currency,
      status: r.status, createdAt: r.created_at,
    }));

    return {
      totalUsers, totalInspections, inspectionsLast30Days, processingFailures, storageUsedMb,
      planBreakdown, recentUsers, recentInspections, dailyInspections, totalRevenueUsd, recentPayments,
    };
  },

  async listAllUsers() {
    const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as any[];
    return rows.map(rowToUser);
  },
};

export default localAdapter;
