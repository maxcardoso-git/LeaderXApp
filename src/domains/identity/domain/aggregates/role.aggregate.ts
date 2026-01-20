import { RoleEffect } from '../value-objects';
import { RolePermission } from '../entities';

export interface RoleProps {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  effect: RoleEffect;
  createdAt: Date;
  updatedAt: Date;
  permissions?: RolePermission[];
}

export interface CreateRoleProps {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  effect?: RoleEffect;
}

export interface PermissionInput {
  permissionId: string;
  effect?: RoleEffect;
}

/**
 * Role Aggregate Root
 * Represents a functional role that groups permissions
 * Can have ALLOW or DENY effect (for blocking roles)
 */
export class Role {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _code: string;
  private _name: string;
  private _description?: string;
  private readonly _effect: RoleEffect;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _permissions: RolePermission[];

  private constructor(props: RoleProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._effect = props.effect;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._permissions = props.permissions ?? [];
  }

  static create(id: string, props: CreateRoleProps): Role {
    Role.validateCode(props.code);

    const now = new Date();
    return new Role({
      id,
      tenantId: props.tenantId,
      code: props.code.toUpperCase(),
      name: props.name,
      description: props.description,
      effect: props.effect ?? RoleEffect.ALLOW,
      createdAt: now,
      updatedAt: now,
      permissions: [],
    });
  }

  static reconstitute(props: RoleProps): Role {
    return new Role(props);
  }

  private static validateCode(code: string): void {
    const pattern = /^[A-Z][A-Z0-9_]*$/;
    if (!pattern.test(code.toUpperCase())) {
      throw new Error(
        `Invalid role code format: ${code}. Must be UPPER_SNAKE (e.g., ADMIN, EVENT_MANAGER)`,
      );
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get code(): string {
    return this._code;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get description(): string | undefined {
    return this._description;
  }

  set description(value: string | undefined) {
    this._description = value;
  }

  get effect(): RoleEffect {
    return this._effect;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  get permissions(): readonly RolePermission[] {
    return this._permissions;
  }

  // Effect checks
  isAllowRole(): boolean {
    return this._effect === RoleEffect.ALLOW;
  }

  isDenyRole(): boolean {
    return this._effect === RoleEffect.DENY;
  }

  // Permission management
  hasPermission(permissionId: string): boolean {
    return this._permissions.some((p) => p.permissionId === permissionId);
  }

  getPermissionEffect(permissionId: string): RoleEffect | null {
    const rp = this._permissions.find((p) => p.permissionId === permissionId);
    return rp?.effect ?? null;
  }

  /**
   * Upsert permissions - replaces all permissions with the new set
   */
  upsertPermissions(permissions: PermissionInput[]): void {
    // Validate no duplicates
    const permissionIds = permissions.map((p) => p.permissionId);
    const uniqueIds = new Set(permissionIds);
    if (uniqueIds.size !== permissionIds.length) {
      throw new Error('Duplicate permission IDs in upsert');
    }

    // Create new permission set
    this._permissions = permissions.map((p) =>
      RolePermission.create(this._id, p.permissionId, p.effect ?? RoleEffect.ALLOW),
    );
    this._updatedAt = new Date();
  }

  /**
   * Load permissions from persistence
   */
  loadPermissions(permissions: RolePermission[]): void {
    this._permissions = permissions;
  }
}
