import { PolicyEvaluator } from './policy-evaluator.service';
import { ReservationPolicy } from '../entities';
import { ResourceType } from '../value-objects';

describe('PolicyEvaluator', () => {
  const createPolicy = (
    overrides: Partial<{
      isActive: boolean;
      windowStart: Date | null;
      windowEnd: Date | null;
      maxPerUser: number;
      holdTtlSeconds: number;
      costInPoints: number;
    }> = {},
  ): ReservationPolicy => {
    return ReservationPolicy.reconstitute({
      id: 'policy-1',
      tenantId: 'tenant-1',
      eventId: 'event-1',
      resourceType: ResourceType.TABLE,
      costInPoints: overrides.costInPoints ?? 100,
      maxPerUser: overrides.maxPerUser ?? 2,
      requiresApproval: false,
      holdTtlSeconds: overrides.holdTtlSeconds ?? 900,
      windowStart: overrides.windowStart ?? null,
      windowEnd: overrides.windowEnd ?? null,
      isActive: overrides.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  describe('validatePolicyActive', () => {
    it('should return valid for active policy', () => {
      const policy = createPolicy({ isActive: true });
      const result = PolicyEvaluator.validatePolicyActive(policy);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for inactive policy', () => {
      const policy = createPolicy({ isActive: false });
      const result = PolicyEvaluator.validatePolicyActive(policy);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('POLICY_INACTIVE');
    });
  });

  describe('validateWindow', () => {
    it('should return valid when no window is set', () => {
      const policy = createPolicy({ windowStart: null, windowEnd: null });
      const result = PolicyEvaluator.validateWindow(policy);

      expect(result.valid).toBe(true);
    });

    it('should return valid when within window', () => {
      const now = new Date();
      const policy = createPolicy({
        windowStart: new Date(now.getTime() - 3600000), // 1 hour ago
        windowEnd: new Date(now.getTime() + 3600000), // 1 hour from now
      });
      const result = PolicyEvaluator.validateWindow(policy, now);

      expect(result.valid).toBe(true);
    });

    it('should return invalid when before window', () => {
      const now = new Date();
      const policy = createPolicy({
        windowStart: new Date(now.getTime() + 3600000), // 1 hour from now
        windowEnd: new Date(now.getTime() + 7200000), // 2 hours from now
      });
      const result = PolicyEvaluator.validateWindow(policy, now);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('OUTSIDE_RESERVATION_WINDOW');
      expect(result.error).toContain('not opened yet');
    });

    it('should return invalid when after window', () => {
      const now = new Date();
      const policy = createPolicy({
        windowStart: new Date(now.getTime() - 7200000), // 2 hours ago
        windowEnd: new Date(now.getTime() - 3600000), // 1 hour ago
      });
      const result = PolicyEvaluator.validateWindow(policy, now);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('OUTSIDE_RESERVATION_WINDOW');
      expect(result.error).toContain('closed');
    });
  });

  describe('validateMaxPerUser', () => {
    it('should return valid when user has no reservations', () => {
      const policy = createPolicy({ maxPerUser: 2 });
      const result = PolicyEvaluator.validateMaxPerUser(policy, 0);

      expect(result.valid).toBe(true);
    });

    it('should return valid when user is below limit', () => {
      const policy = createPolicy({ maxPerUser: 3 });
      const result = PolicyEvaluator.validateMaxPerUser(policy, 2);

      expect(result.valid).toBe(true);
    });

    it('should return invalid when user is at limit', () => {
      const policy = createPolicy({ maxPerUser: 2 });
      const result = PolicyEvaluator.validateMaxPerUser(policy, 2);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MAX_PER_USER_EXCEEDED');
    });

    it('should return invalid when user exceeds limit', () => {
      const policy = createPolicy({ maxPerUser: 2 });
      const result = PolicyEvaluator.validateMaxPerUser(policy, 5);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MAX_PER_USER_EXCEEDED');
      expect(result.error).toContain('Max: 2');
      expect(result.error).toContain('Current: 5');
    });
  });

  describe('validateAll', () => {
    it('should return valid when all checks pass', () => {
      const now = new Date();
      const policy = createPolicy({
        isActive: true,
        maxPerUser: 3,
        windowStart: new Date(now.getTime() - 3600000),
        windowEnd: new Date(now.getTime() + 3600000),
      });
      const result = PolicyEvaluator.validateAll(policy, 1, now);

      expect(result.valid).toBe(true);
    });

    it('should return first failure - inactive policy', () => {
      const policy = createPolicy({ isActive: false, maxPerUser: 3 });
      const result = PolicyEvaluator.validateAll(policy, 0);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('POLICY_INACTIVE');
    });

    it('should return first failure - outside window', () => {
      const now = new Date();
      const policy = createPolicy({
        isActive: true,
        maxPerUser: 3,
        windowStart: new Date(now.getTime() + 3600000),
        windowEnd: new Date(now.getTime() + 7200000),
      });
      const result = PolicyEvaluator.validateAll(policy, 0, now);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('OUTSIDE_RESERVATION_WINDOW');
    });

    it('should return first failure - max per user exceeded', () => {
      const now = new Date();
      const policy = createPolicy({
        isActive: true,
        maxPerUser: 2,
        windowStart: null,
        windowEnd: null,
      });
      const result = PolicyEvaluator.validateAll(policy, 5, now);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MAX_PER_USER_EXCEEDED');
    });
  });
});
