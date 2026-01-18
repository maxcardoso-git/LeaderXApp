import { ReservationPolicy } from '../entities';

export interface PolicyValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Policy Evaluator Domain Service
 * Validates reservation requests against policy rules
 */
export class PolicyEvaluator {
  /**
   * Validate that the policy is active
   */
  static validatePolicyActive(policy: ReservationPolicy): PolicyValidationResult {
    if (!policy.isActive) {
      return {
        valid: false,
        error: 'Policy is not active',
        errorCode: 'POLICY_INACTIVE',
      };
    }
    return { valid: true };
  }

  /**
   * Validate that we're within the reservation window
   */
  static validateWindow(
    policy: ReservationPolicy,
    now: Date = new Date(),
  ): PolicyValidationResult {
    if (!policy.isWindowOpen(now)) {
      const window = policy.window;

      if (window.isBeforeWindow(now)) {
        return {
          valid: false,
          error: `Reservation window has not opened yet. Opens at ${window.start?.toISOString()}`,
          errorCode: 'OUTSIDE_RESERVATION_WINDOW',
        };
      }

      if (window.isAfterWindow(now)) {
        return {
          valid: false,
          error: `Reservation window has closed. Closed at ${window.end?.toISOString()}`,
          errorCode: 'OUTSIDE_RESERVATION_WINDOW',
        };
      }

      return {
        valid: false,
        error: 'Outside reservation window',
        errorCode: 'OUTSIDE_RESERVATION_WINDOW',
      };
    }
    return { valid: true };
  }

  /**
   * Validate that user hasn't exceeded max reservations per user
   */
  static validateMaxPerUser(
    policy: ReservationPolicy,
    currentUserReservationsCount: number,
  ): PolicyValidationResult {
    if (currentUserReservationsCount >= policy.maxPerUser) {
      return {
        valid: false,
        error: `Maximum reservations per user exceeded. Max: ${policy.maxPerUser}, Current: ${currentUserReservationsCount}`,
        errorCode: 'MAX_PER_USER_EXCEEDED',
      };
    }
    return { valid: true };
  }

  /**
   * Run all policy validations
   */
  static validateAll(
    policy: ReservationPolicy,
    currentUserReservationsCount: number,
    now: Date = new Date(),
  ): PolicyValidationResult {
    // Check policy is active
    const activeResult = this.validatePolicyActive(policy);
    if (!activeResult.valid) return activeResult;

    // Check reservation window
    const windowResult = this.validateWindow(policy, now);
    if (!windowResult.valid) return windowResult;

    // Check max per user
    const maxUserResult = this.validateMaxPerUser(
      policy,
      currentUserReservationsCount,
    );
    if (!maxUserResult.valid) return maxUserResult;

    return { valid: true };
  }
}
