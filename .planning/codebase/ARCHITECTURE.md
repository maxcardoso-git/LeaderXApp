# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Hexagonal Architecture (Ports & Adapters) with Domain-Driven Design (DDD)

**Key Characteristics:**
- Multi-domain modular monolith with independent business domains
- Strict separation of concerns: Domain → Application → Infrastructure
- Dependency inversion via NestJS dependency injection and port/adapter pattern
- CQRS pattern for command handling and queries in selected domains
- Event-driven architecture with outbox pattern for eventual consistency

## Layers

**Domain Layer:**
- Purpose: Core business logic, invariants, and rules
- Location: `src/domains/[domain-name]/domain/`
- Contains: Entities, Value Objects, Domain Events, Domain Services, Ports (interfaces)
- Depends on: Nothing (completely isolated, no external dependencies)
- Used by: Application layer and other domains through well-defined ports

**Application Layer:**
- Purpose: Orchestrate domain logic, execute use cases, handle commands and queries
- Location: `src/domains/[domain-name]/application/`
- Contains: Use Cases, Command/Query Handlers, Application Services, Application Errors, DTOs
- Depends on: Domain layer (for business rules), Ports (for repository contracts)
- Used by: Inbound adapters (controllers) and other domain modules

**Inbound Adapters (HTTP):**
- Purpose: Expose APIs via REST/HTTP controllers
- Location: `src/domains/[domain-name]/inbound/`
- Contains: Controllers, DTOs, Request validation
- Depends on: Application layer (handlers/use cases), NestJS decorators
- Used by: HTTP clients, API consumers

**Outbound Adapters (Repositories/Persistence):**
- Purpose: Implement persistence, external service calls, data access
- Location: `src/domains/[domain-name]/outbound/`
- Contains: Repository implementations, Adapters, External service clients
- Depends on: Domain ports (interfaces), Prisma, External SDKs
- Used by: Application handlers to fulfill port contracts

**Infrastructure Layer:**
- Purpose: Cross-cutting technical concerns, shared services
- Location: `src/infrastructure/`
- Contains: Prisma service, OpenAPI clients, HTTP clients, Messaging adapters
- Depends on: Third-party libraries, environment config
- Used by: All layers for database access, external APIs, messaging

**Common/Shared:**
- Purpose: Utilities shared across domains
- Location: `src/common/` (legacy), `src/shared/` (new structure)
- Contains: Validation, Error handling, Request context, Idempotency, Outbox patterns, Retry logic

## Data Flow

**Command Execution (Mutating Operations):**

1. HTTP POST to Controller endpoint (`src/domains/[domain]/inbound/controllers/`)
2. Controller validates DTO and creates Command object
3. Controller injects and calls Handler (e.g., `CreditPointsHandler`)
4. Handler retrieves aggregate from repository via Port
5. Handler calls domain service or aggregate method to execute business logic
6. Handler persists changes via outbound repositories
7. Handler publishes domain events to outbox table
8. Controller returns DTO response with 201/200 status

**Example: Credit Points Flow:**
- POST `/points/credit` → `PointsController.credit()`
- Creates `CreditPointsCommand` → `CreditPointsHandler.execute()`
- `PointAccountRepository.findById()` → retrieves aggregate
- `BalanceCalculator.calculateBalance()` → business logic
- `PointLedgerRepository.save()` + `OutboxRepository.save()` → persistence
- Returns transaction receipt with balance info

**Query Execution (Read Operations):**

1. HTTP GET to Controller endpoint
2. Controller creates Query object from path/query parameters
3. Controller calls Query Handler
4. Handler reads from repositories without modification
5. Handler returns DTO response with 200 status

**Example: Get Balance Query:**
- GET `/points/balance/{accountId}` → `PointsController.balance()`
- Creates `GetBalanceQuery` → `GetBalanceHandler.execute()`
- `PointAccountRepository.findById()` → read aggregate
- `PointLedgerRepository.findByAccountId()` → read transaction history
- Calculates balance via `BalanceCalculator`
- Returns balance response

**State Management:**

- **Aggregate State:** Stored in database via Prisma, loaded on-demand
- **Domain Events:** Stored in outbox table for eventual publication
- **Request Context:** Request ID, Tenant ID, Actor ID passed via headers through middleware
- **Idempotency:** Keys stored in idempotency repository to prevent duplicate transactions

## Key Abstractions

**Domain Ports (Interfaces):**
- Purpose: Define contracts for external dependencies (repositories, services)
- Examples: `src/domains/points/domain/ports/point-account.repository.port.ts`, `IdempotencyRepositoryPort`
- Pattern: Each domain defines ports it needs; outbound adapters implement them

**Repository Pattern:**
- Purpose: Abstract data access, enable testing without real database
- Examples: `PointAccountRepository`, `EventRepository`, `AuditLogRepository`
- Pattern: Implements port interface, uses Prisma client internally

**Domain Services:**
- Purpose: Encapsulate complex business logic that spans multiple aggregates
- Examples: `BalanceCalculator` (points), `EventLifecycleService` (events), `EventAvailabilityService`
- Pattern: Injected into handlers, operate on domains without side effects

**Command/Query Pattern (Points, Reservations domains):**
- Purpose: Separate read and write operations, scalability
- Commands: `CreditPointsCommand`, `HoldPointsCommand`, `DebitPointsCommand`
- Queries: `GetBalanceQuery`, `GetStatementQuery`
- Handlers: `CreditPointsHandler`, `GetBalanceHandler` (use `@QueryHandler` and `@CommandHandler` decorators)

**Use Case Pattern (Events, Audit, Governance, Identity, Network domains):**
- Purpose: Encapsulate single business operation with clear input/output
- Examples: `CreateEventUseCase`, `ListPublicEventsUseCase`, `CreateAuditLogUseCase`
- Pattern: Injectable services with `execute()` method accepting DTO, returning result

**Unit of Work Pattern:**
- Purpose: Ensure multiple operations succeed or fail atomically
- Implementation: `PrismaUnitOfWork` wraps database transaction
- Used by: Points domain handlers for complex multi-repository operations

**Outbox Pattern:**
- Purpose: Guarantee eventual consistency when publishing events
- Implementation: Domain events saved to outbox table within same transaction
- Consumer: Background job/service reads outbox and publishes events (not implemented in current code)

## Entry Points

**HTTP Bootstrap:**
- Location: `src/main.ts`
- Triggers: Application startup (`npm start`, Docker container init)
- Responsibilities: Create NestJS app, setup global pipes (validation), enable CORS, configure Swagger, listen on port 3001

**Module Bootstrap:**
- Location: `src/app.module.ts`
- Triggers: NestJS initialization
- Responsibilities: Register all domain modules, setup CQRS module, configure global config module

**Health Check:**
- Location: `src/health/health.controller.ts`
- Triggers: GET `/health`, `/health/live`, `/health/ready`
- Responsibilities: Check service availability, database connectivity

**Domain Controllers:**
- `src/domains/points/inbound/controllers/points.controller.ts` - Points operations
- `src/domains/events/inbound/controllers/` - Event operations (admin/public)
- `src/domains/audit/inbound/controllers/` - Audit log operations
- `src/domains/governance/inbound/controllers/` - Governance operations
- `src/domains/network/inbound/controllers/` - Network operations
- `src/domains/reservations/inbound/controllers/` - Reservation operations
- `src/domains/identity/inbound/controllers/` - Identity operations

## Error Handling

**Strategy:** Custom domain exceptions, caught and mapped to HTTP status codes

**Patterns:**

1. **Domain-Level Errors:** Throw custom exception classes from domain services
   - Example: `InsufficientFundsError` in points domain
   - Example: `HoldNotFoundError` in points domain
   - Contains business context, not HTTP-aware

2. **Application-Level Errors:** Handlers catch domain errors and throw application exceptions
   - Example: `ValidationError` in handlers
   - Example: `IdempotencyConflictError` for duplicate requests
   - Application exceptions understand HTTP mapping

3. **Controller Error Handling:** Controllers implement `handleError()` method
   - Example: `src/domains/points/inbound/controllers/points.controller.ts` line 190+
   - Maps specific errors to HTTP status codes (400, 409, 500)
   - Uses HttpException for proper response formatting

4. **Validation:** Global NestJS ValidationPipe enforces DTO structure
   - Configured in `src/main.ts` with whitelist and forbidNonWhitelisted
   - Throws 400 Bad Request for invalid input

## Cross-Cutting Concerns

**Logging:**
- Approach: NestJS Logger service, log scope set to class/handler name
- Example: `private readonly logger = new Logger(CreditPointsHandler.name)`
- Used for debugging, tracking execution flow

**Validation:**
- Approach: NestJS class-validator decorators on DTOs + GlobalValidationPipe
- Example: `@IsUUID()`, `@IsNumber()`, `@Min(0)` on DTO properties
- Enforced at inbound adapter layer before handler execution

**Authentication & Authorization:**
- Approach: Tenant ID and Org ID passed via headers (`X-Tenant-Id`, `X-Org-Id`)
- No JWT/OAuth implemented; relies on external gateway or ingress
- Request context available via optional headers (`X-Request-Id`, `X-Actor-Id`)
- Applied implicitly: tenantId required in all commands/queries for data isolation

**Request Tracing:**
- Approach: Request ID passed via `X-Request-Id` header, propagated through operations
- Idempotency Key (`Idempotency-Key` header) used to prevent duplicate processing
- Example: Points domain stores idempotency key to deduplicate credit/debit operations

**Multi-Tenancy:**
- Approach: Tenant ID included in all domain operations, enforced at database level
- Isolation: Data filtered by tenant ID in all queries
- Schema: Tables include `tenant_id` column with indexes for query performance

---

*Architecture analysis: 2026-01-31*
