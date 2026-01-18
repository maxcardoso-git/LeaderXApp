import { PointLedgerEntry } from '../entities';
import { PointHold } from '../entities';
import { Balance, LedgerEntryType, HoldStatus } from '../value-objects';

/**
 * Domain service for calculating point balances
 *
 * Balance calculation rules:
 * - CREDIT increases currentBalance
 * - DEBIT decreases currentBalance
 * - HOLD does not change currentBalance (only heldBalance via active holds)
 * - RELEASE does not change currentBalance (only heldBalance via hold status change)
 * - COMMIT decreases currentBalance (finalizes the hold as a real debit)
 * - REVERSAL increases currentBalance (undo of a debit)
 */
export class BalanceCalculator {
  /**
   * Calculate the current balance, held balance, and available balance
   * from ledger entries and active holds
   */
  static calculate(
    ledgerEntries: PointLedgerEntry[],
    holds: PointHold[],
  ): Balance {
    let currentBalance = 0;

    // Calculate current balance from ledger entries
    for (const entry of ledgerEntries) {
      switch (entry.entryType) {
        case LedgerEntryType.CREDIT:
        case LedgerEntryType.REVERSAL:
          currentBalance += entry.amount;
          break;
        case LedgerEntryType.DEBIT:
        case LedgerEntryType.COMMIT:
          currentBalance -= entry.amount;
          break;
        // HOLD and RELEASE don't affect currentBalance directly
        // They only affect held balance via the holds table
        case LedgerEntryType.HOLD:
        case LedgerEntryType.RELEASE:
          break;
      }
    }

    // Calculate held balance from active holds only
    const heldBalance = holds
      .filter(hold => hold.status === HoldStatus.ACTIVE)
      .reduce((sum, hold) => sum + hold.amount, 0);

    return new Balance(currentBalance, heldBalance);
  }

  /**
   * Calculate balance from raw database aggregation results
   */
  static calculateFromAggregates(aggregates: {
    credits: number;
    debits: number;
    commits: number;
    reversals: number;
    activeHolds: number;
  }): Balance {
    const currentBalance =
      aggregates.credits +
      aggregates.reversals -
      aggregates.debits -
      aggregates.commits;

    return new Balance(currentBalance, aggregates.activeHolds);
  }
}
