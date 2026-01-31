# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Jest 29.5.0
- Config: `jest` section in `package.json` (lines 70-92)

**Assertion Library:**
- Jest built-in matchers (expect)

**Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:cov     # Coverage report
npm run test:e2e     # E2E tests with ./test/jest-e2e.json config
```

## Test File Organization

**Location:**
- Unit/spec tests: Co-located with source files in same directory
- E2E tests: Separate `test/` directory at project root

**Naming:**
- Spec files: `*.spec.ts` (e.g., `reservation.aggregate.spec.ts`)
- E2E spec files: `*.e2e-spec.ts` (e.g., `points.e2e-spec.ts`)

**Structure:**
```
src/
├── domains/
│   ├── reservations/
│   │   └── domain/
│   │       ├── aggregates/
│   │       │   ├── reservation.aggregate.ts
│   │       │   └── reservation.aggregate.spec.ts
│   │       └── services/
│   │           ├── policy-evaluator.service.ts
│   │           └── policy-evaluator.service.spec.ts
test/
├── jest-e2e.json
├── points.e2e-spec.ts
├── reservations.e2e-spec.ts
└── approvals.e2e-spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('Reservation Aggregate', () => {
  const createProps = (
    overrides: Partial<CreateReservationProps> = {},
  ): CreateReservationProps => ({
    tenantId: 'tenant-1',
    eventId: 'event-1',
    // ...default test data
    ...overrides,
  });

  describe('create', () => {
    it('should create a reservation in HOLD status', () => {
      // Arrange
      const props = createProps();

      // Act
      const reservation = Reservation.create('res-1', props);

      // Assert
      expect(reservation.id).toBe('res-1');
      expect(reservation.status).toBe(ReservationStatus.HOLD);
    });

    it('should throw error if not in HOLD status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();

      expect(() => reservation.confirm()).toThrow(
        'Cannot confirm reservation: status is CONFIRMED, expected HOLD',
      );
    });
  });
});
```

**Patterns:**
- Helper function at top of describe block to create test data with overrides (e.g., `createProps()`)
- Nested describe blocks for method/feature grouping (e.g., `describe('create')`, `describe('confirm')`)
- Arrange-Act-Assert pattern within each test
- Descriptive test names with "should" prefix

## Mocking

**Framework:** Jest built-in mocking (no external mocking library)

**Patterns:**
- Minimal mocking; prefer testing actual domain objects
- Create real aggregate instances and domain services for testing
- E2E tests use real database via Prisma

**Test Data Factories:**
```typescript
// From availability-calculator.service.spec.ts
const createResource = (capacityTotal: number): ReservableResource => {
  return ReservableResource.reconstitute({
    id: 'resource-1',
    tenantId: 'tenant-1',
    eventId: 'event-1',
    resourceType: ResourceType.TABLE,
    name: 'Mesa 1',
    capacityTotal,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const createReservation = (
  status: ReservationStatus,
  id: string = 'res-1',
  expiresAt: Date | null = null,
): Reservation => {
  return Reservation.reconstitute({
    id,
    tenantId: 'tenant-1',
    // ...full props
  });
};
```

**What to Mock:**
- External services/adapters only (via dependency injection in e2e)
- Database layer abstraction (repositories)

**What NOT to Mock:**
- Domain aggregates and entities (test actual behavior)
- Domain services (test actual validation logic)
- Value objects (test actual calculations)

## Fixtures and Factories

**Test Data:**
- Helper functions at top of test files create realistic test data
- Overrides pattern allows customization: `createProps({ maxPerUser: 2 })`
- Date-based test data: `new Date(Date.now() + 900000)` for relative times

**Location:**
- Inline within spec files (no separate fixture files)
- Shared test utilities in test helpers

**Example from `policy-evaluator.service.spec.ts`:**
```typescript
const createPolicy = (
  overrides: Partial<{
    isActive: boolean;
    windowStart: Date | null;
    windowEnd: Date | null;
    maxPerUser: number;
  }> = {},
): ReservationPolicy => {
  return ReservationPolicy.reconstitute({
    id: 'policy-1',
    tenantId: 'tenant-1',
    eventId: 'event-1',
    resourceType: ResourceType.TABLE,
    costInPoints: overrides.costInPoints ?? 100,
    // ...other defaults
    ...overrides,
  });
};
```

## Coverage

**Requirements:** Not enforced (no minimum specified in config)

**View Coverage:**
```bash
npm run test:cov
```

Output location: `./coverage` directory (relative to project root)

## Test Types

**Unit Tests:**
- Scope: Single domain object, service, or method
- Approach: Test in isolation using test data factories
- Files: `*.spec.ts` files co-located with source
- Examples:
  - `reservation.aggregate.spec.ts` - tests aggregate lifecycle and state transitions
  - `policy-evaluator.service.spec.ts` - tests validation rules
  - `availability-calculator.service.spec.ts` - tests capacity calculations

**Integration Tests:**
- Scope: Multiple domain objects working together or with repositories
- Approach: Create realistic scenarios testing behavior combinations
- Not explicitly separated; some tests use multiple aggregates together

**E2E Tests:**
- Framework: Jest with supertest HTTP client and NestJS TestingModule
- Scope: Full HTTP endpoint testing with real database
- Location: `test/*.e2e-spec.ts`
- Pattern: Create TestingModule, initialize NestJS app, make HTTP requests

**E2E Test Pattern from `points.e2e-spec.ts`:**
```typescript
describe('Points API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tenantId = 'e2e-test-tenant';
  const ownerId = 'e2e-test-user';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.pointLedgerEntry.deleteMany({ where: { tenantId } });
    await app.close();
  });

  describe('POST /points/credit', () => {
    it('should create account and credit points', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/credit')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-credit-001')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 1000,
          reasonCode: 'INITIAL_CREDIT',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        entryType: 'CREDIT',
        amount: 1000,
      });
    });
  });
});
```

## Common Patterns

**Async Testing:**
```typescript
// E2E tests use async/await
it('should create account and credit points', async () => {
  const response = await request(app.getHttpServer())
    .post('/points/credit')
    .set('X-Tenant-Id', tenantId)
    .send({ /* data */ })
    .expect(201);

  expect(response.body).toMatchObject({ /* assertions */ });
});

// Unit tests are synchronous
it('should create a reservation', () => {
  const reservation = Reservation.create('res-1', props);
  expect(reservation.status).toBe(ReservationStatus.HOLD);
});
```

**Error Testing:**
```typescript
// Testing domain errors
it('should throw error if not in HOLD status', () => {
  const props = createProps();
  const reservation = Reservation.create('res-1', props);
  reservation.confirm();

  expect(() => reservation.confirm()).toThrow(
    'Cannot confirm reservation: status is CONFIRMED, expected HOLD',
  );
});

// Testing HTTP validation errors (e2e)
it('should reject negative amount', async () => {
  const response = await request(app.getHttpServer())
    .post('/points/credit')
    .set('X-Tenant-Id', tenantId)
    .set('Idempotency-Key', 'e2e-credit-002')
    .send({
      ownerType: 'USER',
      ownerId,
      amount: -100,
      reasonCode: 'INVALID',
    })
    .expect(400); // Validation error
});
```

**Idempotency Testing (E2E):**
```typescript
// Test that idempotent requests return same response
it('should return same response for idempotent request', async () => {
  const response = await request(app.getHttpServer())
    .post('/points/credit')
    .set('X-Tenant-Id', tenantId)
    .set('Idempotency-Key', 'e2e-credit-001')
    .send({ /* data */ })
    .expect(201);

  expect(response.body.balance.currentBalance).toBe(1000); // Not 2000
});
```

**Status/State Testing:**
```typescript
// Test multiple related conditions
it('should correctly identify HOLD status', () => {
  const props = createProps();
  const reservation = Reservation.create('res-1', props);

  expect(reservation.isHold()).toBe(true);
  expect(reservation.isConfirmed()).toBe(false);
  expect(reservation.isReleased()).toBe(false);
  expect(reservation.isActive()).toBe(true);
});
```

---

*Testing analysis: 2026-01-31*
