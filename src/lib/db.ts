// =============================================================================
// Prisma Client Singleton
// =============================================================================
// Next.js (especially in dev with HMR) re-imports modules frequently. If we
// naively did `new PrismaClient()` at the top of every file that needs it,
// we would spawn a fresh connection pool on every hot-reload and eventually
// exhaust MongoDB's connection limit.
//
// The singleton pattern below caches the client on the `globalThis` object in
// development, and creates exactly one instance in production.
//
// Always import `prisma` from this file — never `new PrismaClient()` directly.
// =============================================================================

import { PrismaClient } from '@prisma/client';

// Augment the Node.js global scope so TypeScript knows about our cached client.
// `var` (not `let`/`const`) is required here because `globalThis` uses var semantics.
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * The single Prisma Client instance shared across the whole Next.js app.
 *
 * - In development, we reuse `globalThis.prismaGlobal` so hot-reload doesn't
 *   create a new connection pool on every save.
 * - In production, each server instance gets its own client (one per Node process).
 *
 * Logging: only log errors + warnings by default. Enable `'query'` temporarily
 * when debugging slow queries; it's very noisy in production.
 */
export const prisma: PrismaClient =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

// Cache the client in dev so HMR reuses it
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
