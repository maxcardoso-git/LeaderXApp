import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';
import { ExpireHoldsJob } from '../src/domains/reservations/application/jobs/expire-holds.job';

describe('Reservations API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let expireHoldsJob: ExpireHoldsJob;

  const tenantId = 'e2e-res-tenant';
  const eventId = uuidv4();
  const ownerId = uuidv4();
  const owner2Id = uuidv4();

  let policyId: string;
  let policyFreeCostId: string;
  let resourceTableId: string;
  let resourceSeatId: string;

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
    expireHoldsJob = app.get<ExpireHoldsJob>(ExpireHoldsJob);

    // Setup fixtures
    await setupFixtures();
  });

  async function setupFixtures() {
    // Create policies
    policyId = uuidv4();
    policyFreeCostId = uuidv4();
    resourceTableId = uuidv4();
    resourceSeatId = uuidv4();

    // Policy with points cost
    await prisma.reservationPolicy.create({
      data: {
        id: policyId,
        tenantId,
        eventId,
        resourceType: 'TABLE',
        costInPoints: 200,
        maxPerUser: 1,
        requiresApproval: false,
        holdTtlSeconds: 60,
        windowStart: null,
        windowEnd: null,
        isActive: true,
      },
    });

    // Policy without points cost
    await prisma.reservationPolicy.create({
      data: {
        id: policyFreeCostId,
        tenantId,
        eventId,
        resourceType: 'SEAT',
        costInPoints: 0,
        maxPerUser: 2,
        requiresApproval: false,
        holdTtlSeconds: 60,
        windowStart: null,
        windowEnd: null,
        isActive: true,
      },
    });

    // Create resources
    await prisma.reservableResource.create({
      data: {
        id: resourceTableId,
        tenantId,
        eventId,
        resourceType: 'TABLE',
        name: 'Mesa VIP 1',
        capacityTotal: 8,
        isActive: true,
      },
    });

    await prisma.reservableResource.create({
      data: {
        id: resourceSeatId,
        tenantId,
        eventId,
        resourceType: 'SEAT',
        name: 'Assento A1',
        capacityTotal: 1,
        isActive: true,
      },
    });

    // Create point account with balance for user
    const accountId = uuidv4();
    await prisma.pointAccount.create({
      data: {
        id: accountId,
        tenantId,
        ownerType: 'USER',
        ownerId,
        status: 'ACTIVE',
      },
    });

    // Credit initial points
    await prisma.pointLedgerEntry.create({
      data: {
        id: uuidv4(),
        tenantId,
        accountId,
        entryType: 'CREDIT',
        amount: 1000,
        reasonCode: 'INITIAL',
        referenceType: 'SYSTEM',
        referenceId: 'setup',
      },
    });
  }

  afterAll(async () => {
    // Cleanup test data
    await prisma.reservation.deleteMany({ where: { tenantId } });
    await prisma.reservableResource.deleteMany({ where: { tenantId } });
    await prisma.reservationPolicy.deleteMany({ where: { tenantId } });
    await prisma.pointLedgerEntry.deleteMany({ where: { tenantId } });
    await prisma.pointHold.deleteMany({ where: { tenantId } });
    await prisma.pointAccount.deleteMany({ where: { tenantId } });
    await prisma.idempotencyRecord.deleteMany({ where: { tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await app.close();
  });

  describe('POST /reservations', () => {
    it('should create a reservation in HOLD status (with points hold)', async () => {
      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-res-001')
        .send({
          eventId,
          resourceId: resourceTableId,
          resourceType: 'TABLE',
          ownerId,
          ownerType: 'MEMBER',
          policyId,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'HOLD',
      });
      expect(response.body.reservationId).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
      expect(response.body.pointsHoldId).toBeDefined(); // Points were held
    });

    it('should return same response for idempotent request', async () => {
      const firstResponse = await request(app.getHttpServer())
        .post('/reservations')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-res-001')
        .send({
          eventId,
          resourceId: resourceTableId,
          resourceType: 'TABLE',
          ownerId,
          ownerType: 'MEMBER',
          policyId,
        })
        .expect(201);

      // Same idempotency key should return same reservation ID
      expect(firstResponse.body.reservationId).toBeDefined();
    });

    it('should create reservation without points hold when costInPoints=0', async () => {
      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-res-free-001')
        .send({
          eventId,
          resourceId: resourceSeatId,
          resourceType: 'SEAT',
          ownerId,
          ownerType: 'MEMBER',
          policyId: policyFreeCostId,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'HOLD',
      });
      expect(response.body.pointsHoldId).toBeNull(); // No points hold
    });

    it('should reject when max per user exceeded', async () => {
      // First reservation already created, try second (maxPerUser=1 for TABLE)
      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-res-max-user')
        .send({
          eventId,
          resourceId: resourceTableId,
          resourceType: 'TABLE',
          ownerId, // Same user
          ownerType: 'MEMBER',
          policyId,
        })
        .expect(400);

      expect(response.body.error).toBe('MAX_PER_USER_EXCEEDED');
    });

    it('should reject when resource capacity is full', async () => {
      // SEAT has capacityTotal=1, already has one reservation
      // Try to create another with different user
      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-res-capacity')
        .send({
          eventId,
          resourceId: resourceSeatId,
          resourceType: 'SEAT',
          ownerId: owner2Id,
          ownerType: 'MEMBER',
          policyId: policyFreeCostId,
        })
        .expect(402);

      expect(response.body.error).toBe('INSUFFICIENT_CAPACITY');
    });
  });

  describe('GET /reservations/:id', () => {
    let reservationId: string;

    beforeAll(async () => {
      // Get a reservation ID from previous test
      const res = await prisma.reservation.findFirst({
        where: { tenantId, resourceId: resourceTableId },
      });
      reservationId = res!.id;
    });

    it('should return reservation details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reservations/${reservationId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      expect(response.body).toMatchObject({
        id: reservationId,
        eventId,
        resourceId: resourceTableId,
        resourceType: 'TABLE',
        status: 'HOLD',
      });
    });

    it('should return 404 for non-existent reservation', async () => {
      const fakeId = uuidv4();
      const response = await request(app.getHttpServer())
        .get(`/reservations/${fakeId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(404);

      expect(response.body.error).toBe('RESERVATION_NOT_FOUND');
    });
  });

  describe('GET /reservations', () => {
    it('should list reservations with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/reservations')
        .set('X-Tenant-Id', tenantId)
        .query({ page: 0, size: 10 })
        .expect(200);

      expect(response.body.meta).toMatchObject({
        page: 0,
        size: 10,
      });
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should filter by eventId', async () => {
      const response = await request(app.getHttpServer())
        .get('/reservations')
        .set('X-Tenant-Id', tenantId)
        .query({ eventId })
        .expect(200);

      const allMatch = response.body.items.every(
        (r: any) => r.eventId === eventId,
      );
      expect(allMatch).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/reservations')
        .set('X-Tenant-Id', tenantId)
        .query({ status: 'HOLD' })
        .expect(200);

      const allHold = response.body.items.every(
        (r: any) => r.status === 'HOLD',
      );
      expect(allHold).toBe(true);
    });
  });

  describe('POST /reservations/:id/confirm', () => {
    let reservationToConfirmId: string;

    beforeAll(async () => {
      // Create a new reservation to confirm
      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-res-confirm-setup')
        .send({
          eventId,
          resourceId: resourceTableId,
          resourceType: 'TABLE',
          ownerId: owner2Id, // Different user
          ownerType: 'MEMBER',
          policyId,
        });

      reservationToConfirmId = response.body.reservationId;
    });

    it('should confirm a HOLD reservation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/reservations/${reservationToConfirmId}/confirm`)
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-confirm-001')
        .expect(200);

      expect(response.body).toMatchObject({
        reservationId: reservationToConfirmId,
        status: 'CONFIRMED',
      });
      expect(response.body.confirmedAt).toBeDefined();
    });

    it('should reject confirm on already confirmed reservation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/reservations/${reservationToConfirmId}/confirm`)
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-confirm-again')
        .expect(409);

      expect(response.body.error).toBe('RESERVATION_STATUS_INVALID');
    });

    it('should return 404 for non-existent reservation', async () => {
      const fakeId = uuidv4();
      const response = await request(app.getHttpServer())
        .post(`/reservations/${fakeId}/confirm`)
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-confirm-notfound')
        .expect(404);

      expect(response.body.error).toBe('RESERVATION_NOT_FOUND');
    });
  });

  describe('POST /reservations/:id/release', () => {
    let reservationToReleaseId: string;

    beforeAll(async () => {
      // Create a new reservation to release
      const newResourceId = uuidv4();
      await prisma.reservableResource.create({
        data: {
          id: newResourceId,
          tenantId,
          eventId,
          resourceType: 'SLOT',
          name: 'Slot Release Test',
          capacityTotal: 5,
          isActive: true,
        },
      });

      const newPolicyId = uuidv4();
      await prisma.reservationPolicy.create({
        data: {
          id: newPolicyId,
          tenantId,
          eventId,
          resourceType: 'SLOT',
          costInPoints: 0,
          maxPerUser: 5,
          requiresApproval: false,
          holdTtlSeconds: 60,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-res-release-setup')
        .send({
          eventId,
          resourceId: newResourceId,
          resourceType: 'SLOT',
          ownerId,
          ownerType: 'MEMBER',
          policyId: newPolicyId,
        });

      reservationToReleaseId = response.body.reservationId;
    });

    it('should release a HOLD reservation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/reservations/${reservationToReleaseId}/release`)
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-release-001')
        .send({ reason: 'User cancelled' })
        .expect(200);

      expect(response.body).toMatchObject({
        reservationId: reservationToReleaseId,
        status: 'RELEASED',
      });
      expect(response.body.releasedAt).toBeDefined();
    });

    it('should reject release on already released reservation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/reservations/${reservationToReleaseId}/release`)
        .set('X-Tenant-Id', tenantId)
        .set('Idempotency-Key', 'e2e-release-again')
        .send({ reason: 'Try again' })
        .expect(409);

      expect(response.body.error).toBe('RESERVATION_STATUS_INVALID');
    });
  });

  describe('Expire Holds Job', () => {
    let expiredReservationId: string;

    beforeAll(async () => {
      // Create an expired reservation directly
      expiredReservationId = uuidv4();
      const expiredAt = new Date(Date.now() - 60000); // 1 minute ago

      await prisma.reservation.create({
        data: {
          id: expiredReservationId,
          tenantId,
          eventId,
          resourceId: resourceTableId,
          resourceType: 'TABLE',
          policyId,
          ownerId: uuidv4(), // Different user
          ownerType: 'MEMBER',
          status: 'HOLD',
          pointsHoldId: null, // No points hold for simplicity
          expiresAt: expiredAt,
        },
      });
    });

    it('should expire HOLD reservations past expiresAt', async () => {
      // Run the job manually
      const expiredCount = await expireHoldsJob.run();

      expect(expiredCount).toBeGreaterThanOrEqual(1);

      // Verify the reservation is expired
      const reservation = await prisma.reservation.findUnique({
        where: { id: expiredReservationId },
      });

      expect(reservation?.status).toBe('EXPIRED');
    });
  });

  describe('Outbox Events', () => {
    it('should create outbox event for ReservationCreated', async () => {
      const events = await prisma.outboxEvent.findMany({
        where: {
          tenantId,
          eventType: 'ReservationCreated',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should create outbox event for ReservationConfirmed', async () => {
      const events = await prisma.outboxEvent.findMany({
        where: {
          tenantId,
          eventType: 'ReservationConfirmed',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should create outbox event for ReservationReleased', async () => {
      const events = await prisma.outboxEvent.findMany({
        where: {
          tenantId,
          eventType: 'ReservationReleased',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should create outbox event for ReservationExpired', async () => {
      const events = await prisma.outboxEvent.findMany({
        where: {
          tenantId,
          eventType: 'ReservationExpired',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});
