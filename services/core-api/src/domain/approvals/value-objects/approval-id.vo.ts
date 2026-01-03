import { randomUUID } from 'crypto';

export class ApprovalId {
  private constructor(private readonly value: string) {}

  static create(): ApprovalId {
    return new ApprovalId(`apr-${randomUUID().slice(0, 8)}`);
  }

  static fromString(value: string): ApprovalId {
    if (!value || value.trim() === '') {
      throw new Error('ApprovalId cannot be empty');
    }
    return new ApprovalId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ApprovalId): boolean {
    return this.value === other.value;
  }
}
