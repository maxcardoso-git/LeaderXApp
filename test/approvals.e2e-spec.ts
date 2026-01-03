import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('ApprovalsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testHeaders = {
    'x-tenant-id': 'test-tenant',
    'x-org-id': 'test-org',
  };

  beforeAll(async () => {
    // Set mock mode
    process.env.USE_MOCK_API = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.idempotencyRecord.deleteMany({
      where: { tenantId: 'test-tenant' },
    });
    await prisma.outboxEvent.deleteMany({
      where: { correlationId: { startsWith: 'test-' } },
    });
  });

  describe('GET /approvals', () => {
    it('should return a list of approvals', async () => {
      const response = await request(app.getHttpServer())
        .get('/approvals')
        .set(testHeaders)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter approvals by state', async () => {
      const response = await request(app.getHttpServer())
        .get('/approvals?state=PENDING')
        .set(testHeaders)
        .expect(200);

      expect(response.body.items.every((item: { state: string }) => item.state === 'PENDING')).toBe(true);
    });

    it('should filter approvals by priority', async () => {
      const response = await request(app.getHttpServer())
        .get('/approvals?priority=HIGH')
        .set(testHeaders)
        .expect(200);

      expect(response.body.items.every((item: { priority: string }) => item.priority === 'HIGH')).toBe(true);
    });
  });

  describe('GET /approvals/:approvalId', () => {
    it('should return a specific approval', async () => {
      const response = await request(app.getHttpServer())
        .get('/approvals/apr-001')
        .set(testHeaders)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'apr-001');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('state');
    });

    it('should return 404 for non-existent approval', async () => {
      await request(app.getHttpServer())
        .get('/approvals/non-existent')
        .set(testHeaders)
        .expect(404);
    });
  });

  describe('POST /approvals/:approvalId/decide', () => {
    it('should decide an approval successfully', async () => {
      const idempotencyKey = `e2e-test-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/approvals/apr-001/decide')
        .set(testHeaders)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          decision: 'APPROVE',
          reason: 'E2E test approval',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id', 'apr-001');
      expect(response.body).toHaveProperty('status', 'DECIDED');
    });

    it('should require Idempotency-Key header', async () => {
      await request(app.getHttpServer())
        .post('/approvals/apr-001/decide')
        .set(testHeaders)
        .send({
          decision: 'APPROVE',
        })
        .expect(400);
    });

    it('should return cached response for duplicate idempotency key', async () => {
      const idempotencyKey = `e2e-duplicate-${Date.now()}`;

      // First request
      const firstResponse = await request(app.getHttpServer())
        .post('/approvals/apr-001/decide')
        .set(testHeaders)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          decision: 'REJECT',
          reason: 'First request',
        })
        .expect(200);

      // Second request with same key
      const secondResponse = await request(app.getHttpServer())
        .post('/approvals/apr-001/decide')
        .set(testHeaders)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          decision: 'REJECT',
          reason: 'First request',
        })
        .expect(200);

      expect(firstResponse.body).toEqual(secondResponse.body);
    });

    it('should create outbox event on successful decision', async () => {
      const idempotencyKey = `e2e-outbox-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/approvals/apr-002/decide')
        .set(testHeaders)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          decision: 'APPROVE',
          reason: 'Testing outbox',
        })
        .expect(200);

      // Wait for event to be enqueued
      await new Promise((resolve) => setTimeout(resolve, 100));

      const outboxEvents = await prisma.outboxEvent.findMany({
        where: {
          aggregateId: 'apr-002',
          eventType: 'approval.decided',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(outboxEvents.length).toBeGreaterThan(0);
      expect(outboxEvents[0].eventType).toBe('approval.decided');
    });

    it('should validate decision enum', async () => {
      const idempotencyKey = `e2e-invalid-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/approvals/apr-001/decide')
        .set(testHeaders)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          decision: 'INVALID_DECISION',
        })
        .expect(400);
    });
  });

  describe('POST /approvals/bulk-decide', () => {
    it('should bulk decide multiple approvals', async () => {
      const idempotencyKey = `e2e-bulk-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/approvals/bulk-decide')
        .set(testHeaders)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          approvalIds: ['apr-001', 'apr-002'],
          decision: 'APPROVE',
          reason: 'Bulk approval test',
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
    });

    it('should require Idempotency-Key for bulk operations', async () => {
      await request(app.getHttpServer())
        .post('/approvals/bulk-decide')
        .set(testHeaders)
        .send({
          approvalIds: ['apr-001'],
          decision: 'APPROVE',
        })
        .expect(400);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
    });
  });
});
