import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';

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
    await prisma.pointLedgerEntry.deleteMany({
      where: { tenantId },
    });
    await prisma.pointHold.deleteMany({
      where: { tenantId },
    });
    await prisma.pointAccount.deleteMany({
      where: { tenantId },
    });
    await prisma.idempotencyRecord.deleteMany({
      where: { tenantId },
    });
    await prisma.outboxEvent.deleteMany({
      where: {},
    });
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
          referenceType: 'SYSTEM',
          referenceId: 'e2e-init',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        entryType: 'CREDIT',
        amount: 1000,
        balance: {
          currentBalance: 1000,
          heldBalance: 0,
          availableBalance: 1000,
        },
      });
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.accountId).toBeDefined();
    });

    it('should return same response for idempotent request', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/credit')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-credit-001')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 1000,
          reasonCode: 'INITIAL_CREDIT',
          referenceType: 'SYSTEM',
          referenceId: 'e2e-init',
        })
        .expect(201);

      expect(response.body.balance.currentBalance).toBe(1000); // Not 2000
    });

    it('should reject negative amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/credit')
        .set('X-Tenant-Id', tenantId)
        .send({
          ownerType: 'USER',
          ownerId,
          amount: -100,
          reasonCode: 'TEST',
          referenceType: 'SYSTEM',
          referenceId: 'test',
        })
        .expect(400);

      // Validation error from class-validator
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /points/balance', () => {
    it('should return current balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/points/balance')
        .set('X-Tenant-Id', tenantId)
        .query({ ownerType: 'USER', ownerId })
        .expect(200);

      expect(response.body).toMatchObject({
        currentBalance: 1000,
        heldBalance: 0,
        availableBalance: 1000,
      });
    });

    it('should return zero for non-existent account', async () => {
      const response = await request(app.getHttpServer())
        .get('/points/balance')
        .set('X-Tenant-Id', tenantId)
        .query({ ownerType: 'USER', ownerId: 'non-existent' })
        .expect(200);

      expect(response.body).toMatchObject({
        currentBalance: 0,
        heldBalance: 0,
        availableBalance: 0,
      });
    });
  });

  describe('POST /points/hold', () => {
    it('should hold points', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/hold')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-hold-001')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 300,
          reasonCode: 'ORDER_RESERVE',
          referenceType: 'ORDER',
          referenceId: 'e2e-order-001',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'ACTIVE',
        amount: 300,
        balance: {
          currentBalance: 1000,
          heldBalance: 300,
          availableBalance: 700,
        },
      });
    });

    it('should reject hold when insufficient funds', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/hold')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-hold-fail')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 10000,
          reasonCode: 'ORDER_RESERVE',
          referenceType: 'ORDER',
          referenceId: 'e2e-order-big',
        })
        .expect(402);

      expect(response.body.error).toBe('INSUFFICIENT_FUNDS');
    });

    it('should reject duplicate hold on same reference', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/hold')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-hold-duplicate')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 100,
          reasonCode: 'ORDER_RESERVE',
          referenceType: 'ORDER',
          referenceId: 'e2e-order-001', // Same reference as previous hold
        })
        .expect(409);

      // Different amount triggers specific error
      expect(response.body.error).toMatch(/HOLD_ALREADY_EXISTS/);
    });
  });

  describe('POST /points/holds/commit', () => {
    it('should commit held points', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/holds/commit')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-commit-001')
        .send({
          ownerType: 'USER',
          ownerId,
          reasonCode: 'ORDER_FULFILLED',
          referenceType: 'ORDER',
          referenceId: 'e2e-order-001',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'COMMITTED',
        amount: 300,
        balance: {
          currentBalance: 700,
          heldBalance: 0,
          availableBalance: 700,
        },
      });
    });

    it('should return 404 for non-existent hold', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/holds/commit')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-commit-fail')
        .send({
          ownerType: 'USER',
          ownerId,
          reasonCode: 'ORDER_FULFILLED',
          referenceType: 'ORDER',
          referenceId: 'non-existent',
        })
        .expect(404);

      expect(response.body.error).toBe('HOLD_NOT_FOUND');
    });
  });

  describe('POST /points/holds/release', () => {
    it('should hold and then release points', async () => {
      // Create a new hold
      await request(app.getHttpServer())
        .post('/points/hold')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-hold-release')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 100,
          reasonCode: 'ORDER_RESERVE',
          referenceType: 'ORDER',
          referenceId: 'e2e-order-release',
        })
        .expect(201);

      // Release the hold
      const response = await request(app.getHttpServer())
        .post('/points/holds/release')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-release-001')
        .send({
          ownerType: 'USER',
          ownerId,
          reasonCode: 'ORDER_CANCELLED',
          referenceType: 'ORDER',
          referenceId: 'e2e-order-release',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'RELEASED',
        amount: 100,
        balance: {
          currentBalance: 700,
          heldBalance: 0,
          availableBalance: 700,
        },
      });
    });
  });

  describe('POST /points/debit', () => {
    it('should debit points', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/debit')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-debit-001')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 50,
          reasonCode: 'REDEMPTION',
          referenceType: 'REWARD',
          referenceId: 'e2e-reward-001',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        entryType: 'DEBIT',
        amount: 50,
        balance: {
          currentBalance: 650,
          heldBalance: 0,
          availableBalance: 650,
        },
      });
    });

    it('should reject debit when insufficient funds', async () => {
      const response = await request(app.getHttpServer())
        .post('/points/debit')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-debit-fail')
        .send({
          ownerType: 'USER',
          ownerId,
          amount: 10000,
          reasonCode: 'BIG_PURCHASE',
          referenceType: 'ORDER',
          referenceId: 'e2e-big-order',
        })
        .expect(402);

      expect(response.body.error).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('GET /points/statement', () => {
    it('should return paginated statement', async () => {
      const response = await request(app.getHttpServer())
        .get('/points/statement')
        .set('X-Tenant-Id', tenantId)
        .query({ ownerType: 'USER', ownerId, page: 0, size: 10 })
        .expect(200);

      expect(response.body.meta).toMatchObject({
        page: 0,
        size: 10,
      });
      expect(response.body.items.length).toBeGreaterThan(0);

      // Should contain our operations
      const entryTypes = response.body.items.map((i: any) => i.entryType);
      expect(entryTypes).toContain('CREDIT');
      expect(entryTypes).toContain('HOLD');
      expect(entryTypes).toContain('COMMIT');
      expect(entryTypes).toContain('RELEASE');
      expect(entryTypes).toContain('DEBIT');
    });

    it('should filter by entry type', async () => {
      const response = await request(app.getHttpServer())
        .get('/points/statement')
        .set('X-Tenant-Id', tenantId)
        .query({ ownerType: 'USER', ownerId, entryType: 'CREDIT' })
        .expect(200);

      const allCredit = response.body.items.every(
        (i: any) => i.entryType === 'CREDIT',
      );
      expect(allCredit).toBe(true);
    });

    it('should filter by reference', async () => {
      const response = await request(app.getHttpServer())
        .get('/points/statement')
        .set('X-Tenant-Id', tenantId)
        .query({
          ownerType: 'USER',
          ownerId,
          referenceType: 'ORDER',
          referenceId: 'e2e-order-001',
        })
        .expect(200);

      const allMatchRef = response.body.items.every(
        (i: any) =>
          i.referenceType === 'ORDER' && i.referenceId === 'e2e-order-001',
      );
      expect(allMatchRef).toBe(true);
    });
  });
});
