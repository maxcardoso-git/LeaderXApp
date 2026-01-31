# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5.1.3 - Core application language, strict mode enabled

**Secondary:**
- JavaScript - Node.js runtime

## Runtime

**Environment:**
- Node.js 20 (Alpine Linux in Docker)

**Package Manager:**
- npm - Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- NestJS 10.0.0 - Backend framework with dependency injection and modular architecture
- NestJS CQRS 10.0.0 - Command Query Responsibility Segregation pattern for domain-driven design
- NestJS Swagger 7.0.0 - API documentation and OpenAPI spec generation

**Testing:**
- Jest 29.5.0 - Unit and e2e testing framework
- ts-jest 29.1.0 - TypeScript support for Jest
- Supertest 6.3.3 - HTTP assertion library for e2e tests

**Build/Dev:**
- NestJS CLI 10.0.0 - Project scaffolding and build tooling
- ts-loader 9.4.3 - Webpack TypeScript loader
- ts-node 10.9.1 - Direct TypeScript execution for scripts

## Key Dependencies

**Critical:**
- @prisma/client 5.0.0 - Database ORM and query builder for PostgreSQL
- prisma 5.0.0 - Prisma CLI for migrations and code generation
- @nestjs/axios 4.0.1 - HTTP client for external API calls
- @nestjs/config 3.0.0 - Environment configuration management
- uuid 9.0.0 - UUID generation for entity IDs

**Infrastructure:**
- class-transformer 0.5.1 - Object transformation and serialization
- class-validator 0.14.0 - Data validation using decorators
- reflect-metadata 0.1.13 - Metadata reflection for decorators
- rxjs 7.8.1 - Reactive programming library for async operations

**Development Tools:**
- @typescript-eslint/eslint-plugin 6.0.0 - TypeScript linting rules
- @typescript-eslint/parser 6.0.0 - ESLint parser for TypeScript
- eslint 8.42.0 - Code linting
- eslint-config-prettier 9.0.0 - ESLint config that disables conflicting rules
- eslint-plugin-prettier 5.0.0 - ESLint plugin for Prettier
- prettier 3.0.0 - Code formatting
- source-map-support 0.5.21 - Stack trace source map support
- tsconfig-paths 4.2.0 - TypeScript path alias resolution

## Configuration

**Environment:**
- `.env` file for local development variables
- Environment variables:
  - `PORT` - Server port (default: 3001 in dev, 3000 in prod)
  - `NODE_ENV` - Execution environment (development/production)
  - `DATABASE_URL` - PostgreSQL connection string
  - `CORE_API_BASE_URL` - Base URL for core API calls (e.g., http://localhost:3001)
  - `CORE_API_TOKEN` - Bearer token for API authentication
  - `USE_MOCK_API` - Toggle mock API responses (true/false, default: true)
  - `OUTBOX_WORKER_ENABLED` - Enable event outbox publishing worker

**Build:**
- `tsconfig.json` - TypeScript compilation config:
  - Target: ES2021
  - Module: CommonJS
  - Strict mode enabled (strictNullChecks, noImplicitAny, etc.)
  - Path aliases configured for `@domain/`, `@application/`, `@infrastructure/`, `@shared/`
  - Source maps enabled
  - Incremental compilation enabled

- `jest.config.ts` - Jest test configuration:
  - Test environment: Node.js
  - Root directory: `src/`
  - Test file pattern: `*.spec.ts`
  - Coverage directory: `coverage/`
  - Module name mapper for path aliases

- `.eslintrc.js` - ESLint configuration:
  - Parser: @typescript-eslint/parser
  - Environment: Node.js + Jest
  - Ignores: dist/, node_modules/, services/ (generated OpenAPI clients)
  - Lenient rules for explicit types and unused variables

## Platform Requirements

**Development:**
- Node.js 20.x
- npm/npm-compatible package manager
- PostgreSQL 15+ (local database)
- Docker (optional, for containerized development)

**Production:**
- Node.js 20-Alpine Docker image
- PostgreSQL database (cloud or self-hosted)
- Environment variable configuration for cloud deployment
- Non-root user execution (nestjs user with UID 1001)
- Health check endpoint at `GET http://localhost:3000/health`

## Database

**Primary:**
- PostgreSQL 15-Alpine (in Docker Compose)
- Database name: `leaderx_core` (development), configurable via `DATABASE_URL`
- Default credentials: `postgres`/`postgres`

**ORM:**
- Prisma Client - Type-safe ORM with schema-driven migrations
- Prisma Migrations - Managed database schema evolution
- Connection pooling through PostgreSQL native configuration

## Container & Deployment

**Docker:**
- Multi-stage Dockerfile:
  - Builder stage: Node 20-Alpine, builds and prunes dependencies
  - Production stage: Node 20-Alpine, runs optimized application
- Health check: `wget --no-verbose --tries=1 --spider http://localhost:3000/health`
- Port exposed: 3000 (production)
- Non-root user: nestjs (UID 1001)

**Docker Compose:**
- Service: `admin-bff` (API server)
- Service: `postgres` (PostgreSQL database)
- Network: `leaderx-network` (bridge driver)
- Volumes: `postgres_data` (database persistence)
- Health checks configured for both services

---

*Stack analysis: 2026-01-31*
