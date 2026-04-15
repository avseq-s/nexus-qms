// =============================================================================
// GraphQL Proxy — /api/graphql
// =============================================================================
// Forwards every GraphQL request from the Next.js frontend to the Go backend
// (graphqlvastusuchi). The backend now owns the QMS schema, resolvers, and
// MongoDB collections.
//
// Auth translation:
//   The frontend pages rely on the NextAuth session cookie for identity.
//   The Go backend's auth middleware trusts the X-Service-Secret + X-QMS-User-*
//   headers from server-side (non-browser) callers. This route acts as the
//   trusted bridge: it reads the session, verifies it, then proxies the request
//   with the user's email and role in those headers.
//
// If GO_GRAPHQL_URL is not set, the proxy falls back to localhost:8080/query
// which is fine for local development (run both servers side-by-side).
//
// To keep the surface small, only POST is proxied. GET (GraphiQL playground)
// can be used directly against the Go backend.
// =============================================================================

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/** URL of the Go GraphQL backend. Defaults to local dev instance. */
const GO_GRAPHQL_URL = process.env.GO_GRAPHQL_URL ?? 'http://localhost:8080/query';

/** Shared secret verified by the Go auth middleware before trusting user headers. */
const QMS_SERVICE_SECRET = process.env.QMS_SERVICE_SECRET ?? 'dev-secret';

export async function POST(request: Request) {
  // Read the NextAuth session from the cookie embedded in the incoming request.
  // getServerSession() needs the authOptions so it can verify the JWT.
  const session = await getServerSession(authOptions);

  // Forward the raw request body unchanged — it's a GraphQL JSON payload.
  const body = await request.text();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Service-secret tells the Go middleware to trust the X-QMS-User-* headers
    // below. Never expose this value to the browser.
    'X-Service-Secret': QMS_SERVICE_SECRET,
  };

  if (session?.user) {
    const user = session.user as { email?: string; role?: string; id?: string };
    headers['X-QMS-User-Email'] = user.email ?? '';
    headers['X-QMS-User-Role'] = user.role ?? '';
  }

  try {
    const goRes = await fetch(GO_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body,
    });

    const data = await goRes.text();

    // Mirror the Go backend's status code and body back to the browser.
    return new Response(data, {
      status: goRes.status,
      headers: {
        'Content-Type': goRes.headers.get('Content-Type') ?? 'application/json',
        // Allow the frontend to read error details on 4xx responses.
        'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
      },
    });
  } catch (err) {
    // Network error reaching the Go backend — return a structured GraphQL error
    // so the client's GqlError handler can display it gracefully.
    const message =
      err instanceof Error ? err.message : 'Failed to reach GraphQL backend';
    return Response.json(
      { errors: [{ message }] },
      { status: 503 }
    );
  }
}

// GET is used by the GraphQL playground and introspection in development.
// Redirect directly to the Go backend playground rather than proxying.
export async function GET() {
  return Response.redirect(GO_GRAPHQL_URL.replace('/query', '/'));
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
