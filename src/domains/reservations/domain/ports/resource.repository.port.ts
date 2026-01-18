import { ReservableResource } from '../entities';
import { ResourceType, TransactionContext } from '../value-objects';

export interface ResourceRepositoryPort {
  /**
   * Find resource by ID
   */
  findById(
    tenantId: string,
    resourceId: string,
    ctx?: TransactionContext,
  ): Promise<ReservableResource | null>;

  /**
   * Find resources by event
   */
  findByEvent(
    tenantId: string,
    eventId: string,
    resourceType?: ResourceType,
    ctx?: TransactionContext,
  ): Promise<ReservableResource[]>;

  /**
   * Lock resource for update (SELECT FOR UPDATE)
   */
  lockForUpdate(
    tenantId: string,
    resourceId: string,
    ctx: TransactionContext,
  ): Promise<void>;
}
