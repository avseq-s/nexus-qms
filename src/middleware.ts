// =============================================================================
// Next.js Edge Middleware
// =============================================================================
// Runs before every request that matches the `config.matcher` pattern below.
// We use it as a global auth gate for the browser-facing pages — any request
// without a valid NextAuth JWT is redirected to /login.
//
// Exemptions (see matcher):
//   /login           — the sign-in page itself
//   /api/auth        — NextAuth's internal endpoints (sign-in, callback, JWT)
//   /api/health      — Docker health probe (must be anonymous)
//   /api/graphql     — the GraphQL API enforces auth inside each resolver, so
//                      we let all requests through here and return proper
//                      GraphQL errors for unauthenticated callers
//   /_next/*         — Next.js static assets
// =============================================================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      // `token` is the decoded JWT — non-null means the user is signed in.
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/((?!login|api/auth|api/health|api/graphql|_next/static|_next/image|favicon.ico).*)',
  ],
};
