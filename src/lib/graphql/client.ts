// =============================================================================
// GraphQL HTTP Client
// =============================================================================
// Tiny `fetch`-based wrapper used by every page that needs to talk to the
// /api/graphql endpoint. Deliberately written without Apollo or Urql:
//   - Zero added bundle weight (~50 lines vs Apollo's 30+ KB)
//   - Same-origin requests carry the NextAuth cookie automatically
//   - Returns plain promises so we can compose them with React's useEffect
//     or any state library (SWR, React Query) we add later
//
// If/when we need normalized caching, optimistic updates or subscriptions,
// swap this file out for Apollo Client without touching any page.
// =============================================================================

/** Standard GraphQL JSON response shape. */
export interface GqlResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: { code?: string; details?: unknown };
  }>;
}

/**
 * Thrown when a GraphQL request returns one or more `errors`. Inspect
 * `err.code` to differentiate (e.g. show a login modal on UNAUTHENTICATED).
 */
export class GqlError extends Error {
  code?: string;
  details?: unknown;
  raw: GqlResponse<unknown>['errors'];

  constructor(errors: NonNullable<GqlResponse<unknown>['errors']>) {
    super(errors.map((e) => e.message).join('; '));
    this.name = 'GqlError';
    this.code = errors[0]?.extensions?.code;
    this.details = errors[0]?.extensions?.details;
    this.raw = errors;
  }
}

/**
 * Execute a GraphQL operation against /api/graphql.
 *
 * Usage:
 *   const data = await gql<{ suppliers: { nodes: Supplier[] } }>(
 *     `query { suppliers { nodes { id name } } }`
 *   );
 *
 * Throws `GqlError` on validation/auth/server errors so the caller can use
 * try/catch. Network errors propagate from `fetch` directly.
 */
export async function gql<TData = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string,
  variables?: TVariables
): Promise<TData> {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `same-origin` ensures the NextAuth session cookie is sent.
    credentials: 'same-origin',
    body: JSON.stringify({ query, variables }),
  });

  // Even when GraphQL returns 200 we may have errors in the body. Yoga also
  // uses 4xx/5xx for protocol errors — treat anything non-2xx as fatal.
  if (!res.ok && res.status >= 500) {
    throw new Error(`GraphQL HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as GqlResponse<TData>;
  if (json.errors && json.errors.length > 0) throw new GqlError(json.errors);
  if (!json.data) throw new Error('GraphQL response had no data and no errors');
  return json.data;
}
