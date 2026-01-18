import { Injectable } from '@nestjs/common';
import { EventStatus, VALID_STATUS_TRANSITIONS } from '../value-objects';

export interface StatusTransitionResult {
  isValid: boolean;
  reason?: string;
}

@Injectable()
export class EventLifecycleService {
  /**
   * Validates if a status transition is allowed
   */
  validateTransition(
    currentStatus: EventStatus,
    targetStatus: EventStatus,
  ): StatusTransitionResult {
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

    if (!validTransitions.includes(targetStatus)) {
      return {
        isValid: false,
        reason: `Cannot transition from ${currentStatus} to ${targetStatus}. Valid transitions: ${validTransitions.join(', ') || 'none'}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Get all valid next statuses from current status
   */
  getValidNextStatuses(currentStatus: EventStatus): EventStatus[] {
    return VALID_STATUS_TRANSITIONS[currentStatus];
  }

  /**
   * Check if event can be published
   * Event must have at least one table or be configured for no-capacity mode
   */
  canPublish(event: {
    status: EventStatus;
    tablesCount: number;
  }): StatusTransitionResult {
    if (event.status !== EventStatus.DRAFT) {
      return {
        isValid: false,
        reason: 'Only DRAFT events can be published',
      };
    }

    return { isValid: true };
  }

  /**
   * Check if event can be activated
   * Event must be PUBLISHED and have all required policies bound
   */
  canActivate(event: {
    status: EventStatus;
    startsAt: Date;
    policyBindingsCount: number;
  }): StatusTransitionResult {
    if (event.status !== EventStatus.PUBLISHED) {
      return {
        isValid: false,
        reason: 'Only PUBLISHED events can be activated',
      };
    }

    return { isValid: true };
  }

  /**
   * Check if event can be closed
   */
  canClose(event: { status: EventStatus; endsAt: Date }): StatusTransitionResult {
    if (event.status !== EventStatus.ACTIVE) {
      return {
        isValid: false,
        reason: 'Only ACTIVE events can be closed',
      };
    }

    return { isValid: true };
  }

  /**
   * Check if event can be canceled
   */
  canCancel(event: { status: EventStatus }): StatusTransitionResult {
    const cancelableStatuses = [
      EventStatus.DRAFT,
      EventStatus.PUBLISHED,
      EventStatus.ACTIVE,
    ];

    if (!cancelableStatuses.includes(event.status)) {
      return {
        isValid: false,
        reason: `Cannot cancel event in ${event.status} status`,
      };
    }

    return { isValid: true };
  }

  /**
   * Check if event structure can be modified (tables, seats, phases)
   */
  canModifyStructure(status: EventStatus): boolean {
    return status === EventStatus.DRAFT || status === EventStatus.PUBLISHED;
  }

  /**
   * Check if event is in a terminal state
   */
  isTerminalState(status: EventStatus): boolean {
    return status === EventStatus.CLOSED || status === EventStatus.CANCELED;
  }
}
