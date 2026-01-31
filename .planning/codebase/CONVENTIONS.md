# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- Controllers: `*.controller.ts` (e.g., `settings.controller.ts`, `identity.controller.ts`)
- Services: `*.service.ts` (e.g., `policy-evaluator.service.ts`, `availability-calculator.service.ts`)
- Modules: `*.module.ts` (e.g., `reservations.module.ts`)
- DTOs: `*.ts` (grouped in `dtos/` directory, e.g., `dtos/index.ts`)
- Aggregates: `*.aggregate.ts` (e.g., `reservation.aggregate.ts`)
- Repositories: `*.repository.ts` (e.g., `reservation.repository.ts`)
- Value Objects: Grouped in `value-objects/index.ts`
- Use Cases: `*.usecase.ts` (e.g., `create-permission.usecase.ts`)
- Specs/Tests: `*.spec.ts` (e.g., `reservation.aggregate.spec.ts`)
- E2E Tests: `*.e2e-spec.ts` (e.g., `points.e2e-spec.ts`)

**Functions:**
- camelCase for all function names
- Domain services use static methods (e.g., `PolicyEvaluator.validatePolicyActive()`)
- Constructor injection in controllers and services
- Getter methods as properties (e.g., `reservation.isHold()`, `reservation.isConfirmed()`)

**Variables:**
- camelCase for all variable and parameter names
- Private properties use underscore prefix with readonly (e.g., `private readonly _id: string`)
- Public properties use camelCase without prefix

**Types:**
- PascalCase for classes and interfaces
- PascalCase for enums (e.g., `UserStatus`, `ReservationStatus`, `RoleEffect`)
- Suffix interfaces with descriptive names (e.g., `ReservationProps`, `CreateReservationProps`, `PolicyValidationResult`)
- DTO classes use suffix `Dto` (e.g., `CreateUserDto`, `UpdateUserDto`, `ListUsersQueryDto`)
- Response DTOs use suffix `ResponseDto` (e.g., `UserResponseDto`, `PermissionResponseDto`)
- Port interfaces use suffix `Port` (e.g., `ReservationRepositoryPort`)

## Code Style

**Formatting:**
- No explicit prettier config found; uses project defaults
- eslint-plugin-prettier integration enabled

**Linting:**
- ESLint with TypeScript support (@typescript-eslint/eslint-plugin v6)
- Config: `.eslintrc.js`
- Key rules disabled for flexibility:
  - `@typescript-eslint/interface-name-prefix`: off (interfaces don't require I prefix)
  - `@typescript-eslint/explicit-function-return-type`: off (return types inferred)
  - `@typescript-eslint/explicit-module-boundary-types`: off (boundary types inferred)
  - `@typescript-eslint/no-explicit-any`: off (any allowed when necessary)
  - `@typescript-eslint/no-unused-vars`: warn with `argsIgnorePattern: '^_'` (unused args starting with _ ignored)

## Import Organization

**Order:**
1. External packages (NestJS, class-validator, class-transformer, etc.)
2. Internal domain imports (@domain, @application, @infrastructure, @shared aliases)
3. Local relative imports

**Path Aliases:**
- `@domain/*` → `src/domain/*`
- `@application/*` → `src/application/*`
- `@infrastructure/*` → `src/infrastructure/*`
- `@shared/*` → `src/shared/*`

**Example Pattern from `identity.controller.ts`:**
```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateUserUseCase } from '../../application/usecases';
import { UserNotFoundError } from '../../application/errors';
import { CreateUserDto } from '../dtos';
```

## Error Handling

**Patterns:**
- Domain errors: Custom error classes extending Error (e.g., `UserNotFoundError`, `PermissionCodeAlreadyExistsError`)
- HTTP errors: `HttpException` from @nestjs/common with HttpStatus enum
- Validation results: Use domain validation objects (e.g., `PolicyValidationResult` interface with `valid`, `error`, `errorCode`)
- Domain services return objects with `{valid: boolean, error?: string, errorCode?: string}` pattern

**From `policy-evaluator.service.ts`:**
```typescript
export interface PolicyValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

static validatePolicyActive(policy: ReservationPolicy): PolicyValidationResult {
  if (!policy.isActive) {
    return {
      valid: false,
      error: 'Policy is not active',
      errorCode: 'POLICY_INACTIVE',
    };
  }
  return { valid: true };
}
```

**From controllers (HTTP exceptions):**
```typescript
throw new HttpException(
  { error: 'CATEGORY_NOT_FOUND' },
  HttpStatus.NOT_FOUND
);
```

## Logging

**Framework:** console methods (console.log, console.error) currently used for debugging

**Patterns:**
- Debug logs with context prefix (e.g., `console.log('[REORDER] Starting:', { ... })`)
- Error logging in catch blocks (e.g., `console.error('[REORDER] Error:', error)`)
- Located in: `src/domains/plm/plm.controller.ts`, `src/domains/settings/suppliers.controller.ts`

Note: Consider implementing structured logging with Winston or Pino for production.

## Comments

**When to Comment:**
- JSDoc comments on domain service methods explaining purpose (e.g., "Policy Evaluator Domain Service" comment above class)
- JSDoc on static methods in domain services with parameter/return documentation
- Block comments explaining complex business logic
- Minimal inline comments; code should be self-documenting

**JSDoc/TSDoc:**
- Used on domain service static methods
- Pattern: `/** comment */ static methodName()`

## Function Design

**Size:** Domain service methods are single-responsibility and focused, typically 10-20 lines

**Parameters:**
- Constructor injection for dependencies (controllers, services)
- Method parameters use single object parameter for multiple values (e.g., Filter objects)
- Keep method signatures simple (1-3 parameters typical)

**Return Values:**
- Domain methods return domain objects (aggregates, entities, value objects)
- Service validation methods return result objects: `{valid: boolean, error?: string, errorCode?: string}`
- HTTP endpoints return DTOs
- Use null for optional/missing values: `Promise<ThemeConfig | null>`

## Module Design

**Exports:**
- Modules export providers and repositories via `exports: [TOKEN]` array
- Example from `reservations.module.ts`:
```typescript
exports: [
  RESERVATION_REPOSITORY,
  RESOURCE_REPOSITORY,
  POLICY_REPOSITORY,
]
```

**Barrel Files:**
- Index files re-export public API (e.g., `dtos/index.ts`, `value-objects/index.ts`)
- Use barrel exports to simplify imports from domain modules

**Dependency Injection:**
- NestJS Module pattern with providers array
- Tokens for repository injection:
```typescript
{
  provide: RESERVATION_REPOSITORY,
  useClass: ReservationRepository,
}
```

---

*Convention analysis: 2026-01-31*
