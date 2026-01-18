import { IdentityUser } from '../aggregates';
import { AccessAssignment, Role } from '../aggregates';
import { Permission, RolePermission } from '../entities';
import {
  EffectiveAccess,
  AccessContext,
  ScopeType,
  RoleEffect,
  AssignmentStatus,
} from '../value-objects';
import { NetworkReadPort } from '../ports';

export interface EvaluationInput {
  user: IdentityUser | null;
  permission: Permission | null;
  assignments: AccessAssignment[];
  roles: Role[];
  context: AccessContext;
}

export interface ScopeMatchResult {
  matches: boolean;
  requiresNetworkValidation: boolean;
  nodeId?: string;
}

/**
 * AccessPolicyEvaluator - Domain Service
 * Evaluates effective access applying DENY > ALLOW > DEFAULT_DENY precedence
 * Considers user status, active assignments, rolePermissions and scopes
 */
export class AccessPolicyEvaluator {
  constructor(private readonly networkPort?: NetworkReadPort) {}

  /**
   * Evaluate access for a user to a specific permission in a context
   */
  async evaluate(input: EvaluationInput): Promise<EffectiveAccess> {
    const matchedRules: string[] = [];
    const denyReasons: string[] = [];
    const allowReasons: string[] = [];

    // Rule 1: User must exist
    if (!input.user) {
      return EffectiveAccess.defaultDeny('USER_NOT_FOUND');
    }
    matchedRules.push('USER_EXISTS');

    // Rule 2: User must be active
    if (!input.user.canAccess()) {
      return EffectiveAccess.deny(
        ['USER_STATUS_CHECK'],
        [`USER_INACTIVE_OR_SUSPENDED: status=${input.user.status}`],
      );
    }
    matchedRules.push('USER_ACTIVE');

    // Rule 3: Permission must exist
    if (!input.permission) {
      return EffectiveAccess.defaultDeny('PERMISSION_NOT_FOUND');
    }
    matchedRules.push('PERMISSION_EXISTS');

    // Rule 4: Filter active assignments
    const activeAssignments = input.assignments.filter(
      (a) => a.status === AssignmentStatus.ACTIVE,
    );

    if (activeAssignments.length === 0) {
      return EffectiveAccess.defaultDeny('NO_ACTIVE_ASSIGNMENTS');
    }

    // Rule 5: Filter assignments by scope matching
    const matchingAssignments = await this.filterAssignmentsByScope(
      activeAssignments,
      input.context,
      input.user.id,
    );

    if (matchingAssignments.length === 0) {
      return EffectiveAccess.defaultDeny('NO_MATCHING_SCOPE');
    }
    matchedRules.push(`SCOPE_MATCHED:${matchingAssignments.length}`);

    // Rule 6: Get roles for matching assignments
    const matchingRoleIds = new Set(matchingAssignments.map((a) => a.roleId));
    const matchingRoles = input.roles.filter((r) => matchingRoleIds.has(r.id));

    // Rule 7: Evaluate permissions from roles
    // First, check for any DENY
    for (const role of matchingRoles) {
      // Check if role has DENY effect
      if (role.effect === RoleEffect.DENY) {
        // If role has DENY effect and contains the permission, it's a deny
        if (role.hasPermission(input.permission.id)) {
          denyReasons.push(`ROLE_DENY:${role.code}`);
        }
      } else {
        // Role has ALLOW effect, check permission-level effect
        const permEffect = role.getPermissionEffect(input.permission.id);
        if (permEffect === RoleEffect.DENY) {
          denyReasons.push(`ROLE_PERMISSION_DENY:${role.code}`);
        } else if (permEffect === RoleEffect.ALLOW) {
          allowReasons.push(`ROLE_ALLOW:${role.code}`);
        }
      }
    }

    // Apply precedence: DENY > ALLOW > DEFAULT_DENY
    if (denyReasons.length > 0) {
      return EffectiveAccess.deny(matchedRules, denyReasons);
    }

    if (allowReasons.length > 0) {
      return EffectiveAccess.permit(matchedRules, allowReasons);
    }

    return EffectiveAccess.defaultDeny('DEFAULT_DENY');
  }

  /**
   * Filter assignments by scope matching
   */
  private async filterAssignmentsByScope(
    assignments: AccessAssignment[],
    context: AccessContext,
    userId: string,
  ): Promise<AccessAssignment[]> {
    const matching: AccessAssignment[] = [];

    for (const assignment of assignments) {
      const result = await this.matchScope(assignment, context, userId);
      if (result.matches) {
        matching.push(assignment);
      }
    }

    return matching;
  }

  /**
   * Check if an assignment's scope matches the given context
   */
  private async matchScope(
    assignment: AccessAssignment,
    context: AccessContext,
    userId: string,
  ): Promise<ScopeMatchResult> {
    switch (assignment.scopeType) {
      case ScopeType.GLOBAL:
        // GLOBAL: always applies
        return { matches: true, requiresNetworkValidation: false };

      case ScopeType.TENANT:
        // TENANT: applies when tenantId matches
        return {
          matches:
            !context.tenantId || context.tenantId === assignment.tenantId,
          requiresNetworkValidation: false,
        };

      case ScopeType.EVENT:
        // EVENT: applies when context.eventId == scopeId
        return {
          matches: context.eventId === assignment.scopeId,
          requiresNetworkValidation: false,
        };

      case ScopeType.COMMUNITY:
        // COMMUNITY: applies when context.communityId == scopeId
        return {
          matches: context.communityId === assignment.scopeId,
          requiresNetworkValidation: false,
        };

      case ScopeType.TABLE:
        // TABLE: applies when context.tableId == scopeId
        return {
          matches: context.tableId === assignment.scopeId,
          requiresNetworkValidation: false,
        };

      case ScopeType.NETWORK_NODE:
        // NETWORK_NODE: applies when context.networkNodeId == scopeId
        // OR when NetworkReadPort validates authority
        if (context.networkNodeId === assignment.scopeId) {
          return { matches: true, requiresNetworkValidation: false };
        }

        // Check network authority if port is available
        if (this.networkPort && assignment.scopeId && context.networkNodeId) {
          const hasAuthority = await this.networkPort.validateAuthority(
            assignment.tenantId,
            userId,
            context.networkNodeId,
          );
          return {
            matches: hasAuthority,
            requiresNetworkValidation: true,
            nodeId: context.networkNodeId,
          };
        }

        return { matches: false, requiresNetworkValidation: false };

      case ScopeType.RESOURCE:
        // RESOURCE: applies when context.resourceId == scopeId
        return {
          matches: context.resourceId === assignment.scopeId,
          requiresNetworkValidation: false,
        };

      default:
        return { matches: false, requiresNetworkValidation: false };
    }
  }

  /**
   * Simplified evaluation that returns just PERMIT/DENY without network calls
   * Used for quick validation without full traceability
   */
  evaluateSync(input: EvaluationInput): EffectiveAccess {
    const matchedRules: string[] = [];
    const denyReasons: string[] = [];
    const allowReasons: string[] = [];

    // Rule 1: User must exist
    if (!input.user) {
      return EffectiveAccess.defaultDeny('USER_NOT_FOUND');
    }

    // Rule 2: User must be active
    if (!input.user.canAccess()) {
      return EffectiveAccess.deny(
        ['USER_STATUS_CHECK'],
        [`USER_INACTIVE_OR_SUSPENDED: status=${input.user.status}`],
      );
    }

    // Rule 3: Permission must exist
    if (!input.permission) {
      return EffectiveAccess.defaultDeny('PERMISSION_NOT_FOUND');
    }

    // Rule 4: Filter active assignments
    const activeAssignments = input.assignments.filter(
      (a) => a.status === AssignmentStatus.ACTIVE,
    );

    if (activeAssignments.length === 0) {
      return EffectiveAccess.defaultDeny('NO_ACTIVE_ASSIGNMENTS');
    }

    // Rule 5: Filter assignments by simple scope matching (no network calls)
    const matchingAssignments = activeAssignments.filter((a) =>
      this.matchScopeSync(a, input.context),
    );

    if (matchingAssignments.length === 0) {
      return EffectiveAccess.defaultDeny('NO_MATCHING_SCOPE');
    }
    matchedRules.push(`SCOPE_MATCHED:${matchingAssignments.length}`);

    // Rule 6: Get roles for matching assignments
    const matchingRoleIds = new Set(matchingAssignments.map((a) => a.roleId));
    const matchingRoles = input.roles.filter((r) => matchingRoleIds.has(r.id));

    // Rule 7: Evaluate permissions from roles
    for (const role of matchingRoles) {
      if (role.effect === RoleEffect.DENY) {
        if (role.hasPermission(input.permission.id)) {
          denyReasons.push(`ROLE_DENY:${role.code}`);
        }
      } else {
        const permEffect = role.getPermissionEffect(input.permission.id);
        if (permEffect === RoleEffect.DENY) {
          denyReasons.push(`ROLE_PERMISSION_DENY:${role.code}`);
        } else if (permEffect === RoleEffect.ALLOW) {
          allowReasons.push(`ROLE_ALLOW:${role.code}`);
        }
      }
    }

    // Apply precedence: DENY > ALLOW > DEFAULT_DENY
    if (denyReasons.length > 0) {
      return EffectiveAccess.deny(matchedRules, denyReasons);
    }

    if (allowReasons.length > 0) {
      return EffectiveAccess.permit(matchedRules, allowReasons);
    }

    return EffectiveAccess.defaultDeny('DEFAULT_DENY');
  }

  private matchScopeSync(
    assignment: AccessAssignment,
    context: AccessContext,
  ): boolean {
    switch (assignment.scopeType) {
      case ScopeType.GLOBAL:
        return true;
      case ScopeType.TENANT:
        return !context.tenantId || context.tenantId === assignment.tenantId;
      case ScopeType.EVENT:
        return context.eventId === assignment.scopeId;
      case ScopeType.COMMUNITY:
        return context.communityId === assignment.scopeId;
      case ScopeType.TABLE:
        return context.tableId === assignment.scopeId;
      case ScopeType.NETWORK_NODE:
        return context.networkNodeId === assignment.scopeId;
      case ScopeType.RESOURCE:
        return context.resourceId === assignment.scopeId;
      default:
        return false;
    }
  }
}
