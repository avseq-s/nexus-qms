// =============================================================================
// Zod Validation Schemas
// =============================================================================
// Every GraphQL mutation that accepts user input runs the payload through a
// Zod schema before touching the database. This gives us:
//   - Run-time safety (Prisma trusts types; users don't)
//   - Consistent error messages surfaced to the GraphQL client
//   - A single source of truth for "what fields are required and what shape"
//
// When adding a new mutation, define the input schema here, then call
// `schema.parse(args.input)` inside the resolver. On failure, Zod throws a
// `ZodError` which the GraphQL layer converts to a structured error.
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Common primitives
// -----------------------------------------------------------------------------

/** MongoDB ObjectId — exactly 24 hex characters. */
export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

/** Trimmed, non-empty string with a sensible max length. */
const text = (max = 500) =>
  z.string().trim().min(1, 'Required').max(max);

// -----------------------------------------------------------------------------
// User (admin-managed)
// -----------------------------------------------------------------------------
const roleEnum = z.enum(['ADMIN', 'QUALITY', 'STORE', 'PURCHASE', 'PRODUCTION']);

export const userCreateInput = z.object({
  email: z.string().email(),
  name: z.string().trim().max(200).optional().nullable(),
  role: roleEnum,
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const userUpdateInput = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().max(200).optional().nullable(),
  role: roleEnum.optional(),
  // Optional password reset — omit to leave unchanged.
  password: z.string().min(8).max(200).optional(),
});

// -----------------------------------------------------------------------------
// Supplier
// -----------------------------------------------------------------------------
export const supplierCreateInput = z.object({
  name: text(200),
  code: text(50),
  isApproved: z.boolean().default(false),
  performanceRating: z.number().min(0).max(100).default(0),
  contact: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  gstin: z.string().max(50).optional().nullable(),
  isIsoCertified: z.boolean().default(false),
});

export const supplierUpdateInput = supplierCreateInput.partial();

// -----------------------------------------------------------------------------
// Component (part master)
// -----------------------------------------------------------------------------
export const componentCreateInput = z.object({
  partNumber: text(100),
  description: text(500),
  category: text(50),
  // MSL 1–6 per IPC/JEDEC J-STD-033 (1 = unlimited, 6 = most sensitive)
  mslLevel: z.number().int().min(1).max(6).default(1),
  shelfLifeDays: z.number().int().positive().nullable().optional(),
});

// -----------------------------------------------------------------------------
// GRN (Goods Receipt Note) — Purchase → Store handoff
// -----------------------------------------------------------------------------
export const grnLineInput = z.object({
  componentId: objectId,
  declaredQty: z.number().int().positive(),
});

export const grnCreateInput = z.object({
  grnNumber: text(50),
  supplierId: objectId,
  receivedDate: z.coerce.date().optional(),
  items: z.array(grnLineInput).min(1, 'GRN must have at least one line item'),
});

// -----------------------------------------------------------------------------
// Reel — physical inventory unit
// -----------------------------------------------------------------------------
export const reelCreateInput = z.object({
  componentId: objectId,
  grnId: objectId,
  supplierLot: text(100),
  quantity: z.number().int().positive(),
  location: text(50).optional(),
  expiryDate: z.coerce.date().optional(),
});

export const reelStatusUpdateInput = z.object({
  id: objectId,
  status: z.enum([
    'QUARANTINE',
    'ACCEPTED',
    'REJECTED',
    'ISSUED',
    'CONSUMED',
    'SCRAPPED',
  ]),
});

// -----------------------------------------------------------------------------
// IQC Inspection — Quality module
// -----------------------------------------------------------------------------
export const iqcCreateInput = z.object({
  grnItemId: objectId,
  status: z.enum(['PASS', 'FAIL']),
  // `measurements` is intentionally loose — different components need different
  // measurement fields. Validate structure inside the resolver if needed.
  measurements: z.record(z.any()).optional(),
  remarks: z.string().max(2000).optional(),
});

// -----------------------------------------------------------------------------
// NCR — Non-Conformance Report
// -----------------------------------------------------------------------------
export const ncrCreateInput = z.object({
  ncrNumber: text(50),
  reelId: objectId,
  description: text(2000),
});

export const ncrUpdateInput = z.object({
  id: objectId,
  rootCause: z.string().max(2000).optional(),
  capa: z.string().max(2000).optional(),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CLOSED']).optional(),
});

// -----------------------------------------------------------------------------
// BOM — Bill of Materials (Production module)
// -----------------------------------------------------------------------------
export const bomItemInput = z.object({
  componentId: objectId,
  quantity: z.number().positive(),
  reference: z.string().max(200).optional(),
});

export const masterBomCreateInput = z.object({
  productName: text(200),
  productCode: text(50),
  version: text(20).default('Rev A'),
  details: z.string().max(2000).optional(),
  items: z.array(bomItemInput).min(1, 'BOM must have at least one item'),
});

// -----------------------------------------------------------------------------
// Document — ISO 9001 controlled document
// -----------------------------------------------------------------------------
export const documentCreateInput = z.object({
  title: text(200),
  version: text(20),
  content: text(100_000),
});

export const documentTransitionInput = z.object({
  id: objectId,
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE']),
  reviewerId: objectId.optional(),
  approverId: objectId.optional(),
});

// -----------------------------------------------------------------------------
// Dispatch — Production → Customer handoff
// -----------------------------------------------------------------------------
// Dispatch is currently represented on the client only. When we add a real
// Dispatch collection, this schema becomes the source of truth.
export const dispatchCreateInput = z.object({
  dispatchNumber: text(50),
  customerName: text(200),
  address: text(500),
  reelIds: z.array(objectId).min(1),
  notes: z.string().max(1000).optional(),
});
