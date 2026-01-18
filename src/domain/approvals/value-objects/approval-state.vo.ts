export enum ApprovalStateValue {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export class ApprovalState {
  private constructor(private readonly value: ApprovalStateValue) {}

  static pending(): ApprovalState {
    return new ApprovalState(ApprovalStateValue.PENDING);
  }

  static approved(): ApprovalState {
    return new ApprovalState(ApprovalStateValue.APPROVED);
  }

  static rejected(): ApprovalState {
    return new ApprovalState(ApprovalStateValue.REJECTED);
  }

  static changesRequested(): ApprovalState {
    return new ApprovalState(ApprovalStateValue.CHANGES_REQUESTED);
  }

  static fromString(value: string): ApprovalState {
    const state = ApprovalStateValue[value as keyof typeof ApprovalStateValue];
    if (!state) {
      throw new Error(`Invalid approval state: ${value}`);
    }
    return new ApprovalState(state);
  }

  getValue(): ApprovalStateValue {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  isPending(): boolean {
    return this.value === ApprovalStateValue.PENDING;
  }

  isDecided(): boolean {
    return this.value !== ApprovalStateValue.PENDING;
  }

  canTransitionTo(newState: ApprovalState): boolean {
    // Only PENDING approvals can be decided
    if (!this.isPending()) {
      return false;
    }
    // Can only transition to a decided state
    return newState.isDecided();
  }

  equals(other: ApprovalState): boolean {
    return this.value === other.value;
  }
}
