// =============================================================================
// GraphQL Resolvers
// =============================================================================
// Each top-level key (Query, Mutation, custom types) maps a GraphQL field to
// the function that produces its value. Resolvers receive four arguments:
//   (parent, args, ctx, info)
// We rely only on `args` (the field arguments) and `ctx` (see context.ts).
//
// Flow for every mutation:
//   1. `requireRole(ctx, [...])` — access control (throws if wrong role).
//   2. `schema.safeParse(args.input)` — Zod input validation.
//   3. `prisma.$transaction(...)` when multiple writes must succeed together.
//   4. `writeAudit(...)` — immutable audit trail for ISO 9001 compliance.
//
// Relation fields (e.g. `Reel.component`) have dedicated resolvers so we can
// batch-friendly load them lazily. DataLoader is not wired up yet — if N+1
// becomes a problem, add a DataLoader-per-request in context.ts.
// =============================================================================

import { GraphQLError } from 'graphql';
import { GraphQLScalarType, Kind } from 'graphql';
import type { GqlContext } from './context';
import { requireRole, requireUser, badInput } from './auth';
import {
  supplierCreateInput,
  supplierUpdateInput,
  componentCreateInput,
  grnCreateInput,
  reelCreateInput,
  reelStatusUpdateInput,
  iqcCreateInput,
  ncrCreateInput,
  ncrUpdateInput,
  masterBomCreateInput,
  documentCreateInput,
  documentTransitionInput,
  userCreateInput,
  userUpdateInput,
} from '@/lib/validation';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Custom scalars
// ---------------------------------------------------------------------------

/**
 * DateTime scalar — accepts and returns ISO-8601 strings. Prisma already
 * returns JS `Date` objects; we serialize them to ISO format for the wire.
 */
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 UTC timestamp (e.g. "2026-04-15T12:34:56.000Z")',
  serialize(value) {
    return (value instanceof Date ? value : new Date(value as string)).toISOString();
  },
  parseValue(value) {
    return new Date(value as string);
  },
  parseLiteral(ast) {
    return ast.kind === Kind.STRING ? new Date(ast.value) : null;
  },
});

/**
 * JSON scalar — passes arbitrary objects through. Used for flexible fields
 * like IqcInspection.measurements where the shape varies per component type.
 */
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (v) => v,
  parseValue: (v) => v,
  parseLiteral(ast) {
    // Rebuild the JS value from the literal AST node
    const build = (node: any): any => {
      switch (node.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN:
          return node.value;
        case Kind.INT:
        case Kind.FLOAT:
          return parseFloat(node.value);
        case Kind.OBJECT:
          return Object.fromEntries(
            node.fields.map((f: any) => [f.name.value, build(f.value)])
          );
        case Kind.LIST:
          return node.values.map(build);
        case Kind.NULL:
          return null;
        default:
          return null;
      }
    };
    return build(ast);
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pagination defaults if the caller omits them. */
function pagination(p?: { take?: number; skip?: number }) {
  // Cap `take` at 100 so an oversized client query can't DoS the server.
  const take = Math.min(Math.max(p?.take ?? 20, 1), 100);
  const skip = Math.max(p?.skip ?? 0, 0);
  return { take, skip };
}

/** Build a PageInfo block from a total count and the requested page params. */
function pageInfo(total: number, take: number, skip: number) {
  return { total, take, skip, hasMore: skip + take < total };
}

/** Run a Zod parse, throwing a structured GraphQL error on failure. */
function parseOrThrow<T>(schema: { safeParse: (v: unknown) => any }, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) badInput('Input validation failed', r.error.flatten());
  return r.data as T;
}

/**
 * Append an audit row. Best-effort — we swallow errors here because losing
 * an audit row should not fail the main mutation. Production should replace
 * the catch with an alert to Sentry/pino.
 */
async function writeAudit(
  ctx: GqlContext,
  args: {
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
    reelId?: string;
  }
) {
  if (!ctx.user) return;
  try {
    await ctx.prisma.auditLog.create({
      data: {
        userId: ctx.user.id,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        oldValue: (args.oldValue as Prisma.InputJsonValue) ?? undefined,
        newValue: (args.newValue as Prisma.InputJsonValue) ?? undefined,
        reelId: args.reelId,
      },
    });
  } catch (e) {
    // Intentional: audit failures never block the primary write.
    console.error('[audit] failed to write log row', e);
  }
}

// ===========================================================================
// RESOLVERS
// ===========================================================================

export const resolvers = {
  // -------------------------------------------------------------------------
  // Scalars
  // -------------------------------------------------------------------------
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  // -------------------------------------------------------------------------
  // Query root — read side of the API
  // -------------------------------------------------------------------------
  Query: {
    // Auth
    me: (_p: unknown, _a: unknown, ctx: GqlContext) =>
      ctx.user ? ctx.prisma.user.findUnique({ where: { id: ctx.user.id } }) : null,

    // Admin — user management. `requireRole(ctx, [])` enforces ADMIN-only since
    // the role helper auto-promotes ADMIN even with an empty allow list.
    users: (_p: unknown, _a: unknown, ctx: GqlContext) => {
      requireRole(ctx, []);
      return ctx.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    },
    user: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireRole(ctx, []);
      return ctx.prisma.user.findUnique({ where: { id: a.id } });
    },

    // Purchase
    suppliers: async (_p: unknown, a: { page?: any }, ctx: GqlContext) => {
      requireUser(ctx);
      const { take, skip } = pagination(a.page);
      const [nodes, total] = await ctx.prisma.$transaction([
        ctx.prisma.supplier.findMany({ take, skip, orderBy: { createdAt: 'desc' } }),
        ctx.prisma.supplier.count(),
      ]);
      return { nodes, pageInfo: pageInfo(total, take, skip) };
    },
    supplier: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.supplier.findUnique({ where: { id: a.id } });
    },

    // Components (part master)
    components: async (_p: unknown, a: { page?: any }, ctx: GqlContext) => {
      requireUser(ctx);
      const { take, skip } = pagination(a.page);
      const [nodes, total] = await ctx.prisma.$transaction([
        ctx.prisma.component.findMany({ take, skip, orderBy: { partNumber: 'asc' } }),
        ctx.prisma.component.count(),
      ]);
      return { nodes, pageInfo: pageInfo(total, take, skip) };
    },
    component: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.component.findUnique({ where: { id: a.id } });
    },

    // Store / Inventory — reels
    reels: async (
      _p: unknown,
      a: { filter?: { status?: any; componentId?: string; location?: string }; page?: any },
      ctx: GqlContext
    ) => {
      requireUser(ctx);
      const { take, skip } = pagination(a.page);
      const where: Prisma.ReelWhereInput = {
        status: a.filter?.status ?? undefined,
        componentId: a.filter?.componentId ?? undefined,
        location: a.filter?.location ?? undefined,
      };
      const [nodes, total] = await ctx.prisma.$transaction([
        ctx.prisma.reel.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
        ctx.prisma.reel.count({ where }),
      ]);
      return { nodes, pageInfo: pageInfo(total, take, skip) };
    },
    reel: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.reel.findUnique({ where: { id: a.id } });
    },

    // GRN
    grns: async (
      _p: unknown,
      a: { filter?: { status?: string; supplierId?: string }; page?: any },
      ctx: GqlContext
    ) => {
      requireUser(ctx);
      const { take, skip } = pagination(a.page);
      const where: Prisma.GrnWhereInput = {
        status: a.filter?.status ?? undefined,
        supplierId: a.filter?.supplierId ?? undefined,
      };
      const [nodes, total] = await ctx.prisma.$transaction([
        ctx.prisma.grn.findMany({ where, take, skip, orderBy: { receivedDate: 'desc' } }),
        ctx.prisma.grn.count({ where }),
      ]);
      return { nodes, pageInfo: pageInfo(total, take, skip) };
    },
    grn: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.grn.findUnique({ where: { id: a.id } });
    },

    // Quality
    iqcInspection: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.iqcInspection.findUnique({ where: { id: a.id } });
    },
    ncrs: async (_p: unknown, a: { page?: any }, ctx: GqlContext) => {
      requireUser(ctx);
      const { take, skip } = pagination(a.page);
      const [nodes, total] = await ctx.prisma.$transaction([
        ctx.prisma.ncrRecord.findMany({ take, skip, orderBy: { createdAt: 'desc' } }),
        ctx.prisma.ncrRecord.count(),
      ]);
      return { nodes, pageInfo: pageInfo(total, take, skip) };
    },
    ncr: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.ncrRecord.findUnique({ where: { id: a.id } });
    },

    // Production
    masterBoms: (_p: unknown, _a: unknown, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.masterBom.findMany({ orderBy: { productCode: 'asc' } });
    },
    masterBom: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.masterBom.findUnique({ where: { id: a.id } });
    },

    // Documents / Admin
    documents: (_p: unknown, a: { status?: any }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.document.findMany({
        where: a.status ? { status: a.status } : undefined,
        orderBy: { updatedAt: 'desc' },
      });
    },
    document: (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      requireUser(ctx);
      return ctx.prisma.document.findUnique({ where: { id: a.id } });
    },
    auditLogs: (_p: unknown, a: { entityType?: string; entityId?: string }, ctx: GqlContext) => {
      // Only admins can read the global audit trail
      requireRole(ctx, []);
      return ctx.prisma.auditLog.findMany({
        where: { entityType: a.entityType, entityId: a.entityId },
        orderBy: { timestamp: 'desc' },
        take: 200,
      });
    },
  },

  // -------------------------------------------------------------------------
  // Mutation root — write side of the API
  // -------------------------------------------------------------------------
  Mutation: {
    // ---- Admin: user management ------------------------------------------
    createUser: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      requireRole(ctx, []); // ADMIN-only
      const data = parseOrThrow<any>(userCreateInput, a.input);
      const existing = await ctx.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) badInput('A user with this email already exists');
      const passwordHash = await bcrypt.hash(data.password, 10);
      const row = await ctx.prisma.user.create({
        data: {
          email: data.email,
          name: data.name ?? null,
          role: data.role,
          password: passwordHash,
        },
      });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'User',
        entityId: row.id,
        // Never audit the hashed password.
        newValue: { email: row.email, name: row.name, role: row.role },
      });
      return row;
    },

    updateUser: async (_p: unknown, a: { id: string; input: any }, ctx: GqlContext) => {
      requireRole(ctx, []);
      const patch = parseOrThrow<any>(userUpdateInput, a.input);
      const before = await ctx.prisma.user.findUnique({ where: { id: a.id } });
      if (!before) badInput('User not found');
      const data: Prisma.UserUpdateInput = {
        email: patch.email ?? undefined,
        name: patch.name ?? undefined,
        role: patch.role ?? undefined,
      };
      if (patch.password) {
        data.password = await bcrypt.hash(patch.password, 10);
      }
      const row = await ctx.prisma.user.update({ where: { id: a.id }, data });
      await writeAudit(ctx, {
        action: 'UPDATE',
        entityType: 'User',
        entityId: row.id,
        oldValue: { email: before!.email, name: before!.name, role: before!.role },
        newValue: { email: row.email, name: row.name, role: row.role, passwordReset: !!patch.password },
      });
      return row;
    },

    deleteUser: async (_p: unknown, a: { id: string }, ctx: GqlContext) => {
      const actor = requireRole(ctx, []);
      // Guard — you cannot delete your own account.
      if (actor.id === a.id) badInput('You cannot delete your own account');
      const before = await ctx.prisma.user.findUnique({ where: { id: a.id } });
      if (!before) badInput('User not found');
      await ctx.prisma.user.delete({ where: { id: a.id } });
      await writeAudit(ctx, {
        action: 'DELETE',
        entityType: 'User',
        entityId: a.id,
        oldValue: { email: before!.email, name: before!.name, role: before!.role },
      });
      return true;
    },

    // ---- Purchase ---------------------------------------------------------
    createSupplier: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      const user = requireRole(ctx, ['PURCHASE']);
      const data = parseOrThrow<any>(supplierCreateInput, a.input);
      const row = await ctx.prisma.supplier.create({ data });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'SUPPLIER',
        entityId: row.id,
        newValue: row,
      });
      return row;
    },
    updateSupplier: async (
      _p: unknown,
      a: { id: string; input: any },
      ctx: GqlContext
    ) => {
      requireRole(ctx, ['PURCHASE']);
      const data = parseOrThrow<any>(supplierUpdateInput, a.input);
      const oldValue = await ctx.prisma.supplier.findUnique({ where: { id: a.id } });
      if (!oldValue) throw new GraphQLError('Supplier not found', { extensions: { code: 'NOT_FOUND' } });
      const row = await ctx.prisma.supplier.update({ where: { id: a.id }, data });
      await writeAudit(ctx, {
        action: 'UPDATE',
        entityType: 'SUPPLIER',
        entityId: row.id,
        oldValue,
        newValue: row,
      });
      return row;
    },

    createComponent: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      requireRole(ctx, ['PURCHASE', 'STORE']);
      const data = parseOrThrow<any>(componentCreateInput, a.input);
      const row = await ctx.prisma.component.create({ data });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'COMPONENT',
        entityId: row.id,
        newValue: row,
      });
      return row;
    },

    // ---- Store ------------------------------------------------------------
    createGrn: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      requireRole(ctx, ['PURCHASE', 'STORE']);
      const input = parseOrThrow<any>(grnCreateInput, a.input);

      // Wrap GRN + nested GrnItems in a transaction so partial writes can't
      // leave orphan items in the collection.
      const row = await ctx.prisma.grn.create({
        data: {
          grnNumber: input.grnNumber,
          supplierId: input.supplierId,
          receivedDate: input.receivedDate ?? new Date(),
          items: {
            create: input.items.map((i: any) => ({
              componentId: i.componentId,
              declaredQty: i.declaredQty,
            })),
          },
        },
        include: { items: true },
      });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'GRN',
        entityId: row.id,
        newValue: row,
      });
      return row;
    },

    createReel: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      requireRole(ctx, ['STORE']);
      const data = parseOrThrow<any>(reelCreateInput, a.input);
      const row = await ctx.prisma.reel.create({ data });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'REEL',
        entityId: row.id,
        newValue: row,
        reelId: row.id,
      });
      return row;
    },

    updateReelStatus: async (
      _p: unknown,
      a: { id: string; status: any },
      ctx: GqlContext
    ) => {
      requireRole(ctx, ['STORE', 'QUALITY']);
      parseOrThrow<any>(reelStatusUpdateInput, { id: a.id, status: a.status });
      const oldValue = await ctx.prisma.reel.findUnique({ where: { id: a.id } });
      if (!oldValue) throw new GraphQLError('Reel not found', { extensions: { code: 'NOT_FOUND' } });
      const row = await ctx.prisma.reel.update({
        where: { id: a.id },
        data: { status: a.status },
      });
      await writeAudit(ctx, {
        action: 'UPDATE',
        entityType: 'REEL',
        entityId: row.id,
        oldValue,
        newValue: row,
        reelId: row.id,
      });
      return row;
    },

    // ---- Quality ----------------------------------------------------------
    createIqcInspection: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      const user = requireRole(ctx, ['QUALITY']);
      const input = parseOrThrow<any>(iqcCreateInput, a.input);

      // Two linked writes in one transaction:
      //   1. create the inspection row
      //   2. mark the related reels ACCEPTED or REJECTED based on PASS/FAIL
      // Either both succeed, or both are rolled back.
      const [row] = await ctx.prisma.$transaction(async (tx) => {
        const insp = await tx.iqcInspection.create({
          data: {
            grnItemId: input.grnItemId,
            inspectorId: user.id,
            status: input.status,
            measurements: input.measurements ?? undefined,
            remarks: input.remarks,
          },
        });
        // Find the GRN that owns this item, then the reels that came from it.
        const grnItem = await tx.grnItem.findUnique({
          where: { id: input.grnItemId },
          include: { grn: { include: { reels: true } } },
        });
        if (grnItem) {
          const newStatus = input.status === 'PASS' ? 'ACCEPTED' : 'REJECTED';
          await tx.reel.updateMany({
            where: {
              grnId: grnItem.grnId,
              componentId: grnItem.componentId,
              status: 'QUARANTINE',
            },
            data: { status: newStatus },
          });
        }
        return [insp];
      });

      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'IQC_INSPECTION',
        entityId: row.id,
        newValue: row,
      });
      return row;
    },

    createNcr: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      const user = requireRole(ctx, ['QUALITY']);
      const input = parseOrThrow<any>(ncrCreateInput, a.input);
      const row = await ctx.prisma.ncrRecord.create({
        data: { ...input, raisedById: user.id },
      });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'NCR',
        entityId: row.id,
        newValue: row,
        reelId: row.reelId,
      });
      return row;
    },

    updateNcr: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      requireRole(ctx, ['QUALITY']);
      const input = parseOrThrow<any>(ncrUpdateInput, a.input);
      const { id, ...patch } = input;
      const oldValue = await ctx.prisma.ncrRecord.findUnique({ where: { id } });
      if (!oldValue) throw new GraphQLError('NCR not found', { extensions: { code: 'NOT_FOUND' } });
      const row = await ctx.prisma.ncrRecord.update({ where: { id }, data: patch });
      await writeAudit(ctx, {
        action: 'UPDATE',
        entityType: 'NCR',
        entityId: row.id,
        oldValue,
        newValue: row,
        reelId: row.reelId,
      });
      return row;
    },

    // ---- Production -------------------------------------------------------
    createMasterBom: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      requireRole(ctx, ['PRODUCTION']);
      const input = parseOrThrow<any>(masterBomCreateInput, a.input);
      const row = await ctx.prisma.masterBom.create({
        data: {
          productName: input.productName,
          productCode: input.productCode,
          version: input.version,
          details: input.details,
          items: { create: input.items },
        },
        include: { items: true },
      });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'MASTER_BOM',
        entityId: row.id,
        newValue: row,
      });
      return row;
    },

    // ---- Documents --------------------------------------------------------
    createDocument: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      const user = requireUser(ctx);
      const data = parseOrThrow<any>(documentCreateInput, a.input);
      const row = await ctx.prisma.document.create({
        data: { ...data, authorId: user.id },
      });
      await writeAudit(ctx, {
        action: 'CREATE',
        entityType: 'DOCUMENT',
        entityId: row.id,
        newValue: row,
      });
      return row;
    },

    transitionDocument: async (_p: unknown, a: { input: any }, ctx: GqlContext) => {
      const user = requireRole(ctx, ['QUALITY']);
      const input = parseOrThrow<any>(documentTransitionInput, a.input);
      const { id, ...patch } = input;
      const oldValue = await ctx.prisma.document.findUnique({ where: { id } });
      if (!oldValue) throw new GraphQLError('Document not found', { extensions: { code: 'NOT_FOUND' } });

      // Set effectiveDate automatically when moving to APPROVED.
      // Relation fields must use Prisma's {connect} syntax in the checked
      // UpdateInput — not raw foreign-key scalars.
      const data: Prisma.DocumentUpdateInput = {
        status: patch.status,
        reviewer: patch.reviewerId ? { connect: { id: patch.reviewerId } } : undefined,
        approver: patch.approverId ? { connect: { id: patch.approverId } } : undefined,
        effectiveDate: patch.status === 'APPROVED' ? new Date() : undefined,
      };
      const row = await ctx.prisma.document.update({ where: { id }, data });
      await writeAudit(ctx, {
        action: 'TRANSITION',
        entityType: 'DOCUMENT',
        entityId: row.id,
        oldValue,
        newValue: row,
      });
      return row;
    },
  },

  // -------------------------------------------------------------------------
  // Relation resolvers — lazy-load nested objects
  // These keep the GraphQL types decoupled from Prisma's eager `include`.
  // -------------------------------------------------------------------------

  Supplier: {
    grns: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.grn.findMany({ where: { supplierId: p.id } }),
  },

  Component: {
    reels: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.reel.findMany({ where: { componentId: p.id } }),
  },

  Reel: {
    component: (p: { componentId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.component.findUnique({ where: { id: p.componentId } }),
    grn: (p: { grnId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.grn.findUnique({ where: { id: p.grnId } }),
    ncrRecords: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.ncrRecord.findMany({ where: { reelId: p.id } }),
  },

  Grn: {
    supplier: (p: { supplierId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.supplier.findUnique({ where: { id: p.supplierId } }),
    items: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.grnItem.findMany({ where: { grnId: p.id } }),
    reels: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.reel.findMany({ where: { grnId: p.id } }),
  },

  GrnItem: {
    grn: (p: { grnId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.grn.findUnique({ where: { id: p.grnId } }),
    component: (p: { componentId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.component.findUnique({ where: { id: p.componentId } }),
    iqc: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.iqcInspection.findUnique({ where: { grnItemId: p.id } }),
  },

  IqcInspection: {
    grnItem: (p: { grnItemId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.grnItem.findUnique({ where: { id: p.grnItemId } }),
    inspector: (p: { inspectorId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.user.findUnique({ where: { id: p.inspectorId } }),
  },

  NcrRecord: {
    reel: (p: { reelId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.reel.findUnique({ where: { id: p.reelId } }),
    raisedBy: (p: { raisedById: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.user.findUnique({ where: { id: p.raisedById } }),
  },

  Document: {
    author: (p: { authorId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.user.findUnique({ where: { id: p.authorId } }),
    reviewer: (p: { reviewerId: string | null }, _a: unknown, ctx: GqlContext) =>
      p.reviewerId ? ctx.prisma.user.findUnique({ where: { id: p.reviewerId } }) : null,
    approver: (p: { approverId: string | null }, _a: unknown, ctx: GqlContext) =>
      p.approverId ? ctx.prisma.user.findUnique({ where: { id: p.approverId } }) : null,
  },

  MasterBom: {
    items: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.bomItem.findMany({ where: { masterBomId: p.id } }),
  },

  BomItem: {
    masterBom: (p: { masterBomId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.masterBom.findUnique({ where: { id: p.masterBomId } }),
    component: (p: { componentId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.component.findUnique({ where: { id: p.componentId } }),
    alternates: (p: { id: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.bomAlternate.findMany({ where: { bomItemId: p.id } }),
  },

  BomAlternate: {
    bomItem: (p: { bomItemId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.bomItem.findUnique({ where: { id: p.bomItemId } }),
    component: (p: { componentId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.component.findUnique({ where: { id: p.componentId } }),
  },

  AuditLog: {
    user: (p: { userId: string }, _a: unknown, ctx: GqlContext) =>
      ctx.prisma.user.findUnique({ where: { id: p.userId } }),
  },
};
