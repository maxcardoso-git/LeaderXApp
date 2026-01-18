import { Injectable } from '@nestjs/common';
import { EventAggregate } from '../aggregates';
import { PolicyScope } from '../value-objects';

export interface ResolvedPolicy {
  policyCode: string;
  scope: PolicyScope;
  priority: number;
}

@Injectable()
export class EventPolicyResolverService {
  /**
   * Priority order: EVENT > TENANT > GLOBAL
   */
  private readonly scopePriority: Record<PolicyScope, number> = {
    [PolicyScope.EVENT]: 3,
    [PolicyScope.TENANT]: 2,
    [PolicyScope.GLOBAL]: 1,
  };

  /**
   * Resolve applicable policies for an event, sorted by priority
   */
  resolveApplicablePolicies(event: EventAggregate): ResolvedPolicy[] {
    const bindings = event.policyBindings;

    return bindings
      .map((binding) => ({
        policyCode: binding.policyCode,
        scope: binding.scope,
        priority: this.scopePriority[binding.scope],
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if a specific policy is bound to the event
   */
  hasPolicyBinding(event: EventAggregate, policyCode: string): boolean {
    return event.hasPolicyBinding(policyCode);
  }

  /**
   * Get the most specific policy binding for a given policy type
   * Returns the EVENT-scoped binding if exists, then TENANT, then GLOBAL
   */
  getMostSpecificPolicy(
    event: EventAggregate,
    policyCodePrefix: string,
  ): ResolvedPolicy | null {
    const bindings = event.policyBindings.filter((b) =>
      b.policyCode.startsWith(policyCodePrefix),
    );

    if (bindings.length === 0) {
      return null;
    }

    const sorted = bindings
      .map((binding) => ({
        policyCode: binding.policyCode,
        scope: binding.scope,
        priority: this.scopePriority[binding.scope],
      }))
      .sort((a, b) => b.priority - a.priority);

    return sorted[0];
  }

  /**
   * Get all policies of a specific scope
   */
  getPoliciesByScope(
    event: EventAggregate,
    scope: PolicyScope,
  ): ResolvedPolicy[] {
    return event.policyBindings
      .filter((b) => b.scope === scope)
      .map((binding) => ({
        policyCode: binding.policyCode,
        scope: binding.scope,
        priority: this.scopePriority[binding.scope],
      }));
  }

  /**
   * Check if event has all required policies for activation
   */
  hasRequiredPoliciesForActivation(
    event: EventAggregate,
    requiredPolicyCodes: string[],
  ): { satisfied: boolean; missing: string[] } {
    const boundCodes = new Set(event.policyBindings.map((b) => b.policyCode));
    const missing = requiredPolicyCodes.filter((code) => !boundCodes.has(code));

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }
}
