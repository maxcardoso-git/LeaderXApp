export interface PermissionProps {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: Date;
}

export interface CreatePermissionProps {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
}

/**
 * Permission Entity
 * Represents an atomic permission (e.g., EVENTS.CREATE, POINTS.CREDIT)
 * Codes should be DOT_SEPARATED_UPPER format
 */
export class Permission {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _code: string;
  private readonly _name: string;
  private readonly _description?: string;
  private readonly _category?: string;
  private readonly _createdAt: Date;

  private constructor(props: PermissionProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._category = props.category;
    this._createdAt = props.createdAt;
  }

  static create(id: string, props: CreatePermissionProps): Permission {
    Permission.validateCode(props.code);

    return new Permission({
      id,
      tenantId: props.tenantId,
      code: props.code.toUpperCase(),
      name: props.name,
      description: props.description,
      category: props.category,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: PermissionProps): Permission {
    return new Permission(props);
  }

  private static validateCode(code: string): void {
    // Code must be DOT_SEPARATED_UPPER or UPPER_SNAKE format
    const pattern = /^[A-Z][A-Z0-9]*([._][A-Z][A-Z0-9]*)*$/;
    if (!pattern.test(code.toUpperCase())) {
      throw new Error(
        `Invalid permission code format: ${code}. Must be DOT_SEPARATED_UPPER or UPPER_SNAKE (e.g., EVENTS.CREATE, POINTS_CREDIT)`,
      );
    }
  }

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

  get description(): string | undefined {
    return this._description;
  }

  get category(): string | undefined {
    return this._category;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
