import { Inject, Injectable } from '@nestjs/common';
import { EventAggregate } from '../aggregates';
import { EventAvailability } from '../value-objects';
import {
  ReservationReadPort,
  RESERVATION_READ_PORT,
  ReservationCount,
} from '../ports';

export interface TableAvailability {
  tableId: string;
  tableName: string;
  capacity: number;
  seatsCount: number;
  reservedSeats: number;
  availableSeats: number;
  isAvailable: boolean;
}

export interface SeatAvailability {
  seatId: string;
  seatNumber: number;
  tableId: string;
  isReserved: boolean;
  isHeld: boolean;
  isAvailable: boolean;
}

@Injectable()
export class EventAvailabilityService {
  constructor(
    @Inject(RESERVATION_READ_PORT)
    private readonly reservationReadPort: ReservationReadPort,
  ) {}

  /**
   * Calculate overall event availability
   */
  async calculateEventAvailability(
    event: EventAggregate,
  ): Promise<EventAvailability> {
    const tables = event.tables;
    const totalTables = tables.length;
    const totalSeats = tables.reduce((sum, t) => sum + t.seats.length, 0);

    // Get reservation counts for all tables
    const reservationCounts = await this.reservationReadPort.getTableReservationCounts(
      event.tenantId,
      event.id,
    );

    const reservationMap = new Map<string, ReservationCount>();
    for (const rc of reservationCounts) {
      reservationMap.set(rc.resourceId, rc);
    }

    let availableTables = 0;
    let availableSeats = 0;

    for (const table of tables) {
      const reservation = reservationMap.get(table.id);
      const reservedCount = reservation
        ? reservation.confirmedCount + reservation.holdCount
        : 0;

      const tableAvailableSeats = table.capacity - reservedCount;
      if (tableAvailableSeats > 0) {
        availableTables++;
        availableSeats += tableAvailableSeats;
      }
    }

    return {
      eventId: event.id,
      totalTables,
      availableTables,
      totalSeats,
      availableSeats,
      isAvailable: availableSeats > 0,
    };
  }

  /**
   * Get availability for all tables in an event
   */
  async getTablesAvailability(
    event: EventAggregate,
  ): Promise<TableAvailability[]> {
    const tables = event.tables;

    const reservationCounts = await this.reservationReadPort.getTableReservationCounts(
      event.tenantId,
      event.id,
    );

    const reservationMap = new Map<string, ReservationCount>();
    for (const rc of reservationCounts) {
      reservationMap.set(rc.resourceId, rc);
    }

    return tables.map((table) => {
      const reservation = reservationMap.get(table.id);
      const reservedSeats = reservation
        ? reservation.confirmedCount + reservation.holdCount
        : 0;
      const availableSeats = table.capacity - reservedSeats;

      return {
        tableId: table.id,
        tableName: table.name,
        capacity: table.capacity,
        seatsCount: table.seats.length,
        reservedSeats,
        availableSeats,
        isAvailable: availableSeats > 0,
      };
    });
  }

  /**
   * Get availability for all seats in a table
   */
  async getSeatsAvailability(
    event: EventAggregate,
    tableId: string,
  ): Promise<SeatAvailability[]> {
    const table = event.getTableById(tableId);
    if (!table) {
      return [];
    }

    const reservationCounts = await this.reservationReadPort.getSeatReservationCounts(
      event.tenantId,
      event.id,
      tableId,
    );

    const reservationMap = new Map<string, ReservationCount>();
    for (const rc of reservationCounts) {
      reservationMap.set(rc.resourceId, rc);
    }

    return table.seats.map((seat) => {
      const reservation = reservationMap.get(seat.id);
      const isReserved = reservation ? reservation.confirmedCount > 0 : false;
      const isHeld = reservation ? reservation.holdCount > 0 : false;

      return {
        seatId: seat.id,
        seatNumber: seat.seatNumber,
        tableId: table.id,
        isReserved,
        isHeld,
        isAvailable: !isReserved && !isHeld,
      };
    });
  }

  /**
   * Check if a specific table has availability
   */
  async isTableAvailable(
    tenantId: string,
    eventId: string,
    tableId: string,
  ): Promise<boolean> {
    return this.reservationReadPort.isResourceAvailable(
      tenantId,
      eventId,
      tableId,
      'TABLE',
    );
  }

  /**
   * Check if a specific seat is available
   */
  async isSeatAvailable(
    tenantId: string,
    eventId: string,
    seatId: string,
  ): Promise<boolean> {
    return this.reservationReadPort.isResourceAvailable(
      tenantId,
      eventId,
      seatId,
      'SEAT',
    );
  }
}
