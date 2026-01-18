import { AvailabilityCalculator } from './availability-calculator.service';
import { Reservation } from '../aggregates';
import { ReservableResource } from '../entities';
import {
  ResourceType,
  ReservationOwnerType,
  ReservationStatus,
} from '../value-objects';

describe('AvailabilityCalculator', () => {
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
      eventId: 'event-1',
      resourceId: 'resource-1',
      resourceType: ResourceType.TABLE,
      policyId: 'policy-1',
      ownerId: 'owner-1',
      ownerType: ReservationOwnerType.MEMBER,
      status,
      pointsHoldId: null,
      expiresAt,
      confirmedAt:
        status === ReservationStatus.CONFIRMED ? new Date() : null,
      releasedAt:
        status === ReservationStatus.RELEASED ||
        status === ReservationStatus.EXPIRED ||
        status === ReservationStatus.CANCELLED
          ? new Date()
          : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  describe('countActiveReservations', () => {
    it('should return 0 for empty array', () => {
      const count = AvailabilityCalculator.countActiveReservations([]);
      expect(count).toBe(0);
    });

    it('should count HOLD as active', () => {
      const reservations = [createReservation(ReservationStatus.HOLD)];
      const count = AvailabilityCalculator.countActiveReservations(reservations);
      expect(count).toBe(1);
    });

    it('should count CONFIRMED as active', () => {
      const reservations = [createReservation(ReservationStatus.CONFIRMED)];
      const count = AvailabilityCalculator.countActiveReservations(reservations);
      expect(count).toBe(1);
    });

    it('should NOT count RELEASED as active', () => {
      const reservations = [createReservation(ReservationStatus.RELEASED)];
      const count = AvailabilityCalculator.countActiveReservations(reservations);
      expect(count).toBe(0);
    });

    it('should NOT count EXPIRED as active', () => {
      const reservations = [createReservation(ReservationStatus.EXPIRED)];
      const count = AvailabilityCalculator.countActiveReservations(reservations);
      expect(count).toBe(0);
    });

    it('should NOT count CANCELLED as active', () => {
      const reservations = [createReservation(ReservationStatus.CANCELLED)];
      const count = AvailabilityCalculator.countActiveReservations(reservations);
      expect(count).toBe(0);
    });

    it('should count multiple active reservations', () => {
      const reservations = [
        createReservation(ReservationStatus.HOLD, 'res-1'),
        createReservation(ReservationStatus.CONFIRMED, 'res-2'),
        createReservation(ReservationStatus.HOLD, 'res-3'),
        createReservation(ReservationStatus.RELEASED, 'res-4'),
        createReservation(ReservationStatus.EXPIRED, 'res-5'),
      ];
      const count = AvailabilityCalculator.countActiveReservations(reservations);
      expect(count).toBe(3); // 2 HOLD + 1 CONFIRMED
    });
  });

  describe('getActiveReservations', () => {
    it('should return empty array for no reservations', () => {
      const result = AvailabilityCalculator.getActiveReservations([]);
      expect(result).toHaveLength(0);
    });

    it('should filter only active reservations', () => {
      const reservations = [
        createReservation(ReservationStatus.HOLD, 'res-1'),
        createReservation(ReservationStatus.CONFIRMED, 'res-2'),
        createReservation(ReservationStatus.RELEASED, 'res-3'),
      ];
      const result = AvailabilityCalculator.getActiveReservations(reservations);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toContain('res-1');
      expect(result.map((r) => r.id)).toContain('res-2');
    });
  });

  describe('calculateAvailability', () => {
    it('should return full availability for no reservations', () => {
      const resource = createResource(8);
      const result = AvailabilityCalculator.calculateAvailability(resource, []);

      expect(result.resourceId).toBe('resource-1');
      expect(result.capacityTotal).toBe(8);
      expect(result.capacityUsed).toBe(0);
      expect(result.capacityAvailable).toBe(8);
      expect(result.hasAvailability).toBe(true);
    });

    it('should calculate availability with active reservations', () => {
      const resource = createResource(8);
      const reservations = [
        createReservation(ReservationStatus.HOLD, 'res-1'),
        createReservation(ReservationStatus.CONFIRMED, 'res-2'),
        createReservation(ReservationStatus.CONFIRMED, 'res-3'),
      ];
      const result = AvailabilityCalculator.calculateAvailability(
        resource,
        reservations,
      );

      expect(result.capacityTotal).toBe(8);
      expect(result.capacityUsed).toBe(3);
      expect(result.capacityAvailable).toBe(5);
      expect(result.hasAvailability).toBe(true);
    });

    it('should return no availability when at capacity', () => {
      const resource = createResource(2);
      const reservations = [
        createReservation(ReservationStatus.HOLD, 'res-1'),
        createReservation(ReservationStatus.CONFIRMED, 'res-2'),
      ];
      const result = AvailabilityCalculator.calculateAvailability(
        resource,
        reservations,
      );

      expect(result.capacityTotal).toBe(2);
      expect(result.capacityUsed).toBe(2);
      expect(result.capacityAvailable).toBe(0);
      expect(result.hasAvailability).toBe(false);
    });
  });

  describe('hasCapacity', () => {
    it('should return true when capacity is available', () => {
      const resource = createResource(8);
      const result = AvailabilityCalculator.hasCapacity(resource, 5);
      expect(result).toBe(true);
    });

    it('should return false when at capacity', () => {
      const resource = createResource(8);
      const result = AvailabilityCalculator.hasCapacity(resource, 8);
      expect(result).toBe(false);
    });

    it('should return false when over capacity', () => {
      const resource = createResource(8);
      const result = AvailabilityCalculator.hasCapacity(resource, 10);
      expect(result).toBe(false);
    });

    it('should handle capacity of 1', () => {
      const resource = createResource(1);
      expect(AvailabilityCalculator.hasCapacity(resource, 0)).toBe(true);
      expect(AvailabilityCalculator.hasCapacity(resource, 1)).toBe(false);
    });
  });

  describe('validateCapacity', () => {
    it('should return valid when capacity is available', () => {
      const resource = createResource(8);
      const result = AvailabilityCalculator.validateCapacity(resource, 5);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid with error when at capacity', () => {
      const resource = createResource(8);
      const result = AvailabilityCalculator.validateCapacity(resource, 8);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_CAPACITY');
      expect(result.error).toContain('Total: 8');
      expect(result.error).toContain('Used: 8');
    });
  });

  describe('getExpiredHolds', () => {
    it('should return empty array for no reservations', () => {
      const result = AvailabilityCalculator.getExpiredHolds([]);
      expect(result).toHaveLength(0);
    });

    it('should return expired holds', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago
      const futureDate = new Date(now.getTime() + 3600000); // 1 hour from now

      const reservations = [
        createReservation(ReservationStatus.HOLD, 'res-1', pastDate), // Expired
        createReservation(ReservationStatus.HOLD, 'res-2', futureDate), // Not expired
        createReservation(ReservationStatus.CONFIRMED, 'res-3', null), // Confirmed
      ];

      const result = AvailabilityCalculator.getExpiredHolds(reservations, now);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('res-1');
    });

    it('should not include confirmed reservations', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000);

      const reservations = [
        createReservation(ReservationStatus.CONFIRMED, 'res-1', pastDate),
      ];

      const result = AvailabilityCalculator.getExpiredHolds(reservations, now);
      expect(result).toHaveLength(0);
    });
  });
});
