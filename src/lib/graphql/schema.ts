// =============================================================================
// GraphQL Schema (SDL — Schema Definition Language)
// =============================================================================
// This is the public contract of the QMS API. Every field exposed to a client
// must be declared here. Clients — the Next.js front end, desktop apps, or
// third-party integrations — query against this schema.
//
// Design conventions:
//   - Every type matches a Prisma model 1:1 where possible. Relation fields
//     are exposed via dedicated resolvers (see resolvers.ts) so we can control
//     exactly what gets loaded and avoid N+1 surprises.
//   - Mutations accept an `input` object — never a flat list of scalars —
//     which keeps the API forward-compatible when new fields are added.
//   - Role-restricted operations are documented with a `@role(...)` note in the
//     resolver docstring; the SDL itself stays role-agnostic.
//   - Dates are exposed as ISO-8601 strings via the custom `DateTime` scalar.
//
// When the schema changes:
//   1. Edit the SDL here.
//   2. Update resolvers.ts to match.
//   3. Re-run the GraphQL client (Apollo/urql) codegen on consumer apps.
// =============================================================================

export const typeDefs = /* GraphQL */ `
  # ---------------------------------------------------------------------------
  # Custom scalars
  # ---------------------------------------------------------------------------
  # ISO-8601 timestamps in UTC. Clients parse with new Date(value).
  scalar DateTime
  # Arbitrary JSON blob — used for IqcInspection.measurements where the shape
  # varies by component type (resistor vs IC vs capacitor).
  scalar JSON

  # ---------------------------------------------------------------------------
  # Enums — mirror prisma/schema.prisma exactly
  # ---------------------------------------------------------------------------
  enum Role {
    ADMIN
    QUALITY
    STORE
    PURCHASE
    PRODUCTION
  }

  enum DocStatus {
    DRAFT
    IN_REVIEW
    APPROVED
    OBSOLETE
  }

  enum ReelStatus {
    QUARANTINE
    ACCEPTED
    REJECTED
    ISSUED
    CONSUMED
    SCRAPPED
  }

  enum IqcStatus {
    PASS
    FAIL
  }

  enum NcrStatus {
    OPEN
    UNDER_INVESTIGATION
    CLOSED
  }

  # ---------------------------------------------------------------------------
  # Core types
  # ---------------------------------------------------------------------------

  # A system user. Password is deliberately NOT exposed.
  type User {
    id: ID!
    email: String!
    name: String
    role: Role!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Approved supplier (vendor master).
  type Supplier {
    id: ID!
    name: String!
    code: String!
    isApproved: Boolean!
    performanceRating: Float!
    contact: String
    email: String
    phone: String
    gstin: String
    isIsoCertified: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    grns: [Grn!]!
  }

  # Component/part master record.
  type Component {
    id: ID!
    partNumber: String!
    description: String!
    category: String!
    mslLevel: Int!
    shelfLifeDays: Int
    reels: [Reel!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Physical reel/spool tracked in the store.
  type Reel {
    id: ID!
    component: Component!
    grn: Grn!
    supplierLot: String!
    quantity: Int!
    location: String
    status: ReelStatus!
    expiryDate: DateTime
    ncrRecords: [NcrRecord!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Goods Receipt Note — a physical delivery from one supplier.
  type Grn {
    id: ID!
    grnNumber: String!
    supplier: Supplier!
    receivedDate: DateTime!
    status: String!
    items: [GrnItem!]!
    reels: [Reel!]!
  }

  # One line within a GRN (one component type per line).
  type GrnItem {
    id: ID!
    grn: Grn!
    component: Component!
    declaredQty: Int!
    iqc: IqcInspection
  }

  # Incoming Quality Control inspection record.
  type IqcInspection {
    id: ID!
    grnItem: GrnItem!
    inspector: User!
    status: IqcStatus!
    measurements: JSON
    remarks: String
    createdAt: DateTime!
  }

  # Non-Conformance Report.
  type NcrRecord {
    id: ID!
    ncrNumber: String!
    reel: Reel!
    raisedBy: User!
    description: String!
    rootCause: String
    capa: String
    status: NcrStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # ISO 9001 controlled document.
  type Document {
    id: ID!
    title: String!
    version: String!
    content: String!
    status: DocStatus!
    author: User!
    reviewer: User
    approver: User
    effectiveDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Bill of Materials — top-level product assembly.
  type MasterBom {
    id: ID!
    productName: String!
    productCode: String!
    version: String!
    status: String!
    details: String
    items: [BomItem!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type BomItem {
    id: ID!
    masterBom: MasterBom!
    component: Component!
    quantity: Float!
    reference: String
    alternates: [BomAlternate!]!
  }

  type BomAlternate {
    id: ID!
    bomItem: BomItem!
    component: Component!
    isApproved: Boolean!
  }

  # Immutable audit log row.
  type AuditLog {
    id: ID!
    user: User!
    action: String!
    entityType: String!
    entityId: String!
    oldValue: JSON
    newValue: JSON
    timestamp: DateTime!
  }

  # ---------------------------------------------------------------------------
  # Pagination envelope — wrap list responses so clients can page through
  # large collections without blowing up the browser.
  # ---------------------------------------------------------------------------
  type PageInfo {
    total: Int!
    take: Int!
    skip: Int!
    hasMore: Boolean!
  }

  type ReelConnection {
    nodes: [Reel!]!
    pageInfo: PageInfo!
  }

  type GrnConnection {
    nodes: [Grn!]!
    pageInfo: PageInfo!
  }

  type SupplierConnection {
    nodes: [Supplier!]!
    pageInfo: PageInfo!
  }

  type ComponentConnection {
    nodes: [Component!]!
    pageInfo: PageInfo!
  }

  type NcrConnection {
    nodes: [NcrRecord!]!
    pageInfo: PageInfo!
  }

  # ---------------------------------------------------------------------------
  # Filter / pagination inputs
  # ---------------------------------------------------------------------------
  input PageInput {
    take: Int = 20
    skip: Int = 0
  }

  input ReelFilter {
    status: ReelStatus
    componentId: ID
    location: String
  }

  input GrnFilter {
    status: String
    supplierId: ID
  }

  # ---------------------------------------------------------------------------
  # Mutation inputs — keep shapes aligned with src/lib/validation.ts
  # ---------------------------------------------------------------------------
  input UserCreateInput {
    email: String!
    name: String
    role: Role!
    password: String!
  }

  input UserUpdateInput {
    email: String
    name: String
    role: Role
    # Optional — pass to reset the password; omit to leave unchanged.
    password: String
  }

  input SupplierCreateInput {
    name: String!
    code: String!
    isApproved: Boolean = false
    performanceRating: Float = 0
    contact: String
    email: String
    phone: String
    gstin: String
    isIsoCertified: Boolean = false
  }

  input SupplierUpdateInput {
    name: String
    code: String
    isApproved: Boolean
    performanceRating: Float
    contact: String
    email: String
    phone: String
    gstin: String
    isIsoCertified: Boolean
  }

  input ComponentCreateInput {
    partNumber: String!
    description: String!
    category: String!
    mslLevel: Int = 1
    shelfLifeDays: Int
  }

  input GrnLineInput {
    componentId: ID!
    declaredQty: Int!
  }

  input GrnCreateInput {
    grnNumber: String!
    supplierId: ID!
    receivedDate: DateTime
    items: [GrnLineInput!]!
  }

  input ReelCreateInput {
    componentId: ID!
    grnId: ID!
    supplierLot: String!
    quantity: Int!
    location: String
    expiryDate: DateTime
  }

  input IqcCreateInput {
    grnItemId: ID!
    status: IqcStatus!
    measurements: JSON
    remarks: String
  }

  input NcrCreateInput {
    ncrNumber: String!
    reelId: ID!
    description: String!
  }

  input NcrUpdateInput {
    id: ID!
    rootCause: String
    capa: String
    status: NcrStatus
  }

  input BomItemInput {
    componentId: ID!
    quantity: Float!
    reference: String
  }

  input MasterBomCreateInput {
    productName: String!
    productCode: String!
    version: String = "Rev A"
    details: String
    items: [BomItemInput!]!
  }

  input DocumentCreateInput {
    title: String!
    version: String!
    content: String!
  }

  input DocumentTransitionInput {
    id: ID!
    status: DocStatus!
    reviewerId: ID
    approverId: ID
  }

  # ---------------------------------------------------------------------------
  # Queries — read side of the API
  # ---------------------------------------------------------------------------
  type Query {
    # Auth / current user
    me: User

    # Admin — user management (ADMIN only)
    users: [User!]!
    user(id: ID!): User

    # Purchase module
    suppliers(page: PageInput): SupplierConnection!
    supplier(id: ID!): Supplier

    # Store / Inventory module
    components(page: PageInput): ComponentConnection!
    component(id: ID!): Component
    reels(filter: ReelFilter, page: PageInput): ReelConnection!
    reel(id: ID!): Reel

    # GRN (shared by Purchase & Store)
    grns(filter: GrnFilter, page: PageInput): GrnConnection!
    grn(id: ID!): Grn

    # Quality module
    iqcInspection(id: ID!): IqcInspection
    ncrs(page: PageInput): NcrConnection!
    ncr(id: ID!): NcrRecord

    # Production module
    masterBoms: [MasterBom!]!
    masterBom(id: ID!): MasterBom

    # Documents / Admin
    documents(status: DocStatus): [Document!]!
    document(id: ID!): Document
    auditLogs(entityType: String, entityId: String): [AuditLog!]!
  }

  # ---------------------------------------------------------------------------
  # Mutations — write side of the API. Authorization is enforced per resolver.
  # ---------------------------------------------------------------------------
  type Mutation {
    # Admin — user management (ADMIN only)
    createUser(input: UserCreateInput!): User!                 # @role(ADMIN)
    updateUser(id: ID!, input: UserUpdateInput!): User!        # @role(ADMIN)
    deleteUser(id: ID!): Boolean!                              # @role(ADMIN)

    # Purchase
    createSupplier(input: SupplierCreateInput!): Supplier!     # @role(PURCHASE, ADMIN)
    updateSupplier(id: ID!, input: SupplierUpdateInput!): Supplier! # @role(PURCHASE, ADMIN)

    createComponent(input: ComponentCreateInput!): Component!  # @role(PURCHASE, STORE, ADMIN)

    # GRN lifecycle (Purchase creates → Store receives → Quality inspects)
    createGrn(input: GrnCreateInput!): Grn!                    # @role(PURCHASE, STORE, ADMIN)
    createReel(input: ReelCreateInput!): Reel!                 # @role(STORE, ADMIN)
    updateReelStatus(id: ID!, status: ReelStatus!): Reel!      # @role(STORE, QUALITY, ADMIN)

    # Quality
    createIqcInspection(input: IqcCreateInput!): IqcInspection! # @role(QUALITY, ADMIN)
    createNcr(input: NcrCreateInput!): NcrRecord!              # @role(QUALITY, ADMIN)
    updateNcr(input: NcrUpdateInput!): NcrRecord!              # @role(QUALITY, ADMIN)

    # Production
    createMasterBom(input: MasterBomCreateInput!): MasterBom!  # @role(PRODUCTION, ADMIN)

    # Documents
    createDocument(input: DocumentCreateInput!): Document!     # @role(ANY)
    transitionDocument(input: DocumentTransitionInput!): Document! # @role(QUALITY, ADMIN)
  }
`;
