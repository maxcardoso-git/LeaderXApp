import { BalanceCalculator } from './balance-calculator.service';
import { PointLedgerEntry, PointHold } from '../entities';
import { LedgerEntryType, HoldStatus, Reference } from '../value-objects';

describe('BalanceCalculator', () => {
  const createEntry = (
    entryType: LedgerEntryType,
    amount: number,
    id: string = 'entry-1',
  ): PointLedgerEntry => {
    return PointLedgerEntry.reconstitute({
      id,
      tenantId: 'tenant-1',
      accountId: 'account-1',
      entryType,
      amount,
      reasonCode: 'TEST',
      reference: Reference.create('SYSTEM', 'ref-1'),
      metadata: {},
      createdAt: new Date(),
    });
  };

  const createHold = (
    status: HoldStatus,
    amount: number,
    id: string = 'hold-1',
  ): PointHold => {
    return PointHold.reconstitute({
      id,
      tenantId: 'tenant-1',
      accountId: 'account-1',
      status,
      amount,
      reference: Reference.create('ORDER', 'order-1'),
      expiresAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  describe('calculate', () => {
    it('should return zero balance for empty entries', () => {
      const result = BalanceCalculator.calculate([], []);

      expect(result.currentBalance).toBe(0);
      expect(result.heldBalance).toBe(0);
      expect(result.availableBalance).toBe(0);
    });

    it('should add CREDIT to currentBalance', () => {
      const entries = [createEntry(LedgerEntryType.CREDIT, 100)];
      const result = BalanceCalculator.calculate(entries, []);

      expect(result.currentBalance).toBe(100);
      expect(result.availableBalance).toBe(100);
    });

    it('should subtract DEBIT from currentBalance', () => {
      const entries = [
        createEntry(LedgerEntryType.CREDIT, 100, 'e1'),
        createEntry(LedgerEntryType.DEBIT, 30, 'e2'),
      ];
      const result = BalanceCalculator.calculate(entries, []);

      expect(result.currentBalance).toBe(70);
      expect(result.availableBalance).toBe(70);
    });

    it('should subtract COMMIT from currentBalance', () => {
      const entries = [
        createEntry(LedgerEntryType.CREDIT, 100, 'e1'),
        createEntry(LedgerEntryType.HOLD, 30, 'e2'),
        createEntry(LedgerEntryType.COMMIT, 30, 'e3'),
      ];
      const result = BalanceCalculator.calculate(entries, []);

      expect(result.currentBalance).toBe(70);
    });

    it('should add REVERSAL to currentBalance', () => {
      const entries = [
        createEntry(LedgerEntryType.CREDIT, 100, 'e1'),
        createEntry(LedgerEntryType.DEBIT, 30, 'e2'),
        createEntry(LedgerEntryType.REVERSAL, 10, 'e3'),
      ];
      const result = BalanceCalculator.calculate(entries, []);

      expect(result.currentBalance).toBe(80);
    });

    it('should count ACTIVE holds in heldBalance', () => {
      const entries = [createEntry(LedgerEntryType.CREDIT, 100)];
      const holds = [createHold(HoldStatus.ACTIVE, 30)];
      const result = BalanceCalculator.calculate(entries, holds);

      expect(result.currentBalance).toBe(100);
      expect(result.heldBalance).toBe(30);
      expect(result.availableBalance).toBe(70);
    });

    it('should not count COMMITTED holds in heldBalance', () => {
      const entries = [
        createEntry(LedgerEntryType.CREDIT, 100, 'e1'),
        createEntry(LedgerEntryType.HOLD, 30, 'e2'),
        createEntry(LedgerEntryType.COMMIT, 30, 'e3'),
      ];
      const holds = [createHold(HoldStatus.COMMITTED, 30)];
      const result = BalanceCalculator.calculate(entries, holds);

      expect(result.heldBalance).toBe(0);
    });

    it('should not count RELEASED holds in heldBalance', () => {
      const entries = [
        createEntry(LedgerEntryType.CREDIT, 100, 'e1'),
        createEntry(LedgerEntryType.HOLD, 30, 'e2'),
        createEntry(LedgerEntryType.RELEASE, 30, 'e3'),
      ];
      const holds = [createHold(HoldStatus.RELEASED, 30)];
      const result = BalanceCalculator.calculate(entries, holds);

      expect(result.heldBalance).toBe(0);
    });

    it('should not count EXPIRED holds in heldBalance', () => {
      const entries = [createEntry(LedgerEntryType.CREDIT, 100)];
      const holds = [createHold(HoldStatus.EXPIRED, 30)];
      const result = BalanceCalculator.calculate(entries, holds);

      expect(result.heldBalance).toBe(0);
    });

    it('should handle multiple active holds', () => {
      const entries = [createEntry(LedgerEntryType.CREDIT, 100)];
      const holds = [
        createHold(HoldStatus.ACTIVE, 20, 'h1'),
        createHold(HoldStatus.ACTIVE, 30, 'h2'),
      ];
      const result = BalanceCalculator.calculate(entries, holds);

      expect(result.heldBalance).toBe(50);
      expect(result.availableBalance).toBe(50);
    });

    it('should handle complex scenario with multiple entries and holds', () => {
      const entries = [
        createEntry(LedgerEntryType.CREDIT, 500, 'e1'),
        createEntry(LedgerEntryType.DEBIT, 100, 'e2'),
        createEntry(LedgerEntryType.HOLD, 50, 'e3'),
        createEntry(LedgerEntryType.COMMIT, 50, 'e4'),
        createEntry(LedgerEntryType.HOLD, 30, 'e5'),
        createEntry(LedgerEntryType.RELEASE, 30, 'e6'),
        createEntry(LedgerEntryType.CREDIT, 200, 'e7'),
      ];
      const holds = [
        createHold(HoldStatus.COMMITTED, 50, 'h1'),
        createHold(HoldStatus.RELEASED, 30, 'h2'),
        createHold(HoldStatus.ACTIVE, 100, 'h3'),
      ];
      const result = BalanceCalculator.calculate(entries, holds);

      // currentBalance: 500 - 100 - 50 + 200 = 550
      expect(result.currentBalance).toBe(550);
      expect(result.heldBalance).toBe(100);
      expect(result.availableBalance).toBe(450);
    });
  });
});
