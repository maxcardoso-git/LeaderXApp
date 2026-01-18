import { Reservation } from '../aggregates';
import { ReservableResource } from '../entities';
import { Capacity, ReservationStatus } from '../value-objects';

export interface AvailabilityResult {
  resourceId: string;
  resourceName: string;
  capacityTotal: number;
  capacityUsed: number;
  capacityAvailable: number;
  hasAvailability: boolean;
}

/**
 * Availability Calculator Domain Service
 * Calculates resource availability based on active reservations
 */
export class AvailabilityCalculator {
  /**
   * Count active reservations (HOLD + CONFIRMED)
   */
  static countActiveReservations(reservations: Reservation[]): number {
    return reservations.filter((r) => r.isActive()).length;
  }

  /**
   * Filter only active reservations
   */
  static getActiveReservations(reservations: Reservation[]): Reservation[] {
    return reservations.filter((r) => r.isActive());
  }

  /**
   * Calculate availability for a resource
   */
  static calculateAvailability(
    resource: ReservableResource,
    reservations: Reservation[],
  ): AvailabilityResult {
    const activeCount = this.countActiveReservations(reservations);
    const capacity = resource.calculateCapacity(activeCount);

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      capacityTotal: capacity.total,
      capacityUsed: capacity.used,
      capacityAvailable: capacity.available,
      hasAvailability: capacity.hasAvailability(),
    };
  }

  /**
   * Check if a resource has capacity for a new reservation
   */
  static hasCapacity(
    resource: ReservableResource,
    activeReservationsCount: number,
  ): boolean {
    return resource.hasCapacity(activeReservationsCount);
  }

  /**
   * Validate capacity and return error if insufficient
   */
  static validateCapacity(
    resource: ReservableResource,
    activeReservationsCount: number,
  ): { valid: boolean; error?: string; errorCode?: string } {
    if (!this.hasCapacity(resource, activeReservationsCount)) {
      return {
        valid: false,
        error: `Insufficient capacity. Total: ${resource.capacityTotal}, Used: ${activeReservationsCount}`,
        errorCode: 'INSUFFICIENT_CAPACITY',
      };
    }
    return { valid: true };
  }

  /**
   * Get expired holds that need to be processed
   */
  static getExpiredHolds(
    reservations: Reservation[],
    now: Date = new Date(),
  ): Reservation[] {
    return reservations.filter((r) => r.hasExpired(now));
  }
}
