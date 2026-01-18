// Port for reading reservation data (integration with Reservations domain)
export interface ReservationCount {
  resourceId: string;
  resourceType: string;
  confirmedCount: number;
  holdCount: number;
}

export interface ReservationReadPort {
  /**
   * Get reservation counts for tables in an event
   */
  getTableReservationCounts(
    tenantId: string,
    eventId: string,
  ): Promise<ReservationCount[]>;

  /**
   * Get reservation counts for seats in a table
   */
  getSeatReservationCounts(
    tenantId: string,
    eventId: string,
    tableId: string,
  ): Promise<ReservationCount[]>;

  /**
   * Check if a specific resource is available
   */
  isResourceAvailable(
    tenantId: string,
    eventId: string,
    resourceId: string,
    resourceType: string,
  ): Promise<boolean>;
}

export const RESERVATION_READ_PORT = Symbol('RESERVATION_READ_PORT');
