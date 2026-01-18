import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  IEventsReadPort,
  EventsSummary,
  EventRecord,
} from '../../domain/ports';

@Injectable()
export class EventsReadAdapter implements IEventsReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async getEventsSummary(tenantId: string): Promise<EventsSummary | null> {
    const [total, active, draft, closed] = await Promise.all([
      this.prisma.event.count({
        where: { tenantId },
      }),
      this.prisma.event.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
      this.prisma.event.count({
        where: { tenantId, status: 'DRAFT' },
      }),
      this.prisma.event.count({
        where: { tenantId, status: 'CLOSED' },
      }),
    ]);

    return {
      totalEvents: total,
      activeEvents: active,
      draftEvents: draft,
      closedEvents: closed,
    };
  }

  async getRecentEvents(tenantId: string, limit: number): Promise<EventRecord[]> {
    const records = await this.prisma.event.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        startsAt: true,
      },
    });

    return records.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      startsAt: r.startsAt,
    }));
  }
}
