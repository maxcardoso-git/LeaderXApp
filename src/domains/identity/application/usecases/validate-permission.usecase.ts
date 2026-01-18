import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  PERMISSION_REPOSITORY,
  PermissionRepositoryPort,
  ROLE_REPOSITORY,
  RoleRepositoryPort,
  ACCESS_ASSIGNMENT_REPOSITORY,
  AccessAssignmentRepositoryPort,
  AccessPolicyEvaluator,
  AccessContext,
} from '../../domain';

export interface ValidatePermissionCommand {
  tenantId: string;
  userId: string;
  permissionCode: string;
  context?: AccessContext;
}

export interface ValidatePermissionResult {
  decision: 'PERMIT' | 'DENY';
  reason: string;
}

@Injectable()
export class ValidatePermissionUseCase {
  private readonly logger = new Logger(ValidatePermissionUseCase.name);
  private readonly evaluator: AccessPolicyEvaluator;

  constructor(
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepo: PermissionRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
    @Inject(ACCESS_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AccessAssignmentRepositoryPort,
  ) {
    // No network port for sync validation
    this.evaluator = new AccessPolicyEvaluator();
  }

  async execute(
    command: ValidatePermissionCommand,
  ): Promise<ValidatePermissionResult> {
    this.logger.debug(
      `Validating permission ${command.permissionCode} for user ${command.userId}`,
    );

    // Fetch user
    const user = await this.userRepo.findById(command.tenantId, command.userId);

    // Fetch permission
    const permission = await this.permissionRepo.findByCode(
      command.tenantId,
      command.permissionCode,
    );

    // Fetch active assignments
    const assignments = user
      ? await this.assignmentRepo.findActiveByUser(command.tenantId, user.id)
      : [];

    // Fetch roles with permissions
    const roleIds = [...new Set(assignments.map((a) => a.roleId))];
    const roles =
      roleIds.length > 0
        ? await this.roleRepo.findByIdsWithPermissions(command.tenantId, roleIds)
        : [];

    // Build context
    const context: AccessContext = {
      tenantId: command.tenantId,
      ...command.context,
    };

    // Use sync evaluation (no network calls)
    const effectiveAccess = this.evaluator.evaluateSync({
      user,
      permission,
      assignments,
      roles,
      context,
    });

    // Determine reason
    let reason: string;
    if (effectiveAccess.isPermitted()) {
      reason = effectiveAccess.allowReasons[0] ?? 'PERMITTED';
    } else {
      reason = effectiveAccess.denyReasons[0] ?? 'DEFAULT_DENY';
    }

    return {
      decision: effectiveAccess.decision,
      reason,
    };
  }
}
