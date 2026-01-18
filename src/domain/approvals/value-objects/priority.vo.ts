export enum PriorityValue {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class Priority {
  private constructor(private readonly value: PriorityValue) {}

  static low(): Priority {
    return new Priority(PriorityValue.LOW);
  }

  static medium(): Priority {
    return new Priority(PriorityValue.MEDIUM);
  }

  static high(): Priority {
    return new Priority(PriorityValue.HIGH);
  }

  static urgent(): Priority {
    return new Priority(PriorityValue.URGENT);
  }

  static fromString(value: string): Priority {
    const priority = PriorityValue[value as keyof typeof PriorityValue];
    if (!priority) {
      throw new Error(`Invalid priority: ${value}`);
    }
    return new Priority(priority);
  }

  getValue(): PriorityValue {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  getNumericWeight(): number {
    switch (this.value) {
      case PriorityValue.LOW:
        return 1;
      case PriorityValue.MEDIUM:
        return 2;
      case PriorityValue.HIGH:
        return 3;
      case PriorityValue.URGENT:
        return 4;
    }
  }

  equals(other: Priority): boolean {
    return this.value === other.value;
  }
}
