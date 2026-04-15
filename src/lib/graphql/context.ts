// =============================================================================
// GraphQL Context
// =============================================================================
// The `context` object is passed as the 3rd argument to every resolver. We
// use it to:
//   - Expose the shared Prisma client (`ctx.prisma`)
//   - Expose the current authenticated user (`ctx.user`)
//
// Authentication is piggy-backed on NextAuth's JWT session cookie. Every
// request to /api/graphql carries that cookie; we call `getToken()` to decode
// it server-side and extract the user's id/email/role.
//
// If the cookie is missing or invalid, `ctx.user` is null. Resolvers that
// require auth must call `requireUser(ctx)` or `requireRole(ctx, [...])`
// from ./auth.ts before doing any work.
// =============================================================================

import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import type { Role, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';

/** Shape of the decoded NextAuth JWT used throughout the GraphQL layer. */
export interface GqlUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
}

export interface GqlContext {
  prisma: PrismaClient;
  user: GqlUser | null;
  /** Raw request — occasionally useful for IP/user-agent logging. */
  request: Request;
}

/**
 * Builds a fresh context for every GraphQL request.
 *
 * Yoga calls this with the incoming `Request` object. We decode the NextAuth
 * JWT (same secret as the rest of the app) and attach the user info.
 */
export async function createContext(req: Request): Promise<GqlContext> {
  // `getToken` works with either a NextRequest or a plain Request whose
  // headers include the NextAuth session cookie.
  const token = await getToken({
    req: req as unknown as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const user: GqlUser | null = token
    ? {
        // NextAuth stores `sub` for the id by default; we also set `id` in the
        // jwt callback in src/lib/auth.ts, so prefer that if present.
        id: (token.id as string) ?? (token.sub as string),
        email: token.email as string,
        name: (token.name as string | null) ?? null,
        role: token.role as Role,
      }
    : null;

  return {
    prisma,
    user,
    request: req,
  };
}
