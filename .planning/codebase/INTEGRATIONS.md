# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**Core API Microservices:**
- **Approvals API** - Manages approval workflows and decisions
  - SDK/Client: `ApprovalsApiClient` (`src/infrastructure/openapi-clients/approvals-api.client.ts`)
  - Auth: Bearer token via `CORE_API_TOKEN` env var
  - Mock mode: Supports `USE_MOCK_API=true` for development
  - Endpoints:
    - `GET /approvals` - List approvals with filtering (state, type, priority, pagination)
    - `GET /approvals/{id}` - Get approval details
    - `POST /approvals/{id}/decision` - Decide on approval (APPROVE/REJECT/CHANGES_REQUESTED)
    - `POST /approvals/bulk/decision` - Bulk decision for multiple approvals

- **Points API** - Handles point calculations and management
  - SDK/Client: `PointsApiClient` (`src/infrastructure/openapi-clients/points-api.client.ts`)
  - Auth: Bearer token via `CORE_API_TOKEN` env var
  - Mock mode: Supports `USE_MOCK_API=true` for development
  - Endpoints:
    - `POST /points/recalculate` - Recalculate points for candidate

- **Audit API** - Logs audit trail of operations
  - SDK/Client: `AuditApiClient` (`src/infrastructure/openapi-clients/audit-api.client.ts`)
  - Auth: Bearer token via `CORE_API_TOKEN` env var
  - Mock mode: Supports `USE_MOCK_API=true` with in-memory storage
  - Endpoints:
    - `POST /audit/logs` - Create audit log entry

- **Communications API** - Sends notifications
  - SDK/Client: `CommunicationsApiClient` (`src/infrastructure/openapi-clients/communications-api.client.ts`)
  - Auth: Bearer token via `CORE_API_TOKEN` env var
  - Mock mode: Supports `USE_MOCK_API=true` with in-memory storage
  - Endpoints:
    - `POST /communications/notifications` - Send notification via EMAIL, PUSH, or SMS

**API Communication Pattern:**
- HTTP client: `@nestjs/axios` (wraps Axios)
- Protocol: REST with JSON payloads
- Headers:
  - `Authorization: Bearer {token}` - API authentication
  - `X-Tenant-Id` - Multi-tenant identifier (required)
  - `X-Org-Id` - Organization identifier (required)
  - `X-Cycle-Id` - Business cycle identifier (optional)
  - `X-Request-Id` - Request correlation ID (optional)
  - `Accept-Language` - Locale preference (optional)
- Error handling: Observable-based with RxJS operators
- Mock mode: All clients support mock API responses for development/testing

## Data Storage

**Databases:**
- PostgreSQL 15
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma Client 5.0.0
  - Connection string format: `postgresql://user:password@host:port/database`

**File Storage:**
- Local filesystem only - No external cloud storage integration detected

**Caching:**
- None configured - All data accessed directly from PostgreSQL

## Authentication & Identity

**Auth Provider:**
- Custom bearer token implementation
- Implementation: API token via `CORE_API_TOKEN` environment variable
- Header-based: `Authorization: Bearer {token}`
- Tenant isolation: Via `X-Tenant-Id` header in all API requests

**User Sessions:**
- Database-backed session management through `UserSession` model
- Supports device tracking (type, name, browser, OS, IP, location)
- Expiration and revocation support
- Status tracking: ACTIVE, EXPIRED, REVOKED

**Access Control:**
- Role-based access control (RBAC) through `Role` and `Permission` models
- Assignment of roles to users via `AccessAssignment` with scope (GLOBAL, TENANT, EVENT, COMMUNITY, etc.)
- Hierarchical permission evaluation

## Monitoring & Observability

**Error Tracking:**
- Not detected - Application throws domain exceptions handled by global exception filter
- Exception filter: `AllExceptionsFilter` (`src/common/errors/all-exceptions.filter.ts`)
- Returns standardized error responses via `ErrorResponse` interface

**Logs:**
- Console logging via NestJS Logger
- Development: `USE_MOCK_API` flag logs mock operation indicators
- Audit trail: Stored in `AuditLog` database table
- Governance audit: `GovernanceAuditLog` table tracks policy evaluations
- Compliance: `ComplianceCheckResult` table tracks compliance validations

## CI/CD & Deployment

**Hosting:**
- Docker Compose (local/development)
- Designed for containerized deployment (Docker images provided)
- Multi-stage Docker build for optimized production image
- Alpine Linux base for minimal footprint

**CI Pipeline:**
- Not detected - No GitHub Actions, Jenkins, or other CI config found

**Environment Configuration:**
- `.env` file for local development
- Environment variables for cloud deployment
- Health check endpoint: `GET /health` (port 3000)

## Environment Configuration

**Required env vars (for API operations):**
- `DATABASE_URL` - PostgreSQL connection string
- `CORE_API_BASE_URL` - Base URL for calling core microservices
- `CORE_API_TOKEN` - Bearer token for API authentication
- `USE_MOCK_API` - Toggle mock responses (default: true)
- `OUTBOX_WORKER_ENABLED` - Enable event publishing worker

**Optional env vars:**
- `PORT` - Server port (default: 3001 dev, 3000 prod)
- `NODE_ENV` - Environment (development/production)

**Secrets location:**
- Environment variables via `.env` file (development only)
- Cloud deployment: Use secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Docker: Pass via environment variables or secrets files

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook listeners configured

**Outgoing:**
- Event publication via Outbox pattern (`OutboxEvent` model)
- Outbox worker: `PlmStageTrigger` sends HTTP requests to external integrations
  - Supports: GET, POST, PUT, PATCH, DELETE methods
  - Payload: Customizable default payloads
  - Integration tracking: `integration_name`, `integration_key`, `integration_id`
  - Execution logging: `PlmTriggerExecution` table tracks all trigger executions
  - Status: PENDING, SUCCESS, FAILURE with error message capture

## Cross-Domain Event Publishing

**Event Pattern:**
- Outbox/Inbox pattern implemented
- `OutboxEvent` table for transactional event publishing
- Event status: PENDING, PROCESSING, PUBLISHED, DEAD
- Retry mechanism: Configurable max retries (default: 3)
- Event metadata:
  - `aggregate_type` - Domain (POINTS, APPROVALS, etc.)
  - `event_type` - Event name (e.g., PointsHeld, PointsCredited)
  - `payload` - Event data as JSON
  - `correlation_id` - Request correlation tracking

**Event Publishing Topics:**
- Points domain: PointsHeld, PointsCredited, PointsDebited, HoldCommitted, HoldReleased
- Approvals domain: ApprovalCreated, ApprovalDecided
- Reservations domain: ReservationCreated, ReservationConfirmed, ReservationReleased
- Identity domain: UserCreated, PermissionAssigned
- Compliance domain: ComplianceCheckExecuted

## Data Synchronization

**Idempotency:**
- `IdempotencyRecord` table ensures at-most-once delivery
- Scope-based keys: `tenantId`, `scope`, `idem_key`
- Stores: request hash, response payload, error payload
- TTL: `expires_at` for automatic cleanup
- Status tracking: IN_PROGRESS, COMPLETED, FAILED

**Request Context:**
- `RequestContext` service for request-scoped data
- Middleware: `RequestContextMiddleware` extracts and stores context
- Supports: tenant ID, user ID, request ID, correlation ID

---

*Integration audit: 2026-01-31*
