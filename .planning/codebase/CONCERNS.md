# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Incomplete Network Domain Integration:**
- Issue: Network domain validation is stubbed out with always-returning-true permissive behavior
- Files: `src/domains/identity/outbound/adapters/network-client.adapter.ts`
- Impact: Authority validation is not actually enforced. Any user is considered authorized for any node, creating security risk for hierarchical access control
- Fix approach: Implement actual Network domain integration once available, replace permissive return with real authority checks

**Role Deletion Not Implemented:**
- Issue: Role deletion endpoint marks roles as deleted by updating description to '[DELETED]' instead of proper deletion
- Files: `src/domains/identity/inbound/controllers/identity.controller.ts` (line 433)
- Impact: Deleted roles remain in database, can be re-activated accidentally, audit trail is compromised
- Fix approach: Implement proper DeleteRoleUseCase with soft-delete flag and audit logging

**Large Controller Files:**
- Issue: Multiple controller files exceed 700+ lines with mixed responsibilities
- Files:
  - `src/domains/plm/plm.controller.ts` (1870 lines) - Contains 4+ controller classes
  - `src/domains/settings/taxonomy.controller.ts` (1557 lines) - Contains 6+ controllers
  - `src/domains/network/inbound/controllers/structures.controller.ts` (805 lines)
  - `src/domains/form-studio/form-studio.controller.ts` (737 lines)
- Impact: Hard to test, maintain, and navigate; increased cognitive load; violation of single responsibility
- Fix approach: Split into separate controller files, one per entity type; move business logic to services/usecases

**Unvalidated DTO Usage:**
- Issue: 49 controller endpoints accept `@Body() dto: any` without type safety
- Files: Multiple controllers including:
  - `src/domains/plm/plm.controller.ts`
  - `src/domains/governance/inbound/controllers/positions.controller.ts`
  - `src/domains/governance/inbound/controllers/working-units.controller.ts`
- Impact: No input validation, Type errors at runtime, security vulnerability for malicious input
- Fix approach: Create proper DTO classes with class-validator decorators for all endpoints

## Known Bugs

**Sequential Database Writes in Loop:**
- Symptoms: Pipeline version creation performs sequential database calls in a for loop instead of batch operations
- Files: `src/domains/plm/plm.controller.ts` (lines 341-358, 361-374)
- Trigger: Call `POST /plm/pipelines/:id/new-version` on pipeline with many stages/transitions
- Workaround: None - system will be slow on large pipelines
- Impact: Performance degradation (N+1 problem), poor scalability for pipelines with 20+ stages

**Pagination Parameter Type Coercion:**
- Symptoms: Page and size query parameters coerced with `Number()` without bounds validation
- Files: Multiple controllers with pagination
- Trigger: Send `?page=-1&size=999999` query parameter
- Workaround: Database will limit results, but no application-level protection
- Impact: Potential memory exhaustion, DOS vulnerability

## Security Considerations

**Permissive Authority Validation:**
- Risk: NetworkClientAdapter returns true unconditionally, allowing any access to organization hierarchy
- Files: `src/domains/identity/outbound/adapters/network-client.adapter.ts`
- Current mitigation: None - this is a stub awaiting implementation
- Recommendations: Implement actual Network domain calls; add unit tests verifying denied access scenarios

**Missing Input Validation on Core Entities:**
- Risk: Entities accept unvalidated `any` type DTOs; malformed data can corrupt database state
- Files: Controllers with 49 instances of `@Body() dto: any`
- Current mitigation: Some validation in domain aggregates, but not exhaustive
- Recommendations: Create comprehensive DTO validation layer; use class-validator consistently; add request pipe validation

**Tenant Isolation Not Enforced at Database Level:**
- Risk: Queries rely on software-level tenant filtering; missing `tenantId` in WHERE clause breaks isolation
- Files: Most controller files with database queries
- Current mitigation: Headers validation at controller level
- Recommendations: Add database constraints (unique indexes include tenantId); add query middleware to enforce tenantId

**String Case Manipulation Without Sanitization:**
- Risk: `.toUpperCase()` and `.toLowerCase()` on user input without trimming or length validation
- Files: `src/domains/network/inbound/controllers/structures.controller.ts`, `src/domains/governance/inbound/controllers/positions.controller.ts`
- Current mitigation: Database constraints on code uniqueness
- Recommendations: Validate and trim input before transformation; add max-length constraints

## Performance Bottlenecks

**N+1 Query Pattern in Card Listing:**
- Problem: Lists stages, then for each stage calls separate query to fetch cards
- Files: `src/domains/plm/plm.controller.ts` (lines 1551-1561)
- Cause: Use of `Promise.all` with `.map(async (stage) => { await prisma.plmCard.findMany(...) })`
- Improvement path: Use single JOIN query with `include: { stages: { include: { cards: {...} } } }` or raw SQL aggregation

**Promise.all Usage Without Rate Limiting:**
- Problem: Unbounded concurrent database queries
- Files: Multiple controllers (taxonomy, governance, network)
- Cause: `await Promise.all([this.prisma...., this.prisma...])` without limiting concurrency
- Improvement path: Implement connection pooling optimization, add query batching where possible

**Missed Database Indexes:**
- Problem: Frequent queries on `pipelineVersionId`, `pipelineId`, `stageId` without evidence of indexes
- Files: PLM domain controllers
- Cause: Prisma schema may not have proper index definitions for high-cardinality lookups
- Improvement path: Analyze query patterns, add composite indexes for `(tenantId, fieldName)`, verify Prisma migrations include indexes

## Fragile Areas

**PLM Pipeline Version Creation:**
- Files: `src/domains/plm/plm.controller.ts` (lines 305-384)
- Why fragile: Creates new version, stages, transitions in sequence without transaction safety; partial failure leaves orphaned data
- Safe modification: Wrap entire operation in `prisma.$transaction()` to ensure atomicity
- Test coverage: No unit tests for this complex operation; only integration tests

**Authority Validation Across Access Control:**
- Files: `src/domains/identity/inbound/controllers/identity.controller.ts`, `src/domains/identity/domain/services/access-policy-evaluator.service.ts`
- Why fragile: Relies on stub implementation; switching to real Network validation will fail all access checks
- Safe modification: Feature-flag the Network validation toggle; implement gradual rollout path
- Test coverage: Tests may pass now but will fail once real implementation added

**Governance Policy Aggregation:**
- Files: `src/domains/governance/domain/aggregates/governance-policy.aggregate.ts` (302 lines)
- Why fragile: Complex state machine with deprecated status handling mixed into main logic
- Safe modification: Extract status transitions to separate strategy classes
- Test coverage: Some tests exist but deprecated status path coverage unknown

## Scaling Limits

**Database Connection Pool Exhaustion:**
- Current capacity: Default Prisma pool (typically 2 connections in dev)
- Limit: Concurrent request count > pool size causes "Cannot acquire a connection" errors
- Scaling path: Configure `connection_limit` in .env for Prisma; use connection pooling middleware (PgBouncer for PostgreSQL)

**Large Batch Operations:**
- Current capacity: Sequential loops process items one-by-one; ~100ms per stage in PLM creates creates
- Limit: 50+ stage pipelines cause 5+ second responses
- Scaling path: Implement batch create with `createMany` in Prisma; use transaction batching

**Memory Usage in Response Serialization:**
- Current capacity: Full object serialization for large result sets (pagination size unlimited in some endpoints)
- Limit: Requesting 10,000 items will load all into memory before serialization
- Scaling path: Implement streaming responses for large datasets; enforce maximum page size globally

## Dependencies at Risk

**Prisma ORM Version Constraints:**
- Risk: Codebase assumes Prisma v4+ features (raw SQL aggregation, enhanced queries); upgrading may break compatibility
- Impact: Cannot easily upgrade Prisma version; security patches blocked
- Migration plan: Document minimum Prisma version; create migration guide for major version upgrades; add version constraints to package.json

**NestJS Version Pinning:**
- Risk: Controllers use decorators that may change in NestJS v11+
- Impact: Security updates blocked if new NestJS versions have breaking changes
- Migration plan: Pin to compatible range; test against next major version quarterly

## Missing Critical Features

**Proper Error Handling/Serialization:**
- Problem: Controllers throw raw HttpException with unstructured error objects
- Blocks: Consistent error response format for client-side handling
- Fix: Create global error filter and standardized error response DTO

**Request/Response Logging:**
- Problem: No centralized logging of API calls, parameters, responses
- Blocks: Audit trail, debugging production issues, performance analysis
- Fix: Implement Winston logger with request middleware

**Rate Limiting:**
- Problem: No rate limiting on API endpoints
- Blocks: Protection against DOS, fair usage for multi-tenant system
- Fix: Implement @nestjs/throttler with tenant-aware rate limits

**Idempotency Key Support:**
- Problem: Only identity domain uses idempotency keys; other domains ignore duplicates
- Blocks: Safe retry semantics for distributed clients
- Fix: Create global middleware for idempotency key validation

## Test Coverage Gaps

**Controllers Lack Unit Tests:**
- What's not tested: PLM, Form Studio, Settings/Taxonomy, Governance, Network controllers have no unit tests
- Files: All controller files in `src/domains/*/inbound/controllers/`
- Risk: Endpoint logic changes can break without detection; regressions undetected
- Priority: High - controllers contain critical business logic

**E2E Tests Limited to 3 Domains:**
- What's not tested: Form Studio, PLM, Settings, Governance, Network, Audit have no E2E coverage
- Files: Only reservations, points, approvals have e2e tests in `test/`
- Risk: Integration failures not caught until production
- Priority: Medium - focus on newest domains (PLM, Form Studio)

**Transaction/Concurrency Tests Missing:**
- What's not tested: Parallel requests to same resource, transaction rollback scenarios
- Files: No tests in `src/domains/*/domain/services/` for concurrent access
- Risk: Race conditions, data corruption in production
- Priority: High - multi-user system requires this

**Error Path Coverage:**
- What's not tested: Error cases, validation failures, 404/409 responses
- Files: All controllers return errors but tests don't verify error messages/codes
- Risk: Error responses inconsistent, client integration breaks
- Priority: Medium

---

*Concerns audit: 2026-01-31*
