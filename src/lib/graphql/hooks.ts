// =============================================================================
// React Hooks for the QMS GraphQL API
// =============================================================================
// Thin custom hooks built on `useEffect` + `useState` — no external state lib.
// They give pages a uniform { data, loading, error, refetch } shape so we can
// migrate to SWR/React Query later without touching consumers.
//
// Naming convention:
//   useXxxQuery   — read; auto-runs on mount and whenever deps change
//   useXxxMutation — write; returns an `execute(input)` function the caller calls
// =============================================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gql, GqlError } from './client';

// ---------------------------------------------------------------------------
// Generic query hook
// ---------------------------------------------------------------------------

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: GqlError | Error | null;
  /** Re-runs the query without changing variables. Returns the fresh data. */
  refetch: () => Promise<T | null>;
}

/**
 * Run a GraphQL query on mount and whenever the JSON-encoded `variables`
 * change. We stringify variables for the dep array so callers can pass plain
 * inline objects without breaking memoization rules.
 */
export function useGqlQuery<TData, TVars extends Record<string, unknown> = {}>(
  query: string,
  variables?: TVars,
  options?: { skip?: boolean }
): QueryState<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<GqlError | Error | null>(null);
  // Keep latest variables in a ref so refetch() always uses current values.
  const varsRef = useRef(variables);
  varsRef.current = variables;
  const queryRef = useRef(query);
  queryRef.current = query;

  const run = useCallback(async (): Promise<TData | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await gql<TData>(queryRef.current, varsRef.current);
      setData(result);
      return result;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // The variables JSON is the only effective dep. `query` rarely changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (options?.skip) return;
    run();
  }, [JSON.stringify(variables), options?.skip]);

  return { data, loading, error, refetch: run };
}

// ---------------------------------------------------------------------------
// Generic mutation hook
// ---------------------------------------------------------------------------

export interface MutationState<TData, TInput> {
  /** Run the mutation. Resolves with the typed response or throws on error. */
  execute: (variables: TInput) => Promise<TData>;
  loading: boolean;
  error: GqlError | Error | null;
  /** The most recent successful response — handy for chaining UI updates. */
  data: TData | null;
}

/**
 * Pair a mutation document with a strongly-typed `execute(variables)` call.
 * Caller decides when to invoke (e.g. on form submit).
 */
export function useGqlMutation<TData, TInput extends Record<string, unknown>>(
  mutation: string
): MutationState<TData, TInput> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GqlError | Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const execute = useCallback(
    async (variables: TInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await gql<TData>(mutation, variables);
        setData(result);
        return result;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [mutation]
  );

  return { execute, loading, error, data };
}

// ---------------------------------------------------------------------------
// Domain-specific hooks
// Each one wraps a specific GraphQL operation in a typed interface.
// Pages should call these — never the raw `gql()` client directly.
// ---------------------------------------------------------------------------

// ---- MasterBom types --------------------------------------------------------
export interface MasterBomRecord {
  id: string;
  productName: string;
  productCode: string;
  version: string;
  status: string;
  details: string | null;
  items: Array<{
    id: string;
    quantity: number;
    reference: string | null;
    component: { id: string; partNumber: string; description: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

/** All Master BOMs — no pagination on the server yet. */
export function useMasterBoms() {
  return useGqlQuery<{ masterBoms: MasterBomRecord[] }>(/* GraphQL */ `
    query MasterBoms {
      masterBoms {
        id productName productCode version status details createdAt updatedAt
        items {
          id quantity reference
          component { id partNumber description }
        }
      }
    }
  `);
}

/** Single Master BOM by id, used on the drill-down page. */
export function useMasterBom(id: string | null) {
  return useGqlQuery<{ masterBom: MasterBomRecord | null }>(
    /* GraphQL */ `
      query MasterBom($id: ID!) {
        masterBom(id: $id) {
          id productName productCode version status details createdAt updatedAt
          items {
            id quantity reference
            component { id partNumber description }
          }
        }
      }
    `,
    id ? { id } : undefined,
    { skip: !id }
  );
}

export function useCreateMasterBom() {
  return useGqlMutation<
    { createMasterBom: MasterBomRecord },
    {
      input: {
        productName: string;
        productCode: string;
        version?: string;
        details?: string;
        items: Array<{ componentId: string; quantity: number; reference?: string }>;
      };
    }
  >(/* GraphQL */ `
    mutation CreateMasterBom($input: MasterBomCreateInput!) {
      createMasterBom(input: $input) {
        id productName productCode version status details createdAt updatedAt
        items {
          id quantity reference
          component { id partNumber description }
        }
      }
    }
  `);
}

// ---- Audit types ------------------------------------------------------------
export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
  user: { id: string; name: string | null; email: string; role: string };
}

/**
 * Global audit trail (ADMIN-only on the server). Optionally filter by
 * entityType / entityId when zooming into a single record's history.
 */
export function useAuditLogs(filter?: { entityType?: string; entityId?: string }) {
  return useGqlQuery<{ auditLogs: AuditLogRecord[] }>(
    /* GraphQL */ `
      query AuditLogs($entityType: String, $entityId: String) {
        auditLogs(entityType: $entityType, entityId: $entityId) {
          id action entityType entityId oldValue newValue timestamp
          user { id name email role }
        }
      }
    `,
    filter
  );
}

// ---- User types -------------------------------------------------------------
export type Role = 'ADMIN' | 'QUALITY' | 'STORE' | 'PURCHASE' | 'PRODUCTION';

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/** All users — ADMIN only on the server. */
export function useUsers() {
  return useGqlQuery<{ users: UserRecord[] }>(
    /* GraphQL */ `
      query Users {
        users { id email name role createdAt updatedAt }
      }
    `
  );
}

export function useCreateUser() {
  return useGqlMutation<
    { createUser: UserRecord },
    { input: { email: string; name?: string | null; role: Role; password: string } }
  >(/* GraphQL */ `
    mutation CreateUser($input: UserCreateInput!) {
      createUser(input: $input) {
        id email name role createdAt updatedAt
      }
    }
  `);
}

export function useUpdateUser() {
  return useGqlMutation<
    { updateUser: UserRecord },
    {
      id: string;
      input: { email?: string; name?: string | null; role?: Role; password?: string };
    }
  >(/* GraphQL */ `
    mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
      updateUser(id: $id, input: $input) {
        id email name role createdAt updatedAt
      }
    }
  `);
}

export function useDeleteUser() {
  return useGqlMutation<{ deleteUser: boolean }, { id: string }>(/* GraphQL */ `
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }
  `);
}

// ---- Supplier types (mirror schema.ts) -------------------------------------
export interface Supplier {
  id: string;
  name: string;
  code: string;
  isApproved: boolean;
  performanceRating: number;
  contact: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  isIsoCertified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageInfo {
  total: number;
  take: number;
  skip: number;
  hasMore: boolean;
}

// ---- Supplier hooks --------------------------------------------------------

/** Paginated list of suppliers ordered by `createdAt desc`. */
export function useSuppliers(page?: { take?: number; skip?: number }) {
  return useGqlQuery<{
    suppliers: { nodes: Supplier[]; pageInfo: PageInfo };
  }>(
    /* GraphQL */ `
      query Suppliers($page: PageInput) {
        suppliers(page: $page) {
          nodes {
            id name code isApproved performanceRating
            contact email phone gstin isIsoCertified
            createdAt updatedAt
          }
          pageInfo { total take skip hasMore }
        }
      }
    `,
    { page }
  );
}

/** Create a new supplier. */
export function useCreateSupplier() {
  return useGqlMutation<
    { createSupplier: Supplier },
    { input: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>> }
  >(/* GraphQL */ `
    mutation CreateSupplier($input: SupplierCreateInput!) {
      createSupplier(input: $input) {
        id name code isApproved performanceRating
        contact email phone gstin isIsoCertified
        createdAt updatedAt
      }
    }
  `);
}

/** Update an existing supplier. */
export function useUpdateSupplier() {
  return useGqlMutation<
    { updateSupplier: Supplier },
    { id: string; input: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>> }
  >(/* GraphQL */ `
    mutation UpdateSupplier($id: ID!, $input: SupplierUpdateInput!) {
      updateSupplier(id: $id, input: $input) {
        id name code isApproved performanceRating
        contact email phone gstin isIsoCertified
        createdAt updatedAt
      }
    }
  `);
}

// ---- Component types --------------------------------------------------------
export interface Component {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  mslLevel: number;
  shelfLifeDays: number | null;
}

/** Paginated list of components / parts. */
export function useComponents(page?: { take?: number; skip?: number }) {
  return useGqlQuery<{
    components: { nodes: Component[]; pageInfo: PageInfo };
  }>(
    /* GraphQL */ `
      query Components($page: PageInput) {
        components(page: $page) {
          nodes { id partNumber description category mslLevel shelfLifeDays }
          pageInfo { total take skip hasMore }
        }
      }
    `,
    { page }
  );
}

/** Create a new component (Item Master mint). */
export function useCreateComponent() {
  return useGqlMutation<
    { createComponent: Component },
    {
      input: {
        partNumber: string;
        description: string;
        category: string;
        mslLevel?: number;
        shelfLifeDays?: number | null;
      };
    }
  >(/* GraphQL */ `
    mutation CreateComponent($input: ComponentCreateInput!) {
      createComponent(input: $input) {
        id partNumber description category mslLevel shelfLifeDays
      }
    }
  `);
}

// ---- Reel types --------------------------------------------------------------
export type ReelStatus =
  | 'QUARANTINE'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ISSUED'
  | 'CONSUMED'
  | 'SCRAPPED';

export interface Reel {
  id: string;
  supplierLot: string;
  quantity: number;
  location: string | null;
  status: ReelStatus;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations — populated by the hook's nested query
  component: { id: string; partNumber: string; description: string };
  grn: {
    id: string;
    grnNumber: string;
    supplier: { id: string; name: string; code: string };
  };
}

/** Paginated list of reels with component + GRN + supplier joined. */
export function useReels(filter?: { status?: ReelStatus }, page?: { take?: number; skip?: number }) {
  return useGqlQuery<{
    reels: { nodes: Reel[]; pageInfo: PageInfo };
  }>(
    /* GraphQL */ `
      query Reels($filter: ReelFilter, $page: PageInput) {
        reels(filter: $filter, page: $page) {
          nodes {
            id supplierLot quantity location status expiryDate createdAt updatedAt
            component { id partNumber description }
            grn { id grnNumber supplier { id name code } }
          }
          pageInfo { total take skip hasMore }
        }
      }
    `,
    { filter, page }
  );
}

/**
 * Update a reel's status — primarily used by the IQC page to flip
 * QUARANTINE → ACCEPTED or REJECTED in bulk after a scan-verify.
 */
export function useUpdateReelStatus() {
  return useGqlMutation<
    { updateReelStatus: Reel },
    { id: string; status: ReelStatus }
  >(/* GraphQL */ `
    mutation UpdateReelStatus($id: ID!, $status: ReelStatus!) {
      updateReelStatus(id: $id, status: $status) {
        id status updatedAt
        component { id partNumber description }
        grn { id grnNumber supplier { id name code } }
        supplierLot quantity location expiryDate createdAt
      }
    }
  `);
}

// ---- NCR types --------------------------------------------------------------
export type NcrStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED';

export interface NcrRecord {
  id: string;
  ncrNumber: string;
  description: string;
  rootCause: string | null;
  capa: string | null;
  status: NcrStatus;
  createdAt: string;
  updatedAt: string;
  reel: {
    id: string;
    supplierLot: string;
    component: { id: string; partNumber: string };
    grn: { id: string; grnNumber: string; supplier: { id: string; name: string } };
  };
  raisedBy: { id: string; name: string | null; email: string };
}

/** Paginated NCR list — newest first. */
export function useNcrs(page?: { take?: number; skip?: number }) {
  return useGqlQuery<{
    ncrs: { nodes: NcrRecord[]; pageInfo: PageInfo };
  }>(
    /* GraphQL */ `
      query Ncrs($page: PageInput) {
        ncrs(page: $page) {
          nodes {
            id ncrNumber description rootCause capa status createdAt updatedAt
            reel {
              id supplierLot
              component { id partNumber }
              grn { id grnNumber supplier { id name } }
            }
            raisedBy { id name email }
          }
          pageInfo { total take skip hasMore }
        }
      }
    `,
    { page }
  );
}

/** Create a new NCR. */
export function useCreateNcr() {
  return useGqlMutation<
    { createNcr: NcrRecord },
    { input: { ncrNumber: string; reelId: string; description: string } }
  >(/* GraphQL */ `
    mutation CreateNcr($input: NcrCreateInput!) {
      createNcr(input: $input) {
        id ncrNumber description status createdAt
        reel { id supplierLot component { id partNumber } grn { id grnNumber supplier { id name } } }
        raisedBy { id name email }
      }
    }
  `);
}

// ---- Document types ---------------------------------------------------------
export type DocStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'OBSOLETE';

export interface DocumentRecord {
  id: string;
  title: string;
  version: string;
  content: string;
  status: DocStatus;
  author: { id: string; name: string | null; email: string };
  reviewer: { id: string; name: string | null; email: string } | null;
  approver: { id: string; name: string | null; email: string } | null;
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** All controlled documents, optionally filtered by status. */
export function useDocuments(status?: DocStatus) {
  return useGqlQuery<{ documents: DocumentRecord[] }>(
    /* GraphQL */ `
      query Documents($status: DocStatus) {
        documents(status: $status) {
          id title version content status
          author   { id name email }
          reviewer { id name email }
          approver { id name email }
          effectiveDate createdAt updatedAt
        }
      }
    `,
    { status }
  );
}

/** Create a new document — always starts in DRAFT status. */
export function useCreateDocument() {
  return useGqlMutation<
    { createDocument: DocumentRecord },
    { input: { title: string; version: string; content: string } }
  >(/* GraphQL */ `
    mutation CreateDocument($input: DocumentCreateInput!) {
      createDocument(input: $input) {
        id title version content status
        author   { id name email }
        reviewer { id name email }
        approver { id name email }
        effectiveDate createdAt updatedAt
      }
    }
  `);
}

/**
 * Transition a document's status (DRAFT → IN_REVIEW → APPROVED / OBSOLETE)
 * and optionally attach the reviewer/approver.
 */
export function useTransitionDocument() {
  return useGqlMutation<
    { transitionDocument: DocumentRecord },
    {
      input: {
        id: string;
        status: DocStatus;
        reviewerId?: string;
        approverId?: string;
      };
    }
  >(/* GraphQL */ `
    mutation TransitionDocument($input: DocumentTransitionInput!) {
      transitionDocument(input: $input) {
        id title version content status
        author   { id name email }
        reviewer { id name email }
        approver { id name email }
        effectiveDate createdAt updatedAt
      }
    }
  `);
}

/** Update an existing NCR — set rootCause/capa or transition status. */
export function useUpdateNcr() {
  return useGqlMutation<
    { updateNcr: NcrRecord },
    {
      input: {
        id: string;
        rootCause?: string | null;
        capa?: string | null;
        status?: NcrStatus;
      };
    }
  >(/* GraphQL */ `
    mutation UpdateNcr($input: NcrUpdateInput!) {
      updateNcr(input: $input) {
        id ncrNumber description rootCause capa status createdAt updatedAt
        reel { id supplierLot component { id partNumber } grn { id grnNumber supplier { id name } } }
        raisedBy { id name email }
      }
    }
  `);
}
