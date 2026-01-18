import { ReservationPolicy } from '../entities';
import { ResourceType, TransactionContext } from '../value-objects';

export interface PolicyRepositoryPort {
  /**
   * Find policy by ID
   */
  findById(
    tenantId: string,
    policyId: string,
    ctx?: TransactionContext,
  ): Promise<ReservationPolicy | null>;

  /**
   * Find active policy by event and resource type
   */
  findActiveByEventAndType(
    tenantId: string,
    eventId: string,
    resourceType: ResourceType,
    ctx?: TransactionContext,
  ): Promise<ReservationPolicy | null>;

  /**
   * Find policies by event
   */
  findByEvent(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<ReservationPolicy[]>;
}
