// Shared data-layer contracts. Both the local (SQLite) adapter used for
// zero-config development/demo, and the Supabase adapter used in production,
// implement these same interfaces so the rest of the app never needs to know
// which backend is active.

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro" | "business";
  isAdmin: boolean;
  createdAt: string;
  billingProvider?: "freemius" | null;
  billingRef?: string | null; // Freemius license ID
  planExpiresAt?: string | null; // null for auto-renewing Freemius subscriptions
}

export interface Payment {
  id: string;
  userId: string;
  provider: "freemius";
  providerRef: string;
  plan: "pro" | "business";
  amount: number;
  currency: "USD";
  status: "pending" | "completed" | "failed" | "cancelled";
  createdAt: string;
}

export interface Session {
  user: AppUser;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inspectionCount?: number;
  latestScore?: number | null;
}

export interface IssueRecord {
  id: string;
  category: string;
  category_label: string;
  severity: "critical" | "warning" | "info";
  page: number | null;
  title: string;
  explanation: string;
  recommendation: string;
  meta?: Record<string, unknown>;
}

export interface PageRecord {
  page: number;
  width_in: number;
  height_in: number;
  has_text: boolean;
  image_count: number;
  rotation: number;
}

export interface Inspection {
  id: string;
  userId: string;
  projectId: string | null;
  jobId: string;
  documentName: string;
  fileSizeBytes: number;
  specKey: string | null;
  specLabel: string | null;
  targetWidthIn: number | null;
  targetHeightIn: number | null;
  bleedIn: number | null;
  marginIn: number | null;
  pageCount: number;
  score: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passedChecks: number;
  totalChecks: number;
  issues: IssueRecord[];
  pages: PageRecord[];
  thumbnails: string[];
  isEncrypted: boolean;
  blocked: boolean;
  createdAt: string;
}

export interface UsageSummary {
  period: string;
  inspectionsUsed: number;
  inspectionsLimit: number | null;
}

export interface AdminStats {
  totalUsers: number;
  totalInspections: number;
  inspectionsLast30Days: number;
  processingFailures: number;
  storageUsedMb: number;
  planBreakdown: Record<string, number>;
  recentUsers: { email: string; createdAt: string; plan: string }[];
  recentInspections: { documentName: string; score: number; createdAt: string; email: string }[];
  dailyInspections: { date: string; count: number }[];
  totalRevenueUsd: number;
  recentPayments: { email: string; provider: string; plan: string; amount: number; currency: string; status: string; createdAt: string }[];
}

export interface DataAdapter {
  kind: "local" | "supabase";

  // --- auth ---
  registerUser(email: string, password: string, name?: string): Promise<{ user?: AppUser; error?: string }>;
  authenticate(email: string, password: string): Promise<{ user?: AppUser; error?: string }>;
  getUserById(id: string): Promise<AppUser | null>;
  getUserByBillingRef(ref: string): Promise<AppUser | null>;
  requestPasswordReset(email: string): Promise<{ resetLink?: string; error?: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ ok: boolean; error?: string }>;

  // --- projects ---
  createProject(userId: string, name: string): Promise<Project>;
  listProjects(userId: string): Promise<Project[]>;
  renameProject(userId: string, id: string, name: string): Promise<Project | null>;
  deleteProject(userId: string, id: string): Promise<boolean>;
  getProject(userId: string, id: string): Promise<Project | null>;

  // --- inspections ---
  createInspection(input: Omit<Inspection, "createdAt">): Promise<Inspection>;
  listInspections(userId: string, projectId?: string): Promise<Inspection[]>;
  getInspection(userId: string, id: string): Promise<Inspection | null>;
  deleteInspection(userId: string, id: string): Promise<boolean>;
  reassignInspection(userId: string, id: string, projectId: string | null): Promise<boolean>;

  // --- usage / billing ---
  getUsage(userId: string): Promise<UsageSummary>;
  incrementUsage(userId: string): Promise<void>;
  setUserPlan(userId: string, plan: "free" | "pro" | "business"): Promise<void>;
  activateSubscription(userId: string, input: {
    provider: "freemius";
    providerRef: string;
    plan: "pro" | "business";
    expiresAt?: string | null; // null/undefined = auto-renewing subscription
  }): Promise<void>;
  cancelSubscription(userId: string): Promise<void>;
  recordPayment(input: Omit<Payment, "id" | "createdAt">): Promise<Payment>;
  listPayments(userId: string): Promise<Payment[]>;
  getPaymentByRef(providerRef: string): Promise<Payment | null>;
  updatePaymentStatus(id: string, status: Payment["status"]): Promise<void>;

  // --- admin ---
  isFailure?(): void;
  recordProcessingFailure(reason: string): Promise<void>;
  getAdminStats(): Promise<AdminStats>;
  listAllUsers(): Promise<AppUser[]>;
}
