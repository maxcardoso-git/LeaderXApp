import { Reservation, CreateReservationProps } from './reservation.aggregate';
import {
  ResourceType,
  ReservationOwnerType,
  ReservationStatus,
} from '../value-objects';

describe('Reservation Aggregate', () => {
  const createProps = (
    overrides: Partial<CreateReservationProps> = {},
  ): CreateReservationProps => ({
    tenantId: 'tenant-1',
    eventId: 'event-1',
    resourceId: 'resource-1',
    resourceType: ResourceType.TABLE,
    policyId: 'policy-1',
    ownerId: 'owner-1',
    ownerType: ReservationOwnerType.MEMBER,
    expiresAt: new Date(Date.now() + 900000), // 15 min from now
    ...overrides,
  });

  describe('create', () => {
    it('should create a reservation in HOLD status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      expect(reservation.id).toBe('res-1');
      expect(reservation.tenantId).toBe('tenant-1');
      expect(reservation.status).toBe(ReservationStatus.HOLD);
      expect(reservation.isHold()).toBe(true);
      expect(reservation.isActive()).toBe(true);
    });

    it('should set expiresAt correctly', () => {
      const expiresAt = new Date(Date.now() + 900000);
      const props = createProps({ expiresAt });
      const reservation = Reservation.create('res-1', props);

      expect(reservation.expiresAt).toEqual(expiresAt);
    });

    it('should set pointsHoldId when provided', () => {
      const props = createProps({ pointsHoldId: 'hold-123' });
      const reservation = Reservation.create('res-1', props);

      expect(reservation.pointsHoldId).toBe('hold-123');
      expect(reservation.hasPointsHold()).toBe(true);
    });

    it('should have null pointsHoldId when not provided', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      expect(reservation.pointsHoldId).toBeNull();
      expect(reservation.hasPointsHold()).toBe(false);
    });

    it('should set confirmedAt and releasedAt to null', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      expect(reservation.confirmedAt).toBeNull();
      expect(reservation.releasedAt).toBeNull();
    });
  });

  describe('confirm', () => {
    it('should transition from HOLD to CONFIRMED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      reservation.confirm();

      expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
      expect(reservation.isConfirmed()).toBe(true);
      expect(reservation.isActive()).toBe(true);
      expect(reservation.confirmedAt).toBeInstanceOf(Date);
      expect(reservation.expiresAt).toBeNull(); // Cleared after confirmation
    });

    it('should throw error if not in HOLD status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();

      expect(() => reservation.confirm()).toThrow(
        'Cannot confirm reservation: status is CONFIRMED, expected HOLD',
      );
    });

    it('should throw error if expired', () => {
      const pastExpiresAt = new Date(Date.now() - 1000); // 1 second ago
      const props = createProps({ expiresAt: pastExpiresAt });
      const reservation = Reservation.create('res-1', props);

      expect(() => reservation.confirm()).toThrow(
        'Cannot confirm reservation: hold has expired',
      );
    });
  });

  describe('release', () => {
    it('should transition from HOLD to RELEASED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      reservation.release();

      expect(reservation.status).toBe(ReservationStatus.RELEASED);
      expect(reservation.isReleased()).toBe(true);
      expect(reservation.isActive()).toBe(false);
      expect(reservation.releasedAt).toBeInstanceOf(Date);
    });

    it('should throw error if not in HOLD status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();

      expect(() => reservation.release()).toThrow(
        'Cannot release reservation: status is CONFIRMED, expected HOLD',
      );
    });
  });

  describe('expire', () => {
    it('should transition from HOLD to EXPIRED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      reservation.expire();

      expect(reservation.status).toBe(ReservationStatus.EXPIRED);
      expect(reservation.isExpired()).toBe(true);
      expect(reservation.isActive()).toBe(false);
      expect(reservation.releasedAt).toBeInstanceOf(Date);
    });

    it('should throw error if not in HOLD status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();

      expect(() => reservation.expire()).toThrow(
        'Cannot expire reservation: status is CONFIRMED, expected HOLD',
      );
    });
  });

  describe('cancel', () => {
    it('should transition from CONFIRMED to CANCELLED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();

      reservation.cancel();

      expect(reservation.status).toBe(ReservationStatus.CANCELLED);
      expect(reservation.isCancelled()).toBe(true);
      expect(reservation.isActive()).toBe(false);
      expect(reservation.releasedAt).toBeInstanceOf(Date);
    });

    it('should throw error if not in CONFIRMED status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      expect(() => reservation.cancel()).toThrow(
        'Cannot cancel reservation: status is HOLD, expected CONFIRMED',
      );
    });

    it('should throw error if already released', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.release();

      expect(() => reservation.cancel()).toThrow(
        'Cannot cancel reservation: status is RELEASED, expected CONFIRMED',
      );
    });
  });

  describe('hasExpired', () => {
    it('should return false if not in HOLD status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();

      expect(reservation.hasExpired()).toBe(false);
    });

    it('should return false if no expiresAt is set', () => {
      const reservation = Reservation.reconstitute({
        id: 'res-1',
        tenantId: 'tenant-1',
        eventId: 'event-1',
        resourceId: 'resource-1',
        resourceType: ResourceType.TABLE,
        policyId: 'policy-1',
        ownerId: 'owner-1',
        ownerType: ReservationOwnerType.MEMBER,
        status: ReservationStatus.HOLD,
        pointsHoldId: null,
        expiresAt: null,
        confirmedAt: null,
        releasedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(reservation.hasExpired()).toBe(false);
    });

    it('should return false if expiresAt is in the future', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const props = createProps({ expiresAt: futureDate });
      const reservation = Reservation.create('res-1', props);

      expect(reservation.hasExpired()).toBe(false);
    });

    it('should return true if expiresAt is in the past', () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const props = createProps({ expiresAt: pastDate });
      const reservation = Reservation.create('res-1', props);

      expect(reservation.hasExpired()).toBe(true);
    });

    it('should use provided now parameter', () => {
      const expiresAt = new Date('2024-01-15T10:00:00Z');
      const props = createProps({ expiresAt });
      const reservation = Reservation.create('res-1', props);

      const beforeExpiry = new Date('2024-01-15T09:00:00Z');
      const afterExpiry = new Date('2024-01-15T11:00:00Z');

      expect(reservation.hasExpired(beforeExpiry)).toBe(false);
      expect(reservation.hasExpired(afterExpiry)).toBe(true);
    });
  });

  describe('hasPointsHold', () => {
    it('should return true when pointsHoldId is set', () => {
      const props = createProps({ pointsHoldId: 'hold-123' });
      const reservation = Reservation.create('res-1', props);

      expect(reservation.hasPointsHold()).toBe(true);
    });

    it('should return false when pointsHoldId is null', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      expect(reservation.hasPointsHold()).toBe(false);
    });
  });

  describe('setPointsHoldId', () => {
    it('should set the pointsHoldId', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      expect(reservation.pointsHoldId).toBeNull();

      reservation.setPointsHoldId('hold-456');

      expect(reservation.pointsHoldId).toBe('hold-456');
      expect(reservation.hasPointsHold()).toBe(true);
    });
  });

  describe('status checks', () => {
    it('should correctly identify HOLD status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);

      expect(reservation.isHold()).toBe(true);
      expect(reservation.isConfirmed()).toBe(false);
      expect(reservation.isReleased()).toBe(false);
      expect(reservation.isExpired()).toBe(false);
      expect(reservation.isCancelled()).toBe(false);
    });

    it('should correctly identify CONFIRMED status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();

      expect(reservation.isHold()).toBe(false);
      expect(reservation.isConfirmed()).toBe(true);
      expect(reservation.isReleased()).toBe(false);
      expect(reservation.isExpired()).toBe(false);
      expect(reservation.isCancelled()).toBe(false);
    });

    it('should correctly identify RELEASED status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.release();

      expect(reservation.isHold()).toBe(false);
      expect(reservation.isConfirmed()).toBe(false);
      expect(reservation.isReleased()).toBe(true);
      expect(reservation.isExpired()).toBe(false);
      expect(reservation.isCancelled()).toBe(false);
    });

    it('should correctly identify EXPIRED status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.expire();

      expect(reservation.isHold()).toBe(false);
      expect(reservation.isConfirmed()).toBe(false);
      expect(reservation.isReleased()).toBe(false);
      expect(reservation.isExpired()).toBe(true);
      expect(reservation.isCancelled()).toBe(false);
    });

    it('should correctly identify CANCELLED status', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();
      reservation.cancel();

      expect(reservation.isHold()).toBe(false);
      expect(reservation.isConfirmed()).toBe(false);
      expect(reservation.isReleased()).toBe(false);
      expect(reservation.isExpired()).toBe(false);
      expect(reservation.isCancelled()).toBe(true);
    });
  });

  describe('isActive', () => {
    it('should return true for HOLD', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      expect(reservation.isActive()).toBe(true);
    });

    it('should return true for CONFIRMED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();
      expect(reservation.isActive()).toBe(true);
    });

    it('should return false for RELEASED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.release();
      expect(reservation.isActive()).toBe(false);
    });

    it('should return false for EXPIRED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.expire();
      expect(reservation.isActive()).toBe(false);
    });

    it('should return false for CANCELLED', () => {
      const props = createProps();
      const reservation = Reservation.create('res-1', props);
      reservation.confirm();
      reservation.cancel();
      expect(reservation.isActive()).toBe(false);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from database record', () => {
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-01T11:00:00Z');
      const confirmedAt = new Date('2024-01-01T10:30:00Z');

      const reservation = Reservation.reconstitute({
        id: 'res-1',
        tenantId: 'tenant-1',
        eventId: 'event-1',
        resourceId: 'resource-1',
        resourceType: ResourceType.SEAT,
        policyId: 'policy-1',
        ownerId: 'owner-1',
        ownerType: ReservationOwnerType.GUEST,
        status: ReservationStatus.CONFIRMED,
        pointsHoldId: 'hold-123',
        expiresAt: null,
        confirmedAt,
        releasedAt: null,
        metadata: { vip: true },
        createdAt,
        updatedAt,
      });

      expect(reservation.id).toBe('res-1');
      expect(reservation.resourceType).toBe(ResourceType.SEAT);
      expect(reservation.ownerType).toBe(ReservationOwnerType.GUEST);
      expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
      expect(reservation.pointsHoldId).toBe('hold-123');
      expect(reservation.confirmedAt).toEqual(confirmedAt);
      expect(reservation.metadata).toEqual({ vip: true });
    });
  });
});
