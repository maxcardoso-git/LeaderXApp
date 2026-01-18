import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  RESERVATION_REPOSITORY,
  POINTS_PORT,
  ReservationRepositoryPort,
  PointsPort,
  ReservationExpiredEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';

const BATCH_SIZE = 100;

@Injectable()
export class ExpireHoldsJob {
  private readonly logger = new Logger(ExpireHoldsJob.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: ReservationRepositoryPort,
    @Inject(POINTS_PORT)
    private readonly pointsPort: PointsPort,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (this.isRunning) {
      this.logger.debug('Expire holds job already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      await this.processExpiredHolds();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual trigger for testing
   */
  async run(): Promise<number> {
    return this.processExpiredHolds();
  }

  private async processExpiredHolds(): Promise<number> {
    this.logger.debug('Starting expire holds job');

    let totalExpired = 0;
    let batchCount = 0;

    // Process in batches
    while (true) {
      const expiredCount = await this.processBatch();
      totalExpired += expiredCount;
      batchCount++;

      if (expiredCount < BATCH_SIZE) {
        break; // No more expired holds
      }

      // Safety limit
      if (batchCount >= 10) {
        this.logger.warn('Reached max batch limit, will continue next run');
        break;
      }
    }

    if (totalExpired > 0) {
      this.logger.log(`Expired ${totalExpired} reservation holds`);
    } else {
      this.logger.debug('No expired holds found');
    }

    return totalExpired;
  }

  private async processBatch(): Promise<number> {
    // Find expired holds within a transaction (using SKIP LOCKED)
    return await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      const expiredHolds = await this.reservationRepo.findExpiredHolds(
        BATCH_SIZE,
        ctx,
      );

      if (expiredHolds.length === 0) {
        return 0;
      }

      this.logger.debug(`Processing ${expiredHolds.length} expired holds`);

      for (const reservation of expiredHolds) {
        try {
          // Release points hold if exists
          if (reservation.hasPointsHold()) {
            try {
              await this.pointsPort.releaseHold({
                tenantId: reservation.tenantId,
                ownerType: 'USER',
                ownerId: reservation.ownerId,
                referenceType: 'RESERVATION',
                referenceId: reservation.id,
                reasonCode: 'RESERVATION_EXPIRED',
                idempotencyKey: `res-${reservation.id}:expire-release`,
              });
            } catch (error) {
              this.logger.error(
                `Failed to release points hold for reservation ${reservation.id}: ${error}`,
              );
              // Continue with expiration even if points release fails
            }
          }

          // Expire the reservation
          reservation.expire();
          await this.reservationRepo.update(reservation, ctx);

          // Create outbox event
          const event = new ReservationExpiredEvent(reservation.id, {
            reservationId: reservation.id,
            tenantId: reservation.tenantId,
            expiredAt: reservation.releasedAt!.toISOString(),
            pointsHoldId: reservation.pointsHoldId,
          });

          await this.outboxRepo.enqueue(
            {
              tenantId: reservation.tenantId,
              aggregateType: event.aggregateType,
              aggregateId: event.aggregateId,
              eventType: event.eventType,
              payload: event.payload,
            },
            ctx,
          );
        } catch (error) {
          this.logger.error(
            `Failed to expire reservation ${reservation.id}: ${error}`,
          );
          // Continue processing other reservations
        }
      }

      return expiredHolds.length;
    });
  }
}
