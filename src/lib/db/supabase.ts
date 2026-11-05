// Production data adapter backed by Supabase (Postgres + Auth).
//
// Activated automatically whenever NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are present in the environment (see lib/db/index.ts).
// Run `supabase/migrations/0001_init.sql` against your project before use.
//
// Design notes for the next engineer:
// - `admin` uses the service-role key and is ONLY ever imported on the server
//   (API routes / server components) — never bundled client-side.
// - Table-level Row Level Security (RLS) policies are defined in the migration
//   as defense-in-depth: even though this adapter runs with elevated
//   privileges, every query is still explicitly filtered by user_id so the
//   same code is safe to adapt to a user-scoped client later if desired.
// - Supabase Auth (GoTrue) owns password hashing, session tokens, and password
//   reset email delivery — PrintReady never stores or sees raw passwords.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { AppUser, DataAdapter, Inspection, Payment, Project } from "./types";
import { currentUsagePeriod, getPlan } from "../plans";

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _admin;
}

function anon(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _anon;
}

function rowToProject(r: any): Project {
  return { id: r.id, userId: r.user_id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at };
}

function rowToInspection(r: any): Inspection {
  return {
    id: r.id, userId: r.user_id, projectId: r.project_id, jobId: r.job_id, documentName: r.document_name,
    fileSizeBytes: r.file_size_bytes, specKey: r.spec_key, specLabel: r.spec_label,
    targetWidthIn: r.target_width_in, targetHeightIn: r.target_height_in, bleedIn: r.bleed_in, marginIn: r.margin_in,
    pageCount: r.page_count, score: r.score, criticalCount: r.critical_count, warningCount: r.warning_count,
    infoCount: r.info_count, passedChecks: r.passed_checks, totalChecks: r.total_checks,
    issues: r.issues_json, pages: r.pages_json, thumbnails: r.thumbnails_json,
    isEncrypted: r.is_encrypted, blocked: r.blocked, createdAt: r.created_at,
  };
}

async function profileToAppUser(profileRow: any): Promise<AppUser> {
  return {
    id: profileRow.id,
    email: profileRow.email,
    name: profileRow.full_name,
    plan: profileRow.plan,
    isAdmin: profileRow.is_admin,
    createdAt: profileRow.created_at,
    billingProvider: profileRow.billing_provider || null,
    billingRef: profileRow.billing_ref || null,
    planExpiresAt: profileRow.plan_expires_at || null,
  };
}

function rowToPayment(r: any): Payment {
  return {
    id: r.id, userId: r.user_id, provider: r.provider, providerRef: r.provider_ref, plan: r.plan,
    amount: r.amount, currency: r.currency, status: r.status, createdAt: r.created_at,
  };
}

export const supabaseAdapter: DataAdapter = {
  kind: "supabase",

  async registerUser(email, password, name) {
    const { data, error } = await admin().auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name || null },
    });
    if (error || !data.user) return { error: error?.message || "Registration failed." };
    await admin().from("profiles").insert({
      id: data.user.id, email, full_name: name || null, plan: "free", is_admin: false,
    });
    return { user: { id: data.user.id, email, name: name || null, plan: "free", isAdmin: false, createdAt: new Date().toISOString() } };
  },

  async authenticate(email, password) {
    const { data, error } = await anon().auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: "Invalid email or password." };
    const { data: profile } = await admin().from("profiles").select("*").eq("id", data.user.id).single();
    if (!profile) return { error: "Account profile not found." };
    return { user: await profileToAppUser(profile) };
  },

  async getUserById(id) {
    const { data: profile } = await admin().from("profiles").select("*").eq("id", id).single();
    return profile ? await profileToAppUser(profile) : null;
  },

  async getUserByBillingRef(ref) {
    const { data: profile } = await admin().from("profiles").select("*").eq("billing_ref", ref).single();
    return profile ? await profileToAppUser(profile) : null;
  },

  async requestPasswordReset(email) {
    const { error } = await anon().auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/reset-password/confirm`,
    });
    if (error) return { error: error.message };
    return {}; // Supabase sends the email directly; no link to display.
  },

  async resetPassword(token, newPassword) {
    // With Supabase Auth, the reset flow exchanges the emailed token for a
    // session client-side, then calls supabase.auth.updateUser(). This stub
    // documents the expected production flow; see docs/DEPLOYMENT.md.
    return { ok: false, error: "Use supabase.auth.updateUser() client-side after following the emailed reset link." };
  },

  async createProject(userId, name) {
    const now = new Date().toISOString();
    const { data } = await admin().from("projects").insert({ user_id: userId, name }).select().single();
    return rowToProject(data);
  },

  async listProjects(userId) {
    const { data } = await admin().from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    const projects = (data || []).map(rowToProject);
    for (const p of projects) {
      const { count } = await admin().from("inspections").select("id", { count: "exact", head: true }).eq("project_id", p.id);
      p.inspectionCount = count || 0;
      const { data: latest } = await admin().from("inspections").select("score").eq("project_id", p.id).order("created_at", { ascending: false }).limit(1).single();
      p.latestScore = latest ? latest.score : null;
    }
    return projects;
  },

  async renameProject(userId, id, name) {
    const { data } = await admin().from("projects").update({ name, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select().single();
    return data ? rowToProject(data) : null;
  },

  async deleteProject(userId, id) {
    const { error, count } = await admin().from("projects").delete({ count: "exact" }).eq("id", id).eq("user_id", userId);
    return !error && (count || 0) > 0;
  },

  async getProject(userId, id) {
    const { data } = await admin().from("projects").select("*").eq("id", id).eq("user_id", userId).single();
    return data ? rowToProject(data) : null;
  },

  async createInspection(input) {
    const now = new Date().toISOString();
    const { data } = await admin().from("inspections").insert({
      id: input.id, user_id: input.userId, project_id: input.projectId, job_id: input.jobId,
      document_name: input.documentName, file_size_bytes: input.fileSizeBytes, spec_key: input.specKey,
      spec_label: input.specLabel, target_width_in: input.targetWidthIn, target_height_in: input.targetHeightIn,
      bleed_in: input.bleedIn, margin_in: input.marginIn, page_count: input.pageCount, score: input.score,
      critical_count: input.criticalCount, warning_count: input.warningCount, info_count: input.infoCount,
      passed_checks: input.passedChecks, total_checks: input.totalChecks, issues_json: input.issues,
      pages_json: input.pages, thumbnails_json: input.thumbnails, is_encrypted: input.isEncrypted, blocked: input.blocked,
    }).select().single();
    if (input.projectId) await admin().from("projects").update({ updated_at: now }).eq("id", input.projectId);
    return rowToInspection(data);
  },

  async listInspections(userId, projectId) {
    let q = admin().from("inspections").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (projectId) q = q.eq("project_id", projectId);
    const { data } = await q;
    return (data || []).map(rowToInspection);
  },

  async getInspection(userId, id) {
    const { data } = await admin().from("inspections").select("*").eq("id", id).eq("user_id", userId).single();
    return data ? rowToInspection(data) : null;
  },

  async deleteInspection(userId, id) {
    const { error, count } = await admin().from("inspections").delete({ count: "exact" }).eq("id", id).eq("user_id", userId);
    return !error && (count || 0) > 0;
  },

  async reassignInspection(userId, id, projectId) {
    const { error, count } = await admin().from("inspections").update({ project_id: projectId }, { count: "exact" }).eq("id", id).eq("user_id", userId);
    return !error && (count || 0) > 0;
  },

  async getUsage(userId) {
    const period = currentUsagePeriod();
    const { data } = await admin().from("usage_counters").select("*").eq("user_id", userId).eq("period", period).single();
    const user = await this.getUserById(userId);
    const plan = getPlan(user?.plan);
    return { period, inspectionsUsed: data ? data.inspections_used : 0, inspectionsLimit: plan.inspectionsPerMonth };
  },

  async incrementUsage(userId) {
    const period = currentUsagePeriod();
    await admin().rpc("increment_usage_counter", { p_user_id: userId, p_period: period });
  },

  async setUserPlan(userId, plan) {
    await admin().from("profiles").update({ plan }).eq("id", userId);
  },

  async activateSubscription(userId, { provider, providerRef, plan, expiresAt }) {
    await admin().from("profiles").update({
      plan, billing_provider: provider, billing_ref: providerRef, plan_expires_at: expiresAt ?? null,
    }).eq("id", userId);
  },

  async cancelSubscription(userId) {
    await admin().from("profiles").update({
      plan: "free", billing_provider: null, billing_ref: null, plan_expires_at: null,
    }).eq("id", userId);
  },

  async recordPayment(input) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await admin().from("payments").insert({
      id, user_id: input.userId, provider: input.provider, provider_ref: input.providerRef,
      plan: input.plan, amount: input.amount, currency: input.currency, status: input.status, created_at: createdAt,
    });
    return { id, createdAt, ...input };
  },

  async listPayments(userId) {
    const { data } = await admin().from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data || []).map(rowToPayment);
  },

  async getPaymentByRef(providerRef) {
    const { data } = await admin().from("payments").select("*").eq("provider_ref", providerRef).order("created_at", { ascending: false }).limit(1).single();
    return data ? rowToPayment(data) : null;
  },

  async updatePaymentStatus(id, status) {
    await admin().from("payments").update({ status }).eq("id", id);
  },

  async recordProcessingFailure(reason) {
    await admin().from("processing_failures").insert({ id: randomUUID(), reason });
  },

  async getAdminStats() {
    const { count: totalUsers } = await admin().from("profiles").select("id", { count: "exact", head: true });
    const { count: totalInspections } = await admin().from("inspections").select("id", { count: "exact", head: true });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: inspectionsLast30Days } = await admin().from("inspections").select("id", { count: "exact", head: true }).gte("created_at", since);
    const { count: processingFailures } = await admin().from("processing_failures").select("id", { count: "exact", head: true });
    const { data: sizeRows } = await admin().from("inspections").select("file_size_bytes");
    const storageUsedMb = Math.round(((sizeRows || []).reduce((s, r: any) => s + (r.file_size_bytes || 0), 0) / (1024 * 1024)) * 10) / 10;
    const { data: profiles } = await admin().from("profiles").select("plan, email, created_at").order("created_at", { ascending: false }).limit(50);
    const planBreakdown: Record<string, number> = {};
    (profiles || []).forEach((p: any) => (planBreakdown[p.plan] = (planBreakdown[p.plan] || 0) + 1));
    const recentUsers = (profiles || []).slice(0, 8).map((p: any) => ({ email: p.email, createdAt: p.created_at, plan: p.plan }));
    const { data: recent } = await admin().from("inspections").select("document_name, score, created_at, user_id").order("created_at", { ascending: false }).limit(8);
    const recentInspections = (recent || []).map((r: any) => ({ documentName: r.document_name, score: r.score, createdAt: r.created_at, email: "—" }));
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: dailyRows } = await admin().from("inspections").select("created_at").gte("created_at", since14);
    const dailyMap = new Map<string, number>();
    (dailyRows || []).forEach((r: any) => {
      const day = r.created_at.slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    });
    const dailyInspections: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dailyInspections.push({ date: d.slice(5), count: dailyMap.get(d) || 0 });
    }

    const { data: paymentRows } = await admin()
      .from("payments").select("*, profiles(email)").eq("status", "completed").order("created_at", { ascending: false });
    // All Freemius charges are settled in USD, so this is a straight sum.
    const totalRevenueUsd = Math.round(
      (paymentRows || []).reduce((sum: number, r: any) => sum + r.amount, 0) * 100
    ) / 100;
    const recentPayments = (paymentRows || []).slice(0, 8).map((r: any) => ({
      email: r.profiles?.email || "—", provider: r.provider, plan: r.plan, amount: r.amount,
      currency: r.currency, status: r.status, createdAt: r.created_at,
    }));

    return {
      totalUsers: totalUsers || 0, totalInspections: totalInspections || 0, inspectionsLast30Days: inspectionsLast30Days || 0,
      processingFailures: processingFailures || 0, storageUsedMb, planBreakdown, recentUsers, recentInspections, dailyInspections,
      totalRevenueUsd, recentPayments,
    };
  },

  async listAllUsers() {
    const { data } = await admin().from("profiles").select("*").order("created_at", { ascending: false });
    return Promise.all((data || []).map(profileToAppUser));
  },
};

export default supabaseAdapter;
