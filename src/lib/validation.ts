import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const requestResetSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const confirmResetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required.").max(120),
});

export const projectRenameSchema = z.object({
  name: z.string().min(1, "Project name is required.").max(120),
});

export const SPEC_KEYS = ["8.5x11", "8x10", "8.5x8.5", "6x9", "5x8", "5.5x8.5", "7x10", "custom"] as const;

export const analyzeSchema = z.object({
  jobId: z.string().min(10),
  specKey: z.enum(SPEC_KEYS),
  customWidthIn: z.number().positive().max(60).nullable().optional(),
  customHeightIn: z.number().positive().max(60).nullable().optional(),
  bleedIn: z.number().min(0).max(1),
  marginIn: z.number().min(0).max(3),
  documentName: z.string().min(1).max(255),
  projectId: z.string().nullable().optional(),
});

export const MAX_UPLOAD_MB = 75;
