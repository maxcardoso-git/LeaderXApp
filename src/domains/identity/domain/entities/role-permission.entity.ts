import { RoleEffect } from '../value-objects';

export interface RolePermissionProps {
  roleId: string;
  permissionId: string;
  effect: RoleEffect;
}

/**
 * RolePermission Entity
 * Represents the association between a Role and a Permission with an optional effect override
 */
export class RolePermission {
  private readonly _roleId: string;
  private readonly _permissionId: string;
  private readonly _effect: RoleEffect;

  private constructor(props: RolePermissionProps) {
    this._roleId = props.roleId;
    this._permissionId = props.permissionId;
    this._effect = props.effect;
  }

  static create(
    roleId: string,
    permissionId: string,
    effect: RoleEffect = RoleEffect.ALLOW,
  ): RolePermission {
    return new RolePermission({
      roleId,
      permissionId,
      effect,
    });
  }

  static reconstitute(props: RolePermissionProps): RolePermission {
    return new RolePermission(props);
  }

  get roleId(): string {
    return this._roleId;
  }

  get permissionId(): string {
    return this._permissionId;
  }

  get effect(): RoleEffect {
    return this._effect;
  }

  isAllow(): boolean {
    return this._effect === RoleEffect.ALLOW;
  }

  isDeny(): boolean {
    return this._effect === RoleEffect.DENY;
  }
}
