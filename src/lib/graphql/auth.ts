// =============================================================================
// GraphQL Authorization Helpers
// =============================================================================
// Resolvers call these guards at the top of any operation that should not be
// reachable anonymously or by the wrong role. They throw `GraphQLError`
// instances with extensions.code set to standard codes so clients can branch
// on error type ("UNAUTHENTICATED" vs "FORBIDDEN").
// =============================================================================

import { GraphQLError } from 'graphql';
import type { Role } from '@prisma/client';
import type { GqlContext, GqlUser } from './context';

/**
 * Assert that a user is logged in. Returns the user so the caller can use it
 * without another null-check:
 *
 *   const user = requireUser(ctx);
 *   // user.id is safe to use below
 */
export function requireUser(ctx: GqlContext): GqlUser {
  if (!ctx.user) {
    throw new GraphQLError('You must be signed in to perform this action.', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }
  return ctx.user;
}

/**
 * Assert that the logged-in user has one of the allowed roles. ADMIN always
 * passes regardless of the allowed list — admins can do everything.
 *
 *   requireRole(ctx, ['QUALITY']);          // Quality team only
 *   requireRole(ctx, ['STORE', 'QUALITY']); // Either role works
 */
export function requireRole(ctx: GqlContext, allowed: Role[]): GqlUser {
  const user = requireUser(ctx);
  if (user.role === 'ADMIN') return user;
  if (!allowed.includes(user.role)) {
    throw new GraphQLError(
      `Role ${user.role} is not allowed. Required: ${allowed.join(', ')}.`,
      { extensions: { code: 'FORBIDDEN', http: { status: 403 } } }
    );
  }
  return user;
}

/**
 * Wrap a Zod-style validation error into a GraphQL error the client can parse.
 * Call from resolvers after `schema.safeParse(args.input)` returns `success=false`.
 */
export function badInput(message: string, details?: unknown): never {
  throw new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', details, http: { status: 400 } },
  });
}
