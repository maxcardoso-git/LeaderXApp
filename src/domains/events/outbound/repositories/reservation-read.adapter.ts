import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ReservationReadPort, ReservationCount } from '../../domain/ports';

@Injectable()
export class ReservationReadAdapter implements ReservationReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async getTableReservationCounts(
    tenantId: string,
    eventId: string,
  ): Promise<ReservationCount[]> {
    const reservations = await this.prisma.reservation.groupBy({
      by: ['resourceId', 'resourceType', 'status'],
      where: {
        tenantId,
        eventId,
        resourceType: 'TABLE',
        status: { in: ['CONFIRMED', 'HOLD'] },
      },
      _count: { id: true },
    });

    const countMap = new Map<string, ReservationCount>();

    for (const r of reservations) {
      const existing = countMap.get(r.resourceId) || {
        resourceId: r.resourceId,
        resourceType: r.resourceType,
        confirmedCount: 0,
        holdCount: 0,
      };

      if (r.status === 'CONFIRMED') {
        existing.confirmedCount = r._count.id;
      } else if (r.status === 'HOLD') {
        existing.holdCount = r._count.id;
      }

      countMap.set(r.resourceId, existing);
    }

    return Array.from(countMap.values());
  }

  async getSeatReservationCounts(
    tenantId: string,
    eventId: string,
    tableId: string,
  ): Promise<ReservationCount[]> {
    // First get all seat IDs for this table
    const seats = await this.prisma.eventSeat.findMany({
      where: { tenantId, eventId, tableId },
      select: { id: true },
    });

    const seatIds = seats.map((s) => s.id);

    const reservations = await this.prisma.reservation.groupBy({
      by: ['resourceId', 'resourceType', 'status'],
      where: {
        tenantId,
        eventId,
        resourceType: 'SEAT',
        resourceId: { in: seatIds },
        status: { in: ['CONFIRMED', 'HOLD'] },
      },
      _count: { id: true },
    });

    const countMap = new Map<string, ReservationCount>();

    for (const r of reservations) {
      const existing = countMap.get(r.resourceId) || {
        resourceId: r.resourceId,
        resourceType: r.resourceType,
        confirmedCount: 0,
        holdCount: 0,
      };

      if (r.status === 'CONFIRMED') {
        existing.confirmedCount = r._count.id;
      } else if (r.status === 'HOLD') {
        existing.holdCount = r._count.id;
      }

      countMap.set(r.resourceId, existing);
    }

    return Array.from(countMap.values());
  }

  async isResourceAvailable(
    tenantId: string,
    eventId: string,
    resourceId: string,
    resourceType: string,
  ): Promise<boolean> {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        eventId,
        resourceId,
        resourceType,
        status: { in: ['CONFIRMED', 'HOLD'] },
      },
    });

    return !reservation;
  }
}
